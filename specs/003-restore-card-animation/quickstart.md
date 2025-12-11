# Quick Start: 优化卡片恢复动画流畅性

**Feature**: 003-restore-card-animation  
**Date**: 2025-12-09

## 概述

本指南提供快速实现卡片恢复动画优化的关键代码片段和步骤。

## 实现步骤

### 1. 创建贝塞尔曲线路径计算工具

创建 `src/utils/bezierPath.ts`:

```typescript
import type { AnimationPosition } from '@/specs/003-restore-card-animation/contracts/restore-animation-interfaces';

/**
 * 计算二次贝塞尔曲线路径上的位置
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
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * 计算控制点位置（偏向起点方向，模拟拖拽起始加速）
 * @param start 起点
 * @param end 终点
 * @returns 控制点位置
 */
export function calculateControlPoint(
  start: AnimationPosition,
  end: AnimationPosition
): AnimationPosition {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // 控制点偏向起点方向 30%，模拟拖拽起始时的加速效果
  return {
    x: start.x + dx * 0.3,
    y: start.y + dy * 0.3
  };
}
```

### 2. 修改 placeCard API 支持延迟部署

在 `src/composables/useBentoGrid.ts` 中修改 `placeCard` 函数，支持延迟部署机制：

```typescript
const placeCard = (
  card: Omit<BentoCard, 'id'>,
  position?: { x?: number; y?: number },
  animateFrom?: { x: number; y: number }
): { x: number; y: number; cardId: string; tempCardId?: string } => {
  // ... 计算最终位置 ...
  
  // 如果需要动画，创建临时卡片状态，不立即添加到网格
  if (animateFrom) {
    const tempCardId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempCard: BentoCard = {
      ...card,
      id: tempCardId,
      position: finalPosition
    };
    
    // 存储临时卡片状态（不添加到 grid.value.cards）
    // 触发动画事件，传递临时卡片信息
    setTimeout(() => {
      const event = new CustomEvent('card-placed-with-animation', {
        detail: {
          cardId: tempCardId,
          tempCard: card, // 不包含 id 的卡片数据
          from: animateFrom,
          to: finalPosition
        }
      });
      document.dispatchEvent(event);
    }, 0);
    
    return { x: finalPosition.x, y: finalPosition.y, cardId: tempCardId, tempCardId };
  }
  
  // 不需要动画时，正常添加卡片
  const newCard: BentoCard = {
    ...card,
    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: finalPosition
  };
  grid.value.cards.push(newCard);
  return { x: finalPosition.x, y: finalPosition.y, cardId: newCard.id };
};
```

### 3. 优化 BentoGrid 组件中的动画处理和延迟部署

在 `src/components/BentoGrid.vue` 中更新 `handleCardPlacedWithAnimation` 函数，实现延迟部署机制:

```typescript
import { calculateBezierPosition, calculateControlPoint } from '@/utils/bezierPath';
import type { AnimationPosition } from '@/specs/003-restore-card-animation/contracts/restore-animation-interfaces';

// 处理从收纳列表恢复卡片的动画（延迟部署机制）
const handleCardPlacedWithAnimation = (event: CustomEvent) => {
  const { cardId, tempCard, from, to } = event.detail;
  
  // 创建临时卡片元素（不添加到网格数据结构）
  // 注意：tempCard 不包含 id，cardId 是临时ID
  const tempCardElement = createTempCardElement(tempCard, cardId);
  if (!tempCardElement || !gridEl.value) return;
  
  // 将临时卡片添加到 DOM（但不添加到 grid.value.cards）
  gridEl.value.appendChild(tempCardElement);
  
  setTimeout(() => {
    const el = tempCardElement as HTMLElement;
    if (!el || !gridEl.value) return;

    // 获取卡片实际位置（中心点）
    const cardRect = el.getBoundingClientRect();
    const targetX = cardRect.left + cardRect.width / 2;
    const targetY = cardRect.top + cardRect.height / 2;

    // 计算贝塞尔曲线路径
    const startPoint: AnimationPosition = { x: from.x, y: from.y };
    const endPoint: AnimationPosition = { x: targetX, y: targetY };
    const controlPoint = calculateControlPoint(startPoint, endPoint);

    // 计算偏移量（从收纳列表中心到网格卡片中心）
    const dx = from.x - targetX;
    const dy = from.y - targetY;
    const distance = Math.hypot(dx, dy);
    
    // 根据距离计算动画时长（400-900ms）
    const duration = Math.max(400, Math.min(900, Math.round((distance / 1000) * 1000)));

    // 设置动画
    animSuppressMove.value.add(cardId);
    animations.value.set(cardId, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
    
    // 初始状态：从收纳列表位置开始，模拟高处
    el.style.transition = 'none';
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.03)`;
    el.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.18)';
    el.style.opacity = '0.95';
    el.style.zIndex = '1000';
    el.style.willChange = 'transform, box-shadow, opacity';
    el.style.pointerEvents = 'none';

    // 使用 requestAnimationFrame 实现贝塞尔曲线路径动画
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 应用缓动函数
      const easedProgress = easeInOutCubic(progress);
      
      // 计算贝塞尔曲线位置
      const currentPos = calculateBezierPosition(easedProgress, startPoint, controlPoint, endPoint);
      const currentDx = currentPos.x - targetX;
      const currentDy = currentPos.y - targetY;
      
      // 更新位置
      el.style.transform = `translate3d(${currentDx}px, ${currentDy}px, 0) scale(${1.03 - easedProgress * 0.03})`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画到达目标位置，触发回弹效果
        triggerBounceEffect(el, cardId, duration);
      }
    };

    requestAnimationFrame(animate);
  }, 10);
};

