# Quick Start: 完善暂存区功能

**Feature**: 002-staging-area-improvements  
**Date**: 2025-12-09

## 概述

本文档提供快速开始实施暂存区功能完善的指南。主要任务包括：1) 修复和优化数字角标显示；2) 实现从网格到暂存区的完整拖放功能；3) 优化从暂存区到网格的拖放体验。

## 实施步骤

### 1. 准备工作

确保你已了解：
- Vue 3 Composition API
- TypeScript 基础
- 现有拖放系统（`useDragAndDrop.ts`）
- FloatingPanel 组件结构（`FloatingPanel.vue`）
- 暂存区状态管理（`useFloatingPanel.ts`）

### 2. 修复和优化数字角标

#### 2.1 检查现有角标实现

在 `FloatingPanel.vue` 第 20 行，角标已部分实现：
```vue
<span v-if="storedCardsCount > 0" class="floating-panel__count-badge">{{ storedCardsCount }}</span>
```

#### 2.2 确保角标正确更新

确保 `storedCardsCount` 是响应式的 computed：
```typescript
// 在 useFloatingPanel.ts 中
const storedCardsCount = computed(() => globalStoredCards.value.length);
```

#### 2.3 优化角标样式（如需要）

```css
.floating-panel__count-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  z-index: 10; /* 确保在最上层 */
}
```

### 3. 实现容量限制

#### 3.1 扩展 useFloatingPanel composable

在 `useFloatingPanel.ts` 中添加容量检查和相关状态：

```typescript
const CAPACITY_LIMIT = 10;

const isFull = computed(() => globalStoredCards.value.length >= CAPACITY_LIMIT);
const canAcceptDrop = computed(() => !isFull.value);

const addToStorage = (card: BentoCard): StorageOperationResult => {
  // 检查容量
  if (isFull.value) {
    return { success: false, reason: 'Storage capacity limit reached' };
  }
  
  // 检查是否已存在
  if (globalStoredCards.value.some(c => c.id === card.id)) {
    return { success: false, reason: 'Card already in storage' };
  }
  
  const storedCard: StoredCard = {
    ...card,
    storedAt: Date.now()
  };
  globalStoredCards.value.push(storedCard);
  
  return { success: true };
};

const checkCapacity = () => {
  return !isFull.value;
};

const getCapacityStatus = (): StorageCapacityStatus => {
  return {
    current: globalStoredCards.value.length,
    limit: CAPACITY_LIMIT,
    isFull: isFull.value,
    canAccept: canAcceptDrop.value
  };
};
```

#### 3.2 更新返回值

```typescript
return {
  // ... existing returns
  isFull,
  canAcceptDrop,
  addToStorage, // 现在返回 StorageOperationResult
  checkCapacity,
  getCapacityStatus,
};
```

### 4. 实现从网格到暂存区的拖放

#### 4.1 在 FloatingPanel.vue 中添加拖放事件处理

```vue
<template>
  <div 
    class="floating-panel__storage"
    @mouseenter="isStorageExpanded = true"
    @mouseleave="handleStorageMouseLeave"
  >
    <!-- 图标触发位置 -->
    <div 
      class="floating-panel__storage-trigger"
      :class="{ 
        'floating-panel__storage-trigger--drag-over': isDragOverStorage,
        'floating-panel__storage-trigger--full': isFull && isDragOverStorage
      }"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDropFromGrid"
    >
      <!-- 图标和角标 -->
    </div>
    
    <!-- 展开的卡片列表 -->
    <div 
      class="floating-panel__storage-expanded"
      :class="{ 'floating-panel__storage-expanded--visible': isStorageExpanded || isDragOverStorage }"
      @dragover.prevent="handleDragOver"
      @dragenter.prevent="handleDragEnter"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDropFromGrid"
    >
      <!-- 提示文本 -->
      <div v-if="isDragOverStorage && !isFull" class="floating-panel__drop-hint">
        释放以暂存
      </div>
      <div v-else-if="isDragOverStorage && isFull" class="floating-panel__drop-hint floating-panel__drop-hint--error">
        暂存区已满（最多 10 张）
      </div>
      <!-- 卡片列表 -->
    </div>
  </div>
</template>

<script setup lang="ts">
const isDragOverStorage = ref(false);

const handleDragEnter = (e: DragEvent) => {
  isDragOverStorage.value = true;
  isStorageExpanded.value = true;
  
  // 设置拖放效果
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = canAcceptDrop.value ? 'move' : 'none';
  }
  
  // 更新拖放状态
  setDragOverStorage(true);
};

const handleDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = canAcceptDrop.value ? 'move' : 'none';
  }
};

const handleDragLeave = (e: DragEvent) => {
  // 检查是否真的离开了暂存区（不是进入子元素）
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
    isDragOverStorage.value = false;
    setDragOverStorage(false);
  }
};

const handleDropFromGrid = (e: DragEvent) => {
  isDragOverStorage.value = false;
  setDragOverStorage(false);
  
  // 获取拖动的卡片（从全局拖放状态）
  const card = draggedCard.value;
  if (!card || dragSource.value !== 'grid') {
    return;
  }
  
  // 尝试添加到暂存区
  const result = addToStorage(card);
  if (result.success) {
    // 从网格移除卡片
    emit('remove-card-from-grid', card.id);
    // 结束拖放
    endDrag();
  } else {
    // 容量已满，提供视觉反馈
    // 卡片会自动返回网格（由拖放系统处理）
    endDrag();
  }
};

const handleStorageMouseLeave = () => {
  // 只有在没有拖放时才收起
  if (!isDragOverStorage.value) {
    isStorageExpanded.value = false;
  }
};
</script>
```

