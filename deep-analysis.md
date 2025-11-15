# 避让问题深度分析

## 从测试结果得出的结论

测试显示：
- ✅ 碰撞检测正常工作
- ✅ 占用网格构建正确
- ✅ 四个方向中只有左方向 (1,2) 是可行的避让位置
- ❌ 但蓝色卡片实际上没有执行避让

## 可能的问题根源

### 1. 避让选择算法问题

当前的算法逻辑（第 116-122 行）：
```typescript
const sorted = collisions
  .map(c => {
    const u = getUnitsForCard(c)
    const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
    return { card: c, area: intersectArea(draggedRect, rect) }
  })
  .sort((a, b) => b.area - a.area)
```

**问题**：这个算法只选择重叠面积最大的一个卡片进行避让，但如果只有一个碰撞卡片，它应该总是被选择。

### 2. 单卡片避让逻辑检查

让我检查当只有一个碰撞卡片时的处理逻辑：

```typescript
let best: { card: BentoCard; pos: { x: number; y: number }; routes: number } | null = null
for (const item of sorted) {
  // ... 避让位置查找逻辑 ...
  if (candidates.length === 0) continue  // 如果没有找到候选位置，跳过这个卡片
  
  // 选择逻辑
  if (!best || item.area > intersectArea(...) || (...)) {
    best = { card: c, pos: chosen, routes }
  }
}
```

**可能问题**：如果 `candidates.length === 0`，那么 `best` 会保持为 `null`，导致整个避让失败。

### 3. 实际场景分析

在我们的测试场景中：
- 只有一个碰撞卡片（蓝色卡片）
- 找到了一个有效的避让位置 (1,2)
- 但避让没有执行

这表明问题可能在：**避让决策逻辑** 或 **避让执行逻辑**

### 4. 检查防抖机制

第 154-158 行的防抖逻辑：
```typescript
const lastMove = (this as any)._lastMoves.get(best.card.id)
const sameAsLast = lastMove && lastMove.x === best.pos.x && lastMove.y === best.pos.y
if (sameAsLast && now - lastMove.ts < 300) {
  return null  // 这里可能阻止了避让执行
}
```

**问题**：如果之前已经尝试过相同的避让位置，300ms 内不会重复执行。

### 5. 检查避让状态管理

可能存在的问题：
- `_activeAvoid` 状态中已经有这个卡片
- `_reservations` 预留冲突
- `_activeAreaKey` 区域键不匹配

## 修复建议

### 1. 增强调试日志
我已经添加了详细的调试日志，运行时可以查看：
- 碰撞检测过程
- 避让位置查找过程
- 避让决策过程
- 防抖机制触发情况

### 2. 检查避让返回值
确保当找到有效避让位置时，函数会返回非 null 值。

### 3. 验证避让执行
检查返回的避让计划是否被正确执行。