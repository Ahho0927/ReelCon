export const HOLD_DELAY_MS = 300;
export const MOVE_TOLERANCE_PX = 8;
export const EDGE_ZONE_RATIO = 0.22;

export type GestureZone = 'leftEdge' | 'center' | 'rightEdge';
export type GestureState =
  | 'idle'
  | 'pending'
  | 'centerHeld'
  | 'edgeHeld'
  | 'edgeArmed'
  | 'locked';

export function getGestureZone(clientX: number, rect: Pick<DOMRect, 'left' | 'width'>): GestureZone {
  const progress = (clientX - rect.left) / rect.width;
  if (progress <= EDGE_ZONE_RATIO) return 'leftEdge';
  if (progress >= 1 - EDGE_ZONE_RATIO) return 'rightEdge';
  return 'center';
}

export function getLockThreshold(videoHeight: number): number {
  return Math.min(96, Math.max(64, videoHeight * 0.1));
}

export function movedBeyondTolerance(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
): boolean {
  return Math.hypot(clientX - startX, clientY - startY) > MOVE_TOLERANCE_PX;
}
