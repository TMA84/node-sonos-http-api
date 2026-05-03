import http, { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import auth from 'basic-auth';
import serveStatic from 'serve-static';
import settings from './settings.js';
import HttpAPI from './lib/sonos-http-api.js';
import { healthHandler } from './health.js';

const require = createRequire(import.meta.url);
const SonosSystem = require('sonos-discovery') as new (settings: unknown) => import('sonos-discovery');
const logger = require('sonos-discovery/lib/helpers/logger') as typeof import('sonos-discovery/lib/helpers/logger');

const serve = serveStatic(settings.webroot);
const discovery = new SonosSystem(settings);
const api = new HttpAPI(discovery, settings);

await api.init();

const requestHandler = (req: IncomingMessage, res: ServerResponse): void => {
  // Health check bypasses authentication and static serving
  if (req.url === '/health') {
    healthHandler(req, res, discovery);
    return;
  }

  req.addListener('end', () => {
    serve(req, res, (_err?: unknown) => {
      if (res.headersSent) return;

      if (settings.auth) {
        const credentials = auth(req);

        if (!credentials || credentials.name !== settings.auth.username || credentials.pass !== settings.auth.password) {
          res.statusCode = 401;
          res.setHeader('WWW-Authenticate', 'Basic realm="Access Denied"');
          res.end('Access denied');
          return;
        }
      }

      // Enable CORS requests
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.headers['access-control-request-headers']) {
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
      }

      if (req.method === 'OPTIONS') {
        res.end();
        return;
      }

      if (req.method === 'GET') {
        api.requestHandler(req, res);
      }
    });
  }).resume();
};

if (settings.https) {
  const options: https.ServerOptions = {};
  if (settings.https.pfx) {
    options.pfx = fs.readFileSync(settings.https.pfx);
    options.passphrase = settings.https.passphrase;
  } else if (settings.https.key && settings.https.cert) {
    options.key = fs.readFileSync(settings.https.key);
    options.cert = fs.readFileSync(settings.https.cert);
  } else {
    logger.error('Insufficient configuration for https');
    process.exit(1);
  }

  const secureServer = https.createServer(options, requestHandler);
  secureServer.listen(settings.securePort, () => {
    logger.info('https server listening on port', settings.securePort);
  });
}

const server = http.createServer(requestHandler);

process.on('unhandledRejection', (err: unknown) => {
  logger.error(err);
});

const host: string = settings.ip;
server.listen(settings.port, host, () => {
  logger.info('http server listening on', host, 'port', settings.port);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code && err.code === 'EADDRINUSE') {
    logger.error(`Port ${settings.port} seems to be in use already. Make sure the sonos-http-api isn't already running, or that no other server uses that port. You can specify an alternative http port with property "port" in settings.json`);
  } else {
    logger.error(err);
  }

  process.exit(1);
});
