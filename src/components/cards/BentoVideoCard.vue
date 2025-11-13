<template>
  <div class="bento-video-card">
    <div v-if="videoUrl" class="bento-video-card__video">
      <iframe
        :src="embedUrl"
        frameborder="0"
        allowfullscreen
        class="bento-video-card__iframe"
      ></iframe>
    </div>
    <div v-else class="bento-video-card__placeholder">
      <div class="bento-video-card__placeholder-icon">🎥</div>
      <p class="bento-video-card__placeholder-text">Add a video</p>
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

const videoUrl = computed(() => {
  return typeof props.card.content === 'string' ? props.card.content : '';
});

const embedUrl = computed(() => {
  const url = videoUrl.value;
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes('vimeo.com')) {
    const videoId = extractVimeoId(url);
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
});

const extractYouTubeId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : '';
};

const extractVimeoId = (url: string) => {
  const match = url.match(/(?:vimeo\.com\/)([0-9]+)/);
  return match ? match[1] : '';
};
</script>

<style scoped>
.bento-video-card {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: inherit;
}

.bento-video-card__video {
  width: 100%;
  height: 100%;
  position: relative;
}

.bento-video-card__iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.bento-video-card__placeholder {
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

.bento-video-card__placeholder-icon {
  font-size: 2rem;
  margin-bottom: 8px;
  opacity: 0.6;
}

.bento-video-card__placeholder-text {
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 0;
}
</style>