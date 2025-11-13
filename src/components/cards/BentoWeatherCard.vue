<template>
  <div class="bento-weather-card">
    <div class="bento-weather-card__header">
      <h3 v-if="card.title" class="bento-weather-card__title">{{ card.title }}</h3>
      <div class="bento-weather-card__location">📍 {{ weatherData.location || 'Unknown' }}</div>
    </div>
    <div class="bento-weather-card__main">
      <div class="bento-weather-card__temp">{{ weatherData.temperature || '--' }}°</div>
      <div class="bento-weather-card__condition">{{ weatherData.condition || 'Unknown' }}</div>
      <div class="bento-weather-card__icon">{{ getWeatherIcon(weatherData.condition) }}</div>
    </div>
    <div class="bento-weather-card__details">
      <div class="bento-weather-card__detail">
        <span class="bento-weather-card__detail-label">💧</span>
        <span>{{ weatherData.humidity || '--' }}%</span>
      </div>
      <div class="bento-weather-card__detail">
        <span class="bento-weather-card__detail-label">💨</span>
        <span>{{ weatherData.windSpeed || '--' }} mph</span>
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

interface WeatherData {
  location?: string;
  temperature?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
}

const weatherData = computed<WeatherData>(() => {
  if (typeof props.card.content === 'object') {
    return props.card.content as WeatherData;
  }
  return {};
});

const getWeatherIcon = (condition?: string) => {
  const icons: Record<string, string> = {
    'Sunny': '☀️',
    'Clear': '☀️',
    'Partly Cloudy': '⛅',
    'Cloudy': '☁️',
    'Overcast': '☁️',
    'Rainy': '🌧️',
    'Rain': '🌧️',
    'Stormy': '⛈️',
    'Thunderstorm': '⛈️',
    'Snowy': '❄️',
    'Snow': '❄️',
    'Foggy': '🌫️',
    'Fog': '🌫️'
  };
  return icons[condition || ''] || '🌤️';
};
</script>

<style scoped>
.bento-weather-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  font-family: inherit;
}

.bento-weather-card__header {
  margin-bottom: 12px;
}

.bento-weather-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: inherit;
}

.bento-weather-card__location {
  font-size: 0.75rem;
  opacity: 0.8;
  color: inherit;
}

.bento-weather-card__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 12px;
}

.bento-weather-card__temp {
  font-size: 2.5rem;
  font-weight: 700;
  color: inherit;
  line-height: 1;
}

.bento-weather-card__condition {
  font-size: 0.875rem;
  opacity: 0.8;
  margin: 4px 0;
  color: inherit;
}

.bento-weather-card__icon {
  font-size: 3rem;
  margin-top: 8px;
}

.bento-weather-card__details {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.bento-weather-card__detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: inherit;
}

.bento-weather-card__detail-label {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .bento-weather-card__temp {
    font-size: 2rem;
  }
  
  .bento-weather-card__icon {
    font-size: 2.5rem;
  }
}
</style>