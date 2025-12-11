/**
 * TypeScript Interfaces for Card Restoration Animation
 * Feature: 003-restore-card-animation
 * Date: 2025-12-09
 */

/**
 * 动画起始和目标位置（像素坐标）
 */
export interface AnimationPosition {
  x: number;
  y: number;
}

/**
 * 网格坐标位置
 */
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * 卡片恢复动画状态
 */
export interface RestorationAnimation {
  cardId: string; // 临时卡片ID，动画完成后会生成新的正式ID
  tempCard: Omit<{ id: string; [key: string]: any }, 'id'>; // 临时卡片对象（动画期间使用，不添加到网格数据结构）
  startPosition: AnimationPosition;
  targetPosition: AnimationPosition;
  gridPosition: GridPosition;
  progress: number;
  duration: number;
  startTime: number;
  state: 'pending' | 'running' | 'completing' | 'completed';
}

/**
 * 临时卡片状态（用于延迟部署机制）
 */
export interface TemporaryCardState {
  card: Omit<{ id: string; [key: string]: any }, 'id'>; // 卡片数据（不包含ID，ID在动画完成后生成）
  targetGridPosition: GridPosition; // 目标网格坐标位置
  animationId: string; // 关联的动画ID
  createdAt: number; // 创建时间戳
}

/**
 * 贝塞尔曲线路径定义
 */
export interface AnimationPath {
  startPoint: AnimationPosition;
  controlPoint: AnimationPosition;
  endPoint: AnimationPosition;
  easingFunction: string;
}

/**
 * 拖拽状态视觉反馈
 */
export interface DragStateVisual {
  scale: number;
  shadow: string;
  zIndex: number;
  opacity: number;
}

/**
 * placeCard API 参数
 * Note: BentoCard type is defined in src/types/bento.ts
 */
export interface PlaceCardParams {
  card: Omit<{ id: string; [key: string]: any }, 'id'>; // BentoCard without id
  position?: { x?: number; y?: number };
  animateFrom?: AnimationPosition;
}

/**
 * placeCard API 返回值
 */
export interface PlaceCardResult {
  x: number;
  y: number;
  cardId: string;
}

/**
 * 卡片放置动画事件详情（支持延迟部署）
 */
export interface CardPlacedWithAnimationEventDetail {
  cardId: string; // 临时卡片ID
  tempCard: Omit<{ id: string; [key: string]: any }, 'id'>; // 临时卡片数据（不包含ID）
  from: AnimationPosition;
  to: GridPosition;
}

/**
 * 贝塞尔曲线路径计算函数
 */
export interface BezierPathCalculator {
  /**
   * 根据进度 t (0-1) 计算路径上的位置
   * @param t 动画进度，范围 0-1
   * @returns 当前位置（像素坐标）
   */
  getPositionAt(t: number): AnimationPosition;
  
  /**
   * 计算路径总长度（用于速度控制）
   * @returns 路径长度（像素）
   */
  getLength(): number;
}

