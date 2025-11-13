<template>
  <div class="bento-stats-card">
    <h3 v-if="card.title" class="bento-stats-card__title">{{ card.title }}</h3>
    <div class="bento-stats-card__stats">
      <div 
        v-for="(value, key) in statsData" 
        :key="key"
        class="bento-stats-card__stat"
      >
        <div class="bento-stats-card__stat-value">{{ value }}</div>
        <div class="bento-stats-card__stat-label">{{ formatLabel(key as string) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BentoCard } from '@/types/bento';

interface Props {
  card: BentoCard;
  isHovered?: boolean;
}

const props = defineProps<Props>();

interface StatsData {
  [key: string]: string | number;
}

const statsData = computed<StatsData>(() => {
  if (typeof props.card.content === 'object') {
    return props.card.content as StatsData;
  }
  return {};
});

const formatLabel = (key: string) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};
</script>

<style scoped>
.bento-stats-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px;
}

.bento-stats-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
  color: inherit;
}

.bento-stats-card__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  gap: 16px;
  text-align: center;
}

.bento-stats-card__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bento-stats-card__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: inherit;
}

.bento-stats-card__stat-label {
  font-size: 0.75rem;
  opacity: 0.8;
  text-transform: capitalize;
  color: inherit;
}

@media (max-width: 768px) {
  .bento-stats-card__title {
    font-size: 1rem;
  }
  
  .bento-stats-card__stat-value {
    font-size: 1.25rem;
  }
}
</style>