<template>
  <div
    :class="[
      'bento-card',
      `bento-card--${card.size}`,
      `bento-card--${card.type}`,
      {
        'bento-card--interactive': card.interactive,
        'bento-card--dragging': isDragging
      }
    ]"
    :style="cardStyles"
    ref="rootEl"
    @mousedown="handleMouseDown"
    @touchstart.passive="handleTouchStart"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :draggable="card.interactive ? true : false"
    @dragstart="handleHtml5DragStart"
    @dragend="handleHtml5DragEnd"
  >
  <div class="bento-card__content">
      <template v-if="contentVisible">
        <template v-if="hasDefaultSlot">
          <slot />
        </template>
        <template v-else>
          <div class="bento-card__default">
            <div class="bento-card__default-title">{{ card.title }}</div>
            <div class="bento-card__default-content">{{ typeof card.content === 'string' ? card.content : '' }}</div>
          </div>
        </template>
      </template>
      <template v-else>
        <div class="bento-card__skeleton" />
      </template>
  </div>
    
    <div v-if="card.interactive" class="bento-card__controls">
      <button
        class="bento-card__resize-btn"
        @click="cycleSize"
        title="Resize card"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
          <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2"/>
          <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <button
        class="bento-card__remove-btn"
        @click="handleRemove"
        title="Remove card"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useSlots, onMounted, onUnmounted } from 'vue';
import type { BentoCard, CardSize } from '@/types/bento';

interface Props {
  card: BentoCard;
  isDragging?: boolean;
  allowedSizes?: Array<[number, number]>;
  hoverScale?: number;
  shadowStrength?: number;
}

interface Emits {
  (e: 'update', cardId: string, updates: Partial<BentoCard>): void;
  (e: 'remove', cardId: string): void;
  (e: 'drag-start', card: BentoCard, event: MouseEvent | TouchEvent): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isHovered = ref(false);
const isPressed = ref(false);
const scale = ref(1);
const shadow = ref(0.06);
const targetScale = ref(1);
const targetShadow = ref(0.06);
let rafId: number | null = null;
const contentVisible = ref(true);
let io: IntersectionObserver | null = null;
const rootEl = ref<HTMLElement | null>(null);

const slots = useSlots();
const hasDefaultSlot = computed(() => !!slots.default);

const cardStyles = computed(() => ({
  backgroundColor: props.card.style?.backgroundColor || '#ffffff',
  color: props.card.style?.textColor || '#000000',
  borderRadius: props.card.style?.borderRadius || '12px',
  background: props.card.style?.gradient || undefined,
  transition: 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)',
  transform: props.isDragging ? 'scale(1.02)' : `scale(${scale.value})`,
  boxShadow: `0 8px 28px rgba(15, 23, 42, ${shadow.value})`,
  cursor: props.card.interactive ? 'grab' : 'default'
}));

const getCardComponent = () => null;

const handleMouseDown = (event: MouseEvent) => {
  if (props.card.interactive) {
    emit('drag-start', props.card, event);
  }
  isPressed.value = true;
  targetScale.value = 0.98;
  targetShadow.value = 0.12;
  console.log('[DND] card mousedown', { id: props.card.id, interactive: props.card.interactive });
};

const handleTouchStart = (event: TouchEvent) => {
  if (props.card.interactive) {
    emit('drag-start', props.card, event);
  }
  isPressed.value = true;
  targetScale.value = 0.98;
  targetShadow.value = 0.12;
  console.log('[DND] card touchstart', { id: props.card.id, interactive: props.card.interactive });
};

const handleMouseEnter = () => {
  isHovered.value = true;
  if (!isPressed.value) {
    targetScale.value = props.hoverScale ?? 1.03;
    targetShadow.value = props.shadowStrength ?? 0.12;
  }
};

const handleMouseLeave = () => {
  isHovered.value = false;
  isPressed.value = false;
  targetScale.value = 1;
  targetShadow.value = 0.06;
};

const handleUpdate = (updates: Partial<BentoCard>) => {
  emit('update', props.card.id, updates);
};

