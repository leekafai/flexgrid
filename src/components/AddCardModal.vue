<template>
  <div class="add-card-modal" @click="$emit('close')">
    <div class="add-card-modal__content" @click.stop>
      <div class="add-card-modal__header">
        <h2 class="add-card-modal__title">Add New Card</h2>
        <button 
          class="add-card-modal__close" 
          @click="$emit('close')"
          title="Close"
        >
          ✕
        </button>
      </div>
      
      <div class="add-card-modal__body">
        <div class="add-card-modal__form">
          <div class="add-card-modal__field">
            <label class="add-card-modal__label">Card Type</label>
            <div class="add-card-modal__card-types">
              <button
                v-for="type in cardTypes"
                :key="type.value"
                :class="[
                  'add-card-modal__card-type',
                  { 'add-card-modal__card-type--active': selectedType === type.value }
                ]"
                @click="selectedType = type.value"
              >
                <span class="add-card-modal__card-type-icon">{{ type.icon }}</span>
                <span class="add-card-modal__card-type-label">{{ type.label }}</span>
              </button>
            </div>
          </div>
          
          <div class="add-card-modal__field">
            <label class="add-card-modal__label">Title</label>
            <input
              v-model="cardData.title"
              type="text"
              class="add-card-modal__input"
              placeholder="Enter card title"
            />
          </div>
          
          <div class="add-card-modal__field">
            <label class="add-card-modal__label">Content</label>
            <textarea
              v-model="cardData.content"
              class="add-card-modal__textarea"
              :placeholder="getContentPlaceholder()"
              rows="3"
            ></textarea>
          </div>
          
          <div class="add-card-modal__field">
            <label class="add-card-modal__label">Size</label>
            <div class="add-card-modal__sizes">
              <button
                v-for="size in cardSizes"
                :key="size.value"
                :class="[
                  'add-card-modal__size',
                  { 'add-card-modal__size--active': selectedSize === size.value }
                ]"
                @click="selectedSize = size.value"
              >
                {{ size.label }}
              </button>
            </div>
          </div>
          
          <div class="add-card-modal__field">
            <label class="add-card-modal__checkbox">
              <input
                v-model="cardData.interactive"
                type="checkbox"
                class="add-card-modal__checkbox-input"
              />
              <span class="add-card-modal__checkbox-label">Interactive (draggable & resizable)</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="add-card-modal__footer">
        <button 
          class="add-card-modal__btn add-card-modal__btn--secondary" 
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button 
          class="add-card-modal__btn add-card-modal__btn--primary" 
          @click="handleAddCard"
          :disabled="!isValid"
        >
          Add Card
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BentoCard, CardSize, CardType } from '@/types/bento';

interface Emits {
  (e: 'close'): void;
  (e: 'add-card', cardData: Omit<BentoCard, 'id' | 'position'>): void;
}

const emit = defineEmits<Emits>();

const cardTypes = [
  { value: 'text' as CardType, label: 'Text', icon: '📝' },
  { value: 'image' as CardType, label: 'Image', icon: '🖼️' },
  { value: 'link' as CardType, label: 'Link', icon: '🔗' },
  { value: 'video' as CardType, label: 'Video', icon: '🎥' },
  { value: 'social' as CardType, label: 'Social', icon: '👥' },
  { value: 'stats' as CardType, label: 'Stats', icon: '📊' },
  { value: 'weather' as CardType, label: 'Weather', icon: '🌤️' },
  { value: 'music' as CardType, label: 'Music', icon: '🎵' }
];

const cardSizes = [
  { value: 'small' as CardSize, label: 'Small' },
  { value: 'medium' as CardSize, label: 'Medium' },
  { value: 'large' as CardSize, label: 'Large' },
  { value: 'wide' as CardSize, label: 'Wide' }
];

const selectedType = ref<CardType>('text');
const selectedSize = ref<CardSize>('wide');

const cardData = ref({
  title: '',
  content: '',
  interactive: true,
  animation: 'fade' as const
});

const getContentPlaceholder = () => {
  const placeholders: Record<CardType, string> = {
    text: 'Enter your text content',
    image: 'Enter image URL',
    link: 'Enter URL (e.g., https://example.com)',
    video: 'Enter video URL (YouTube, Vimeo)',
    social: 'Enter social handles (JSON format)',
    stats: 'Enter stats (JSON format)',
    weather: 'Enter weather data (JSON format)',
    music: 'Enter music info (JSON format)'
  };
  return placeholders[selectedType.value];
};

const isValid = computed(() => {
  return cardData.value.content.trim().length > 0;
});

const handleAddCard = () => {
  if (!isValid.value) return;
  
  const newCard: Omit<BentoCard, 'id' | 'position'> = {
    type: selectedType.value,
    title: cardData.value.title || undefined,
    content: parseContent(cardData.value.content, selectedType.value),
    size: selectedSize.value,
    interactive: cardData.value.interactive,
    animation: cardData.value.animation
  };
  
  emit('add-card', newCard);
};

const parseContent = (content: string, type: CardType) => {
  if (['social', 'stats', 'weather', 'music'].includes(type)) {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
  return content;
};
</script>

<style scoped>
.add-card-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.add-card-modal__content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.add-card-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.add-card-modal__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.add-card-modal__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.add-card-modal__close:hover {
  background: #f3f4f6;
  color: #374151;
}

.add-card-modal__body {
  padding: 1.5rem;
}

.add-card-modal__form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.add-card-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-card-modal__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.add-card-modal__card-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
}

.add-card-modal__card-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-card-modal__card-type:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.add-card-modal__card-type--active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.add-card-modal__card-type-icon {
  font-size: 1.5rem;
}

.add-card-modal__card-type-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.add-card-modal__input,
.add-card-modal__textarea {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.add-card-modal__input:focus,
.add-card-modal__textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-card-modal__textarea {
  resize: vertical;
  min-height: 80px;
}

.add-card-modal__sizes {
  display: flex;
  gap: 0.5rem;
}

.add-card-modal__size {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.add-card-modal__size:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.add-card-modal__size--active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.add-card-modal__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.add-card-modal__checkbox-input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.add-card-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.add-card-modal__btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-card-modal__btn--secondary {
  background: #f3f4f6;
  color: #374151;
}

.add-card-modal__btn--secondary:hover {
  background: #e5e7eb;
}

.add-card-modal__btn--primary {
  background: #3b82f6;
  color: white;
}

.add-card-modal__btn--primary:hover:not(:disabled) {
  background: #2563eb;
}

.add-card-modal__btn--primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .add-card-modal__content {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
  
  .add-card-modal__card-types {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .add-card-modal__sizes {
    flex-wrap: wrap;
  }
  
  .add-card-modal__footer {
    flex-direction: column;
  }
  
  .add-card-modal__btn {
    width: 100%;
  }
}
</style>
