# Quick Start: 改进 FloatingPanel

**Feature**: 001-improve-floating-panel  
**Date**: 2025-12-09

## 概述

本文档提供快速开始实施 FloatingPanel 改进功能的指南。

## 实施步骤

### 1. 准备工作

确保你已了解：
- Vue 3 Composition API
- TypeScript 基础
- 现有拖放系统（`useDragAndDrop.ts`）
- FloatingPanel 组件结构

### 2. 尺寸优化实施

#### 2.1 修改 FloatingPanel.vue 样式

```css
/* 优化前 */
.floating-panel {
  min-width: 480px;
  padding: 12px;
  gap: 12px;
}

/* 优化后 */
.floating-panel {
  min-width: 320px;  /* 减少 33% */
  padding: 8px;      /* 减少 33% */
  gap: 8px;          /* 减少 33% */
}
```

#### 2.2 优化卡片预览尺寸

```css
.floating-panel__stored-card {
  min-width: 48px;   /* 从 60px 减少 */
  max-width: 72px;   /* 从 90px 减少 */
  padding: 4px 6px;  /* 从 6px 8px 减少 */
}
```

### 3. 拖放功能实施

#### 3.1 扩展 useFloatingPanel composable

在 `useFloatingPanel.ts` 中添加拖放相关方法：

```typescript
import { useDragAndDrop } from '@/composables/useDragAndDrop';

export const useFloatingPanel = () => {
  const { startDrag, endDrag } = useDragAndDrop();
  
  const startDragFromStorage = (card: StoredCard) => {
    // 检查面板是否折叠
    if (isCollapsed.value) return;
    
    // 调用现有拖放系统
    startDrag(card, event);
  };
  
  const endDragFromStorage = (success: boolean) => {
    if (success) {
      // 从暂存区域移除
      removeFromStorage(draggedCard.value?.id);
    }
    endDrag();
  };
  
  return {
    // ... existing methods
    startDragFromStorage,
    endDragFromStorage,
  };
};
```

#### 3.2 在 FloatingPanel.vue 中添加拖放事件

```vue
<template>
  <div
    v-for="card in storedCards"
    :key="card.id"
    class="floating-panel__stored-card"
    draggable="true"
    @dragstart="handleDragStart(card, $event)"
    @click="restoreCard(card)"
  >
    <!-- card content -->
  </div>
</template>

<script setup lang="ts">
const handleDragStart = (card: StoredCard, event: DragEvent) => {
  if (isCollapsed.value) {
    event.preventDefault();
    return;
  }
  
  startDragFromStorage(card);
  emit('drag-start', card);
};
</script>
```

#### 3.3 处理网格拖放事件

在 `BentoGrid.vue` 中扩展拖放处理，支持从暂存区域来的卡片：

```typescript
const handleDrop = (e: DragEvent) => {
  // 检查是否来自暂存区域
  if (isDraggingFromStorage.value) {
    // 处理暂存卡片放置
    const card = draggedStorageCard.value;
    if (card && dropRect.value) {
      // 使用现有避让逻辑
      const plan = plugins.dispatch('onBeforeDrop', ctx);
      if (plan && !plan.shadowPosition) {
        // 成功放置
        addCard(card);
        emit('card-restored', card);
      }
    }
  }
  // ... existing grid drag handling
};
```

### 4. 冲突处理实施

复用现有的避让系统：

```typescript
// 在拖放更新时
const plan = plugins.dispatch('onDragUpdate', {
  // ... existing context
  draggedCard: draggedStorageCard.value,
  dragSource: 'storage',
});

if (plan && plan.moves && plan.moves.length > 0) {
  // 应用避让移动
  applyAnimations(plan);
} else if (plan && plan.shadowPosition) {
  // 无法避让，返回暂存区域
  endDragFromStorage(false);
}
```

### 5. 交互处理实施

处理拖放过程中的按钮点击：

```typescript
// 在 FloatingPanel.vue 中
const handleButtonClick = (action: string) => {
  if (isDragging.value) {
    // 取消拖放
    endDragFromStorage(false);
  }
  
  // 执行操作
  if (action === 'add-card') {
    emit('add-card', type);
  } else if (action === 'collapse') {
    toggleCollapse();
  }
};
```

## 测试检查点

1. ✅ 面板尺寸减少至少 30%
2. ✅ 所有功能按钮仍然可用
3. ✅ 暂存卡片可以拖动
4. ✅ 拖放到网格成功
5. ✅ 冲突时自动避让
6. ✅ 折叠状态下拖放被禁用
7. ✅ 拖放过程中点击按钮取消拖放

## 性能验证

- 拖放视觉反馈 < 50ms
- 拖放操作完成 < 2 秒
- 60fps 流畅动画

## 下一步

完成实施后，运行 `/speckit.tasks` 创建详细任务列表进行跟踪。


