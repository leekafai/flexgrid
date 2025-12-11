<template>
  <div class="bento-grid" :style="gridStyles" ref="gridEl" @dragover.prevent="handleDragOver" @dragenter.prevent="handleDragEnter" @drop.prevent="handleDrop">
    <BentoCard
      v-for="(card, idx) in grid.cards"
      :key="card.id"
      :card="card"
      :is-dragging="draggedCard?.id === card.id"
      @update="handleCardUpdate"
      @remove="handleCardRemove"
      @store="handleCardStore"
      @drag-start="handleDragStart"
      class="bento-grid__card"
      :style="[getCardStyles(card), getDragStylesSafe(card), getAnimStyles(card)]"
      :data-id="card.id"
    >
      <slot name="card" :card="card" :index="idx" />
    </BentoCard>
    
    <!-- 拖拽目标阴影 -->
    <div
      v-if="dropTargetVisible && dropRect"
      class="bento-grid__drop-target"
        :style="[getDropTargetStyles(grid.columns, grid.gap, grid.unit ?? 89, props.debugDropColor), dropShadowStyle]"
    />
    
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import { useBentoAnimations } from '@/composables/useBentoAnimations';
import BentoCard from './BentoCard.vue';
import type { BentoCard as BentoCardType, BentoGridRow } from '@/types/bento';
import { createPluginManager } from '@/plugins/manager';
import { avoidancePlugin } from '@/plugins/avoidance/index';
import { placementPlugin } from '@/plugins/placement/index';
import { attachPlacementObserver } from '@/debug/debugPlacementObserver';
import { calculateBezierPosition, calculateControlPoint, easeInOutCubic, easeOutBounce } from '@/utils/bezierPath';
import type { AnimationPosition } from '@/specs/003-restore-card-animation/contracts/restore-animation-interfaces';

const { 
  grid, 
  isDragging, 
  draggedCard, 
  addCard, 
  placeCard,
  removeCard, 
  updateCard, 
  startDrag, 
  moveCard, 
  getGridStyles, 
  getCardStyles, 
  getCardUnits,
  reorderCardByIndex, 
  saveLayout, 
  loadLayout, 
  setViewportGridBounds, 
  expandRowsForBottom,
  moveCardToRow,
  addRow,
  initializeRows
} = useBentoGrid();

const { 
  updateDrag, 
  endDrag, 
  getDropTargetStyles, 
  findValidPosition, 
  getDragStyles, 
  draggedCard: dragDropCard, 
  dropTarget, 
  dropIndex, 
  dropRect, 
  dragState,
  getOriginGhostStyles, 
  startDrag: startDragDnd,
  dragSource,
  isDragOverStorage
} = useDragAndDrop();

const { getCardAnimationStyles, createIntersectionObserver } = useBentoAnimations();

const plugins = createPluginManager();
plugins.register(avoidancePlugin);
plugins.register(placementPlugin);
const animations = ref(new Map<string, { duration: number; easing: string }>());
const animSuppressMove = ref(new Set<string>());
// 临时卡片状态管理（用于延迟部署机制）
const temporaryCards = ref(new Map<string, {
  card: Omit<BentoCardType, 'id'>;
  targetGridPosition: { x: number; y: number };
  animationId: string;
  createdAt: number;
  element: HTMLElement | null;
}>());
// 正在部署的卡片ID（用于渐显效果）
const deployingCards = ref(new Set<string>());
const dropTargetVisible = ref(false);
const dropShadowOpacity = ref(0);
const dropShadowDropping = ref(false);
const dropShadowStyle = computed(() => {
  const ms = props.dropShadowFadeMs ?? 220;
  const s: CSSProperties = { opacity: dropShadowOpacity.value } as any;
  if (dropShadowDropping.value) {
    (s as any).transform = 'scale(0.96)';
    (s as any).animation = 'none';
    (s as any).boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
  } else {
    (s as any).transform = 'scale(1)';
    (s as any).animation = 'dropTargetPulse 1s infinite';
  }
  return s as any;
}) as any;
const overlapUnresolved = ref(false);

const pathSamples = new Map<string, Array<{ t: number; expected: { x: number; y: number }; actual: { x: number; y: number }; deviation: number; lineDist: number; tProj: number; onLine: boolean }>>();
const startLinePathDebug = (id: string, el: HTMLElement, ax: number, ay: number, bx: number, by: number, duration: number) => {
  const start = performance.now();
  const dx = bx - ax;
  const dy = by - ay;
  let rafId = 0;
  const poll = () => {
    const t = Math.max(0, Math.min(1, (performance.now() - start) / duration));
    const ex = ax + dx * t;
    const ey = ay + dy * t;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dev = Math.hypot(cx - ex, cy - ey);
    const abLen = Math.hypot(dx, dy) || 1;
    const lineDist = Math.abs((cx - ax) * dy - (cy - ay) * dx) / abLen;
    const tProj = ((cx - ax) * dx + (cy - ay) * dy) / (abLen * abLen);
    const onLine = lineDist <= 2.5 && tProj >= -0.02 && tProj <= 1.02;
    const rec = { t, expected: { x: ex, y: ey }, actual: { x: cx, y: cy }, deviation: dev };
    const rec2 = { ...rec, lineDist, tProj, onLine };
    if (!pathSamples.has(id)) pathSamples.set(id, []);
    pathSamples.get(id)!.push(rec2);
    if (dev > 4) {
      try { console.warn('[PathDBG]', JSON.stringify({ id, t, expected: { x: ex, y: ey }, actual: { x: cx, y: cy }, deviation: dev })) } catch {}
    }
    if (t < 1) { rafId = requestAnimationFrame(poll) }
  };
  rafId = requestAnimationFrame(poll);
  setTimeout(() => {
    if (rafId) cancelAnimationFrame(rafId);
    const arr = pathSamples.get(id) || [];
    try { console.log('[DBG-PathSamples]', id, arr) } catch {}
    const maxLineDist = arr.reduce((m, s) => Math.max(m, s.lineDist ?? 0), 0);
    const allOnLine = arr.every(s => s.onLine);
    try { console.log('[DBG-PathVerify]', { id, A: { x: ax, y: ay }, B: { x: bx, y: by }, maxLineDist, allOnLine }) } catch {}
    pathSamples.delete(id);
  }, duration + 80);
};

