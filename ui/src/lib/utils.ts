import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function throttle(fn: () => void, delay: number) {
  let lastExecTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    const now = Date.now();
    const timeSinceLastExec = now - lastExecTime;
    
    if (timeSinceLastExec >= delay) {
      // Enough time has passed, execute immediately
      lastExecTime = now;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      fn();
    } else {
      // Still in throttle period, schedule execution for trailing edge
      // This ensures the latest data is synced even if calls stop
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastExecTime = Date.now();
        timeout = null;
        fn();
      }, delay - timeSinceLastExec);
    }
  };
}

export function debounce(fn: () => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn();
    }, delay);
  };
}