// 缓动函数：cubic-bezier(.2,.8,.2,1) 的近似实现
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 回弹效果
function triggerBounceEffect(el: HTMLElement, cardId: string, duration: number) {
  el.style.transition = 'none';
  el.style.transform = 'translate3d(0, 0, 0) scale(0.98)';
  el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0)';
  requestAnimationFrame(() => {
    el.style.transition = 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 140ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'translate3d(0, 0, 0) scale(1.00)';
    el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.04)';
  });

  // 动画结束后：正式部署卡片到网格
  setTimeout(() => {
    // 1. 清理动画样式
    el.style.transition = '';
    el.style.transform = '';
    el.style.boxShadow = '';
    el.style.opacity = '';
    el.style.zIndex = '';
    el.style.willChange = '';
    el.style.pointerEvents = '';
    
    // 2. 创建正式卡片并添加到网格数据结构
    const finalCard: BentoCard = {
      ...tempCard,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: to
    };
    grid.value.cards.push(finalCard);
    
    // 3. 移除临时卡片元素
    el.remove();
    
    // 4. 清理动画状态
    animSuppressMove.value.delete(cardId);
    animations.value.delete(cardId);
  }, duration + 10 + 160 + 20);
}

// 创建临时卡片元素的辅助函数
function createTempCardElement(tempCard: Omit<BentoCard, 'id'>, tempCardId: string): HTMLElement | null {
  // 创建临时卡片 DOM 元素
  // 使用与 BentoCard 组件相同的结构和样式
  // 注意：这个元素不会添加到 grid.value.cards，只用于动画显示
  // 返回创建的元素
}
```

### 3. 确保 placeCard API 正确触发动画事件

`placeCard` API 已在 `useBentoGrid.ts` 中实现，确保 `animateFrom` 参数正确传递：

```typescript
// 在 useBentoGrid.ts 中，placeCard 函数已包含动画事件触发逻辑
// 确保 animateFrom 参数正确传递即可
```

### 4. 测试动画效果

1. 打开应用，添加一些卡片到网格
2. 将卡片收纳到收纳列表
3. 点击收纳列表中的卡片
4. 观察卡片是否从收纳列表位置平滑移动到网格位置
5. 验证动画路径是否平滑（贝塞尔曲线）
6. 验证视觉反馈（缩放、阴影、回弹效果）

## 关键实现要点

1. **延迟部署机制**: 卡片在动画期间保持临时状态，动画完成后才正式添加到网格数据结构
2. **贝塞尔曲线路径**: 使用二次贝塞尔曲线计算平滑路径
3. **性能优化**: 使用 CSS transforms 和 requestAnimationFrame
4. **视觉反馈**: 缩放、阴影、层级变化提供清晰的拖拽状态
5. **动画时长**: 根据距离动态计算（400-900ms）
6. **回弹效果**: 放置时先压缩再回弹，提供满意的完成反馈

## 注意事项

- **延迟部署**: 卡片必须在动画完成后再正式添加到网格，避免卡片先出现在目标位置再跳回收纳列表的闪烁问题
- 确保动画完成后清理所有状态，避免内存泄漏
- 多个动画并行执行时，每个动画独立管理状态
- 使用 `willChange` 提示浏览器优化渲染
- 动画过程中避免触发 layout 和 paint，只触发 composite
- 临时卡片元素在动画完成后必须移除，正式卡片才添加到网格数据结构