const applyAnimations = (plan: { animations?: Array<{ cardId: string; duration: number; easing: string; type: string; from?: { x: number; y: number }; to?: { x: number; y: number } }> } | null) => {
  if (!plan || !plan.animations || plan.animations.length === 0) return;
  for (const a of plan.animations) {
    if (a.type === 'translate') {
      if (animations.value.has(a.cardId)) continue;
      const el = gridEl.value?.querySelector(`.bento-grid__card[data-id="${a.cardId}"]`) as HTMLElement | null;
      if (el) {
        const st = getComputedStyle(el);
        console.log('[Anim] apply translate', {
          id: a.cardId,
          from: a.from,
          to: a.to,
          domLeft: st.left,
          domTop: st.top,
          easing: a.easing,
          duration: a.duration
        });
        if (a.from && a.to && draggedCard.value && draggedCard.value.id === a.cardId) {
          const first = el.getBoundingClientRect();
          animSuppressMove.value.add(a.cardId);
          moveCard(a.cardId, { x: a.to!.x, y: a.to!.y });
          requestAnimationFrame(() => {
            const last = el.getBoundingClientRect();
            const dx = first.left - last.left;
            const dy = first.top - last.top;
            const distance = Math.hypot(dx, dy);
            const v = (props.dropSpeed ?? 1200);
            const duration = Math.max(0, Math.round((distance / v) * 1000));
            animations.value.set(a.cardId, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
            el.style.transition = 'none';
            el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.03)`;
            el.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.18)';
            el.style.willChange = 'transform';
            el.style.pointerEvents = 'none';
            requestAnimationFrame(() => {
              el.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1), box-shadow ${duration}ms cubic-bezier(.2,.8,.2,1)`;
              el.style.transform = 'translate3d(0, 0, 0) scale(1.00)';
              el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.04)';
            });
            const ax = first.left + first.width / 2;
            const ay = first.top + first.height / 2;
            const bx = last.left + last.width / 2;
            const by = last.top + last.height / 2;
            startLinePathDebug(a.cardId, el, ax, ay, bx, by, duration);
            setTimeout(() => {
              el.style.transition = 'none';
              el.style.transform = 'translate3d(0, 0, 0) scale(0.98)';
              el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0)';
              requestAnimationFrame(() => {
                el.style.transition = 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 140ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                el.style.transform = 'translate3d(0, 0, 0) scale(1.00)';
                el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.04)';
              });
            }, duration + 10);
            setTimeout(() => {
              el.style.transition = '';
              el.style.transform = '';
              el.style.boxShadow = '';
              el.style.willChange = '';
              el.style.pointerEvents = '';
              animSuppressMove.value.delete(a.cardId);
              animations.value.delete(a.cardId);
            }, duration + 10 + 160 + 20);
          });
          continue;
        }
      }
      animations.value.set(a.cardId, { duration: a.duration, easing: a.easing });
      setTimeout(() => {
        animations.value.delete(a.cardId);
      }, a.duration + 50);
    }
  }
};

const lastShadow = ref<{ left: number; top: number; area: string } | null>(null);
const hasPlacedOnce = ref(false);

const dragOriginPos = ref<{ x: number; y: number } | null>(null);

const rectOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
};

const unitsOf = (card: BentoCardType) => {
  if (card.units) return card.units;
  const map: Record<string, { w: number; h: number }> = { small: { w: 1, h: 1 }, medium: { w: 2, h: 1 }, large: { w: 1, h: 2 }, wide: { w: 2, h: 2 } };
  const size = (card.size as any) || 'wide';
  return map[size] || { w: 2, h: 2 };
};

const getAnimStyles = (card: BentoCardType) => {
  const anim = animations.value.get(card.id);
  const base = 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)';
  const isDragged = draggedCard.value && draggedCard.value.id === card.id;
  const isDeploying = deployingCards.value.has(card.id);
  const transition = anim ? (isDragged ? `transform ${anim.duration}ms ${anim.easing}, box-shadow ${anim.duration}ms ${anim.easing}` : `left ${anim.duration}ms ${anim.easing}, top ${anim.duration}ms ${anim.easing}, ${base}`) : base;
  const opacityTransition = isDeploying ? 'opacity 0.3s ease-out' : '';
  const fullTransition = opacityTransition ? `${transition}, ${opacityTransition}` : transition;
  const opacity = isDeploying ? 0 : 1;
  return { transition: fullTransition, willChange: 'left, top, transform, opacity', opacity } as any;
};

const getDragStylesSafe = (card: BentoCardType) => {
  if (animations.value.has(card.id)) return {} as any;
  return getDragStyles(card as any, grid.value.unit ?? 89, grid.value.gap) as any;
};

const collidesAt = (card: BentoCardType, pos: { x: number; y: number }) => {
  const u = unitsOf(card);
  const a = { x: pos.x, y: pos.y, w: u.w, h: u.h };
  for (const c of grid.value.cards) {
    if (c.id === card.id) continue;
    const uc = unitsOf(c);
    const b = { x: c.position.x, y: c.position.y, w: uc.w, h: uc.h };
    if (rectOverlap(a, b)) return true;
  }
  return false;
};

/**
 * 创建临时卡片元素（用于延迟部署机制）
 * 临时卡片元素会被添加到 DOM，但不会添加到 grid.value.cards
 */
const createTempCardElement = (
  tempCard: Omit<BentoCardType, 'id'>,
  tempCardId: string,
  targetPosition: { x: number; y: number }
): HTMLElement | null => {
  if (!gridEl.value) return null;

  // 创建临时卡片容器
  const tempElement = document.createElement('div');
  tempElement.className = 'bento-grid__card bento-grid__card--temp';
  tempElement.setAttribute('data-id', tempCardId);
  tempElement.setAttribute('data-temp', 'true');

  // 计算卡片样式
  const units = getCardUnits(tempCard);
  const unit = grid.value.unit ?? 89;
  const gap = grid.value.gap;
  const cardWidth = units.w * unit + (units.w - 1) * gap;
  const cardHeight = units.h * unit + (units.h - 1) * gap;
  const left = targetPosition.x * (unit + gap);
  const top = targetPosition.y * (unit + gap);

  // 设置基础样式
  tempElement.style.position = 'absolute';
  tempElement.style.left = `${left}px`;
  tempElement.style.top = `${top}px`;
  tempElement.style.width = `${cardWidth}px`;
  tempElement.style.height = `${cardHeight}px`;
  tempElement.style.pointerEvents = 'none';
  tempElement.style.zIndex = '1000';

  // 创建卡片内容（简化版本，用于动画显示）
  const cardContent = document.createElement('div');
  cardContent.className = 'bento-card';
  cardContent.className += ` bento-card--${tempCard.size || 'wide'}`;
  cardContent.className += ` bento-card--${tempCard.type || 'text'}`;
  
  // 设置卡片内容样式
  if (tempCard.style) {
    if (tempCard.style.backgroundColor) {
      cardContent.style.backgroundColor = tempCard.style.backgroundColor;
    }
    if (tempCard.style.textColor) {
      cardContent.style.color = tempCard.style.textColor;
    }
    if (tempCard.style.borderRadius) {
      cardContent.style.borderRadius = tempCard.style.borderRadius;
    }
  }

  // 添加卡片内容
  const contentDiv = document.createElement('div');
  contentDiv.className = 'bento-card__content';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'bento-card__default-title';
  titleDiv.textContent = tempCard.title || '';
  const contentTextDiv = document.createElement('div');
  contentTextDiv.className = 'bento-card__default-content';
  if (typeof tempCard.content === 'string') {
    contentTextDiv.textContent = tempCard.content;
  }
  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(contentTextDiv);
  cardContent.appendChild(contentDiv);
  tempElement.appendChild(cardContent);

  return tempElement;
};

// Expose methods for parent components
defineExpose({
  placeCard,
  addCard,
  removeCard,
  saveLayout,
  loadLayout,
  reorderCardByIndex
});

interface Props {
  columns?: number;
  gap?: number;
  unit?: number;
  breakpoints?: { mobile: number; tablet: number; desktop: number };
  virtualized?: boolean;
  storageKey?: string;
  debugDropColor?: string;
  dropSpeed?: number;
  dropShadowFadeMs?: number;
  avoidanceDelayMs?: number;
  reserveRows?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'store-card': [card: BentoCardType];
}>();

const placeholderStyles = ref({});
const gridEl = ref<HTMLElement | null>(null);

const gridStyles = computed(() => ({
  ...getGridStyles.value,
  position: 'relative',
  minHeight: '80vh'
})) as any;

const handleCardUpdate = (cardId: string, updates: Partial<BentoCardType>) => {
  updateCard(cardId, updates);
};

const handleCardRemove = (cardId: string) => {
  removeCard(cardId);
};

const handleCardStore = (card: BentoCardType) => {
  console.log('BentoGrid 收到收纳事件，卡片信息:', card.id, card.title);
  emit('store-card', card);
};

