<template>
  <div class="bento-link-card">
    <div class="bento-link-card__icon" v-if="linkData.icon">{{ linkData.icon }}</div>
    <h3 v-if="card.title" class="bento-link-card__title">{{ card.title }}</h3>
    <p v-if="linkData.description" class="bento-link-card__description">{{ linkData.description }}</p>
    <div class="bento-link-card__url">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="bento-link-card__url-icon">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="2"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span class="bento-link-card__url-text">{{ getDisplayUrl(linkData.url) }}</span>
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

interface LinkData {
  url: string;
  icon?: string;
  description?: string;
}

const linkData = computed<LinkData>(() => {
  if (typeof props.card.content === 'object') {
    return props.card.content as LinkData;
  }
  return { url: String(props.card.content) };
});

const getDisplayUrl = (url: string) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};
</script>

<style scoped>
.bento-link-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bento-link-card:hover {
  transform: translateY(-2px);
}

.bento-link-card__icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.bento-link-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.bento-link-card__description {
  font-size: 0.875rem;
  opacity: 0.8;
  margin-bottom: 8px;
  color: inherit;
}

.bento-link-card__url {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  opacity: 0.7;
  color: inherit;
}

.bento-link-card__url-icon {
  flex-shrink: 0;
}

.bento-link-card__url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

@media (max-width: 768px) {
  .bento-link-card__title {
    font-size: 1rem;
  }
  
  .bento-link-card__description {
    font-size: 0.8125rem;
  }
}
</style>