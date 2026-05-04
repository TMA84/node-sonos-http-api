import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import auth from 'basic-auth';
import serveStatic from 'serve-static';
import settings from './settings.js';
import HttpAPI from './lib/sonos-http-api.js';

const require = createRequire(import.meta.url);
const SonosSystem = require('sonos-discovery');
const logger = require('sonos-discovery/lib/helpers/logger');

const serve = serveStatic(settings.webroot, { index: ['index.html'], redirect: true });
const discovery = new SonosSystem(settings);
const api = new HttpAPI(discovery, settings);

await api.init();

var requestHandler = function (req, res) {
  // Strip Home Assistant Ingress prefix from URL
  const ingressPath = req.headers['x-ingress-path'];
  if (ingressPath && req.url.startsWith(ingressPath)) {
    req.url = req.url.slice(ingressPath.length) || '/';
    // Redirect to trailing slash for root so relative URLs work
    if (req.url === '' || req.url === '/') {
      req.url = '/';
    }
  }

  // Health check endpoint for HA watchdog
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  req.addListener('end', function () {
    serve(req, res, function (err) {
      if (res.headersSent) return;

      // If error, route it.
      // This bypasses authentication on static files!
      //if (!err) {
      //  return;
      //}

      if (settings.auth) {
        var credentials = auth(req);

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

let server;

if (settings.https) {
  var options = {};
  if (settings.https.pfx) {
    options.pfx = fs.readFileSync(settings.https.pfx);
    options.passphrase = settings.https.passphrase;
  } else if (settings.https.key && settings.https.cert) {
    options.key = fs.readFileSync(settings.https.key);
    options.cert = fs.readFileSync(settings.https.cert);
  } else {
    logger.error("Insufficient configuration for https");
    process.exit(1);
  }

  const secureServer = https.createServer(options, requestHandler);
  secureServer.listen(settings.securePort, function () {
    logger.info('https server listening on port', settings.securePort);
  });
}

server = http.createServer(requestHandler);

process.on('unhandledRejection', (err) => {
  logger.error(err);
});

let host = settings.ip;
server.listen(settings.port, host, function () {
  logger.info('http server listening on', host, 'port', settings.port);
});

server.on('error', (err) => {
  if (err.code && err.code === 'EADDRINUSE') {
    logger.error(`Port ${settings.port} seems to be in use already. Make sure the sonos-http-api isn't 
    already running, or that no other server uses that port. You can specify an alternative http port 
    with property "port" in settings.json`);
  } else {
    logger.error(err);
  }

  process.exit(1);
});
