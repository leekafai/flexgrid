# Data Model: 完善暂存区功能

**Date**: 2025-12-09  
**Feature**: 002-staging-area-improvements

## Entities

### StoredCard

**Description**: 表示暂存在 FloatingPanel 中的卡片

**Fields**:
- `id: string` - 卡片唯一标识符
- `type: string` - 卡片类型（text, image, link, video, etc.）
- `title?: string` - 卡片标题（可选）
- `content: string | Record<string, any>` - 卡片内容
- `position: { x: number, y: number }` - 卡片在网格中的原始位置（暂存时保留，用于恢复）
- `units?: { w: number, h: number }` - 卡片尺寸单位
- `size?: 'small' | 'medium' | 'large' | 'wide'` - 卡片尺寸预设
- `storedAt: number` - 暂存时间戳（毫秒）
- `style?: {...}` - 卡片样式（继承自 BentoCard）
- `interactive?: boolean` - 是否可交互
- `animation?: 'fade' | 'slide' | 'scale' | 'bounce'` - 动画类型

**Relationships**:
- 继承自 `BentoCard` 接口
- 属于 FloatingPanel 的暂存集合（最多 10 张）
- 可以恢复到 BentoGrid 中

**State Transitions**:
1. Grid Card → StoredCard (用户将卡片拖入暂存区域，容量检查通过)
2. StoredCard → Grid Card (用户将卡片拖回网格或点击恢复)
3. StoredCard → Removed (用户删除暂存卡片)

**Validation Rules**:
- `id` 必须唯一
- `storedAt` 必须为正数时间戳
- `position` 必须包含有效的 x, y 坐标
- 暂存区最多容纳 10 张卡片（容量限制）

### StorageBadge

**Description**: 暂存图标上的数字角标，显示当前暂存卡片数量

**Fields**:
- `count: number` - 当前暂存卡片数量（0-10）
- `visible: boolean` - 是否显示角标（count > 0 时显示）

**Computed Properties**:
- `displayText: string` - 显示的文本（count 的字符串形式，超过 10 显示 "10+"）

**State Transitions**:
1. Hidden → Visible (count 从 0 变为 > 0)
2. Visible → Hidden (count 变为 0)
3. Count Update (卡片添加/移除时更新)

**Validation Rules**:
- `count` 必须在 0-10 范围内
- 更新必须在 100ms 内完成（符合 SC-001）

### DragState (Extended)

**Description**: 扩展现有的拖放状态，支持从网格到暂存区和从暂存区到网格的拖放操作

**Fields** (继承自现有 DragState):
- `draggedCard: BentoCard | StoredCard | null` - 当前拖动的卡片
- `dragSource: 'grid' | 'storage' | null` - 拖放来源标识
- `dropTarget: HTMLElement | null` - 目标放置元素
- `isDragging: boolean` - 是否正在拖动（用于串行处理）
- `dropRect: { left: number, top: number, width: number, height: number } | null` - 拖放预览矩形

**New/Extended Fields**:
- `isDragOverStorage: boolean` - 是否悬停在暂存区上方（用于视觉反馈）
- `storageCapacityFull: boolean` - 暂存区是否已满（10 张卡片）
- `dragStartTime: number | null` - 拖放开始时间（用于性能监控）

**State Transitions**:
1. Idle → Dragging (startDrag called, isDragging = true)
2. Dragging → DragOverStorage (鼠标移动到暂存区，isDragOverStorage = true)
3. Dragging → Dropped (endDrag called, card moved)
4. Dragging → Cancelled (endDrag called, card returned)
5. Dragging → Idle (isDragging = false, 允许新的拖放操作)

**Validation Rules**:
- `dragSource` 必须与 `draggedCard` 的来源一致
- `isDragging` 为 true 时，新的拖放操作必须被阻止（串行处理）
- 容量已满时，从网格到暂存区的拖放必须被拒绝

### StorageAreaState

**Description**: 暂存区的完整状态管理

**Fields**:
- `storedCards: StoredCard[]` - 暂存的卡片列表（最多 10 张）
- `isPanelVisible: boolean` - 面板是否可见
- `isStorageExpanded: boolean` - 暂存列表是否展开（鼠标悬停或拖放时）
- `isDraggingFromStorage: boolean` - 是否正在从暂存区域拖动卡片
- `isDragOverStorage: boolean` - 是否正在拖放卡片到暂存区（用于视觉反馈）
- `capacityLimit: number` - 容量限制（固定为 10）

**Computed Properties**:
- `storedCardsCount: number` - 当前暂存卡片数量
- `isFull: boolean` - 是否已满（count >= capacityLimit）
- `canAcceptDrop: boolean` - 是否可以接受新的拖放（!isFull）

**State Transitions**:
1. Empty → HasCards (添加第一张卡片)
2. HasCards → Full (达到 10 张卡片)
3. Full → HasCards (移除卡片，数量 < 10)
4. Collapsed → Expanded (鼠标悬停或拖放时)
5. Expanded → Collapsed (鼠标离开且无拖放时)

**Validation Rules**:
- `storedCards` 数组长度不能超过 `capacityLimit` (10)
- `storedCards` 数组中的卡片 ID 必须唯一
- 容量已满时，`canAcceptDrop` 必须为 false

