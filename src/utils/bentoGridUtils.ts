import type { BentoCard as BentoCardType } from '@/types/bento';

export interface Rectangle {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Check if two rectangles overlap
 */
export function rectOverlap(a: Rectangle, b: Rectangle): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/**
 * Get card units (width and height in grid units)
 */
export function unitsOf(card: BentoCardType): { w: number; h: number } {
  if (card.units) return card.units;
  
  const map: Record<string, { w: number; h: number }> = { 
    small: { w: 1, h: 1 }, 
    medium: { w: 2, h: 1 }, 
    large: { w: 1, h: 2 }, 
    wide: { w: 2, h: 2 } 
  };
  
  const size = (card.size as any) || 'wide';
  return map[size] || { w: 2, h: 2 };
}

/**
 * Calculate grid position from pixel coordinates
 */
export function getGridPosition(x: number, y: number, unit: number, gap: number): { gridX: number; gridY: number } {
  const cellSize = unit + gap;
  return {
    gridX: Math.max(0, Math.floor(x / cellSize)),
    gridY: Math.max(0, Math.floor(y / cellSize))
  };
}

/**
 * Calculate pixel position from grid coordinates
 */
export function getPixelPosition(gridX: number, gridY: number, unit: number, gap: number): { left: number; top: number } {
  const cellSize = unit + gap;
  return {
    left: gridX * cellSize,
    top: gridY * cellSize
  };
}

/**
 * Calculate card dimensions in pixels
 */
export function getCardDimensions(card: BentoCardType, unit: number, gap: number): { width: number; height: number } {
  const u = unitsOf(card);
  return {
    width: u.w * unit + (u.w - 1) * gap,
    height: u.h * unit + (u.h - 1) * gap
  };
}

/**
 * Check if a card collides with other cards at a given position
 */
export function collidesAt(card: BentoCardType, pos: { x: number; y: number }, cards: BentoCardType[]): boolean {
  const u = unitsOf(card);
  const a = { x: pos.x, y: pos.y, w: u.w, h: u.h };
  
  for (const c of cards) {
    if (c.id === card.id) continue;
    
    const uc = unitsOf(c);
    const b = { x: c.position.x, y: c.position.y, w: uc.w, h: uc.h };
    
    if (rectOverlap(a, b)) return true;
  }
  
  return false;
}

/**
 * Find a valid position for a card that doesn't collide with others
 */
export function findValidPosition(
  card: BentoCardType, 
  startX: number, 
  startY: number, 
  cards: BentoCardType[], 
  columns: number, 
  maxAttempts: number = 100
): { x: number; y: number } | null {
  const u = unitsOf(card);
  
  // Try positions starting from the desired position
  for (let y = Math.max(0, startY); y < startY + maxAttempts; y++) {
    for (let x = Math.max(0, startX); x < columns; x++) {
      const newPos = { x, y };
      
      // Check if position is within bounds
      if (x + u.w > columns) continue;
      
      // Check collision with other cards
      if (!collidesAt(card, newPos, cards)) {
        return newPos;
      }
    }
  }
  
  return null;
}

/**
 * Calculate grid columns based on container width
 */
export function calculateColumns(containerWidth: number, unit: number, gap: number): number {
  return Math.max(1, Math.floor((containerWidth + gap) / (unit + gap)));
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Get distance between two points
 */
export function getDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * Format position for area key (used for caching/deduplication)
 */
export function getAreaKey(x: number, y: number, w: number, h: number): string {
  return `${x},${y},${w},${h}`;
}