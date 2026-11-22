import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importDir } from './helpers/import-dir.js';
import HttpEventServer from './helpers/http-event-server.js';

const require = createRequire(import.meta.url);
const request = require('sonos-discovery/lib/helpers/request');
const logger = require('sonos-discovery/lib/helpers/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function HttpAPI(discovery, settings) {

  const port = settings.port;
  const webroot = settings.webroot;
  // Null-prototype map so URL-supplied action names can never resolve to
  // inherited Object.prototype members (e.g. /constructor).
  const actions = Object.create(null);
  const events = new HttpEventServer();
  const webhookFailures = new WebhookFailureLog(logger);

  this.getWebRoot = function () {
    return webroot;
  };

  this.getPort = function () {
    return port;
  };

  this.discovery = discovery;

  discovery.on('transport-state', function (player) {
    invokeWebhook('transport-state', player);
  });

  discovery.on('topology-change', function (topology) {
    invokeWebhook('topology-change', topology);
  });

  discovery.on('volume-change', function (volumeChange) {
    invokeWebhook('volume-change', volumeChange);
  });

  discovery.on('mute-change', function (muteChange) {
    invokeWebhook('mute-change', muteChange);
  });

  // this handles registering of all actions
  this.registerAction = function (action, handler) {
    actions[action] = handler;
  };

  // Load modularized actions asynchronously
  this.init = async () => {
    await importDir(join(__dirname, './actions'), (registerAction) => {
      registerAction(this);
    });
  };

  this.requestHandler = function (req, res) {
    if (req.url === '/favicon.ico') {
      res.end();
      return;
    }

    if (req.url === '/events') {
      events.addClient(res);
      return;
    }

    if (!discovery.zones || discovery.zones.length === 0) {
      const msg = 'No system has yet been discovered. Please see https://github.com/jishi/node-sonos-http-api/issues/77 if it doesn\'t resolve itself in a few seconds.';
      logger.error(msg);
      sendResponse(500, { status: 'error', error: msg });
      return;
    }

    const params = req.url.substring(1).split('/');

    // parse decode player name considering decode errors
    let playerName;
    let player;
    try {
      playerName = decodeURIComponent(params[0]);
      player = discovery.getPlayer(playerName);
    } catch (error) {
      logger.error(`Unable to parse supplied URI component (${params[0]})`, error);
      return sendResponse(500, { status: 'error', error: error.message });
    }

    const opt = {};

    if (player) {
      opt.action = (params[1] || '').toLowerCase();
      opt.values = params.splice(2);
    } else {
      // Check if the first param was intended as a player name (has a second param as action)
      if (params.length > 1) {
        // The user specified a player name that doesn't exist
        return sendResponse(404, { status: 'error', error: `Player "${playerName}" not found` });
      }
      player = discovery.getAnyPlayer();
      opt.action = (params[0] || '').toLowerCase();
      opt.values = params.splice(1);
    }

    // Validate action exists before dispatching
    if (!hasAction(opt.action)) {
      return sendResponse(400, { status: 'error', error: `Unknown action: "${opt.action}"` });
    }

    function sendResponse(code, body) {
      if (res.headersSent) {
        logger.warn('Response already sent, skipping duplicate response');
        return;
      }
      var jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(Buffer.from(jsonResponse));
      res.end();
    }

    opt.player = player;
    // Run the action inside the promise chain so a synchronous throw becomes a
    // 500 response instead of escaping and leaving the request hanging.
    Promise.resolve()
    .then(() => handleAction(opt))
    .then((response) => {
      if (!response || response.constructor.name === 'IncomingMessage') {
        response = { status: 'success' };
      } else if (Array.isArray(response) && response.length > 0 && response[0].constructor.name === 'IncomingMessage') {
        response = { status: 'success' };
      }

      sendResponse(200, response);
    }).catch((error) => {
      logger.error(error);
      sendResponse(500, { status: 'error', error: error.message });
    });
  };


  function hasAction(name) {
    return typeof name === 'string' && Object.hasOwn(actions, name) && typeof actions[name] === 'function';
  }

  function handleAction(options) {
    var player = options.player;
    if (!hasAction(options.action)) {
      return Promise.reject(new Error(`Invalid action: ${options.action}`));
    }
    var action = actions[options.action];
    if (typeof action !== 'function') {
      return Promise.reject(new Error(`Invalid action: ${options.action}`));
    }
    return action(player, options.values);
  }

  function invokeWebhook(type, data) {
    var typeName = "type";
    var dataName = "data";

    if (settings.webhookType) { typeName = settings.webhookType; }
    if (settings.webhookData) { dataName = settings.webhookData; }

    let jsonBody;
    try {
      jsonBody = JSON.stringify({
        [typeName]: type,
        [dataName]: data
      });
    } catch (e) {
      logger.warn('Failed to serialize webhook data:', e.message);
      return;
    }

    events.sendEvent(jsonBody);

    const webhooks = normalizeWebhooks(settings.webhook);
    if (webhooks.length === 0) return;

    const body = Buffer.from(jsonBody, 'utf8');

    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    if (settings.webhookHeaderName && settings.webhookHeaderContents) {
      headers[settings.webhookHeaderName] = settings.webhookHeaderContents;
    }

    webhooks.forEach(function (uri) {
      request({
        method: 'POST',
        uri: uri,
        headers: headers,
        body
      })
      .then(function () {
        webhookFailures.recordSuccess(uri);
      })
      .catch(function (err) {
        webhookFailures.recordFailure(uri, err);
      });
    });
  }

}

/**
 * Logs webhook delivery problems once per endpoint instead of on every event:
 * the first failure is logged as an error, repeated failures only at debug
 * level, and an info line is logged once the endpoint accepts events again.
 */
export function WebhookFailureLog(log) {
  const failures = new Map();

  this.recordFailure = function (uri, err) {
    const count = failures.get(uri);
    if (count === undefined) {
      failures.set(uri, 1);
      log.error('Could not reach webhook endpoint', uri, 'for some reason. Verify that the receiving end is up and running.',
        'Further failures for this endpoint are suppressed until it is reachable again.');
      log.error(err);
      return;
    }
    failures.set(uri, count + 1);
    log.debug('Webhook endpoint', uri, 'still unreachable:', err && err.message);
  };

  this.recordSuccess = function (uri) {
    const count = failures.get(uri);
    if (count === undefined) return;
    failures.delete(uri);
    log.info('Webhook endpoint', uri, 'is reachable again after', count, count === 1 ? 'failed delivery.' : 'failed deliveries.');
  };
}

/**
 * Accepts the `webhook` setting as a single URL string or an array of URL
 * strings and returns a de-duplicated list of non-empty URLs.
 */
export function normalizeWebhooks(webhook) {
  const list = Array.isArray(webhook) ? webhook : [webhook];
  const urls = list
    .filter(function (url) { return typeof url === 'string'; })
    .map(function (url) { return url.trim(); })
    .filter(function (url) { return url.length > 0; });
  return Array.from(new Set(urls));
}

export default HttpAPI;
