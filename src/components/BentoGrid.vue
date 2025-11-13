<template>
  <div class="bento-grid" :style="gridStyles" ref="gridEl" @dragover.prevent="handleDragOver" @dragenter.prevent="handleDragEnter" @drop.prevent="handleDrop" :data-layout="layout">
    <!-- 新的基于行的结构 -->
    <div
      v-if="layout !== 'position' && grid.rows && grid.rows.length > 0"
      v-for="row in grid.rows"
      :key="row.id"
      class="bento-grid__row"
      :data-row-id="row.id"
      :data-row-index="row.index"
      :style="{
        '--grid-columns': grid.columns,
        '--grid-gap': `${grid.gap}px`
      }"
    >
      <BentoCard
        v-for="(card, cardIndex) in row.cards"
        :key="card.id"
        :card="card"
        :is-dragging="draggedCard?.id === card.id"
        @update="handleCardUpdate"
        @remove="handleCardRemove"
        @drag-start="handleDragStart"
        class="bento-grid__card"
        :style="[getCardStyles(card), getDragStyles(card, grid.unit ?? 36, grid.gap)]"
        :data-id="card.id"
        :data-row-index="row.index"
        :data-card-index="cardIndex"
      >
        <slot name="card" :card="card" />
      </BentoCard>
      
      <!-- 空行的占位符 -->
      <div v-if="row.cards.length === 0" class="bento-grid__row-placeholder">
        <span>空行 {{ row.index }}</span>
      </div>
    </div>
    
    <!-- 回退到旧的卡片列表结构 -->
    <template v-else>
      <BentoCard
        v-for="card in grid.cards"
        :key="card.id"
        :card="card"
        :is-dragging="draggedCard?.id === card.id"
        @update="handleCardUpdate"
        @remove="handleCardRemove"
        @drag-start="handleDragStart"
        class="bento-grid__card"
        :style="[getCardStyles(card), getDragStyles(card, grid.unit ?? 36, grid.gap)]"
        :data-id="card.id"
      >
        <slot name="card" :card="card" />
      </BentoCard>
    </template>
    
    <!-- 拖拽目标阴影 -->
    <div
      v-if="isDragging && dropRect"
      class="bento-grid__drop-target"
      :style="getDropTargetStyles(grid.columns, grid.gap, grid.unit ?? 36)"
    />
    
    <!-- 原始位置幽灵 -->
    <div
      v-if="isDragging && draggedCard"
      class="bento-grid__origin-ghost"
      :style="getOriginGhostStyles()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import { useBentoAnimations } from '@/composables/useBentoAnimations';
import BentoCard from './BentoCard.vue';
import type { BentoCard as BentoCardType, BentoGridRow } from '@/types/bento';

const { 
  grid, 
  isDragging, 
  draggedCard, 
  addCard, 
  removeCard, 
  updateCard, 
  startDrag, 
  moveCard, 
  getGridStyles, 
  getCardStyles, 
  layout, 
  reorderCardByIndex, 
  saveLayout, 
  loadLayout, 
  setViewportGridBounds, 
  expandRowsForBottom,
  moveCardToRow,
  addRow,
  initializeRows
} = useBentoGrid();

const { 
  updateDrag, 
  endDrag, 
  getDropTargetStyles, 
  findValidPosition, 
  getDragStyles, 
  draggedCard: dragDropCard, 
  dropTarget, 
  dropIndex, 
  dropRect, 
  dragState,
  getOriginGhostStyles, 
  startDrag: startDragDnd 
} = useDragAndDrop();

const { getCardAnimationStyles, createIntersectionObserver } = useBentoAnimations();

// Expose addCard method for parent components
defineExpose({
  addCard,
  saveLayout,
  loadLayout,
  reorderCardByIndex
});

interface Props {
  columns?: number;
  gap?: number;
  unit?: number;
  breakpoints?: { mobile: number; tablet: number; desktop: number };
  virtualized?: boolean;
  layout?: 'flex' | 'grid' | 'position';
  storageKey?: string;
}

const props = defineProps<Props>();

const placeholderStyles = ref({});
const gridEl = ref<HTMLElement | null>(null);

const gridStyles = computed(() => ({
  ...getGridStyles.value,
  position: 'relative',
  minHeight: '80vh'
})) as any;

const handleCardUpdate = (cardId: string, updates: Partial<BentoCardType>) => {
  updateCard(cardId, updates);
};

const handleCardRemove = (cardId: string) => {
  removeCard(cardId);
};

