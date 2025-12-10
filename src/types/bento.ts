export interface BentoCard {
  id: string;
  type: string;
  title?: string;
  content: string | Record<string, any>;
  size?: 'small' | 'medium' | 'large' | 'wide';
  units?: { h: number; w: number };
  position: { x: number; y: number };
  style?: {
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: string;
    gradient?: string;
  };
  interactive?: boolean;
  animation?: 'fade' | 'slide' | 'scale' | 'bounce';
  rowIndex?: number; // 新增：卡片所在的行索引
}

export interface BentoGridRow {
  id: string;
  index: number;
  cards: BentoCard[];
  height?: number; // 行高，可选
}

export interface BentoGrid {
  id: string;
  name: string;
  cards: BentoCard[];
  rows?: BentoGridRow[]; // 新增：网格行数组
  columns: number;
  gap: number;
  maxWidth?: string;
  theme?: 'light' | 'dark' | 'auto';
  unit?: number;
  totalRows?: number;
  overscanRows?: number;
}

export interface BentoLayout {
  grids: BentoGrid[];
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export type CardSize = 'small' | 'medium' | 'large' | 'wide';
export type CardType = string;
export type AnimationType = BentoCard['animation'];

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface VirtualScrollConfig {
  enabled: boolean;
  overscan?: number;
}

export interface BentoGridProps {
  columns?: number;
  gap?: number;
  unit?: number;
  breakpoints?: BreakpointConfig;
  virtualized?: boolean;
  overscan?: number;
  hoverScale?: number;
  shadowStrength?: number;
}

export interface BentoCardProps {
  hoverScale?: number;
  shadowStrength?: number;
  interactive?: boolean;
}

export interface StorageDragState {
  draggedStorageCard: BentoCard | null;
  isDraggingFromStorage: boolean;
  storageDragOrigin?: string;
}