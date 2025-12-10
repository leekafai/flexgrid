<template>
  <div 
    v-if="isPanelVisible" 
    class="floating-panel"
    :class="{ 'floating-panel--collapsed': isCollapsed }"
  >
    <div class="floating-panel__content">
      <!-- 暂存区域 - 图标触发，悬停展开 -->
      <div 
        class="floating-panel__storage"
        @mouseenter="isStorageExpanded = true"
        @mouseleave="isStorageExpanded = false"
      >
        <!-- 图标触发位置 -->
        <div class="floating-panel__storage-trigger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M9 9h6M9 15h6M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span v-if="storedCardsCount > 0" class="floating-panel__count-badge">{{ storedCardsCount }}</span>
        </div>
        
        <!-- 展开的卡片列表 -->
        <div 
          class="floating-panel__storage-expanded"
          :class="{ 'floating-panel__storage-expanded--visible': isStorageExpanded }"
        >
          <div class="floating-panel__storage-header">
            <span class="floating-panel__title-small">暂存 ({{ storedCardsCount }})</span>
          </div>
          <div class="floating-panel__storage-cards">
            <div
              v-for="card in storedCards"
              :key="card.id"
              class="floating-panel__stored-card"
              :class="{ 'floating-panel__stored-card--dragging': isDraggingFromStorage && draggedCard?.id === card.id }"
              draggable="true"
              @dragstart="handleDragStart(card, $event)"
              @dragend="handleDragEnd(card, false)"
              @click="restoreCard(card)"
              :title="`恢复 ${card.title || card.type}`"
            >
              <div class="floating-panel__card-preview">
                <div class="floating-panel__card-type">{{ card.type }}</div>
                <div class="floating-panel__card-title">{{ card.title || '无标题' }}</div>
              </div>
              <button
                class="floating-panel__remove-stored"
                @click.stop="removeStoredCard(card.id)"
                title="删除"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
            <div v-if="storedCards.length === 0" class="floating-panel__empty">
              暂无收纳的卡片
            </div>
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="floating-panel__divider"></div>

      <!-- 添加卡片区域 -->
      <div class="floating-panel__add-section">
        <div class="floating-panel__add-grid">
          <button
            class="floating-panel__add-btn"
            @click="handleAddCard('text')"
            title="添加文本卡片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="handleAddCard('link')"
            title="添加链接卡片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="handleAddCard('image')"
            title="添加图片卡片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
              <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="handleAddCard('video')"
            title="添加视频卡片"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="5,3 19,12 5,21" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 折叠按钮 -->
    <button
      class="floating-panel__toggle"
      @click="toggleCollapse"
      :title="isCollapsed ? '展开面板' : '折叠面板'"
    >
      <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none"
        :class="{ 'rotate-180': isCollapsed }"
      >
        <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useFloatingPanel } from '@/composables/useFloatingPanel';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import type { BentoCard } from '@/types/bento';
import type { StoredCard } from '@/composables/useFloatingPanel';

onMounted(() => {
  // 组件挂载完成
});

const emit = defineEmits<{
  'restore-card': [card: BentoCard];
  'remove-stored-card': [cardId: string];
  'add-card': [type: string];
  'drag-start': [card: StoredCard];
  'drag-end': [card: StoredCard, success: boolean];
}>();

const { 
  storedCards, 
  isPanelVisible, 
  removeFromStorage, 
  storedCardsCount,
  startDragFromStorage,
  endDragFromStorage,
  isDraggingFromStorage
} = useFloatingPanel();

const { draggedCard, updateDrag } = useDragAndDrop();
const isCollapsed = ref(false);
const isStorageExpanded = ref(false);

const restoreCard = (card: BentoCard) => {
  // 如果正在拖放，取消拖放
  if (isDraggingFromStorage.value) {
    endDragFromStorage(false);
    return;
  }
  console.log('恢复卡片:', card.id, card.title);
  emit('restore-card', card);
};

const removeStoredCard = (cardId: string) => {
  // 如果正在拖放，取消拖放
  if (isDraggingFromStorage.value) {
    endDragFromStorage(false);
    return;
  }
  removeFromStorage(cardId);
  emit('remove-stored-card', cardId);
};

const toggleCollapse = () => {
  // 如果正在拖放，取消拖放
  if (isDraggingFromStorage.value) {
    endDragFromStorage(false);
  }
  isCollapsed.value = !isCollapsed.value;
  console.log('面板折叠状态:', isCollapsed.value);
};

const handleAddCard = (type: string) => {
  // 如果正在拖放，取消拖放
  if (isDraggingFromStorage.value) {
    endDragFromStorage(false);
    return;
  }
  emit('add-card', type);
};