const handleDragStart = (card: BentoCardType, event: MouseEvent | TouchEvent) => {
  console.log('[DND] Starting drag for card:', card.id, 'interactive:', card.interactive);
  
  // 检查卡片是否可交互
  if (!card.interactive) {
    console.log('[DND] Card is not interactive, ignoring drag');
    return;
  }
  
  // 设置拖拽状态
  const before = { gridDragging: isDragging.value, gridDraggedId: draggedCard.value?.id, dndDraggedId: dragDropCard.value?.id };
  startDrag(card, event);
  startDragDnd(card, event as any);
  const after = { gridDragging: isDragging.value, gridDraggedId: draggedCard.value?.id, dndDraggedId: dragDropCard.value?.id };
  console.log('[DND] grid handleDragStart', { cardId: card.id, before, after });
  lastShadow.value = null;
  dragOriginPos.value = { x: card.position.x, y: card.position.y };
  dropTargetVisible.value = true;
  dropShadowOpacity.value = 0.8;
  dropShadowDropping.value = false;
  
  if (!isDragging.value) {
    console.error('[DND] Failed to start drag - isDragging is false');
    return;
  }
  
  setViewportGridBounds(gridEl.value);

  if (gridEl.value) {
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: card,
      dropRect: dropRect.value || { left: 0, top: 0, width: 0, height: 0 },
      dropTarget: dropTarget.value,
      cards: grid.value.cards
    } as any
    plugins.dispatch('onDragStart', ctx as any)
  }
  
  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !draggedCard.value) {
      console.log('[DND] Mouse move ignored - not dragging or no dragged card');
      return;
    }
    
    console.log('[DND] Processing mouse move');
    
    // 使用新的基于行的拖拽更新
    updateDrag(e, grid.value.columns, grid.value.gap, grid.value.unit ?? 89, grid.value.rows, gridEl.value!, () => {
      if (!gridEl.value || !dropRect.value || !draggedCard.value) return
      const unit = grid.value.unit ?? 89
      const gap = grid.value.gap
      const cell = unit + gap
      const gridX = Math.max(0, Math.floor(dropRect.value.left / cell))
      const gridY = Math.max(0, Math.floor(dropRect.value.top / cell))
      const u = getCardUnits(draggedCard.value)
      const areaKey = `${gridX},${gridY},${u.w},${u.h}`
      const prev = lastShadow.value
      if (prev) {
        const dx = Math.abs(dropRect.value.left - prev.left)
        const dy = Math.abs(dropRect.value.top - prev.top)
        const same = prev.area === areaKey
        if (dx < 5 && dy < 5 && same) return
      }
      lastShadow.value = { left: dropRect.value.left, top: dropRect.value.top, area: areaKey }
      const ctx = {
        gridEl: gridEl.value,
        columns: grid.value.columns,
        gap: grid.value.gap,
        unit: grid.value.unit ?? 89,
        draggedCard: draggedCard.value,
        dropRect: dropRect.value,
        dropTarget: dropTarget.value,
        cards: grid.value.cards,
        avoidanceDelayMs: props.avoidanceDelayMs ?? 100
      } as any
      const plan = plugins.dispatch('onDragUpdate', ctx as any)
      applyAnimations(plan as any)
      if (plan && plan.moves && plan.moves.length > 0) {
        if (import.meta.env.DEV) {
          console.log('[Grid] 应用实时避让移动:', plan.moves)
        }
        for (const mv of plan.moves) {
          if (import.meta.env.DEV) {
            console.log('[Grid] moveCard()', mv.cardId, '->', mv.toPosition)
          }
          if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition)
        }
      }
    });
    
    // 扩展网格高度
    if (dropRect.value) {
      const bottom = dropRect.value.top + dropRect.value.height;
      expandRowsForBottom(bottom);
    }

    if (gridEl.value && draggedCard.value) {
      requestAnimationFrame(() => {
        if (!dropRect.value) return
        const ctx = {
          gridEl: gridEl.value!,
          columns: grid.value.columns,
          gap: grid.value.gap,
          unit: grid.value.unit ?? 89,
          draggedCard: draggedCard.value!,
          dropRect: dropRect.value!,
          dropTarget: dropTarget.value,
          cards: grid.value.cards
        } as any
        const unit = grid.value.unit ?? 89
        const gap = grid.value.gap
        const cell = unit + gap
        const gridX = Math.max(0, Math.floor(dropRect.value.left / cell))
        const gridY = Math.max(0, Math.floor(dropRect.value.top / cell))
        const u = getCardUnits(draggedCard.value!)
        const areaKey = `${gridX},${gridY},${u.w},${u.h}`
        const prev = lastShadow.value
        if (prev) {
          const dx = Math.abs(dropRect.value.left - prev.left)
          const dy = Math.abs(dropRect.value.top - prev.top)
          const same = prev.area === areaKey
          if (dx < 5 && dy < 5 && same) {
            return
          }
        }
        lastShadow.value = { left: dropRect.value.left, top: dropRect.value.top, area: areaKey }
        const plan = plugins.dispatch('onDragUpdate', ctx as any)
        applyAnimations(plan as any)
        if (plan && plan.moves && plan.moves.length > 0) {
          for (const mv of plan.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition) }
        }
      })
    }
    
    console.log('[DND] grid mousemove', { 
      draggedId: draggedCard.value?.id, 
      dropIndex: dropIndex.value, 
      dropRect: dropRect.value,
      dragState: dragState.value 
    });
  };
  
  const handleMouseUp = (e?: MouseEvent | TouchEvent) => {
    console.log('[DND] Mouse up detected');
    if (hasPlacedOnce.value) {
      console.log('[Place] skip duplicate mouseup');
      return;
    }
    isDragging.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleMouseMove);
    document.removeEventListener('touchend', handleMouseUp);
    
    if (!draggedCard.value) {
      console.log('[DND] No dragged card, cleaning up');
      hasPlacedOnce.value = true;
      console.log('[Place] endDrag suppressed overlay, proceeding with grid animation');
      if (dropTargetVisible.value) {
        dropShadowDropping.value = true;
        dropShadowOpacity.value = 0;
        setTimeout(() => { dropTargetVisible.value = false; dropShadowDropping.value = false; }, props.dropShadowFadeMs ?? 220);
      }
      // 由 transform 动画接管，避免在此触发固定层 left/top 过渡
      setTimeout(() => {
        draggedCard.value = null;
        placeholderStyles.value = {};
      }, 300);
      return;
    }

    // 调试观察器：无论布局类型，先尝试接入以捕获完整阶段
    if (gridEl.value && draggedCard.value) {
      const cs = getComputedStyle(gridEl.value);
      const paddingLeft = parseFloat(cs.paddingLeft || '0') || 0;
      const paddingTop = parseFloat(cs.paddingTop || '0') || 0;
      console.log('[DBG-ATTACH] mouseup attach observer for', draggedCard.value.id);
      attachPlacementObserver(
        draggedCard.value.id,
        gridEl.value,
        () => draggedCard.value ? ({ x: draggedCard.value.position.x, y: draggedCard.value.position.y }) : null,
        () => dropRect.value ? { left: dropRect.value.left + gridEl.value!.getBoundingClientRect().left + paddingLeft, top: dropRect.value.top + gridEl.value!.getBoundingClientRect().top + paddingTop, width: dropRect.value.width, height: dropRect.value.height } : null,
        { unit: grid.value.unit ?? 89, gap: grid.value.gap, columns: grid.value.columns, paddingLeft, paddingTop, timeoutMs: 1600 }
      );
    }

    if (draggedCard.value && dropRect.value && gridEl.value) {
      const unit = grid.value.unit ?? 89;
      const gap = grid.value.gap;
      const cell = unit + gap;
      const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
      const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
      const intended = { x: gridX, y: gridY };
      const stillOverlap = overlapUnresolved.value || collidesAt(draggedCard.value, intended);
      const origin = dragOriginPos.value ?? { x: draggedCard.value.position.x, y: draggedCard.value.position.y };

      const containerRect = gridEl.value.getBoundingClientRect();
      const cs = getComputedStyle(gridEl.value);
      const paddingLeft = parseFloat(cs.paddingLeft || '0') || 0;
      const paddingTop = parseFloat(cs.paddingTop || '0') || 0;
      const release = (() => {
        if (e && 'clientX' in e) return { x: e.clientX, y: e.clientY };
        if (e && 'changedTouches' in e && e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        return { x: NaN, y: NaN };
      })();
      const expectedCenter = { x: containerRect.left + paddingLeft + dropRect.value.left + dropRect.value.width / 2, y: containerRect.top + paddingTop + dropRect.value.top + dropRect.value.height / 2 };
      const el = gridEl.value!.querySelector(`.bento-grid__card[data-id="${draggedCard.value.id}"]`) as HTMLElement | null;
      const st = el ? getComputedStyle(el) : null;
      const curLeft = st ? (parseFloat(st.left || '0') || 0) : draggedCard.value.position.x * (unit + gap);
      const curTop = st ? (parseFloat(st.top || '0') || 0) : draggedCard.value.position.y * (unit + gap);
      const u = unitsOf(draggedCard.value);
      const width = u.w * unit + (u.w - 1) * gap;
      const height = u.h * unit + (u.h - 1) * gap;
      const A = { x: containerRect.left + paddingLeft + curLeft + width / 2, y: containerRect.top + paddingTop + curTop + height / 2 };
      const B = expectedCenter;
      console.log('[DBG-Release]', { client: release, local: { x: release.x - containerRect.left - paddingLeft, y: release.y - containerRect.top - paddingTop } });
      console.log('[DBG-A]', A);
      console.log('[DBG-B]', B);
      if (stillOverlap && dropRect.value) {
        dropRect.value = {
          left: origin.x * (unit + gap),
          top: origin.y * (unit + gap),
          width: dropRect.value.width,
          height: dropRect.value.height
        } as any
      }
      console.log('[DDL]', {
        origin,
        shadow: { x: gridX, y: gridY },
        unavoidableOverlap: stillOverlap
      });
      console.log('[PlaceDBG] mouseup', { overlap: stillOverlap, origin, shadow: { left: dropRect.value.left, top: dropRect.value.top, width: dropRect.value.width, height: dropRect.value.height } });
      let reverted = false;
      if (overlapUnresolved.value || collidesAt(draggedCard.value, intended)) {
        const ctx = {
          gridEl: gridEl.value,
          columns: grid.value.columns,
          gap: grid.value.gap,
          unit: grid.value.unit ?? 89,
          draggedCard: draggedCard.value,
          dropRect: dropRect.value,
          dropTarget: dropTarget.value,
          cards: grid.value.cards
        } as any
        const plan = plugins.dispatch('onBeforeDrop', ctx as any)
        applyAnimations(plan as any)
        if (plan && plan.moves && plan.moves.length > 0) {
          for (const mv of plan.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition) }
        }
        
        // 如果插件返回了 shadowPosition，说明无法避让，直接回到原始位置
        if (plan && plan.shadowPosition) {
          // 更新阴影位置到原始位置
          dropRect.value = {
            left: plan.shadowPosition.left,
            top: plan.shadowPosition.top,
            width: dropRect.value.width,
            height: dropRect.value.height
          }
          // 直接移动卡片到原始位置，不再进行碰撞检测
          const origin = dragOriginPos.value ?? { x: draggedCard.value.position.x, y: draggedCard.value.position.y };
          if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, origin)
          reverted = true
        } else if (collidesAt(draggedCard.value, intended)) {
          // 只有在没有 shadowPosition 时才进行传统的碰撞检测
          const origin = dragOriginPos.value ?? { x: draggedCard.value.position.x, y: draggedCard.value.position.y };
          applyAnimations({ animations: [{ cardId: draggedCard.value.id, type: 'translate', duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', from: draggedCard.value.position, to: origin }] } as any)
          dropRect.value = {
            left: origin.x * (unit + gap),
            top: origin.y * (unit + gap),
            width: dropRect.value.width,
            height: dropRect.value.height
          } as any
          if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, origin)
          reverted = true
        } else {
          const planPlace = plugins.dispatch('onBeforeDrop', ctx as any)
          applyAnimations(planPlace as any)
          if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, intended)
        }
      } else {
        const ctx = {
          gridEl: gridEl.value,
          columns: grid.value.columns,
          gap: grid.value.gap,
          unit: grid.value.unit ?? 89,
          draggedCard: draggedCard.value,
          dropRect: dropRect.value,
          dropTarget: dropTarget.value,
          cards: grid.value.cards
        } as any
        const planPlace = plugins.dispatch('onBeforeDrop', ctx as any)
        applyAnimations(planPlace as any)
        applyAnimations({ animations: [{ cardId: draggedCard.value.id, type: 'translate', duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', from: draggedCard.value.position, to: intended }] } as any)
        if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, intended)
      }
      // 处理来自存储的拖放
      if (dragSource.value === 'storage' && draggedCard.value && !reverted) {
        // 从存储区域拖放的卡片需要添加到网格
        const cardToAdd = { ...draggedCard.value, position: intended };
        addCard(cardToAdd);
        console.log('[Storage] Card added to grid from storage:', cardToAdd.id);
        // 通知 FloatingPanel 拖放成功
        const floatingPanelEvent = new CustomEvent('storage-card-dropped', { 
          detail: { cardId: cardToAdd.id, success: true } 
        });
        document.dispatchEvent(floatingPanelEvent);
      } else if (dragSource.value === 'storage' && reverted) {
        // 避让失败，通知 FloatingPanel 取消拖放
        const floatingPanelEvent = new CustomEvent('storage-card-dropped', { 
          detail: { cardId: draggedCard.value?.id, success: false } 
        });
        document.dispatchEvent(floatingPanelEvent);
      }
      
      endDrag();
      if (gridEl.value && !reverted) {
        const ctx = {
          gridEl: gridEl.value,
          columns: grid.value.columns,
          gap: grid.value.gap,
          unit: grid.value.unit ?? 89,
          draggedCard: draggedCard.value,
          dropRect: dropRect.value,
          dropTarget: dropTarget.value,
          cards: grid.value.cards,
          avoidanceDelayMs: props.avoidanceDelayMs ?? 100
        } as any
        const plan2 = plugins.dispatch('onBeforeDrop', ctx as any)
        applyAnimations(plan2 as any)
        if (plan2 && plan2.moves && plan2.moves.length > 0) {
          for (const mv of plan2.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition) }
        }
      }
      saveLayout(props.storageKey);
      plugins.dispatch('onDragEnd', {
        gridEl: gridEl.value!,
        columns: grid.value.columns,
        gap: grid.value.gap,
        unit: grid.value.unit ?? 89,
        draggedCard: draggedCard.value!,
        dropRect: dropRect.value!,
        dropTarget: dropTarget.value,
        cards: grid.value.cards
      } as any)
      if (dropTargetVisible.value) {
        dropShadowDropping.value = true;
        dropShadowOpacity.value = 0;
        setTimeout(() => { dropTargetVisible.value = false; dropShadowDropping.value = false; }, props.dropShadowFadeMs ?? 220);
      }
    }
  
    // 使用新的基于行的放置逻辑
    
    
    console.log('[DND] grid mouseup completed', { 
      draggedId: draggedCard.value?.id, 
      dragState: dragState.value 
    });
    setTimeout(() => {
      draggedCard.value = null;
      placeholderStyles.value = {};
    }, 300);
  };
  
  // 添加事件监听器
  console.log('[DND] Adding event listeners for drag operation');
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp, { passive: true });
  document.addEventListener('touchmove', handleMouseMove, { passive: true });
  document.addEventListener('touchend', handleMouseUp, { passive: true });
};

