# 避让插件问题分析报告

## 问题描述
当鼠标移动但阴影位置（预估卡片摆放位置）不变时，避让卡片仍然会有变化。

## 根本原因分析

### 1. 阴影位置判断逻辑缺陷

在 `onDragUpdate` 方法中，第 59-67 行的位置判断逻辑存在问题：

```typescript
const prev = (this as any)._prevShadowRect
if (prev) {
  const dx = Math.abs((ctx.dropRect.left ?? 0) - prev.left)
  const dy = Math.abs((ctx.dropRect.top ?? 0) - prev.top)
  const sameArea = prev.areaKey === areaKey
  if (dx < 5 && dy < 5 && sameArea) {
    return null
  }
}
```

**问题**：
- 虽然 `sameArea` 检查网格位置是否相同，但 `dx < 5 && dy < 5` 的判断过于严格
- 当阴影位置在网格内微小移动时，即使网格位置相同，也可能触发避让重新计算
- 返回 `null` 会跳过整个避让逻辑，但避让状态可能需要更新

### 2. 避让状态管理逻辑问题

第 69-77 行的无碰撞处理逻辑：

```typescript
if (collisions.length === 0) {
  if ((this as any)._activeAvoid.size > 0) {
    const restores = Array.from((this as any)._activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }))
    ;(this as any)._activeAvoid.clear()
    ;(this as any)._activeAreaKey = ''
    return { moves: restores }
  }
  return null
}
```

**问题**：
- 只要没有碰撞，就立即清除所有避让状态
- 但可能存在之前避让的卡片需要逐步恢复的情况
- 没有考虑阴影位置是否真的发生了变化

### 3. 碰撞检测与避让计算耦合度过高

当前的逻辑将碰撞检测和避让计算紧密耦合，导致：
- 即使阴影位置不变，碰撞检测结果可能因其他因素变化
- 避让计算被不必要的频繁触发

## 解决方案

### 改进方案 1：优化阴影位置判断

增强位置稳定性判断，只有当阴影位置真正改变时才重新计算避让：

```typescript
const prev = (this as any)._prevShadowRect
if (prev && prev.areaKey === areaKey) {
  // 只有区域键相同才跳过计算
  // 因为 areaKey 已经包含了网格位置信息
  return null
}
```

### 改进方案 2：分离碰撞检测与避让状态管理

将避让状态的管理与碰撞检测分离，确保：
- 阴影位置不变时，保持现有避让状态
- 只有真正需要时才重新计算避让
- 提供更平滑的避让体验

### 改进方案 3：增加防抖机制

在避让计算中增加防抖机制，避免频繁的避让状态变化：

```typescript
const lastMove = (this as any)._lastMoves.get(card.id)
const sameAsLast = lastMove && lastMove.x === best.pos.x && lastMove.y === best.pos.y
if (sameAsLast && now - lastMove.ts < 300) { // 减少防抖时间
  return null
}
```

## 测试建议

1. **基本功能测试**：拖动卡片到不同位置，验证避让是否正常
2. **稳定性测试**：在相同网格位置内微小移动鼠标，验证避让是否保持不变
3. **性能测试**：快速拖动卡片，验证避让计算的频率是否合理
4. **边缘情况测试**：测试卡片在边界附近的避让行为

## 结论

问题的根本原因是阴影位置判断逻辑过于敏感，导致不必要的避让重新计算。通过优化位置判断逻辑和分离碰撞检测与状态管理，可以解决鼠标移动但阴影不变时避让仍然变化的问题。