const handleRemove = () => {
  emit('remove', props.card.id);
};

const cycleSize = () => {
  const sizes = (props as any).allowedSizes ?? [[2,2]];
  const current = props.card.units ? [props.card.units.h, props.card.units.w] as [number, number] : [2,2];
  const idx = sizes.findIndex(([h,w]: [number, number]) => h === current[0] && w === current[1]);
  const next = sizes[(idx + 1) % sizes.length] || sizes[0];
  emit('update', props.card.id, { units: { h: next[0], w: next[1] } });
};
</script>

<style scoped>
.bento-card {
  position: relative;
  overflow: hidden;
  border: none;
  user-select: none;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

/* 尺寸由布局的单位与跨度控制，移除固定最小高度以保持方形 */

.bento-card--interactive:hover { }

.bento-card--dragging {
  z-index: 1000;
  pointer-events: none;
  opacity: 0.8;
}

.bento-card__content {
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bento-card__skeleton {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(226,232,240,0.6) 25%, rgba(226,232,240,0.9) 37%, rgba(226,232,240,0.6) 63%);
  background-size: 400% 100%;
  animation: bentoShimmer 1.2s ease infinite;
}

@keyframes bentoShimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

.bento-card__default {
  text-align: center;
}

.bento-card__default-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #111827;
  line-height: 1.4;
}

.bento-card__default-content {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.bento-card__controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.bento-card:hover .bento-card__controls {
  opacity: 1;
}

.bento-card__resize-btn,
.bento-card__remove-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.bento-card__resize-btn:hover,
.bento-card__remove-btn:hover {
  background: rgba(255, 255, 255, 1);
  color: #333;
  transform: scale(1.1);
}

.bento-card__remove-btn:hover {
  background: #ff4444;
  color: white;
}
</style>
const handleMouseUpDoc = () => {
  if (isHovered.value) {
    targetScale.value = props.hoverScale ?? 1.03;
    targetShadow.value = props.shadowStrength ?? 0.12;
  } else {
    targetScale.value = 1;
    targetShadow.value = 0.06;
  }
  isPressed.value = false;
};

const step = () => {
  const s = scale.value + (targetScale.value - scale.value) * 0.2;
  const sh = shadow.value + (targetShadow.value - shadow.value) * 0.2;
  scale.value = Math.abs(s - targetScale.value) < 0.001 ? targetScale.value : s;
  shadow.value = Math.abs(sh - targetShadow.value) < 0.001 ? targetShadow.value : sh;
  rafId = requestAnimationFrame(step);
};

onMounted(() => {
  rafId = requestAnimationFrame(step);
  document.addEventListener('mouseup', handleMouseUpDoc, { passive: true });
  document.addEventListener('touchend', handleMouseUpDoc, { passive: true });
  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      contentVisible.value = entry.isIntersecting;
    });
  }, { threshold: 0.1, rootMargin: '100px' });
  if (rootEl.value) io.observe(rootEl.value);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  document.removeEventListener('mouseup', handleMouseUpDoc);
  document.removeEventListener('touchend', handleMouseUpDoc);
  if (io) io.disconnect();
});
const handleHtml5DragStart = (e: DragEvent) => {
  if (!props.card.interactive) return;
  try {
    e.dataTransfer?.setData('text/plain', props.card.id);
    emit('drag-start', props.card, e as unknown as MouseEvent);
    if (rootEl.value && e.dataTransfer?.setDragImage) {
      e.dataTransfer.setDragImage(rootEl.value, rootEl.value.clientWidth / 2, rootEl.value.clientHeight / 2);
    }
    console.log('[DND] card dragstart', { id: props.card.id });
  } catch {}
};

const handleHtml5DragEnd = () => {
  isPressed.value = false;
  targetScale.value = isHovered.value ? (props.hoverScale ?? 1.03) : 1;
  targetShadow.value = isHovered.value ? (props.shadowStrength ?? 0.12) : 0.06;
  console.log('[DND] card dragend', { id: props.card.id });
};
