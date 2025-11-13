<template>
  <div class="app" :class="{ 'app--dark': isDark }">
    <header class="app__header">
      <div class="app__header-content">
        <h1 class="app__title">组件库测试页</h1>
        <p class="app__subtitle">创建与演示 Bento 组件</p>
        <div class="app__controls">
          <button 
            @click="toggleTheme" 
            class="app__theme-toggle"
            :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
          >
            {{ isDark ? '☀️' : '🌙' }}
          </button>
        <div class="demo__buttons">
          <button class="demo__btn" @click="addTextCard">添加文本卡片</button>
          <button class="demo__btn" @click="addImageCard">添加图片卡片</button>
          <button class="demo__btn" @click="addLinkCard">添加链接卡片</button>
          <button class="demo__btn" @click="addVideoCard">添加视频卡片</button>
          <button class="demo__btn" @click="addSocialCard">添加社交卡片</button>
          <button class="demo__btn" @click="addStatsCard">添加统计卡片</button>
          <button class="demo__btn" @click="addWeatherCard">添加天气卡片</button>
          <button class="demo__btn" @click="addMusicCard">添加音乐卡片</button>
          <button class="demo__btn" @click="runDragTests">运行拖拽测试</button>
        </div>
        </div>
      </div>
    </header>

    <main class="app__main">
      <BentoGrid ref="bentoGridRef">
        <template #card="{ card }">
          <div v-if="card.type === 'text'" class="slot-text-card">
            <h3 class="slot-text-title">{{ card.title || '文本卡片' }}</h3>
            <p class="slot-text-content">{{ (card.content as string) }}</p>
          </div>
        </template>
      </BentoGrid>
    </main>
  </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BentoGrid from '@/components/BentoGrid.vue'
import { useTheme } from '@/composables/useTheme'
import type { BentoCard } from '@/types/bento'

const { isDark, toggleTheme } = useTheme()
const bentoGridRef = ref<InstanceType<typeof BentoGrid>>()

const addCard = (cardData: Omit<BentoCard, 'id' | 'position'>) => {
  bentoGridRef.value?.addCard({
    ...cardData,
    position: { x: 0, y: 0 }
  })
}

const addTextCard = () => {
  addCard({
    type: 'text',
    title: '示例文本',
    content: '这是一个来自组件库的文本卡片',
    size: 'medium',
    interactive: true,
    animation: 'fade',
    style: { backgroundColor: '#f8fafc', textColor: '#1e293b', borderRadius: '16px' }
  })
}

const addImageCard = () => {
  addCard({
    type: 'image',
    title: '示例图片',
    content: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    size: 'small',
    interactive: true,
    animation: 'scale',
    style: { borderRadius: '12px' }
  })
}

const addLinkCard = () => {
  addCard({
    type: 'link',
    title: '示例链接',
    content: { url: 'https://example.com', icon: '🔗', description: '访问示例网站' },
    size: 'small',
    interactive: true,
    animation: 'slide',
    style: { backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: '12px' }
  })
}

const addVideoCard = () => {
  addCard({
    type: 'video',
    title: '示例视频',
    content: 'https://www.w3schools.com/html/mov_bbb.mp4',
    size: 'wide',
    interactive: true,
    animation: 'fade',
    style: { borderRadius: '12px' }
  })
}

const addSocialCard = () => {
  addCard({
    type: 'social',
    title: '示例社交',
    content: { twitter: '@demo', github: 'demo', linkedin: 'demo' },
    size: 'wide',
    interactive: true,
    animation: 'fade',
    style: { backgroundColor: '#0f172a', textColor: '#e2e8f0', borderRadius: '12px' }
  })
}

const addStatsCard = () => {
  addCard({
    type: 'stats',
    title: '示例统计',
    content: { followers: '1.2K', projects: '24', experience: '3+ years' },
    size: 'large',
    interactive: true,
    animation: 'bounce',
    style: { backgroundColor: '#1e293b', textColor: '#ffffff', borderRadius: '12px' }
  })
}

const addWeatherCard = () => {
  addCard({
    type: 'weather',
    title: '示例天气',
    content: { city: 'Shanghai', temperature: '22°C', condition: 'Sunny' },
    size: 'small',
    interactive: true,
    animation: 'fade',
    style: { borderRadius: '12px' }
  })
}

const addMusicCard = () => {
  addCard({
    type: 'music',
    title: '示例音乐',
    content: { track: 'Bento Theme', artist: 'FlexGrid', cover: 'https://picsum.photos/200/200' },
    size: 'small',
    interactive: true,
    animation: 'scale',
    style: { borderRadius: '12px' }
  })
}

onMounted(() => {
  addTextCard();
  addImageCard();
  addLinkCard();
  addVideoCard();
  addSocialCard();
  addStatsCard();
  addWeatherCard();
  addMusicCard();
})

const runDragTests = async () => {
  addTextCard();
  addTextCard();
  addTextCard();
  await new Promise(r => setTimeout(r, 50));
  const el = document.querySelector('.bento-grid') as HTMLElement | null;
  const items = Array.from(document.querySelectorAll('.bento-grid__card')) as HTMLElement[];
  const second = items[1];
  const third = items[2];
  const rect = third?.getBoundingClientRect();
  const event = new DragEvent('dragover', { bubbles: true, clientX: rect ? rect.left + 5 : 5, clientY: rect ? rect.top + 5 : 5 });
  el?.dispatchEvent(event);
  const cardId = second?.getAttribute('data-id') || '';
  if (cardId && bentoGridRef.value?.reorderCardByIndex) {
    (bentoGridRef.value as any).reorderCardByIndex(cardId, 2);
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: #ffffff;
  color: #0f172a;
  transition: all 0.2s ease;
}

.app--dark {
  background: #f8fafc;
  color: #0f172a;
}

.app__header {
  padding: 2rem 1rem;
  text-align: center;
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.app--dark .app__header {
  background: transparent;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.app__header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.app__title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.app__subtitle {
  font-size: 0.95rem;
  opacity: 0.7;
  margin: 0;
  color: #6b7280;
}

.app__controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.app__theme-toggle {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  font-size: 1rem;
  background: #fff;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__theme-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.demo__buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.demo__btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  color: #333;
}

.demo__btn:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.app__main {
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .app__title { font-size: 2rem; }
  .app__subtitle { font-size: 1rem; }
  .app__header { padding: 1.5rem 1rem; }
  .app__main { padding: 1rem; }
}

@media (max-width: 480px) {
  .demo__buttons { max-width: 320px; }
}
</style>
<style scoped>
/* 追加：插槽派生的文本卡片极简样式 */
.slot-text-card { padding: 8px; }
.slot-text-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 4px; color: #111827; }
.slot-text-content { font-size: 0.875rem; color: #374151; }
</style>
