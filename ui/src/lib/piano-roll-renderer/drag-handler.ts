export interface DragHandlerCallbacks {
  onDragStart: () => void;
  onDragMove: (deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
}

export class DragHandler {
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private wheelScrollTimeout: number | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: DragHandlerCallbacks
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = "grabbing";
      this.callbacks.onDragStart();
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.callbacks.onDragMove(deltaX, deltaY);
  };

  private handleMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = "default";
      this.callbacks.onDragEnd();
    }
  };

  private handleContextMenu = (e: Event) => {
    e.preventDefault();
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Start scroll on first wheel event
    if (this.wheelScrollTimeout === null) {
      this.callbacks.onDragStart();
    }

    // Clear any existing timeout
    if (this.wheelScrollTimeout !== null) {
      clearTimeout(this.wheelScrollTimeout);
    }

    // Calculate delta with appropriate scaling
    // Note: deltaX and deltaY are positive when scrolling right/down
    // We invert them to match the expected scroll direction
    const deltaX = -e.deltaX;
    const deltaY = -e.deltaY;

    this.callbacks.onDragMove(deltaX, deltaY);

    // End scroll after a short delay without wheel events
    this.wheelScrollTimeout = window.setTimeout(() => {
      this.wheelScrollTimeout = null;
      this.callbacks.onDragEnd();
    }, 150);
  };

  destroy() {
    if (this.wheelScrollTimeout !== null) {
      clearTimeout(this.wheelScrollTimeout);
      this.wheelScrollTimeout = null;
    }
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }
}
