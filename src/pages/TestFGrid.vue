<template>
  <div class="test-page">
    <div class="test-header">
      <h1>Flex/Grid 布局测试</h1>
      <p>行网格方案验证（layout="grid"）</p>
    </div>

    <div class="test-controls">
      <button @click="addTestCard" class="btn">添加测试卡片</button>
      <button @click="addRowAtEnd" class="btn">在末尾添加空行</button>
      <button @click="addRowInMiddle" class="btn">在中间添加空行</button>
      <button @click="clearGrid" class="btn">清空网格</button>
    </div>

    <div class="test-info">
      <p>总行数: {{ grid.rows?.length || 0 }}</p>
      <p>总卡片数: {{ grid.cards.length }}</p>
    </div>

    <div class="test-grid-container">
      <BentoGrid ref="gridRef" storage-key="test-f-grid" layout="grid">
        <template #card="{ card }">
          <div class="test-card-content">
            <h3>{{ card.title || '卡片' }}</h3>
            <p>行: {{ card.rowIndex }}, 位置: ({{ card.position.x }}, {{ card.position.y }})</p>
            <p>类型: {{ card.type }}, 大小: {{ card.size }}</p>
          </div>
        </template>
      </BentoGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BentoGrid from '@/components/BentoGrid.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import type { BentoCard } from '@/types/bento';

const gridRef = ref<InstanceType<typeof BentoGrid>>();
const { grid } = useBentoGrid();

const initializeTestCards = () => {
  const testCards: Array<Omit<BentoCard, 'id'>> = [
    { type: 'text', title: '卡片 A', content: '行0', size: 'medium', position: { x: 0, y: 0 }, rowIndex: 0, interactive: true },
    { type: 'text', title: '卡片 B', content: '行1', size: 'small', position: { x: 2, y: 1 }, rowIndex: 1, interactive: true },
    { type: 'text', title: '卡片 C', content: '行2', size: 'large', position: { x: 0, y: 2 }, rowIndex: 2, interactive: true }
  ];
  testCards.forEach(card => gridRef.value?.addCard(card));
};

onMounted(() => initializeTestCards());

const addTestCard = () => {
  const rowIndex = Math.floor(Math.random() * 4);
  const card: Omit<BentoCard, 'id'> = {
    type: 'text', title: `测试 ${Date.now()}`, content: '示例', size: 'medium', position: { x: 0, y: rowIndex }, rowIndex, interactive: true
  };
  gridRef.value?.addCard(card);
};

const addRowAtEnd = () => {
  const maxRow = Math.max(...grid.value.cards.map(c => c.rowIndex ?? 0), 0) + 1;
  const card: Omit<BentoCard, 'id'> = { type: 'text', title: `新行 ${maxRow}`, content: '新行卡片', size: 'small', position: { x: 0, y: maxRow }, rowIndex: maxRow, interactive: true };
  gridRef.value?.addCard(card);
};

const addRowInMiddle = () => {
  const insertRow = Math.floor((grid.value.rows?.length || 1) / 2);
  const card: Omit<BentoCard, 'id'> = { type: 'text', title: `中间 ${insertRow}`, content: '插入行卡片', size: 'small', position: { x: 0, y: insertRow }, rowIndex: insertRow, interactive: true };
  gridRef.value?.addCard(card);
};

const clearGrid = () => {
  grid.value.cards = [];
  if (grid.value.rows) grid.value.rows = [];
};
</script>

<style scoped>
.test-page { min-height: 100vh; background: #fff; }
.test-header { text-align: center; padding: 32px 16px; }
.test-controls { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn { padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; }
.test-grid-container { max-width: 1200px; margin: 0 auto; }
.test-card-content { padding: 24px; text-align: center; }
</style>

