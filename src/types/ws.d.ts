declare module 'ws' {
  export class WebSocketServer {
    constructor(options?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    close(cb?: (err?: Error) => void): void;
    clients: Set<any>;
  }
  export class WebSocket {
    static OPEN: number;
    readyState: number;
    send(data: any): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
