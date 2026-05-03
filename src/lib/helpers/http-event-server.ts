import { ServerResponse } from 'node:http';

interface HttpEventSourceInstance {
  sendEvent(event: string): void;
}

class HttpEventSource implements HttpEventSourceInstance {
  private res: ServerResponse;
  private done: (client: HttpEventSourceInstance) => void;

  constructor(res: ServerResponse, done: (client: HttpEventSourceInstance) => void) {
    this.res = res;
    this.done = done;

    res.on('close', () => this.done(this));
    res.setHeader('Content-Type', 'text/event-stream');
  }

  sendEvent(event: string): void {
    this.res.write('data: ' + event + '\n\n');
  }
}

class HttpEventServer {
  private clients: HttpEventSourceInstance[] = [];

  addClient(res: ServerResponse): void {
    const removeClient = (client: HttpEventSourceInstance): void => {
      this.clients = this.clients.filter(value => value !== client);
    };
    this.clients.push(new HttpEventSource(res, removeClient));
  }

  sendEvent(event: string): void {
    this.clients.forEach(client => client.sendEvent(event));
  }
}

export default HttpEventServer;
