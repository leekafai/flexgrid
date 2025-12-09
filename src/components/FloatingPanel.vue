<template>
  <div 
    v-if="isPanelVisible" 
    class="floating-panel"
    :class="{ 'floating-panel--collapsed': isCollapsed }"
  >
    <div class="floating-panel__content">
      <!-- 暂存区域 -->
      <div class="floating-panel__storage">
        <div class="floating-panel__storage-header">
          <h3 class="floating-panel__title">暂存区域</h3>
          <span class="floating-panel__count">{{ storedCardsCount }}</span>
        </div>
        <div class="floating-panel__storage-cards">
          <div
            v-for="card in storedCards"
            :key="card.id"
            class="floating-panel__stored-card"
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          </div>
          <div v-if="storedCards.length === 0" class="floating-panel__empty">
            暂无收纳的卡片
          </div>
        </div>
      </div>

      <!-- 分隔线 -->
      <div class="floating-panel__divider"></div>

      <!-- 添加卡片区域 -->
      <div class="floating-panel__add-section">
        <h3 class="floating-panel__title">添加卡片</h3>
        <div class="floating-panel__add-grid">
          <!-- 这里可以添加不同类型的卡片创建按钮 -->
          <button
            class="floating-panel__add-btn"
            @click="$emit('add-card', 'text')"
            title="添加文本卡片"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
              <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="$emit('add-card', 'link')"
            title="添加链接卡片"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="$emit('add-card', 'image')"
            title="添加图片卡片"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
              <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button
            class="floating-panel__add-btn"
            @click="$emit('add-card', 'video')"
            title="添加视频卡片"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
        width="16" 
        height="16" 
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
import { ref, onMounted } from 'vue';
import { useFloatingPanel } from '@/composables/useFloatingPanel';
import type { BentoCard } from '@/types/bento';

onMounted(() => {
  // 组件挂载完成
});

const emit = defineEmits<{
  'restore-card': [card: BentoCard];
  'remove-stored-card': [cardId: string];
  'add-card': [type: string];
}>();

const { storedCards, isPanelVisible, removeFromStorage, storedCardsCount } = useFloatingPanel();
const isCollapsed = ref(false);

const restoreCard = (card: BentoCard) => {
    console.log('恢复卡片:', card.id, card.title);
    emit('restore-card', card);
  };

const removeStoredCard = (cardId: string) => {
  removeFromStorage(cardId);
  emit('remove-stored-card', cardId);
};

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
    console.log('面板折叠状态:', isCollapsed.value);
  };
</script>

<style scoped>
.floating-panel {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 480px;
  max-width: 90vw;
}

.floating-panel--collapsed {
  min-width: auto;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.floating-panel__content {
  display: flex;
  align-items: stretch;
  padding: 12px;
  gap: 12px;
}

.floating-panel--collapsed .floating-panel__content {
  display: none;
}

.floating-panel__storage {
  flex: 1;
  min-width: 0;
}

.floating-panel__storage-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.floating-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.floating-panel__count {
  font-size: 12px;
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.floating-panel__storage-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 80px;
  overflow-y: auto;
  padding: 2px;
}

.floating-panel__stored-card {
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
  max-width: 90px;
}

.floating-panel__stored-card:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.floating-panel__card-preview {
  pointer-events: none;
}

.floating-panel__card-type {
  font-size: 9px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 1px;
}

.floating-panel__card-title {
  font-size: 11px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.floating-panel__remove-stored {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
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
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  padding: 12px;
  font-style: italic;
}

.floating-panel__divider {
  width: 1px;
  background: #e5e7eb;
  margin: 8px 0;
}

.floating-panel__add-section {
  flex: 1;
  min-width: 0;
}

.floating-panel__add-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.floating-panel__add-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
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
  top: -8px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: white;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
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
    min-width: 95vw;
    bottom: 12px;
    border-radius: 10px;
  }
  
  .floating-panel__content {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .floating-panel__divider {
    width: 100%;
    height: 1px;
    margin: 6px 0;
  }
  
  .floating-panel__add-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }
  
  .floating-panel__add-btn {
    width: 32px;
    height: 32px;
  }
  
  .floating-panel__storage-cards {
    max-height: 60px;
    gap: 4px;
  }
  
  .floating-panel__stored-card {
    min-width: 50px;
    max-width: 70px;
    padding: 4px 6px;
  }
}
</style>