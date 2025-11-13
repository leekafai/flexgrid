<template>
  <div class="app" :class="{ 'app--dark': isDark }">
    <header class="app__header">
      <div class="app__header-content">
        <h1 class="app__title">Bento Grid</h1>
        <p class="app__subtitle">Create beautiful, organized layouts</p>
        <div class="app__controls">
          <button 
            @click="toggleTheme" 
            class="app__theme-toggle"
            :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          >
            {{ isDark ? '☀️' : '🌙' }}
          </button>
          <button 
            @click="showAddCardModal = true" 
            class="app__add-card-btn"
          >
            + Add Card
          </button>
          <router-link 
            to="/test-f-grid" 
            class="app__test-link"
          >
            🧪 测试新网格（行网格）
          </router-link>
          <router-link 
            to="/test-p-grid" 
            class="app__test-link"
          >
            🎯 测试 Position 布局
          </router-link>
        </div>
      </div>
    </header>
    
    <main class="app__main">
      <BentoGrid ref="bentoGridRef" />
    </main>
    
    <AddCardModal 
      v-if="showAddCardModal" 
      @close="showAddCardModal = false"
      @add-card="handleAddCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BentoGrid from '@/components/BentoGrid.vue';
import AddCardModal from '@/components/AddCardModal.vue';
import { useTheme } from '@/composables/useTheme';
import type { BentoCard } from '@/types/bento';

const { isDark, toggleTheme } = useTheme();
const showAddCardModal = ref(false);
const bentoGridRef = ref<InstanceType<typeof BentoGrid>>();

const handleAddCard = (cardData: Omit<BentoCard, 'id' | 'position'>) => {
  // Add the new card to the grid
  bentoGridRef.value?.addCard({
    ...cardData,
    position: { x: 0, y: 0 } // Default position, will be adjusted by the grid
  });
  showAddCardModal.value = false;
};
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
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.app__subtitle {
  font-size: 1rem;
  opacity: 0.7;
  margin: 0;
  color: #6b7280;
}

.app__controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
}

.app__theme-toggle,
.app__add-card-btn,
.app__test-link {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  text-decoration: none;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}


.app__theme-toggle {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__theme-toggle:hover { transform: scale(1.03); }

.app__add-card-btn:hover { transform: translateY(-1px); }

.app__test-link:hover { transform: translateY(-1px); background: #f8fafc; }

.app__main {
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .app__title {
    font-size: 2rem;
  }
  
  .app__subtitle {
    font-size: 1rem;
  }
  
  .app__header {
    padding: 1.5rem 1rem;
  }
  
  .app__main {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .app__controls {
    flex-direction: column;
    width: 100%;
    max-width: 200px;
  }
  
  .app__theme-toggle,
  .app__add-card-btn,
  .app__test-link {
    width: 100%;
  }
}
</style>