const handleDragOver = (e: DragEvent) => {
  if (!isDragging.value) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  updateDrag(e as unknown as MouseEvent, grid.value.columns, grid.value.gap, grid.value.unit ?? 89, grid.value.rows, gridEl.value!, () => {
    if (!gridEl.value || !dropRect.value || !draggedCard.value) return;
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
    const u = getCardUnits(draggedCard.value);
    const areaKey = `${gridX},${gridY},${u.w},${u.h}`;
    const prev = lastShadow.value;
    if (prev) {
      const dx = Math.abs(dropRect.value.left - prev.left);
      const dy = Math.abs(dropRect.value.top - prev.top);
      const same = prev.area === areaKey;
      if (dx < 5 && dy < 5 && same) return;
    }
    lastShadow.value = { left: dropRect.value.left, top: dropRect.value.top, area: areaKey };
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value,
      dropRect: dropRect.value,
      dropTarget: dropTarget.value,
      cards: grid.value.cards,
      avoidanceDelayMs: props.avoidanceDelayMs ?? 100
    } as any;
    const plan = plugins.dispatch('onDragUpdate', ctx as any);
    applyAnimations(plan as any)
    if (plan && plan.moves && plan.moves.length > 0) {
      if (import.meta.env.DEV) {
        console.log('[Grid] dragover 应用实时避让移动:', plan.moves)
      }
      for (const mv of plan.moves) {
        if (import.meta.env.DEV) {
          console.log('[Grid] moveCard()', mv.cardId, '->', mv.toPosition)
        }
        if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition);
      }
    }
  });
  if (dropRect.value) {
    const bottom = dropRect.value.top + dropRect.value.height;
    expandRowsForBottom(bottom);
  }
  if (gridEl.value && draggedCard.value) {
    requestAnimationFrame(() => {
      if (!dropRect.value) return
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value!.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value!.top / cell));
    const u = getCardUnits(draggedCard.value);
    const areaKey = `${gridX},${gridY},${u.w},${u.h}`;
    const prev = lastShadow.value;
    if (prev) {
      const dx = Math.abs(dropRect.value!.left - prev.left);
      const dy = Math.abs(dropRect.value!.top - prev.top);
      const same = prev.area === areaKey;
      if (dx < 5 && dy < 5 && same) return;
    }
    lastShadow.value = { left: dropRect.value!.left, top: dropRect.value!.top, area: areaKey };
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value!,
      dropRect: dropRect.value!,
      dropTarget: dropTarget.value,
      cards: grid.value.cards,
      avoidanceDelayMs: props.avoidanceDelayMs ?? 100
    } as any;
    const plan = plugins.dispatch('onDragUpdate', ctx as any);
    applyAnimations(plan as any)
    if (plan && plan.moves && plan.moves.length > 0) {
      if (import.meta.env.DEV) {
        console.log('[Grid] dragenter 应用实时避让移动:', plan.moves)
      }
      for (const mv of plan.moves) {
        if (import.meta.env.DEV) {
          console.log('[Grid] moveCard()', mv.cardId, '->', mv.toPosition)
        }
        if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition);
      }
    }
    })
  }
  console.log('[DND] grid dragover', { draggedId: draggedCard.value?.id, dropIndex: dropIndex.value, dropRect: dropRect.value });
};

