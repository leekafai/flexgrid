<template>
  <div class="test-page">
    <div class="test-header">
      <h1>Bento Grid 新结构测试</h1>
      <p>基于行的拖拽网格系统测试</p>
      
      <div class="test-controls">
        <button @click="addTestCard" class="btn btn-primary">添加测试卡片</button>
        <button @click="addRowAtEnd" class="btn btn-secondary">在末尾添加空行</button>
        <button @click="addRowInMiddle" class="btn btn-secondary">在中间添加空行</button>
        <button @click="clearGrid" class="btn btn-danger">清空网格</button>
        <button @click="initializeRows" class="btn btn-info">重新初始化行</button>
      </div>
      
      <div class="test-info">
        <p>总行数: {{ grid.rows?.length || 0 }}</p>
        <p>总卡片数: {{ grid.cards.length }}</p>
        <p>拖拽状态: {{ isDragging ? '拖拽中' : '空闲' }}</p>
        <p v-if="dragState">目标行: {{ dragState.targetRowIndex }}, 目标位置: {{ dragState.targetCardIndex }}</p>
      </div>
    </div>
    
    <div class="test-grid-container">
      <BentoGrid ref="gridRef" storage-key="test-bento-grid">
        <template #card="{ card }">
          <div class="test-card-content">
            <h3>{{ card.title || '卡片' }}</h3>
            <p>行: {{ card.rowIndex }}, 位置: ({{ card.position.x }}, {{ card.position.y }})</p>
            <p>类型: {{ card.type }}, 大小: {{ card.size }}</p>
          </div>
        </template>
      </BentoGrid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BentoGrid from '@/components/BentoGrid.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import type { BentoCard } from '@/types/bento';

const gridRef = ref<InstanceType<typeof BentoGrid>>();
const { grid, isDragging } = useBentoGrid();
const { dragState } = useDragAndDrop();

// 初始化时添加一些测试卡片
const initializeTestCards = () => {
  // 添加几个测试卡片到不同的行
  const testCards = [
    {
      type: 'text' as const,
      title: '测试卡片 1',
      content: '这是第一行的测试卡片',
      size: 'medium' as const,
      position: { x: 0, y: 0 },
      rowIndex: 0,
      interactive: true,
      style: {
        backgroundColor: '#ffebee',
        textColor: '#c62828',
        borderRadius: '12px'
      }
    },
    {
      type: 'text' as const,
      title: '测试卡片 2',
      content: '这是第二行的测试卡片',
      size: 'small' as const,
      position: { x: 2, y: 1 },
      rowIndex: 1,
      interactive: true,
      style: {
        backgroundColor: '#e8f5e8',
        textColor: '#2e7d32',
        borderRadius: '12px'
      }
    },
    {
      type: 'text' as const,
      title: '测试卡片 3',
      content: '这是第三行的测试卡片',
      size: 'large' as const,
      position: { x: 0, y: 2 },
      rowIndex: 2,
      interactive: true,
      style: {
        backgroundColor: '#e3f2fd',
        textColor: '#1976d2',
        borderRadius: '12px'
      }
    }
  ];
  
  testCards.forEach(card => {
    gridRef.value?.addCard(card);
  });
};

// 组件挂载后初始化测试卡片
import { onMounted } from 'vue';
onMounted(() => {
  setTimeout(() => {
    initializeTestCards();
  }, 100);
});

const cardTypes = ['text', 'image', 'link', 'video', 'stats'];
const cardSizes: Array<'small' | 'medium' | 'large' | 'wide'> = ['small', 'medium', 'large', 'wide'];

const addTestCard = () => {
  const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  const size = cardSizes[Math.floor(Math.random() * cardSizes.length)];
  const rowIndex = Math.floor(Math.random() * 5); // 随机分配到前5行
  
  const card: Omit<BentoCard, 'id'> = {
    type,
    title: `测试卡片 ${Date.now()}`,
    content: `这是 ${type} 类型的测试卡片`,
    size,
    position: { x: 0, y: rowIndex },
    rowIndex,
    interactive: true, // 关键：启用拖拽功能
    style: {
      backgroundColor: `hsl(${Math.random() * 360}, 70%, 80%)`,
      textColor: '#333',
      borderRadius: '12px'
    }
  };
  
  gridRef.value?.addCard(card);
};

const addRowAtEnd = () => {
  const currentMaxRow = Math.max(...grid.value.cards.map(c => c.rowIndex ?? 0), -1);
  const newRowIndex = currentMaxRow + 1;
  
  // 添加一个卡片到新行来创建行
  const card: Omit<BentoCard, 'id'> = {
    type: 'text',
    title: `新行 ${newRowIndex} 卡片`,
    content: `这是新行 ${newRowIndex} 的卡片`,
    size: 'small',
    position: { x: 0, y: newRowIndex },
    rowIndex: newRowIndex,
    interactive: true, // 关键：启用拖拽功能
    style: {
      backgroundColor: '#e3f2fd',
      textColor: '#1976d2',
      borderRadius: '12px'
    }
  };
  
  gridRef.value?.addCard(card);
};

const addRowInMiddle = () => {
  const currentRows = grid.value.rows?.length || 0;
  if (currentRows === 0) {
    addRowAtEnd();
    return;
  }
  
  const insertPosition = Math.floor(currentRows / 2);
  
  // 添加一个卡片到中间行来创建行
  const card: Omit<BentoCard, 'id'> = {
    type: 'text',
    title: `中间行 ${insertPosition} 卡片`,
    content: `这是插入到行 ${insertPosition} 的卡片`,
    size: 'small',
    position: { x: 0, y: insertPosition },
    rowIndex: insertPosition,
    interactive: true, // 关键：启用拖拽功能
    style: {
      backgroundColor: '#f3e5f5',
      textColor: '#7b1fa2',
      borderRadius: '12px'
    }
  };
  
  gridRef.value?.addCard(card);
};

const clearGrid = () => {
  grid.value.cards = [];
  if (grid.value.rows) {
    grid.value.rows = [];
  }
};

const initializeRows = () => {
  // 重新初始化行结构
  const { initializeRows } = useBentoGrid();
  initializeRows();
};
</script>

<style scoped>
.test-page {
  min-height: 100vh;
  background: #ffffff;
  padding: 0;
}

.test-header {
  text-align: center;
  color: #111827;
  margin-bottom: 0;
  padding: 48px 20px 24px;
  background: #ffffff;
}

.test-header h1 {
  font-size: 2rem;
  margin-bottom: 8px;
  font-weight: 600;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-header p {
  font-size: 1.1rem;
  opacity: 0.7;
  margin-bottom: 32px;
  color: #6b7280;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 24px 0 0;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  background: #ffffff;
  color: #374151;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn:active {
  transform: translateY(0);
  background: #f3f4f6;
}

.btn-primary {
  background: #111827;
  color: white;
  border-color: #111827;
}

.btn-primary:hover {
  background: #374151;
  border-color: #374151;
}

.btn-secondary {
  background: #f9fafb;
  color: #374151;
  border-color: #e5e7eb;
}

.btn-secondary:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.test-info {
  padding: 16px 0 0;
  margin-top: 16px;
  color: #6b7280;
  border-top: 1px solid #f3f4f6;
}

.test-info p {
  margin: 6px 0;
  font-size: 13px;
  font-weight: 400;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-grid-container {
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
}

.test-card-content {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.test-card-content h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

.test-card-content p {
  margin: 4px 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  font-weight: 400;
}

@media (max-width: 768px) {
  .test-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 200px;
  }
  
  .test-header h1 {
    font-size: 2rem;
  }
}
</style>
