<template>
  <div class="bento-social-card">
    <h3 v-if="card.title" class="bento-social-card__title">{{ card.title }}</h3>
    <div class="bento-social-card__links">
      <a
        v-for="(handle, platform) in socialData"
        :key="platform"
        :href="getSocialUrl(platform as string, handle as string)"
        target="_blank"
        rel="noopener noreferrer"
        class="bento-social-card__link"
        :class="`bento-social-card__link--${platform}`"
      >
        <div class="bento-social-card__link-icon">{{ getSocialIcon(platform as string) }}</div>
        <div class="bento-social-card__link-info">
          <div class="bento-social-card__link-platform">{{ formatPlatform(platform as string) }}</div>
          <div class="bento-social-card__link-handle">{{ handle }}</div>
        </div>
      </a>
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

interface SocialData {
  [key: string]: string;
}

const socialData = computed<SocialData>(() => {
  if (typeof props.card.content === 'object') {
    return props.card.content as SocialData;
  }
  return {};
});

const getSocialUrl = (platform: string, handle: string) => {
  const urls: Record<string, string> = {
    twitter: `https://twitter.com/${handle.replace('@', '')}`,
    github: `https://github.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    instagram: `https://instagram.com/${handle.replace('@', '')}`,
    facebook: `https://facebook.com/${handle}`,
    youtube: `https://youtube.com/@${handle.replace('@', '')}`,
    tiktok: `https://tiktok.com/@${handle.replace('@', '')}`
  };
  return urls[platform] || '#';
};

const getSocialIcon = (platform: string) => {
  const icons: Record<string, string> = {
    twitter: '🐦',
    github: '🐙',
    linkedin: '💼',
    instagram: '📷',
    facebook: '📘',
    youtube: '📺',
    tiktok: '🎵'
  };
  return icons[platform] || '🔗';
};

const formatPlatform = (platform: string) => {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};
</script>

<style scoped>
.bento-social-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.bento-social-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
  color: inherit;
}

.bento-social-card__links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.bento-social-card__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-decoration: none;
  color: inherit;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.bento-social-card__link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.bento-social-card__link-icon {
  font-size: 1.5rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bento-social-card__link-info {
  flex: 1;
  min-width: 0;
}

.bento-social-card__link-platform {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-bottom: 2px;
}

.bento-social-card__link-handle {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .bento-social-card__title {
    font-size: 1rem;
  }
  
  .bento-social-card__link {
    padding: 10px;
    gap: 10px;
  }
}
</style>