const handleDragStart = (card: BentoCardType, event: MouseEvent | TouchEvent) => {
  console.log('[DND] Starting drag for card:', card.id, 'interactive:', card.interactive);
  
  // 检查卡片是否可交互
  if (!card.interactive) {
    console.log('[DND] Card is not interactive, ignoring drag');
    return;
  }
  
  // 设置拖拽状态
  const before = { gridDragging: isDragging.value, gridDraggedId: draggedCard.value?.id, dndDraggedId: dragDropCard.value?.id };
  startDrag(card, event);
  startDragDnd(card, event as any);
  const after = { gridDragging: isDragging.value, gridDraggedId: draggedCard.value?.id, dndDraggedId: dragDropCard.value?.id };
  console.log('[DND] grid handleDragStart', { cardId: card.id, before, after });
  
  if (!isDragging.value) {
    console.error('[DND] Failed to start drag - isDragging is false');
    return;
  }
  
  setViewportGridBounds(gridEl.value);
  
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !draggedCard.value) {
      console.log('[DND] Mouse move ignored - not dragging or no dragged card');
      return;
    }
    
    console.log('[DND] Processing mouse move');
    
    // 使用新的基于行的拖拽更新
    updateDrag(e, grid.value.columns, grid.value.gap, grid.value.unit ?? 36, grid.value.rows, gridEl.value!);
    
    // 扩展网格高度
    if (dropRect.value) {
      const bottom = dropRect.value.top + dropRect.value.height;
      expandRowsForBottom(bottom);
    }
    
    console.log('[DND] grid mousemove', { 
      draggedId: draggedCard.value?.id, 
      dropIndex: dropIndex.value, 
      dropRect: dropRect.value,
      dragState: dragState.value 
    });
  };
  
  const handleMouseUp = () => {
    console.log('[DND] Mouse up detected');
    
    if (!draggedCard.value) {
      console.log('[DND] No dragged card, cleaning up');
      endDrag();
      setTimeout(() => {
        isDragging.value = false;
        draggedCard.value = null;
        placeholderStyles.value = {};
      }, 300);
      return;
    }
    
    endDrag();
    if (layout.value === 'position' && draggedCard.value && dropRect.value && gridEl.value) {
      const unit = grid.value.unit ?? 36;
      const gap = grid.value.gap;
      const cell = unit + gap;
      const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
      const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
      moveCard(draggedCard.value.id, { x: gridX, y: gridY });
      saveLayout(props.storageKey);
    }
    
    // 使用新的基于行的放置逻辑
    if (draggedCard.value && dragState.value) {
      const { targetRowIndex, targetCardIndex } = dragState.value;
      
      console.log('[DND] Attempting to place card:', {
        cardId: draggedCard.value.id,
        targetRowIndex,
        targetCardIndex
      });
      
      // 确保目标行存在
      if (targetRowIndex !== undefined) {
        let targetRow = grid.value.rows?.find(r => r.index === targetRowIndex);
        if (!targetRow && dragState.value?.dropRow === undefined) {
          // 创建新行
          console.log('[DND] Creating new row at index:', targetRowIndex);
          targetRow = addRow(targetRowIndex);
        }
        
        // 移动卡片到新行
        console.log('[DND] Moving card to row:', targetRowIndex, 'at position:', targetCardIndex);
        moveCardToRow(draggedCard.value.id, targetRowIndex, targetCardIndex);
      }
      
      saveLayout(props.storageKey);
    } else {
      console.log('[DND] No valid drag state, card will return to original position');
    }
    
    console.log('[DND] grid mouseup completed', { 
      draggedId: draggedCard.value?.id, 
      dragState: dragState.value 
    });
    setTimeout(() => {
      isDragging.value = false;
      draggedCard.value = null;
      placeholderStyles.value = {};
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    }, 300);
  };
  
  // 添加事件监听器
  console.log('[DND] Adding event listeners for drag operation');
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp, { passive: true });
  document.addEventListener('touchmove', handleMouseMove, { passive: true });
  document.addEventListener('touchend', handleMouseUp, { passive: true });
};

const handleDragOver = (e: DragEvent) => {
  if (!isDragging.value) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  updateDrag(e as unknown as MouseEvent, grid.value.columns, grid.value.gap, grid.value.unit ?? 36, grid.value.rows, gridEl.value!);
  if (dropRect.value) {
    const bottom = dropRect.value.top + dropRect.value.height;
    expandRowsForBottom(bottom);
  }
  console.log('[DND] grid dragover', { draggedId: draggedCard.value?.id, dropIndex: dropIndex.value, dropRect: dropRect.value });
};

const handleDragEnter = (e: DragEvent) => {
  if (!isDragging.value) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  updateDrag(e as unknown as MouseEvent, grid.value.columns, grid.value.gap, grid.value.unit ?? 36, grid.value.rows, gridEl.value!);
  console.log('[DND] grid dragenter', { draggedId: draggedCard.value?.id });
};

