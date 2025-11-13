<template>
  <div class="bento-text-card">
    <h3 v-if="card.title" class="bento-text-card__title">{{ card.title }}</h3>
    <p class="bento-text-card__content">{{ card.content }}</p>
  </div>
</template>

<script setup lang="ts">
import type { BentoCard } from '@/types/bento';

interface Props {
  card: BentoCard;
  isHovered?: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.bento-text-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  padding: 16px;
}

.bento-text-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: inherit;
}

.bento-text-card__content {
  font-size: 0.875rem;
  line-height: 1.5;
  color: inherit;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .bento-text-card__title {
    font-size: 1rem;
  }
  
  .bento-text-card__content {
    font-size: 0.8125rem;
  }
}
</style>