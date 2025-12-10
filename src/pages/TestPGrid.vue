<template>
  <div class="test-page">
    <div class="test-header">
      <h1>Position 布局测试</h1>
      
    </div>

    <div class="test-controls">
      <button @click="loadJson" class="btn">加载 bento_data.json</button>
      <button @click="clearGrid" class="btn">清空网格</button>
      <button @click="toggleRed" class="btn">阴影标红</button>
    </div>

    <div class="test-info">
      <p>总卡片数: {{ grid.cards.length }}</p>
    </div>

    <div class="test-grid-container">
      <BentoGrid ref="gridRef" storage-key="test-p-grid" :debug-drop-color="dropColor" @store-card="handleStoreCard">
        <template #card="{ card, index }">
          <div class="test-card-content">
            <div class="badge">#{{ index + 1 }}</div>
            <h3>{{ card.title || card.type }}</h3>
            <p>坐标: ({{ card.position.x }}, {{ card.position.y }})，尺寸: {{ card.units?.w || '?' }}×{{ card.units?.h || '?'
              }}</p>
          </div>
        </template>
      </BentoGrid>
    </div>
    
    <!-- 浮动面板 -->
    <FloatingPanel
      @restore-card="handleRestoreCard"
      @remove-stored-card="handleRemoveStoredCard"
      @add-card="handleAddCard"
      @remove-card-from-grid="handleRemoveCardFromGrid"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BentoGrid from '@/components/BentoGrid.vue';
import FloatingPanel from '@/components/FloatingPanel.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useFloatingPanel } from '@/composables/useFloatingPanel';
import type { BentoCard } from '@/types/bento';
import bentoData from '../../bento_data.json';

const gridRef = ref<InstanceType<typeof BentoGrid>>();
const { grid } = useBentoGrid();
const { addToStorage, removeFromStorage } = useFloatingPanel();
const dropColor = ref<string | undefined>(undefined);

const parseUnits = (style?: string) => {
  if (!style) return { w: 2, h: 2 };
  const m = style.match(/(\d)x(\d)/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 2, h: 2 };
};

const pickByViewport = <T,>(obj: { mobile?: T; desktop?: T }, width: number): T | undefined => {
  return width < 768 ? obj.mobile : (obj.desktop ?? obj.mobile);
};

const loadJson = () => {
  const width = window.innerWidth;
  const items = (bentoData as any).bento.items as Array<any>;
  const cards: Array<Omit<BentoCard, 'id'>> = items.map(item => {
    const pos: { x: number, y: number } = pickByViewport(item.position, width) || { x: 0, y: 0 };
    const styleStr = pickByViewport(item.data.style || {}, width) as string | undefined;
    const units = parseUnits(styleStr);
    const title = item.data.title?.content?.[0]?.content?.[0]?.text;
    return {
      type: item.data.type || 'text',
      title: title || undefined,
      content: title || '',
      size: 'wide',
      units,
      position: { x: pos.x, y: pos.y },
      interactive: true,
      style: { borderRadius: '16px' }
    };
  });
  clearGrid();
  cards.forEach(card => gridRef.value?.addCard(card));
};

const clearGrid = () => {
  grid.value.cards = [];
  grid.value.rows = [];
};

onMounted(() => {
  loadJson();
});

// 浮动面板事件处理
const handleStoreCard = (card: BentoCard) => {
  console.log('TestPGrid 收到收纳事件，卡片信息:', card.id, card.title);
  // 收纳卡片：添加到存储并移除出网格
  addToStorage(card);
  gridRef.value?.removeCard(card.id);
};

const handleRestoreCard = (card: BentoCard) => {
  // 先获取收纳列表中卡片的位置（像素坐标），在移除之前
  const storageCardElement = document.querySelector(`.floating-panel__stored-card[data-card-id="${card.id}"]`) as HTMLElement;
  let animateFrom: { x: number; y: number } | undefined;
  
  if (storageCardElement) {
    const rect = storageCardElement.getBoundingClientRect();
    // 获取卡片中心位置
    animateFrom = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  
  // 从收纳区恢复卡片到网格
  const restoredCard = removeFromStorage(card.id);
  if (restoredCard && gridRef.value) {
    // 使用 placeCard API 自动计算不覆盖的位置
    // 如果卡片有原始位置，尝试使用原始位置；否则自动计算
    const originalPosition = restoredCard.position;
    // 从 restoredCard 中移除 id，因为 placeCard 会生成新的 id
    const { id, ...cardWithoutId } = restoredCard;
    const placedPosition = gridRef.value.placeCard(
      cardWithoutId,
      originalPosition ? { x: originalPosition.x, y: originalPosition.y } : undefined,
      animateFrom
    );
    console.log('卡片已恢复到网格，位置:', placedPosition);
  }
};

const handleRemoveStoredCard = (cardId: string) => {
  // 从收纳区删除卡片
  removeFromStorage(cardId);
};

const handleRemoveCardFromGrid = (cardId: string) => {
  // 从网格移除卡片（拖放到暂存区时）
  gridRef.value?.removeCard(cardId);
};

const handleAddCard = (type: string) => {
  // 根据类型添加新卡片
  const cardSizes: Array<'small' | 'medium' | 'large' | 'wide'> = ['small', 'medium', 'large', 'wide'];
  const size = cardSizes[Math.floor(Math.random() * cardSizes.length)];
  
  const card: Omit<BentoCard, 'id'> = {
    type,
    title: `新${type}卡片 ${Date.now()}`,
    content: `这是 ${type} 类型的新卡片`,
    size,
    position: { x: 0, y: grid.value.cards.length },
    interactive: true,
    style: {
      backgroundColor: `hsl(${Math.random() * 360}, 70%, 80%)`,
      textColor: '#333',
      borderRadius: '16px'
    }
  };
  
  gridRef.value?.addCard(card);
};

const toggleRed = () => {
  dropColor.value = dropColor.value ? undefined : 'rgba(255,0,0,0.18)';
};
</script>

<style scoped>
.test-page {
  min-height: 100vh;
  background: #fff;
}

.test-header {
  text-align: center;
  padding: 32px 16px;
}

.test-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.test-grid-container {
  max-width: 1200px;
  margin: 0 auto;
}

.test-card-content {
  padding: 24px;
  text-align: center;
  position: relative;
}

.badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 8px;
  background: #eef2ff;
  color: #374151;
}
</style>
