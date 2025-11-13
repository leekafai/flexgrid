<template>
  <div class="bento-image-card">
    <img
      v-if="typeof card.content === 'string'"
      :src="card.content"
      :alt="card.title || 'Image'"
      class="bento-image-card__img"
      :class="{ 'bento-image-card__img--rounded': isRounded }"
    />
    <div v-else class="bento-image-card__placeholder">
      <div class="bento-image-card__placeholder-icon">🖼️</div>
      <p class="bento-image-card__placeholder-text">Add an image</p>
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

const isRounded = computed(() => 
  props.card.style?.borderRadius === '50%' || 
  props.card.style?.borderRadius === '9999px'
);
</script>

<style scoped>
.bento-image-card {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bento-image-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.bento-image-card__img--rounded {
  border-radius: 50%;
}

.bento-image-card:hover .bento-image-card__img {
  transform: scale(1.05);
}

.bento-image-card__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.05);
  border-radius: inherit;
}

.bento-image-card__placeholder-icon {
  font-size: 2rem;
  margin-bottom: 8px;
  opacity: 0.6;
}

.bento-image-card__placeholder-text {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 0;
}
</style>