const handleDragEnter = (e: DragEvent) => {
  if (!isDragging.value) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  updateDrag(e as unknown as MouseEvent, grid.value.columns, grid.value.gap, grid.value.unit ?? 89, grid.value.rows, gridEl.value!, () => {
    if (!gridEl.value || !dropRect.value || !draggedCard.value) return;
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
    const u = getCardUnits(draggedCard.value);
    const areaKey = `${gridX},${gridY},${u.w},${u.h}`;
    const prev = lastShadow.value;
    if (prev) {
      const dx = Math.abs(dropRect.value.left - prev.left);
      const dy = Math.abs(dropRect.value.top - prev.top);
      const same = prev.area === areaKey;
      if (dx < 5 && dy < 5 && same) return;
    }
    lastShadow.value = { left: dropRect.value.left, top: dropRect.value.top, area: areaKey };
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value,
      dropRect: dropRect.value,
      dropTarget: dropTarget.value,
      cards: grid.value.cards,
      avoidanceDelayMs: props.avoidanceDelayMs ?? 100
    } as any;
    const plan = plugins.dispatch('onDragUpdate', ctx as any);
    if (plan && plan.moves && plan.moves.length > 0) {
      for (const mv of plan.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition); }
    }
  });
  if (gridEl.value && draggedCard.value) {
    requestAnimationFrame(() => {
      if (!dropRect.value) return
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value!.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value!.top / cell));
    const u = getCardUnits(draggedCard.value);
    const areaKey = `${gridX},${gridY},${u.w},${u.h}`;
    const prev = lastShadow.value;
    if (prev) {
      const dx = Math.abs(dropRect.value!.left - prev.left);
      const dy = Math.abs(dropRect.value!.top - prev.top);
      const same = prev.area === areaKey;
      if (dx < 5 && dy < 5 && same) return;
    }
    lastShadow.value = { left: dropRect.value!.left, top: dropRect.value!.top, area: areaKey };
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value!,
      dropRect: dropRect.value!,
      dropTarget: dropTarget.value,
      cards: grid.value.cards,
      avoidanceDelayMs: props.avoidanceDelayMs ?? 100
    } as any;
    const plan = plugins.dispatch('onDragUpdate', ctx as any);
    applyAnimations(plan as any)
    if (plan && plan.moves && plan.moves.length > 0) {
      for (const mv of plan.moves) moveCard(mv.cardId, mv.toPosition);
    }
    })
  }
  console.log('[DND] grid dragenter', { draggedId: draggedCard.value?.id });
};

