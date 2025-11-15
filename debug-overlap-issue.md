# 避让插件问题调试分析

## 问题现象
从图像可以看出：
- 红色框卡片：位置 (3,2)，尺寸 2×2
- 蓝色框卡片：位置 (2,2)，尺寸 2×2
- 两张卡片发生了重叠，但蓝色卡片没有执行避让

## 可能的原因分析

### 1. 碰撞检测问题
让我检查碰撞检测逻辑是否正确识别了这个重叠：

```typescript
const draggedRect = { x: 3, y: 2, w: 2, h: 2 }  // 红色卡片
const blueCardRect = { x: 2, y: 2, w: 2, h: 2 }  // 蓝色卡片

// AABB 重叠检测
function aabbOverlap(a, b) {
  return !(
    a.x + a.w <= b.x ||  // 3+2 <= 2 = 5 <= 2 = false
    b.x + b.w <= a.x ||  // 2+2 <= 3 = 4 <= 3 = false  
    a.y + a.h <= b.y ||  // 2+2 <= 2 = 4 <= 2 = false
    b.y + b.h <= a.y    // 2+2 <= 2 = 4 <= 2 = false
  )
}
// 结果：true (应该检测到重叠)
```

碰撞检测逻辑是正确的，应该能检测到重叠。

### 2. 避让位置查找问题

让我检查 `bfsNearest` 函数是否能找到合适的避让位置：

对于蓝色卡片（2,2），避让算法会检查四个方向：
- 上：(2,1) - 可能有效
- 下：(2,3) - 可能有效  
- 左：(1,2) - 可能有效
- 右：(3,2) - 被红色卡片占据，无效

### 3. 可能的根本原因

通过分析代码，我发现了几个可能的问题：

#### 问题1：避让算法选择逻辑
在第 145 行：
```typescript
if (!best || item.area > intersectArea(...) || (item.area === intersectArea(...) && routes > best.routes)) {
  best = { card: c, pos: chosen, routes }
}
```

这个逻辑可能选择了重叠面积最大的卡片进行避让，但如果有多个卡片重叠，可能不是选择最优的避让方案。

#### 问题2：占用网格构建问题
让我检查 `buildOccupancy` 函数是否正确处理了当前状态：

```typescript
// 在 onDragUpdate 中，被拖动的卡片被过滤掉了
let occ = buildOccupancy(ctx.cards.filter(c => c.id !== ctx.draggedCard.id), ctx.columns)
```

但是，避让后的卡片位置是否正确更新到了占用网格中？

#### 问题3：避让状态冲突
可能存在多个卡片同时需要避让，但算法只处理了一个卡片的情况。

## 调试建议

为了验证具体问题，我建议添加详细的调试日志：