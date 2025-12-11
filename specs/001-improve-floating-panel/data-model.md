# Data Model: 改进 FloatingPanel

**Date**: 2025-12-09  
**Feature**: 001-improve-floating-panel

## Entities

### StoredCard

**Description**: 表示暂存在 FloatingPanel 中的卡片

**Fields**:
- `id: string` - 卡片唯一标识符
- `type: string` - 卡片类型（text, image, link, video, etc.）
- `title?: string` - 卡片标题（可选）
- `position: { x: number, y: number }` - 卡片在网格中的位置（暂存时保留）
- `units?: { w: number, h: number }` - 卡片尺寸单位
- `size?: 'small' | 'medium' | 'large' | 'wide'` - 卡片尺寸预设
- `storedAt: number` - 暂存时间戳（毫秒）

**Relationships**:
- 属于 FloatingPanel 的暂存集合
- 可以恢复到 BentoGrid 中

**State Transitions**:
1. Grid Card → StoredCard (用户将卡片拖入暂存区域)
2. StoredCard → Grid Card (用户将卡片拖回网格或点击恢复)

**Validation Rules**:
- `id` 必须唯一
- `storedAt` 必须为正数时间戳
- `position` 必须包含有效的 x, y 坐标

### DragState (Extended)

**Description**: 扩展现有的拖放状态，支持从暂存区域启动的拖放操作

**Fields** (继承自现有 DragState):
- `draggedCard: BentoCard | StoredCard | null` - 当前拖动的卡片（可能是网格卡片或暂存卡片）
- `dragSource: 'grid' | 'storage' | null` - 拖放来源标识
- `dropTarget: { x: number, y: number } | null` - 目标放置位置
- `isDragging: boolean` - 是否正在拖动
- `dropRect: { left: number, top: number, width: number, height: number } | null` - 拖放预览矩形

**New Fields**:
- `storageDragOrigin?: string` - 暂存卡片的原始 ID（用于恢复）

**State Transitions**:
1. Idle → Dragging (startDrag called)
2. Dragging → Dropped (endDrag called, card moved to grid)
3. Dragging → Cancelled (endDrag called, card returned to storage)

**Validation Rules**:
- `dragSource` 必须与 `draggedCard` 的来源一致
- `dropTarget` 必须在网格有效范围内

### FloatingPanelState

**Description**: FloatingPanel 组件的内部状态

**Fields**:
- `isPanelVisible: boolean` - 面板是否可见
- `isCollapsed: boolean` - 面板是否折叠
- `storedCards: StoredCard[]` - 暂存的卡片列表
- `isDraggingFromStorage: boolean` - 是否正在从暂存区域拖动卡片

**State Transitions**:
1. Expanded → Collapsed (用户点击折叠按钮)
2. Collapsed → Expanded (用户点击展开按钮)
3. Dragging → Idle (拖放完成或取消)

**Validation Rules**:
- `storedCards` 数组中的卡片 ID 必须唯一
- 折叠状态下不能启动拖放操作

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
}
```

### useFloatingPanel Composable Return

```typescript
interface UseFloatingPanelReturn {
  storedCards: ComputedRef<StoredCard[]>;
  isPanelVisible: ComputedRef<boolean>;
  storedCardsCount: ComputedRef<number>;
  addToStorage: (card: BentoCard) => void;
  removeFromStorage: (cardId: string) => BentoCard | null;
  clearStorage: () => void;
  togglePanelVisibility: () => void;
  startDragFromStorage: (card: StoredCard) => void;
  endDragFromStorage: (success: boolean) => void;
}
```

## Data Flow

### 卡片暂存流程
```
Grid Card → handleStoreCard → addToStorage → storedCards[]
```

### 卡片恢复流程（点击）
```
StoredCard → restoreCard → emit('restore-card') → Grid.addCard()
```

### 卡片恢复流程（拖放）
```
StoredCard → startDragFromStorage → useDragAndDrop.startDrag()
  → drag over grid → drop → endDrag → removeFromStorage → Grid.addCard()
```

### 拖放取消流程
```
Dragging → click other button → endDragFromStorage(false) → card stays in storage
```

## Constraints

1. **唯一性约束**: 暂存卡片 ID 必须唯一，不能重复暂存同一卡片
2. **状态一致性**: 拖放状态必须与 UI 状态保持一致
3. **响应式约束**: 所有状态变更必须通过响应式 API（ref/computed）进行
4. **性能约束**: 拖放操作必须在 50ms 内显示视觉反馈


