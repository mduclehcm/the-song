import { EventEmitter } from "@/lib/event";
import { WS_URL } from "@/config";

export type ConnectedEvent = {
  name: "connected";
};

export type DisconnectedEvent = {
  name: "disconnected";
};

export type ReconnectingEvent = {
  name: "reconnecting";
};

export type MessageEvent = {
  name: "message";
  data: string;
};

export type WebsocketEvent =
  | ConnectedEvent
  | DisconnectedEvent
  | ReconnectingEvent
  | MessageEvent;

export enum WsStatus {
  Initial = "initial",
  Connected = "connected",
  Disconnected = "disconnected",
  Connecting = "connecting",
  Reconnecting = "reconnecting",
}

export class WebSocketClient extends EventEmitter<WebsocketEvent> {
  private socket: WebSocket | null = null;
  private status: WsStatus = WsStatus.Initial;
  private shouldConnect: boolean = true;
  private url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  connect() {
    if (this.status === WsStatus.Connected) {
      console.debug("[WS] already connected");
      return;
    }
    if (!this.shouldConnect) {
      console.debug("[WS] connection cancelled");
      return;
    }
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      this.status = WsStatus.Connected;
      this.emit({ name: "connected" });
    };
    this.socket.onclose = (event) => {
      if (this.shouldConnect) {
        console.debug("[WS] Connection closed, reconnecting in 2500ms");
        this.status = WsStatus.Reconnecting;
        this.emit({ name: "reconnecting" });
        setTimeout(() => {
          this.connect();
        }, 2500);
      } else {
        this.status = WsStatus.Disconnected;
        this.emit({ name: "disconnected" });
        // Log close details for debugging
        console.debug("[WS] Connection closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
      }
    };
    this.socket.onerror = (error) => {
      console.error("[WS] Connection error", error);
      this.socket?.close();
    };
    this.socket.onmessage = (event) => {
      this.emit({ name: "message", data: event.data });
    };
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.status === WsStatus.Disconnected) {
      console.debug("[WS] not connected");
      return;
    }
    this.socket?.close();
    this.emit({ name: "disconnected" });
  }

  send(message: string) {
    this.socket?.send(message);
  }
}

export const WS_CLIENT = new WebSocketClient(WS_URL);