#### 4.2 在 BentoGrid.vue 中处理卡片移除

```typescript
// 在 BentoGrid.vue 中
const handleCardStore = (card: BentoCardType) => {
  // 移除卡片
  removeCard(card.id);
  // 通知父组件
  emit('store-card', card);
};
```

### 5. 优化视觉反馈

#### 5.1 添加 CSS 样式

```css
/* 拖放悬停状态 */
.floating-panel__storage-trigger--drag-over {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: scale(1.05);
}

/* 容量已满状态 */
.floating-panel__storage-trigger--full {
  background: #fef2f2;
  border-color: #ef4444;
  animation: flash 0.5s ease-in-out;
}

@keyframes flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 提示文本 */
.floating-panel__drop-hint {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

.floating-panel__drop-hint--error {
  background: #ef4444;
}

/* 鼠标样式 */
.floating-panel__storage--drag-over {
  cursor: move;
}
```

#### 5.2 更新鼠标样式

```typescript
// 在拖放悬停时
document.body.style.cursor = canAcceptDrop.value ? 'move' : 'not-allowed';
```

### 6. 实现串行拖放处理

#### 6.1 在 useDragAndDrop.ts 中检查

```typescript
const startDrag = (card: BentoCard, event: MouseEvent | TouchEvent, source: 'grid' | 'storage' = 'grid') => {
  // 检查是否已有拖放操作
  if (isDragging.value) {
    console.warn('[DND] Another drag operation in progress, ignoring');
    return;
  }
  
  // 设置拖放状态
  isDragging.value = true;
  draggedCard.value = card;
  dragSource.value = source;
  // ... rest of implementation
};
```

### 7. 优化从暂存区到网格的拖放

#### 7.1 确保视觉反馈清晰

在 `FloatingPanel.vue` 中，被拖动的卡片应显示半透明：

```vue
<div
  class="floating-panel__stored-card"
  :class="{ 
    'floating-panel__stored-card--dragging': isDraggingFromStorage && draggedCard?.id === card.id 
  }"
>
```

```css
.floating-panel__stored-card--dragging {
  opacity: 0.5;
  cursor: grabbing;
  pointer-events: none;
}
```

## 测试检查点

1. ✅ 角标正确显示暂存卡片数量
2. ✅ 角标在添加/移除卡片时立即更新（< 100ms）
3. ✅ 角标在数量为 0 时隐藏
4. ✅ 从网格拖放到暂存区成功
5. ✅ 容量已满时拒绝拖放并显示反馈
6. ✅ 视觉反馈在 50ms 内显示
7. ✅ 串行处理：一次只允许一个拖放操作
8. ✅ 从暂存区拖放到网格流畅
9. ✅ 图标和展开列表都接受拖放

## 性能验证

- 角标更新 < 100ms (SC-001)
- 视觉反馈 < 50ms (SC-004)
- 拖放操作完成 < 2 秒 (SC-002)
- 展开动画 < 200ms (SC-003)

## 下一步

完成实施后，运行 `/speckit.tasks` 创建详细任务列表进行跟踪。