const handleDrop = (e: DragEvent) => {
  if (!draggedCard.value) return;
  
  // 使用新的基于行的放置逻辑
  if (dragState.value) {
    const { targetRowIndex, targetCardIndex } = dragState.value;
    
    if (targetRowIndex !== undefined) {
      let targetRow = grid.value.rows?.find(r => r.index === targetRowIndex);
      if (!targetRow && dragState.value?.dropRow === undefined) {
        targetRow = addRow(targetRowIndex);
      }
      
      moveCardToRow(draggedCard.value.id, targetRowIndex, targetCardIndex);
    }
    
    saveLayout(props.storageKey);
  }
  if (layout.value === 'position' && dropRect.value && draggedCard.value && gridEl.value) {
    const unit = grid.value.unit ?? 36;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
    moveCard(draggedCard.value.id, { x: gridX, y: gridY });
    saveLayout(props.storageKey);
  }
  
  console.log('[DND] grid drop', { draggedId: draggedCard.value.id, dragState: dragState.value });
  endDrag();
  setTimeout(() => {
    isDragging.value = false;
    draggedCard.value = null;
  }, 300);
};

// Initialize with some demo cards
onMounted(() => {
  // 初始化行结构
  if (grid.value.rows && grid.value.rows.length === 0 && grid.value.cards.length > 0) {
    initializeRows();
  }
  
  const resize = () => {
    const el = gridEl.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const unit = grid.value.unit ?? 36;
    const gap = grid.value.gap;
    const cols = Math.max(1, Math.floor((rect.width + gap) / (unit + gap)));
    grid.value.columns = cols;
  };
  const ro = new ResizeObserver(resize);
  if (gridEl.value) ro.observe(gridEl.value);
  resize();
  (grid as any)._ro = ro;
  if (props.columns) grid.value.columns = props.columns;
  if (props.gap !== undefined) grid.value.gap = props.gap!;
  if (props.unit !== undefined) grid.value.unit = props.unit!;
  if (props.layout) layout.value = props.layout;
  setViewportGridBounds(gridEl.value);
  loadLayout(props.storageKey);
});

onUnmounted(() => {
  const ro = (grid as any)._ro as ResizeObserver | undefined;
  if (ro && gridEl.value) ro.unobserve(gridEl.value);
});
</script>

<style scoped>
.bento-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 40px;
}

/* 无感知的行设计 - 完全移除视觉效果 */
.bento-grid__row {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 12), 1fr);
  gap: var(--grid-gap, 20px);
  grid-auto-flow: row dense;
  align-items: start;
  justify-items: start;
  width: 100%;
  min-height: auto;
  padding: 0;
  position: relative;
}

.bento-grid__row-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 400;
  border: 1px dashed #e5e7eb;
  border-radius: 16px;
  margin: 0;
  grid-column: 1 / -1;
  background: #ffffff;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bento-grid__row-placeholder:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #6b7280;
}

.bento-grid__card { 
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-grid__card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}

.bento-grid__drag-placeholder {
  pointer-events: none;
  z-index: 999;
  transition: none;
  animation: dragPulse 1s infinite;
}

.bento-grid__drop-target {
  pointer-events: none;
  z-index: 998;
  animation: dropTargetPulse 1s infinite;
}

.bento-grid__origin-ghost {
  pointer-events: none;
  z-index: 500;
}

@keyframes dragPulse {
  0%, 100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

@keyframes dropTargetPulse {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

/* Responsive design - 保持简洁风格 */
@media (max-width: 1024px) {
  .bento-grid {
    gap: 18px;
    padding: 40px 32px;
    max-width: 960px;
  }
  
  .bento-grid__row {
    gap: 18px;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    gap: 16px;
    padding: 32px 24px;
    max-width: 100%;
  }
  
  .bento-grid__row {
    gap: 16px;
  }
  
  .bento-grid__row-placeholder {
    min-height: 100px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .bento-grid {
    gap: 12px;
    padding: 24px 16px;
  }
  
  .bento-grid__row {
    gap: 12px;
  }
  
  .bento-grid__row-placeholder {
    min-height: 80px;
    font-size: 12px;
  }
}

/* Touch device optimizations - 保持简洁 */
@media (hover: none) and (pointer: coarse) {
  .bento-grid__card {
    transition: transform 0.15s ease;
  }
  
  .bento-grid__card:active {
    transform: scale(0.98);
  }
}

/* High DPI displays - 保持简洁 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .bento-grid {
    gap: 20px;
    padding: 48px 40px;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .bento-grid__card,
  .bento-grid__drag-placeholder,
  .bento-grid__drop-target {
    animation: none !important;
    transition: none !important;
  }
}
</style>