const handleDrop = (e: DragEvent) => {
  if (!draggedCard.value) return;
  
  // 检查是否在暂存区上方，如果是则让暂存区处理，网格不处理
  if (isDragOverStorage.value && dragSource.value === 'grid') {
    console.log('[Grid] Drop over storage area, letting FloatingPanel handle it');
    return;
  }
  
  // 双重检查：如果 drop 事件的目标在暂存区内，也让暂存区处理
  const target = e.target as HTMLElement;
  const isOverStorageElement = target.closest('.floating-panel__storage') !== null || 
                                target.closest('.floating-panel__storage-trigger') !== null ||
                                target.closest('.floating-panel__storage-expanded') !== null;
  
  if (isOverStorageElement && dragSource.value === 'grid') {
    console.log('[Grid] Drop target is storage area, letting FloatingPanel handle it');
    return;
  }
  
  if (hasPlacedOnce.value) {
    console.log('[Place] drop skipped due to prior mouseup placement');
    return;
  }
  
  if (dropRect.value && draggedCard.value && gridEl.value) {
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cell = unit + gap;
    const gridX = Math.max(0, Math.floor(dropRect.value.left / cell));
    const gridY = Math.max(0, Math.floor(dropRect.value.top / cell));
    const intended = { x: gridX, y: gridY };
    let reverted = false;
    if (overlapUnresolved.value || collidesAt(draggedCard.value, intended)) {
      const ctx = {
        gridEl: gridEl.value,
        columns: grid.value.columns,
        gap: grid.value.gap,
        unit: grid.value.unit ?? 89,
        draggedCard: draggedCard.value,
        dropRect: dropRect.value,
        dropTarget: dropTarget.value,
        cards: grid.value.cards
      } as any
    const plan = plugins.dispatch('onBeforeDrop', ctx as any)
    applyAnimations(plan as any)
    if (plan && plan.moves && plan.moves.length > 0) {
      for (const mv of plan.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition) }
    }
    
    // 如果插件返回了 shadowPosition，说明无法避让，直接回到原始位置
    if (plan && plan.shadowPosition) {
      // 更新阴影位置到原始位置
      dropRect.value = {
        left: plan.shadowPosition.left,
        top: plan.shadowPosition.top,
        width: dropRect.value.width,
        height: dropRect.value.height
      }
      // 直接移动卡片到原始位置，不再进行碰撞检测
      const origin = dragOriginPos.value ?? { x: draggedCard.value.position.x, y: draggedCard.value.position.y };
      if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, origin)
      reverted = true
    } else if (collidesAt(draggedCard.value, intended)) {
      // 只有在没有 shadowPosition 时才进行传统的碰撞检测
      const origin = dragOriginPos.value ?? { x: draggedCard.value.position.x, y: draggedCard.value.position.y };
      applyAnimations({ animations: [{ cardId: draggedCard.value.id, type: 'translate', duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', from: draggedCard.value.position, to: origin }] } as any)
      dropRect.value = {
        left: origin.x * (unit + gap),
        top: origin.y * (unit + gap),
        width: dropRect.value.width,
        height: dropRect.value.height
      } as any
      if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, origin)
      reverted = true
    } else {
      const planPlace = plugins.dispatch('onBeforeDrop', ctx as any)
      applyAnimations(planPlace as any)
      if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, intended)
    }
    } else {
      const ctx = {
        gridEl: gridEl.value,
        columns: grid.value.columns,
        gap: grid.value.gap,
        unit: grid.value.unit ?? 89,
        draggedCard: draggedCard.value,
        dropRect: dropRect.value,
        dropTarget: dropTarget.value,
        cards: grid.value.cards
      } as any
      const planPlace = plugins.dispatch('onBeforeDrop', ctx as any)
      applyAnimations(planPlace as any)
      applyAnimations({ animations: [{ cardId: draggedCard.value.id, type: 'translate', duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)', from: draggedCard.value.position, to: intended }] } as any)
      if (!animations.value.has(draggedCard.value.id)) moveCard(draggedCard.value.id, intended)
    }
    const ctx = {
      gridEl: gridEl.value,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value,
      dropRect: dropRect.value,
      dropTarget: dropTarget.value,
      cards: grid.value.cards
    } as any
    if (!reverted) {
      const plan = plugins.dispatch('onBeforeDrop', ctx as any)
      applyAnimations(plan as any)
      if (plan && plan.moves && plan.moves.length > 0) {
        for (const mv of plan.moves) { if (!animSuppressMove.value.has(mv.cardId)) moveCard(mv.cardId, mv.toPosition) }
      }
    }
    saveLayout(props.storageKey);
    plugins.dispatch('onDragEnd', {
      gridEl: gridEl.value!,
      columns: grid.value.columns,
      gap: grid.value.gap,
      unit: grid.value.unit ?? 89,
      draggedCard: draggedCard.value!,
      dropRect: dropRect.value!,
      dropTarget: dropTarget.value,
      cards: grid.value.cards
    } as any)
    if (dropTargetVisible.value) {
      dropShadowOpacity.value = 0;
      setTimeout(() => { dropTargetVisible.value = false; }, props.dropShadowFadeMs ?? 220);
    }
  }
  
  console.log('[DND] grid drop', { draggedId: draggedCard.value.id, dragState: dragState.value });
  endDrag();
  setTimeout(() => {
    isDragging.value = false;
    draggedCard.value = null;
    dropTargetVisible.value = false;
    dropShadowDropping.value = false;
    overlapUnresolved.value = false;
  }, 300);
};

// Initialize with some demo cards
// 处理从收纳列表恢复卡片的动画（使用贝塞尔曲线路径）
// 支持多个并行动画，性能优化，边界情况处理
// 延迟部署机制：卡片在动画期间保持临时状态，动画完成后才正式添加到网格
const handleCardPlacedWithAnimation = (event: CustomEvent) => {
  const { cardId, tempCard, from, to } = event.detail;
  
  // 边界情况处理：验证必要数据
  if (!tempCard || !gridEl.value) {
    console.error('[Animation] Missing tempCard or gridEl');
    return;
  }
  
  if (!from || typeof from.x !== 'number' || typeof from.y !== 'number') {
    console.error('[Animation] Invalid from position');
    return;
  }
  
  if (!to || typeof to.x !== 'number' || typeof to.y !== 'number') {
    console.error('[Animation] Invalid to position');
    return;
  }

  // 检查是否已有动画在进行（防止重复）
  if (animSuppressMove.value.has(cardId)) {
    console.warn('[Animation] Animation already in progress for cardId:', cardId);
    return;
  }
  
  // 检查是否已有临时卡片（防止重复创建）
  if (temporaryCards.value.has(cardId)) {
    console.warn('[Animation] Temporary card already exists for cardId:', cardId);
    return;
  }

  // 创建临时卡片元素（不添加到 grid.value.cards）
  const tempCardElement = createTempCardElement(tempCard, cardId, to);
  if (!tempCardElement) {
    console.error('[Animation] Failed to create temp card element');
    return;
  }

  // 将临时卡片添加到 DOM（但不添加到 grid.value.cards）
  gridEl.value.appendChild(tempCardElement);
  
  // 存储临时卡片状态
  temporaryCards.value.set(cardId, {
    card: tempCard,
    targetGridPosition: to,
    animationId: cardId,
    createdAt: Date.now(),
    element: tempCardElement
  });

  // 使用临时卡片元素进行动画
  const el = tempCardElement;
  
  // 计算起点和终点（相对于网格容器）
  const gridRect = gridEl.value.getBoundingClientRect();
  
  // 计算目标位置（网格坐标转换为像素坐标）
  const units = getCardUnits(tempCard);
  const unit = grid.value.unit ?? 89;
  const gap = grid.value.gap;
  const targetLeft = to.x * (unit + gap);
  const targetTop = to.y * (unit + gap);
  const targetWidth = units.w * unit + (units.w - 1) * gap;
  const targetHeight = units.h * unit + (units.h - 1) * gap;
  const targetX = gridRect.left + targetLeft + targetWidth / 2;
  const targetY = gridRect.top + targetTop + targetHeight / 2;
  
  // 计算起点和终点（相对于网格容器）
  const startPoint: AnimationPosition = {
    x: from.x - gridRect.left,
    y: from.y - gridRect.top
  };
  const endPoint: AnimationPosition = {
    x: targetX - gridRect.left,
    y: targetY - gridRect.top
  };
  
  // 计算初始偏移量（从收纳列表位置到目标位置的偏移）
  const initialOffsetX = startPoint.x - endPoint.x;
  const initialOffsetY = startPoint.y - endPoint.y;
  
  // 立即设置初始状态，防止卡片闪烁到目标位置
  // 卡片会先出现在收纳列表位置（通过 transform 偏移）
  el.style.transition = 'none';
  el.style.transform = `translate3d(${initialOffsetX}px, ${initialOffsetY}px, 0) scale(1.03)`;
  el.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.18)';
  el.style.opacity = '0.95';
  el.style.zIndex = '1000';
  el.style.willChange = 'transform, box-shadow, opacity';
  el.style.pointerEvents = 'none';
  
  // 定义动画使用的起点和终点（在 setTimeout 外部定义，以便在动画循环中访问）
  let updatedStartPoint: AnimationPosition = startPoint;
  let updatedEndPoint: AnimationPosition = endPoint;
  
  // 延迟执行，确保 DOM 已更新，然后开始动画
  setTimeout(() => {
    // 重新获取网格位置（可能因为滚动等原因变化）
    const updatedGridRect = gridEl.value!.getBoundingClientRect();
    
    // 重新计算目标位置
    const updatedTargetLeft = to.x * (unit + gap);
    const updatedTargetTop = to.y * (unit + gap);
    const updatedTargetX = updatedGridRect.left + updatedTargetLeft + targetWidth / 2;
    const updatedTargetY = updatedGridRect.top + updatedTargetTop + targetHeight / 2;
    
    // 更新终点位置
    updatedEndPoint = {
      x: updatedTargetX - updatedGridRect.left,
      y: updatedTargetY - updatedGridRect.top
    };
    
    // 更新起点位置（收纳列表位置相对于更新后的网格）
    updatedStartPoint = {
      x: from.x - updatedGridRect.left,
      y: from.y - updatedGridRect.top
    };

    // 边界情况处理：检查目标位置是否在视口外
    const viewport = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
    const targetInViewport = (
      updatedTargetX >= viewport.left &&
      updatedTargetX <= viewport.right &&
      updatedTargetY >= viewport.top &&
      updatedTargetY <= viewport.bottom
    );

    // 计算贝塞尔曲线控制点（使用更新后的位置）
    const controlPoint = calculateControlPoint(updatedStartPoint, updatedEndPoint, 0.3);

    // 计算距离和动画时长（最小400ms，最大900ms）
    const dx = updatedEndPoint.x - updatedStartPoint.x;
    const dy = updatedEndPoint.y - updatedStartPoint.y;
    const distance = Math.hypot(dx, dy);
    const duration = Math.max(400, Math.min(900, Math.round((distance / 1000) * 1000)));

    // 性能优化：检测设备性能，低性能设备使用简化动画
    const isLowPerformance = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    const useSimplifiedAnimation = isLowPerformance && !targetInViewport;

    // 设置动画状态
    animSuppressMove.value.add(cardId);
    animations.value.set(cardId, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });

    // 性能监控：记录动画开始时间
    const animationStartTime = performance.now();
    let frameCount = 0;
    let lastFrameTime = animationStartTime;

    // 动画状态
    const startTime = performance.now();
    let animationFrameId: number | null = null;
    let isCompleting = false;
    let isCancelled = false;

    // 处理窗口调整大小和滚动：更新终点位置
    const updateEndPoint = () => {
      if (!el || !gridEl.value || isCancelled) return;
      const newCardRect = el.getBoundingClientRect();
      const newGridRect = gridEl.value.getBoundingClientRect();
      const newTargetX = newCardRect.left + newCardRect.width / 2;
      const newTargetY = newCardRect.top + newCardRect.height / 2;
      
      // 更新终点位置
      updatedEndPoint.x = newTargetX - newGridRect.left;
      updatedEndPoint.y = newTargetY - newGridRect.top;
      
      // 同时更新起点位置（收纳列表位置相对于更新后的网格）
      updatedStartPoint.x = from.x - newGridRect.left;
      updatedStartPoint.y = from.y - newGridRect.top;
    };

    // 监听窗口调整大小和滚动
    const handleResize = () => updateEndPoint();
    const handleScroll = () => updateEndPoint();
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 动画循环函数
    const animate = (currentTime: number) => {
      // 性能监控：计算帧率
      frameCount++;
      const frameDelta = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      // 如果帧率过低（< 30fps），使用简化动画
      if (frameDelta > 33 && !useSimplifiedAnimation) {
        // 降级到简化动画
        el.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
        el.style.transform = 'translate3d(0, 0, 0) scale(1.00)';
        el.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.04)';
        el.style.opacity = '1';
        setTimeout(() => cleanup(), duration);
        return;
      }

      if (isCancelled) {
        cleanup();
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // 主动画阶段：使用贝塞尔曲线路径（使用更新后的位置）
        const easedProgress = easeInOutCubic(progress);
        const bezierPos = calculateBezierPosition(easedProgress, updatedStartPoint, controlPoint, updatedEndPoint);
        
        // 计算相对于目标位置的偏移（使用更新后的终点位置）
        const offsetX = bezierPos.x - updatedEndPoint.x;
        const offsetY = bezierPos.y - updatedEndPoint.y;
        
        // 优化视觉反馈：根据速度曲线计算缩放和阴影
        // 使用 easedProgress 确保平滑过渡
        const scale = 1.03 - (0.03 * easedProgress);
        
        // 阴影过渡：从大阴影平滑过渡到小阴影，模拟高度变化
        const shadowOpacity = 0.18 - (0.14 * easedProgress);
        const shadowBlur = 40 - (32 * easedProgress);
        const shadowYOffset = 18 - (10 * easedProgress); // Y 偏移量也平滑过渡
        
        // 透明度：从 0.95 平滑过渡到 1.00
        const opacity = 0.95 + (0.05 * easedProgress);
        
        // 应用变换（使用更精确的阴影值）
        el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
        el.style.boxShadow = `0 ${shadowYOffset}px ${shadowBlur}px rgba(15, 23, 42, ${shadowOpacity})`;
        el.style.opacity = String(opacity);

        // 继续动画
        animationFrameId = requestAnimationFrame(animate);
      } else if (!isCompleting) {
        // 主动画完成，开始回弹效果
        isCompleting = true;
        const bounceDuration = 140;
        const bounceStartTime = currentTime;

        const bounceAnimate = (bounceTime: number) => {
          if (isCancelled) {
            cleanup();
            return;
          }

          const bounceElapsed = bounceTime - bounceStartTime;
          const bounceProgress = Math.min(bounceElapsed / bounceDuration, 1);
          
          if (bounceProgress < 1) {
            // 优化回弹效果：先压缩到 0.98，然后弹回 1.00
            // 使用 easeOutBounce 提供更自然的弹性效果
            const bounceEased = easeOutBounce(bounceProgress);
            const bounceScale = 0.98 + (0.02 * bounceEased);
            
            // 阴影也跟随回弹效果变化
            const bounceShadowOpacity = 0.04 * bounceEased;
            const bounceShadowBlur = 8 + (20 * (1 - bounceEased)); // 回弹时阴影稍微增大
            
            el.style.transform = `translate3d(0, 0, 0) scale(${bounceScale})`;
            el.style.boxShadow = `0 8px ${bounceShadowBlur}px rgba(15, 23, 42, ${bounceShadowOpacity})`;
            el.style.opacity = '1';

            animationFrameId = requestAnimationFrame(bounceAnimate);
          } else {
            // 回弹完成，清理动画
            cleanup();
          }
        };

        animationFrameId = requestAnimationFrame(bounceAnimate);
      }
    };

    // 清理函数（包含延迟部署和错误处理）
    const cleanup = () => {
      isCancelled = true;
      
      // 移除事件监听器
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // 性能监控：记录动画完成时间
      const animationEndTime = performance.now();
      const actualDuration = animationEndTime - animationStartTime;
      const avgFps = (frameCount / (actualDuration / 1000)).toFixed(1);
      
      // 仅在开发模式下输出性能信息
      if (import.meta.env.DEV && avgFps) {
        console.log(`[Animation Performance] Card ${cardId}: ${frameCount} frames in ${actualDuration.toFixed(0)}ms, avg FPS: ${avgFps}`);
      }
      
      // 延迟部署：动画完成后正式添加卡片到网格
      const tempCardState = temporaryCards.value.get(cardId);
      if (tempCardState && tempCardState.card) {
        try {
          // 1. 验证卡片数据有效性
          if (!tempCardState.targetGridPosition || 
              typeof tempCardState.targetGridPosition.x !== 'number' || 
              typeof tempCardState.targetGridPosition.y !== 'number') {
            console.error('[Animation] Invalid target grid position, skipping deployment');
            // 清理临时卡片元素
            if (tempCardState.element && tempCardState.element.parentNode) {
              tempCardState.element.parentNode.removeChild(tempCardState.element);
            }
            temporaryCards.value.delete(cardId);
            return;
          }
          
          // 2. 创建正式卡片并添加到网格数据结构
          const finalCard: BentoCardType = {
            ...tempCardState.card,
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            position: tempCardState.targetGridPosition,
            rowIndex: tempCardState.targetGridPosition.y
          };
          
          grid.value.cards.push(finalCard);
          
          // 更新行结构（如果需要）
          if (grid.value.rows) {
            const targetRow = grid.value.rows.find(row => row.index === finalCard.rowIndex);
            if (targetRow) {
              targetRow.cards.push(finalCard);
              targetRow.cards.sort((a, b) => a.position.x - b.position.x);
            } else {
              // 创建新行
              grid.value.rows.push({
                id: `row-${finalCard.rowIndex}`,
                index: finalCard.rowIndex!,
                cards: [finalCard]
              });
              grid.value.rows.sort((a, b) => a.index - b.index);
            }
          }
          
          // 3. 标记正式卡片为部署中（用于渐显效果，初始opacity为0）
          deployingCards.value.add(finalCard.id);
          
          // 4. 等待Vue完成DOM更新，确保正式卡片已渲染
          nextTick(() => {
            // 5. 让临时卡片渐隐（降低z-index确保不影响正式卡片）
            if (tempCardState.element) {
              tempCardState.element.style.transition = 'opacity 0.3s ease-out';
              tempCardState.element.style.zIndex = '1'; // 降低z-index，让正式卡片在上层
              tempCardState.element.style.opacity = '0';
            }
            
            // 6. 让正式卡片渐显
            requestAnimationFrame(() => {
              const finalCardElement = gridEl.value?.querySelector(`.bento-grid__card[data-id="${finalCard.id}"]`) as HTMLElement | null;
              if (finalCardElement) {
                // 确保初始状态是透明的
                finalCardElement.style.opacity = '0';
                // 强制重排，确保opacity: 0生效
                void finalCardElement.offsetHeight;
                // 添加过渡并渐显
                finalCardElement.style.transition = 'opacity 0.3s ease-out';
                finalCardElement.style.opacity = '1';
              }
            });
            
            // 7. 渐隐完成后移除临时卡片元素并清理状态
            setTimeout(() => {
              if (tempCardState.element && tempCardState.element.parentNode) {
                tempCardState.element.parentNode.removeChild(tempCardState.element);
              }
              temporaryCards.value.delete(cardId);
              deployingCards.value.delete(finalCard.id);
            }, 300); // 300ms 与渐隐动画时长一致
          });
        } catch (error) {
          console.error('[Animation] Error deploying card after animation:', error);
          // 确保清理临时卡片元素，即使部署失败
          if (tempCardState.element && tempCardState.element.parentNode) {
            tempCardState.element.parentNode.removeChild(tempCardState.element);
          }
          temporaryCards.value.delete(cardId);
        }
      } else {
        // 如果没有临时卡片状态，仍然清理动画样式
        console.warn('[Animation] No temporary card state found for cardId:', cardId);
      }
      
      // 5. 清理动画样式和状态
      el.style.transition = '';
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.opacity = '';
      el.style.zIndex = '';
      el.style.willChange = '';
      el.style.pointerEvents = '';
      animSuppressMove.value.delete(cardId);
      animations.value.delete(cardId);
    };

    // 启动动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isCancelled) {
          animationFrameId = requestAnimationFrame(animate);
        }
      });
    });
  }, 10);
};

