export interface ServerStats {
  online_users: number;
}

export interface MousePosition {
  x: number;
  y: number;
  dirty: boolean;
}

export interface MousePositions {
  [userId: string]: MousePosition;
}
