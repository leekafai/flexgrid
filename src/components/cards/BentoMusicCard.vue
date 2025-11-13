<template>
  <div class="bento-music-card">
    <div class="bento-music-card__header">
      <h3 v-if="card.title" class="bento-music-card__title">{{ card.title }}</h3>
      <div class="bento-music-card__now-playing" v-if="musicData.nowPlaying">
        🎵 Now Playing
      </div>
    </div>
    <div class="bento-music-card__content">
      <div class="bento-music-card__track" v-if="musicData.track">
        <div class="bento-music-card__track-name">{{ musicData.track }}</div>
        <div class="bento-music-card__artist">{{ musicData.artist }}</div>
      </div>
      <div class="bento-music-card__placeholder" v-else>
        <div class="bento-music-card__placeholder-icon">🎵</div>
        <div class="bento-music-card__placeholder-text">No music playing</div>
      </div>
    </div>
    <div class="bento-music-card__controls" v-if="musicData.track">
      <button class="bento-music-card__control" @click="togglePlay">
        {{ isPlaying ? '⏸️' : '▶️' }}
      </button>
      <div class="bento-music-card__progress">
        <div class="bento-music-card__progress-bar">
          <div 
            class="bento-music-card__progress-fill" 
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <div class="bento-music-card__progress-text">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import type { BentoCard } from '@/types/bento';

interface Props {
  card: BentoCard;
  isHovered?: boolean;
}

const props = defineProps<Props>();

interface MusicData {
  track?: string;
  artist?: string;
  album?: string;
  nowPlaying?: boolean;
  url?: string;
}

const musicData = computed<MusicData>(() => {
  if (typeof props.card.content === 'object') {
    return props.card.content as MusicData;
  }
  return {};
});

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(180); // 3 minutes default

const progress = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

let progressInterval: number | null = null;

const togglePlay = () => {
  isPlaying.value = !isPlaying.value;
  
  if (isPlaying.value) {
    progressInterval = window.setInterval(() => {
      if (currentTime.value < duration.value) {
        currentTime.value += 1;
      } else {
        isPlaying.value = false;
        currentTime.value = 0;
      }
    }, 1000);
  } else {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
});
</script>

<style scoped>
.bento-music-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  font-family: inherit;
}

.bento-music-card__header {
  margin-bottom: 12px;
}

.bento-music-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.bento-music-card__now-playing {
  font-size: 0.75rem;
  opacity: 0.8;
  color: inherit;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.bento-music-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 16px;
}

.bento-music-card__track {
  text-align: center;
}

.bento-music-card__track-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.bento-music-card__artist {
  font-size: 0.875rem;
  opacity: 0.8;
  color: inherit;
}

.bento-music-card__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  opacity: 0.6;
}

.bento-music-card__placeholder-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.bento-music-card__placeholder-text {
  font-size: 0.875rem;
}

.bento-music-card__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bento-music-card__control {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.bento-music-card__control:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.bento-music-card__progress {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bento-music-card__progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.bento-music-card__progress-fill {
  height: 100%;
  background: currentColor;
  border-radius: 2px;
  transition: width 0.1s ease;
}

.bento-music-card__progress-text {
  font-size: 0.75rem;
  opacity: 0.8;
  text-align: center;
  color: inherit;
}

@media (max-width: 768px) {
  .bento-music-card__title {
    font-size: 1rem;
  }
  
  .bento-music-card__track-name {
    font-size: 0.875rem;
  }
  
  .bento-music-card__artist {
    font-size: 0.8125rem;
  }
}
</style>