## Component Interfaces

### FloatingPanel Component Props

```typescript
interface FloatingPanelProps {
  // 当前无外部 props，所有状态通过 composable 管理
}
```

### FloatingPanel Component Events

```typescript
interface FloatingPanelEmits {
  'restore-card': (card: BentoCard) => void;
  'remove-stored-card': (cardId: string) => void;
  'add-card': (type: string) => void;
  'drag-start': (card: StoredCard) => void;
  'drag-end': (card: StoredCard, success: boolean) => void;
  'storage-full': () => void; // 新增：容量已满事件
}
```

### useFloatingPanel Composable Return (Extended)

```typescript
interface UseFloatingPanelReturn {
  // 状态
  storedCards: ComputedRef<StoredCard[]>;
  isPanelVisible: ComputedRef<boolean>;
  storedCardsCount: ComputedRef<number>;
  isDraggingFromStorage: ComputedRef<boolean>;
  isFull: ComputedRef<boolean>; // 新增：是否已满
  canAcceptDrop: ComputedRef<boolean>; // 新增：是否可以接受拖放
  
  // 方法
  addToStorage: (card: BentoCard) => { success: boolean; reason?: string }; // 修改：返回结果
  removeFromStorage: (cardId: string) => BentoCard | null;
  clearStorage: () => void;
  togglePanelVisibility: () => void;
  startDragFromStorage: (card: StoredCard, event: MouseEvent | TouchEvent) => void;
  endDragFromStorage: (success: boolean) => void;
  checkCapacity: () => boolean; // 新增：检查容量
}
```

### useDragAndDrop Composable Return (Extended)

```typescript
interface UseDragAndDropReturn {
  // 状态
  draggedCard: Ref<BentoCard | null>;
  dragSource: Ref<'grid' | 'storage' | null>;
  isDragging: Ref<boolean>;
  isDragOverStorage: Ref<boolean>; // 新增：是否悬停在暂存区
  dropRect: Ref<DropRect | null>;
  
  // 方法
  startDrag: (card: BentoCard, event: MouseEvent | TouchEvent, source?: 'grid' | 'storage') => void;
  endDrag: () => void;
  updateDrag: (event: MouseEvent | TouchEvent, ...) => void;
  setDragOverStorage: (value: boolean) => void; // 新增：设置悬停状态
}
```

## Data Flow

### 卡片暂存流程（从网格到暂存区）
```
Grid Card (dragging) 
  → drag over storage area 
  → checkCapacity() 
  → if canAcceptDrop: addToStorage() → storedCards[] → update badge count
  → if !canAcceptDrop: reject drop → visual feedback (red/flash) → return to grid
```

### 卡片恢复流程（点击）
```
StoredCard → restoreCard() → emit('restore-card') → Grid.addCard()
  → removeFromStorage() → update badge count
```

### 卡片恢复流程（拖放）
```
StoredCard → startDragFromStorage() → useDragAndDrop.startDrag('storage')
  → drag over grid → drop → Grid.addCard() 
  → endDragFromStorage(true) → removeFromStorage() → update badge count
```

### 拖放取消流程
```
Dragging → drop outside valid area 
  → endDrag() / endDragFromStorage(false) 
  → card returns to origin (grid or storage)
```

### 容量已满处理流程
```
Grid Card (dragging) → drag over storage (isFull = true)
  → setDragOverStorage(true) → visual feedback (red/flash)
  → drop attempt → addToStorage() returns { success: false }
  → reject drop → return card to grid position
```

### 串行拖放处理流程
```
Dragging (isDragging = true) 
  → new drag attempt → check isDragging 
  → if true: block/ignore new drag
  → current drag completes → isDragging = false
  → allow next drag operation
```

## Constraints

1. **容量约束**: 暂存区最多容纳 10 张卡片，超过时拒绝新的暂存请求
2. **唯一性约束**: 暂存卡片 ID 必须唯一，不能重复暂存同一卡片
3. **串行约束**: 一次只允许一个拖放操作，`isDragging` 为 true 时阻止新操作
4. **状态一致性**: 拖放状态必须与 UI 状态保持一致
5. **响应式约束**: 所有状态变更必须通过响应式 API（ref/computed）进行
6. **性能约束**: 
   - 角标更新必须在 100ms 内完成（SC-001）
   - 视觉反馈必须在 50ms 内显示（SC-004）
   - 拖放操作必须在 2 秒内完成（SC-002）

## Validation Functions

### addToStorage Validation
```typescript
function validateAddToStorage(card: BentoCard, currentCount: number): { valid: boolean; reason?: string } {
  if (currentCount >= 10) {
    return { valid: false, reason: 'Storage capacity limit reached' };
  }
  if (storedCards.some(c => c.id === card.id)) {
    return { valid: false, reason: 'Card already in storage' };
  }
  return { valid: true };
}
```

### Drag Operation Validation
```typescript
function validateDragStart(isDragging: boolean): { valid: boolean; reason?: string } {
  if (isDragging) {
    return { valid: false, reason: 'Another drag operation in progress' };
  }
  return { valid: true };
}
```


