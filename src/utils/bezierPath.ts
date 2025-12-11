/**
 * Bezier Curve Path Calculation Utility
 * Feature: 003-restore-card-animation
 * Date: 2025-12-09
 * 
 * Provides functions for calculating positions along a quadratic Bezier curve
 * for smooth card restoration animations.
 */

import type { AnimationPosition } from '@/specs/003-restore-card-animation/contracts/restore-animation-interfaces';

/**
 * 计算二次贝塞尔曲线路径上的位置
 * 公式: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 * 
 * @param t 进度值 (0-1)
 * @param p0 起点
 * @param p1 控制点
 * @param p2 终点
 * @returns 当前位置
 */
export function calculateBezierPosition(
  t: number,
  p0: AnimationPosition,
  p1: AnimationPosition,
  p2: AnimationPosition
): AnimationPosition {
  // 确保 t 在 0-1 范围内
  const clampedT = Math.max(0, Math.min(1, t));
  
  // 二次贝塞尔曲线公式
  const mt = 1 - clampedT;
  const mt2 = mt * mt;
  const t2 = clampedT * clampedT;
  const twoMtT = 2 * mt * clampedT;
  
  return {
    x: mt2 * p0.x + twoMtT * p1.x + t2 * p2.x,
    y: mt2 * p0.y + twoMtT * p1.y + t2 * p2.y
  };
}

/**
 * 计算控制点位置
 * 控制点偏向起点方向，以模拟拖拽起始时的加速效果
 * 
 * @param startPoint 起点
 * @param endPoint 终点
 * @param controlPointOffset 控制点偏移系数（0-1），默认 0.3，表示控制点偏向起点方向
 * @returns 控制点位置
 */
export function calculateControlPoint(
  startPoint: AnimationPosition,
  endPoint: AnimationPosition,
  controlPointOffset: number = 0.3
): AnimationPosition {
  // 计算起点到终点的向量
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  
  // 控制点偏向起点方向，模拟拖拽起始时的加速
  // controlPointOffset = 0.3 表示控制点在起点和终点之间，更靠近起点
  return {
    x: startPoint.x + dx * controlPointOffset,
    y: startPoint.y + dy * controlPointOffset
  };
}

/**
 * 三次缓动函数 (ease-in-out-cubic)
 * 提供平滑的加速和减速效果
 * 
 * @param t 进度值 (0-1)
 * @returns 缓动后的进度值 (0-1)
 */
export function easeInOutCubic(t: number): number {
  // 确保 t 在 0-1 范围内
  const clampedT = Math.max(0, Math.min(1, t));
  
  // cubic-bezier(.2,.8,.2,1) 的近似实现
  // 使用三次贝塞尔曲线的缓动函数
  if (clampedT < 0.5) {
    // 前半段：加速
    return 4 * clampedT * clampedT * clampedT;
  } else {
    // 后半段：减速
    const t2 = clampedT - 1;
    return 1 + 4 * t2 * t2 * t2;
  }
}

/**
 * 弹性缓动函数 (用于回弹效果)
 * cubic-bezier(0.34, 1.56, 0.64, 1) 的近似实现
 * 
 * @param t 进度值 (0-1)
 * @returns 缓动后的进度值，可能超出 0-1 范围（用于回弹效果）
 */
export function easeOutBounce(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  
  // 简化的弹性缓动函数
  // 使用三次贝塞尔曲线的近似值
  if (clampedT < 0.5) {
    return 2 * clampedT * clampedT;
  } else {
    // 后半段有轻微的回弹效果
    const t2 = clampedT - 0.5;
    return 1 + 0.1 * Math.sin(t2 * Math.PI * 2);
  }
}

/**
 * 计算路径总长度（近似值）
 * 通过采样多个点来估算路径长度
 * 
 * @param startPoint 起点
 * @param controlPoint 控制点
 * @param endPoint 终点
 * @param samples 采样点数，默认 20
 * @returns 路径长度（像素）
 */
export function calculatePathLength(
  startPoint: AnimationPosition,
  controlPoint: AnimationPosition,
  endPoint: AnimationPosition,
  samples: number = 20
): number {
  let length = 0;
  let prevPoint = startPoint;
  
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const currentPoint = calculateBezierPosition(t, startPoint, controlPoint, endPoint);
    const dx = currentPoint.x - prevPoint.x;
    const dy = currentPoint.y - prevPoint.y;
    length += Math.hypot(dx, dy);
    prevPoint = currentPoint;
  }
  
  return length;
}