onMounted(() => {
  // 初始化行结构
  if (grid.value.rows && grid.value.rows.length === 0 && grid.value.cards.length > 0) {
    initializeRows();
  }
  
  const resize = () => {
    const el = gridEl.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const cols = Math.max(1, Math.floor((rect.width + gap) / (unit + gap)));
    grid.value.columns = cols;
  };
  const ro = new ResizeObserver(resize);
  if (gridEl.value) ro.observe(gridEl.value);
  resize();
  (grid as any)._ro = ro;
  if (props.columns) grid.value.columns = props.columns;
  if (props.gap !== undefined) grid.value.gap = props.gap!;
  if (props.unit !== undefined) grid.value.unit = props.unit!;
  if (props.reserveRows !== undefined) grid.value.overscanRows = props.reserveRows!; else grid.value.overscanRows = grid.value.overscanRows ?? 2;
  
  setViewportGridBounds(gridEl.value);
  loadLayout(props.storageKey);
  
  // 监听卡片放置动画事件
  document.addEventListener('card-placed-with-animation', handleCardPlacedWithAnimation as EventListener);
});

onUnmounted(() => {
  const ro = (grid as any)._ro as ResizeObserver | undefined;
  if (ro && gridEl.value) ro.unobserve(gridEl.value);
  hasPlacedOnce.value = false;
  // 移除卡片放置动画事件监听器
  document.removeEventListener('card-placed-with-animation', handleCardPlacedWithAnimation as EventListener);
});
</script>

