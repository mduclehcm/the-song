import { useEffect, useRef } from "react";
import { useStore } from "@/store/store";

interface MouseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastUpdate: number;
}

export default function MouseOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseStatesRef = useRef<Map<string, MouseState>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const { userId, mousePositions } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Update mouse states from server
  useEffect(() => {
    const now = Date.now();
    Object.entries(mousePositions).forEach(([id, pos]) => {
      if (id === userId) return; // Don't render own mouse

      const existingState = mouseStatesRef.current.get(id);
      if (existingState) {
        // Calculate velocity based on position change
        const dt = (now - existingState.lastUpdate) / 1000;
        const vx = dt > 0 ? (pos.x - existingState.x) / dt : 0;
        const vy = dt > 0 ? (pos.y - existingState.y) / dt : 0;

        mouseStatesRef.current.set(id, {
          x: pos.x,
          y: pos.y,
          vx,
          vy,
          lastUpdate: now,
        });
      } else {
        mouseStatesRef.current.set(id, {
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          lastUpdate: now,
        });
      }
    });

    // Remove mice that are no longer tracked
    const trackedIds = new Set(Object.keys(mousePositions));
    mouseStatesRef.current.forEach((_, id) => {
      if (id !== userId && !trackedIds.has(id)) {
        mouseStatesRef.current.delete(id);
      }
    });
  }, [mousePositions, userId]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and render each mouse
      mouseStatesRef.current.forEach((state, id) => {
        // Optimistic update based on velocity
        const timeSinceUpdate = (now - state.lastUpdate) / 1000;
        const predictedX = state.x + state.vx * timeSinceUpdate;
        const predictedY = state.y + state.vy * timeSinceUpdate;

        // Draw mouse cursor
        drawCursor(ctx, predictedX, predictedY, id);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  userId: string
) {
  // Generate a consistent color for each user based on their ID
  const hue = hashString(userId) % 360;
  const color = `hsl(${hue}, 70%, 60%)`;

  // Draw cursor arrow
  ctx.save();
  ctx.translate(x, y);

  // Cursor shape (arrow)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 20);
  ctx.lineTo(5, 15);
  ctx.lineTo(9, 23);
  ctx.lineTo(12, 21);
  ctx.lineTo(8, 13);
  ctx.lineTo(14, 13);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw user ID label
  ctx.font = "12px monospace";
  ctx.fillStyle = color;
  ctx.fillText(userId.substring(0, 8), 16, 10);

  ctx.restore();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
