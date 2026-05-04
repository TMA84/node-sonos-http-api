import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { importDir } from './helpers/import-dir.js';
import HttpEventServer from './helpers/http-event-server.js';
import type { Settings } from '../settings.js';
import type { ActionHandler, ActionApi } from './actions/types.js';
import type SonosSystem from 'sonos-discovery';

const require = createRequire(import.meta.url);
const request = require('sonos-discovery/lib/helpers/request') as typeof import('sonos-discovery/lib/helpers/request');
const logger = require('sonos-discovery/lib/helpers/logger') as typeof import('sonos-discovery/lib/helpers/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class HttpAPI implements ActionApi {
  private port: number;
  private webroot: string;
  private actions: Record<string, ActionHandler> = {};
  private events: HttpEventServer;
  private settings: Settings;
  discovery: SonosSystem;

  constructor(discovery: SonosSystem, settings: Settings) {
    this.port = settings.port;
    this.webroot = settings.webroot;
    this.events = new HttpEventServer();
    this.settings = settings;
    this.discovery = discovery;

    discovery.on('transport-state', (player: unknown) => {
      this.invokeWebhook('transport-state', player);
    });

    discovery.on('topology-change', (topology: unknown) => {
      this.invokeWebhook('topology-change', topology);
    });

    discovery.on('volume-change', (volumeChange: unknown) => {
      this.invokeWebhook('volume-change', volumeChange);
    });

    discovery.on('mute-change', (muteChange: unknown) => {
      this.invokeWebhook('mute-change', muteChange);
    });
  }

  getWebRoot(): string {
    return this.webroot;
  }

  getPort(): number {
    return this.port;
  }

  registerAction(action: string, handler: ActionHandler): void {
    this.actions[action] = handler;
  }

  async init(): Promise<void> {
    await importDir<(api: ActionApi) => void>(join(__dirname, './actions'), (registerAction) => {
      registerAction(this);
    });
  }

  requestHandler = (req: IncomingMessage, res: ServerResponse): void => {
    if (req.url === '/favicon.ico') {
      res.end();
      return;
    }

    if (req.url === '/events') {
      this.events.addClient(res);
      return;
    }

    if (!this.discovery.zones || this.discovery.zones.length === 0) {
      const msg = 'No system has yet been discovered. Please see https://github.com/jishi/node-sonos-http-api/issues/77 if it doesn\'t resolve itself in a few seconds.';
      logger.error(msg);
      sendResponse(res, 500, { status: 'error', error: msg });
      return;
    }

    const params = (req.url ?? '').substring(1).split('/');

    // parse decode player name considering decode errors
    let playerName: string;
    let player: ReturnType<SonosSystem['getPlayer']>;
    try {
      playerName = decodeURIComponent(params[0]);
      player = this.discovery.getPlayer(playerName);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Unable to parse supplied URI component (${params[0]})`, err);
      sendResponse(res, 500, { status: 'error', error: err.message });
      return;
    }

    const opt: { action: string; values: string[]; player?: ReturnType<SonosSystem['getPlayer']> | ReturnType<SonosSystem['getAnyPlayer']> } = {
      action: '',
      values: [],
    };

    if (player) {
      opt.action = (params[1] || '').toLowerCase();
      opt.values = params.splice(2);
    } else {
      // Check if the first param was intended as a player name (has a second param as action)
      if (params.length > 1) {
        // The user specified a player name that doesn't exist
        sendResponse(res, 404, { status: 'error', error: `Player "${playerName}" not found` });
        return;
      }
      player = this.discovery.getAnyPlayer();
      opt.action = (params[0] || '').toLowerCase();
      opt.values = params.splice(1);
    }

    // Validate action exists before dispatching
    if (!this.actions[opt.action]) {
      sendResponse(res, 400, { status: 'error', error: `Unknown action: "${opt.action}"` });
      return;
    }

    opt.player = player;

    Promise.resolve(this.handleAction(opt))
      .then((response: unknown) => {
        let result = response;
        if (!result || (result as { constructor: { name: string } }).constructor.name === 'IncomingMessage') {
          result = { status: 'success' };
        } else if (Array.isArray(result) && result.length > 0 && result[0].constructor.name === 'IncomingMessage') {
          result = { status: 'success' };
        }

        sendResponse(res, 200, result);
      }).catch((error: unknown) => {
        logger.error(error);
        const err = error as Error;
        sendResponse(res, 500, { status: 'error', error: err.message });
      });
  };

  private handleAction(options: { action: string; values: string[]; player?: unknown }): Promise<unknown> {
    const player = options.player;
    const action = this.actions[options.action];
    if (typeof action !== 'function') {
      return Promise.reject(new Error(`Invalid action: ${options.action}`));
    }
    return action(player as Parameters<ActionHandler>[0], options.values);
  }

  private invokeWebhook(type: string, data: unknown): void {
    let typeName = 'type';
    let dataName = 'data';

    if (this.settings.webhookType) { typeName = this.settings.webhookType; }
    if (this.settings.webhookData) { dataName = this.settings.webhookData; }

    const jsonBody = JSON.stringify({
      [typeName]: type,
      [dataName]: data,
    });

    this.events.sendEvent(jsonBody);

    if (!this.settings.webhook) return;

    const body = Buffer.from(jsonBody, 'utf8');

    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    };
    if (this.settings.webhookHeaderName && this.settings.webhookHeaderContents) {
      headers[this.settings.webhookHeaderName] = this.settings.webhookHeaderContents;
    }

    request({
      method: 'POST',
      uri: this.settings.webhook,
      headers,
      body,
    })
      .catch((err: unknown) => {
        logger.error('Could not reach webhook endpoint', this.settings.webhook, 'for some reason. Verify that the receiving end is up and running.');
        logger.error(err);
      });
  }
}

function sendResponse(res: ServerResponse, code: number, body: unknown): void {
  if (res.headersSent) {
    logger.warn('Response already sent, skipping duplicate response');
    return;
  }
  const jsonResponse = JSON.stringify(body);
  res.statusCode = code;
  res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
  res.setHeader('Content-Type', 'application/json;charset=utf-8');
  res.write(Buffer.from(jsonResponse));
  res.end();
}

export default HttpAPI;