<style scoped>
.bento-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 40px;
}

/* 无感知的行设计 - 完全移除视觉效果 */
.bento-grid__row {
  display: grid;
  grid-template-columns: repeat(var(--grid-columns, 12), 1fr);
  gap: var(--grid-gap, 20px);
  grid-auto-flow: row dense;
  align-items: start;
  justify-items: start;
  width: 100%;
  min-height: auto;
  padding: 0;
  position: relative;
}

.bento-grid__row-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 400;
  border: 1px dashed #e5e7eb;
  border-radius: 16px;
  margin: 0;
  grid-column: 1 / -1;
  background: #ffffff;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bento-grid__row-placeholder:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #6b7280;
}

.bento-grid__card { 
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-grid__card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.06);
}

.bento-grid__drag-placeholder {
  pointer-events: none;
  z-index: 999;
  transition: none;
  animation: dragPulse 1s infinite;
}

.bento-grid__drop-target {
  pointer-events: none;
  z-index: 998;
  animation: dropTargetPulse 1s infinite;
}

.bento-grid__origin-ghost {
  pointer-events: none;
  z-index: 500;
}


@keyframes dragPulse {
  0%, 100% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

@keyframes dropTargetPulse {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

/* Responsive design - 保持简洁风格 */
@media (max-width: 1024px) {
  .bento-grid {
    gap: 18px;
    padding: 40px 32px;
    max-width: 960px;
  }
  
  .bento-grid__row {
    gap: 18px;
  }
}

@media (max-width: 768px) {
  .bento-grid {
    gap: 16px;
    padding: 32px 24px;
    max-width: 100%;
  }
  
  .bento-grid__row {
    gap: 16px;
  }
  
  .bento-grid__row-placeholder {
    min-height: 100px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .bento-grid {
    gap: 12px;
    padding: 24px 16px;
  }
  
  .bento-grid__row {
    gap: 12px;
  }
  
  .bento-grid__row-placeholder {
    min-height: 80px;
    font-size: 12px;
  }
}

/* Touch device optimizations - 保持简洁 */
@media (hover: none) and (pointer: coarse) {
  .bento-grid__card {
    transition: transform 0.15s ease;
  }
  
  .bento-grid__card:active {
    transform: scale(0.98);
  }
}

/* High DPI displays - 保持简洁 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .bento-grid {
    gap: 20px;
    padding: 48px 40px;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .bento-grid__card,
  .bento-grid__drag-placeholder,
  .bento-grid__drop-target {
    animation: none !important;
    transition: none !important;
  }
}
</style>