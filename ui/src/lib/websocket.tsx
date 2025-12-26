import { EventEmitter } from "@/lib/event";
import { WS_URL } from "@/config";
import {
  type ClientMessage,
  ClientMessageSchema,
  type ServerMessage,
  ServerMessageSchema,
} from "@the-song/protocol";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";

export type ConnectedEvent = {
  name: "connected";
};

export type DisconnectedEvent = {
  name: "disconnected";
};

export type ReconnectingEvent = {
  name: "reconnecting";
};

export type BinaryMessageEvent = {
  name: "message";
  data: ServerMessage;
};

export type WaitingEvent = {
  name: "waiting";
};

export type WebsocketEvent =
  | ConnectedEvent
  | DisconnectedEvent
  | ReconnectingEvent
  | BinaryMessageEvent
  | WaitingEvent;

export enum WsStatus {
  Initial = "initial",
  Waiting = "waiting",
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
    this.socket.binaryType = "arraybuffer"; // Enable binary messages

    this.socket.onopen = () => {
      this.status = WsStatus.Waiting;
      this.emit({ name: "waiting" });
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
      // Handle binary messages
      if (event.data instanceof ArrayBuffer) {
        try {
          const bytes = new Uint8Array(event.data);
          const message = fromBinary(ServerMessageSchema, bytes);
          if (this.status === WsStatus.Waiting) {
            this.status = WsStatus.Connected;
            this.emit({ name: "connected" });
          }
          this.emit({ name: "message", data: message });
        } catch (error) {
          console.error("[WS] Failed to decode binary message:", error);
        }
      } else {
        // Legacy text message handling (for backwards compatibility during transition)
        console.warn("[WS] Received text message, expected binary");
      }
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

  /**
   * Send a binary protobuf message
   */
  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const bytes = toBinary(ClientMessageSchema, message);
      this.socket.send(bytes);
    }
  }

  /**
   * Helper to create and send a mouse update message
   */
  sendMouseUpdate(x: number, y: number, vx: number, vy: number) {
    const message = create(ClientMessageSchema, {
      payload: {
        case: "mouseUpdate",
        value: { x, y, vx, vy },
      },
    });
    this.send(message);
  }

  /**
   * Helper to create and send a synthesizer update message
   */
  sendSynthesizerUpdate(data: Uint8Array) {
    const message = create(ClientMessageSchema, {
      payload: {
        case: "synthesizerUpdate",
        value: { data },
      },
    });
    this.send(message);
  }
}

export const WS_CLIENT = new WebSocketClient(WS_URL);
