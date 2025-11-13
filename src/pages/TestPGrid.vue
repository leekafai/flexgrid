<template>
  <div class="test-page">
    <div class="test-header">
      <h1>Position 布局测试</h1>
      <p>绝对定位与坐标映射方案验证（layout="position"）</p>
    </div>

    <div class="test-controls">
      <button @click="loadJson" class="btn">加载 bento_data.json</button>
      <button @click="clearGrid" class="btn">清空网格</button>
    </div>

    <div class="test-info">
      <p>总卡片数: {{ grid.cards.length }}</p>
    </div>

    <div class="test-grid-container">
      <BentoGrid ref="gridRef" storage-key="test-p-grid" layout="position">
        <template #card="{ card }">
          <div class="test-card-content">
            <h3>{{ card.title || card.type }}</h3>
            <p>坐标: ({{ card.position.x }}, {{ card.position.y }})，尺寸: {{ card.units?.w || '?' }}×{{ card.units?.h || '?' }}</p>
          </div>
        </template>
      </BentoGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BentoGrid from '@/components/BentoGrid.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import type { BentoCard } from '@/types/bento';
import bentoData from '../../bento_data.json';

const gridRef = ref<InstanceType<typeof BentoGrid>>();
const { grid } = useBentoGrid();

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
    const pos = pickByViewport(item.position, width) || { x: 0, y: 0 };
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
</script>

<style scoped>
.test-page { min-height: 100vh; background: #fff; }
.test-header { text-align: center; padding: 32px 16px; }
.test-controls { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn { padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; }
.test-grid-container { max-width: 1200px; margin: 0 auto; }
.test-card-content { padding: 24px; text-align: center; }
</style>

