import { ref, computed } from 'vue';
import type { BentoCard } from '@/types/bento';
import { useDragAndDrop } from './useDragAndDrop';

export interface StoredCard extends BentoCard {
  storedAt: number;
}

// 创建全局状态
const globalStoredCards = ref<StoredCard[]>([]);
const globalIsPanelVisible = ref(true);
const isDraggingFromStorage = ref(false);
const storageDragOrigin = ref<string | null>(null);

export const useFloatingPanel = () => {
  const { startDrag, endDrag, draggedCard } = useDragAndDrop();

  const addToStorage = (card: BentoCard) => {
    const storedCard: StoredCard = {
      ...card,
      storedAt: Date.now()
    };
    globalStoredCards.value.push(storedCard);
    console.log('卡片已收纳:', card.id, '当前存储数:', globalStoredCards.value.length);
  };

  const removeFromStorage = (cardId: string) => {
    const index = globalStoredCards.value.findIndex(card => card.id === cardId);
    if (index > -1) {
      const card = globalStoredCards.value[index];
      globalStoredCards.value.splice(index, 1);
      console.log('卡片已移除:', cardId, '当前存储数:', globalStoredCards.value.length);
      return card;
    }
    return null;
  };

  const clearStorage = () => {
    globalStoredCards.value = [];
  };

  const togglePanelVisibility = () => {
    globalIsPanelVisible.value = !globalIsPanelVisible.value;
  };

  const storedCardsCount = computed(() => globalStoredCards.value.length);

  const startDragFromStorage = (card: StoredCard, event: MouseEvent | TouchEvent) => {
    isDraggingFromStorage.value = true;
    storageDragOrigin.value = card.id;
    startDrag(card, event, 'storage');
    console.log('[Storage] Start drag from storage:', card.id);
  };

  const endDragFromStorage = (success: boolean) => {
    if (success && storageDragOrigin.value) {
      removeFromStorage(storageDragOrigin.value);
      console.log('[Storage] Card moved to grid, removed from storage');
    } else {
      console.log('[Storage] Drag cancelled, card stays in storage');
    }
    isDraggingFromStorage.value = false;
    storageDragOrigin.value = null;
    endDrag();
  };

  return {
    storedCards: computed(() => globalStoredCards.value),
    isPanelVisible: computed(() => globalIsPanelVisible.value),
    isDraggingFromStorage: computed(() => isDraggingFromStorage.value),
    addToStorage,
    removeFromStorage,
    clearStorage,
    togglePanelVisibility,
    storedCardsCount,
    startDragFromStorage,
    endDragFromStorage
  };
};