const handleDragStart = (card: StoredCard, event: DragEvent) => {
  // 折叠状态下禁用拖放
  if (isCollapsed.value) {
    event.preventDefault();
    return false;
  }
  
  // 阻止默认拖放行为，使用自定义拖放
  event.preventDefault();
  
  // 转换为 MouseEvent
  const mouseEvent = event as unknown as MouseEvent;
  startDragFromStorage(card, mouseEvent);
  emit('drag-start', card);
  
  // 启动鼠标移动和释放监听
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    const gridElement = document.querySelector('.bento-grid') as HTMLElement | null;
    if (gridElement) {
      // 从网格元素获取列数和间距（这里使用默认值，实际应从 grid 获取）
      updateDrag(e, 12, 16, 89, undefined, gridElement);
    }
  };
  
  const handleMouseUp = (e: MouseEvent | TouchEvent) => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleMouseMove);
    document.removeEventListener('touchend', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchmove', handleMouseMove);
  document.addEventListener('touchend', handleMouseUp);
  
  return false;
};

const handleDragEnd = (card: StoredCard, success: boolean) => {
  endDragFromStorage(success);
  emit('drag-end', card, success);
};

// 监听全局点击事件，处理拖放过程中的按钮点击
const handleGlobalClick = (event: MouseEvent) => {
  if (isDraggingFromStorage.value) {
    const target = event.target as HTMLElement;
    // 检查是否点击了 FloatingPanel 中的按钮
    if (target.closest('.floating-panel__add-btn') || 
        target.closest('.floating-panel__toggle') ||
        target.closest('.floating-panel__remove-stored')) {
      endDragFromStorage(false);
    }
  }
};

// 监听来自网格的拖放结果事件
const handleStorageCardDropped = (event: CustomEvent) => {
  const { cardId, success } = event.detail;
  const card = storedCards.value.find(c => c.id === cardId);
  if (card) {
    handleDragEnd(card, success);
  }
};

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('storage-card-dropped', handleStorageCardDropped as EventListener);
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
  document.removeEventListener('storage-card-dropped', handleStorageCardDropped as EventListener);
});
</script>

<style scoped>
.floating-panel {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(229, 231, 235, 0.8);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 280px;
  max-width: 90vw;
  height: 48px;
}

.floating-panel--collapsed {
  min-width: auto;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.floating-panel__content {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  gap: 8px;
  height: 100%;
}

.floating-panel--collapsed .floating-panel__content {
  display: none;
}

.floating-panel__storage {
  position: relative;
  display: flex;
  align-items: center;
}

.floating-panel__storage-trigger {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.floating-panel__storage-trigger:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

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
}

.floating-panel__storage-expanded {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  min-width: 240px;
  max-width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 1001;
}

.floating-panel__storage-expanded--visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: all;
}

.floating-panel__storage-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}

.floating-panel__title-small {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.floating-panel__storage-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  padding: 2px;
}

.floating-panel__stored-card {
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 3px 5px;
  cursor: grab;
  transition: all 0.2s ease;
  min-width: 44px;
  max-width: 68px;
}

.floating-panel__stored-card:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.floating-panel__stored-card--dragging {
  opacity: 0.5;
  cursor: grabbing;
  pointer-events: none;
}

.floating-panel__card-preview {
  pointer-events: none;
}

.floating-panel__card-type {
  font-size: 8px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 1px;
}

.floating-panel__card-title {
  font-size: 10px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.floating-panel__remove-stored {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.floating-panel__stored-card:hover .floating-panel__remove-stored {
  opacity: 1;
}

.floating-panel__remove-stored:hover {
  background: #dc2626;
}

.floating-panel__empty {
  font-size: 10px;
  color: #9ca3af;
  text-align: center;
  padding: 8px;
  font-style: italic;
}

.floating-panel__divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

.floating-panel__add-section {
  flex: 1;
  min-width: 0;
}

.floating-panel__add-grid {
  display: flex;
  gap: 4px;
}

.floating-panel__add-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.floating-panel__add-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-1px);
}

.floating-panel__toggle {
  position: absolute;
  top: -6px;
  right: 8px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.floating-panel__toggle:hover {
  background: #f9fafb;
  color: #374151;
  transform: scale(1.1);
}

.rotate-180 {
  transform: rotate(180deg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-panel {
    min-width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    bottom: 8px;
    height: 44px;
  }
  
  .floating-panel__content {
    padding: 5px 6px;
    gap: 6px;
  }
  
  .floating-panel__storage-trigger {
    width: 32px;
    height: 32px;
  }
  
  .floating-panel__divider {
    height: 20px;
  }
  
  .floating-panel__add-btn {
    width: 28px;
    height: 28px;
  }
  
  .floating-panel__storage-expanded {
    min-width: 200px;
    max-width: calc(100vw - 48px);
  }
}
</style>