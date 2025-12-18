import { WsStatus } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/store";
import { useMemo } from "react";

export default function OnlineUser() {
  const status = useStore((state) => state.status);
  const onlineUsers = useStore((state) => state.serverStats?.online_users);

  const text = () => {
    if (status === WsStatus.Connected) {
      return `${onlineUsers} online`;
    }
    if (status === WsStatus.Initial) {
      return "Initializing...";
    }
    if (status === WsStatus.Connecting) {
      return "Connecting...";
    }
    if (status === WsStatus.Reconnecting) {
      return "Reconnecting...";
    }
    return "Disconnected";
  };

  const [borderColor, textColor] = useMemo(() => {
    if (status === WsStatus.Connected) {
      return ["border-accent", "text-accent"];
    }
    if (status === WsStatus.Initial) {
      return ["border-gray-500", "text-gray-500"];
    }
    if (status === WsStatus.Connecting) {
      return ["border-yellow-500", "text-yellow-500"];
    }
    if (status === WsStatus.Reconnecting) {
      return ["border-yellow-500", "text-yellow-500"];
    }
    return ["border-red-500", "text-red-500"];
  }, [status]);

  return (
    <div className={cn("border px-2 py-1 text-xs", borderColor, textColor)}>
      {text()}
    </div>
  );
}
