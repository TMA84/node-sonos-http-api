import { IncomingMessage, ServerResponse } from 'node:http';
import type SonosSystem from 'sonos-discovery';

export function healthHandler(_req: IncomingMessage, res: ServerResponse, discovery: SonosSystem): void {
  const body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    discovery: discovery.zones?.length > 0 ? 'connected' : 'pending',
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
