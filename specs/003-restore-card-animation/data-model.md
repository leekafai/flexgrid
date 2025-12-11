# Data Model: 优化卡片恢复动画流畅性

**Feature**: 003-restore-card-animation  
**Date**: 2025-12-09

## Entities

### RestorationAnimation

表示一个正在进行的卡片恢复动画状态。

**Fields**:
- `cardId: string` - 卡片唯一标识符（临时卡片ID，动画完成后会生成新的正式ID）
- `tempCard: BentoCard` - 临时卡片对象（动画期间使用，不添加到网格数据结构）
- `startPosition: { x: number; y: number }` - 动画起始位置（收纳列表卡片中心，像素坐标）
- `targetPosition: { x: number; y: number }` - 动画目标位置（网格卡片中心，像素坐标）
- `gridPosition: { x: number; y: number }` - 网格坐标位置（由 placeCard API 返回）
- `progress: number` - 动画进度（0-1）
- `duration: number` - 动画时长（毫秒，400-900ms）
- `startTime: number` - 动画开始时间戳
- `state: 'pending' | 'running' | 'completing' | 'completed'` - 动画状态

**Relationships**:
- 关联到临时 `BentoCard`（通过 tempCard，动画期间不添加到网格）
- 由 `BentoGrid` 组件管理动画生命周期
- 动画完成后，tempCard 正式添加到网格数据结构

**State Transitions**:
1. `pending` → `running`: 动画开始执行，临时卡片在视觉层显示
2. `running` → `completing`: 动画到达目标位置，开始回弹效果
3. `completing` → `completed`: 回弹效果完成，动画结束，临时卡片正式添加到网格
4. `completed`: 动画状态清理，从动画管理 Map 中移除，临时卡片转换为正式卡片

**Validation Rules**:
- `cardId` 必须存在且唯一（临时ID）
- `tempCard` 必须有效且包含所有必需的 BentoCard 字段
- `duration` 必须在 400-900ms 范围内
- `progress` 必须在 0-1 范围内
- `startPosition` 和 `targetPosition` 必须有效（非 NaN）
- 动画期间，tempCard 不得添加到 `grid.value.cards` 数组

### TemporaryCardState

表示动画期间的临时卡片状态，用于延迟部署机制。

**Fields**:
- `card: Omit<BentoCard, 'id'>` - 卡片数据（不包含ID，ID在动画完成后生成）
- `targetGridPosition: { x: number; y: number }` - 目标网格坐标位置
- `animationId: string` - 关联的动画ID
- `createdAt: number` - 创建时间戳

**Relationships**:
- 与 `RestorationAnimation` 一对一关联（通过 animationId）
- 动画完成后，转换为正式的 `BentoCard` 并添加到网格

**Validation Rules**:
- `card` 必须包含所有必需的 BentoCard 字段（除 id 外）
- `targetGridPosition` 必须有效且不与其他卡片冲突
- `animationId` 必须唯一且对应一个活跃的动画

### AnimationPath

定义贝塞尔曲线路径，用于计算动画过程中的卡片位置。

**Fields**:
- `startPoint: { x: number; y: number }` - 起点（P₀）
- `controlPoint: { x: number; y: number }` - 控制点（P₁）
- `endPoint: { x: number; y: number }` - 终点（P₂）
- `easingFunction: string` - 缓动函数（默认：'cubic-bezier(.2,.8,.2,1)'）

**Methods**:
- `getPositionAt(t: number): { x: number; y: number }` - 根据进度 t (0-1) 计算位置
  - 公式：`B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂`

**Relationships**:
- 由 `RestorationAnimation` 使用，计算动画路径

**Validation Rules**:
- `t` 参数必须在 0-1 范围内
- 控制点应偏向起点方向，以模拟拖拽起始时的加速效果

### DragStateVisual

动画过程中的视觉反馈状态。

**Fields**:
- `scale: number` - 缩放值（1.0-1.03）
- `shadow: string` - 阴影 CSS 值
- `zIndex: number` - 层级值（默认 1000）
- `opacity: number` - 透明度（0-1）

**State Values**:
- **初始状态（高处）**: `scale: 1.03`, `shadow: '0 18px 40px rgba(15, 23, 42, 0.18)'`, `zIndex: 1000`, `opacity: 0.95`
- **移动过程**: `scale: 1.00`, `shadow: '0 8px 28px rgba(15, 23, 42, 0.04)'`, `zIndex: 1000`, `opacity: 1.0`
- **回弹压缩**: `scale: 0.98`, `shadow: '0 8px 28px rgba(15, 23, 42, 0)'`, `zIndex: 1000`, `opacity: 1.0`
- **回弹完成**: `scale: 1.00`, `shadow: '0 8px 28px rgba(15, 23, 42, 0.04)'`, `zIndex: 1000`, `opacity: 1.0`

**Relationships**:
- 由 `RestorationAnimation` 使用，控制动画过程中的视觉效果

**Validation Rules**:
- `scale` 必须在 0.98-1.03 范围内
- `opacity` 必须在 0-1 范围内
- `zIndex` 必须足够高以确保动画卡片在最上层

## Data Flow

### 动画启动流程

1. 用户点击收纳列表中的卡片
2. `handleRestoreCard` 获取收纳列表卡片位置（像素坐标）
3. 调用 `placeCard` API，传递 `animateFrom` 参数
4. `placeCard` API 分配网格位置并创建卡片
5. `placeCard` 触发 `card-placed-with-animation` 事件
6. `BentoGrid` 组件监听事件，创建 `RestorationAnimation` 状态
7. 计算贝塞尔曲线路径（`AnimationPath`）
8. 开始动画执行，更新 `DragStateVisual` 状态

### 动画执行流程

1. 使用 `requestAnimationFrame` 更新动画进度
2. 根据进度 t 和 `AnimationPath` 计算当前位置
3. 更新卡片 DOM 样式（transform, box-shadow, opacity）
4. 动画到达目标位置后，触发回弹效果
5. 回弹效果完成后，清理动画状态

### 动画清理流程

1. 动画完成后，移除 DOM 样式覆盖
2. 从动画管理 Map 中移除 `RestorationAnimation`
3. 从 `animSuppressMove` Set 中移除 cardId
4. 清理相关事件监听器（如果有）

## Constraints

- **唯一性**: 每个 cardId 同时只能有一个恢复动画
- **性能**: 动画必须保持 60fps，避免掉帧
- **内存**: 动画完成后必须清理状态，避免内存泄漏
- **并发**: 支持多个动画并行执行，互不干扰
- **响应式**: 动画状态变化必须触发 Vue 响应式更新（如需要）

## Validation Functions

### validateAnimationParams

验证动画参数的有效性。

```typescript
function validateAnimationParams(
  cardId: string,
  from: { x: number; y: number },
  to: { x: number; y: number }
): boolean {
  // 验证 cardId 存在且非空
  // 验证 from 和 to 坐标有效（非 NaN）
  // 验证距离合理（不超过屏幕尺寸）
  return true;
}
```

### calculateAnimationDuration

根据距离计算动画时长。

```typescript
function calculateAnimationDuration(
  distance: number
): number {
  // 根据距离计算：duration = Math.max(400, Math.min(900, Math.round((distance / 1000) * 1000)))
  return duration;
}
```

