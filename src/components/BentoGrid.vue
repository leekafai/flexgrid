<template>
  <div class="bento-grid" :style="gridStyles" ref="gridEl" @dragover.prevent="handleDragOver" @dragenter.prevent="handleDragEnter" @drop.prevent="handleDrop" :data-layout="layout">
    <!-- 新的基于行的结构 -->
    <div
      v-if="layout !== 'position' && grid.rows && grid.rows.length > 0"
      v-for="row in grid.rows"
      :key="row.id"
      class="bento-grid__row"
      :data-row-id="row.id"
      :data-row-index="row.index"
      :style="{
        '--grid-columns': grid.columns,
        '--grid-gap': `${grid.gap}px`
      }"
    >
      <BentoCard
        v-for="(card, cardIndex) in row.cards"
        :key="card.id"
        :card="card"
        :is-dragging="draggedCard?.id === card.id"
        @update="handleCardUpdate"
        @remove="handleCardRemove"
        @drag-start="handleDragStart"
        class="bento-grid__card"
        :style="[getCardStyles(card), getDragStylesSafe(card), getAnimStyles(card)]"
        :data-id="card.id"
        :data-row-index="row.index"
        :data-card-index="cardIndex"
      >
        <slot name="card" :card="card" :index="cardIndex" />
      </BentoCard>
      
      <!-- 空行的占位符 -->
      <div v-if="row.cards.length === 0" class="bento-grid__row-placeholder">
        <span>空行 {{ row.index }}</span>
      </div>
    </div>
    
    <!-- 回退到旧的卡片列表结构 -->
    <template v-else>
      <BentoCard
        v-for="(card, idx) in grid.cards"
        :key="card.id"
        :card="card"
        :is-dragging="draggedCard?.id === card.id"
        @update="handleCardUpdate"
        @remove="handleCardRemove"
        @drag-start="handleDragStart"
        class="bento-grid__card"
        :style="[getCardStyles(card), getDragStylesSafe(card), getAnimStyles(card)]"
        :data-id="card.id"
      >
        <slot name="card" :card="card" :index="idx" />
      </BentoCard>
    </template>
    
    <!-- 拖拽目标阴影 -->
    <div
      v-if="dropTargetVisible && dropRect"
      class="bento-grid__drop-target"
        :style="[getDropTargetStyles(grid.columns, grid.gap, grid.unit ?? 89, props.debugDropColor), dropShadowStyle]"
    />
    
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useDragAndDrop } from '@/composables/useDragAndDrop';
import { useBentoAnimations } from '@/composables/useBentoAnimations';
import BentoCard from './BentoCard.vue';
import type { BentoCard as BentoCardType, BentoGridRow } from '@/types/bento';
import { createPluginManager } from '@/plugins/manager';
import { avoidancePlugin } from '@/plugins/avoidance/index';
import { placementPlugin } from '@/plugins/placement/index';
import { attachPlacementObserver } from '@/debug/debugPlacementObserver';

const { 
  grid, 
  isDragging, 
  draggedCard, 
  addCard, 
  removeCard, 
  updateCard, 
  startDrag, 
  moveCard, 
  getGridStyles, 
  getCardStyles, 
  getCardUnits,
  layout, 
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
  startDrag: startDragDnd 
} = useDragAndDrop();

const { getCardAnimationStyles, createIntersectionObserver } = useBentoAnimations();

const plugins = createPluginManager();
plugins.register(avoidancePlugin);
plugins.register(placementPlugin);
const animations = ref(new Map<string, { duration: number; easing: string }>());
const animSuppressMove = ref(new Set<string>());
const dropTargetVisible = ref(false);
const dropShadowOpacity = ref(0);
const dropShadowStyle = computed(() => ({ opacity: dropShadowOpacity.value })) as any;
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
        if (a.from && a.to && draggedCard.value && draggedCard.value.id === a.cardId && layout.value === 'position') {
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
            animations.value.set(a.cardId, { duration, easing: 'linear' });
            el.style.transition = 'none';
            el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            el.style.willChange = 'transform';
            el.style.pointerEvents = 'none';
            requestAnimationFrame(() => {
              el.style.transition = `transform ${duration}ms linear`;
              el.style.transform = 'translate3d(0, 0, 0)';
            });
            const ax = first.left + first.width / 2;
            const ay = first.top + first.height / 2;
            const bx = last.left + last.width / 2;
            const by = last.top + last.height / 2;
            startLinePathDebug(a.cardId, el, ax, ay, bx, by, duration);
            setTimeout(() => {
              el.style.transition = '';
              el.style.transform = '';
              el.style.willChange = '';
              el.style.pointerEvents = '';
              animSuppressMove.value.delete(a.cardId);
              animations.value.delete(a.cardId);
            }, duration + 20);
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
  if (layout.value !== 'position') return {} as any;
  const anim = animations.value.get(card.id);
  const base = 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)';
  const isDragged = draggedCard.value && draggedCard.value.id === card.id;
  const transition = anim ? (isDragged ? `transform ${anim.duration}ms ${anim.easing}, box-shadow ${anim.duration}ms ${anim.easing}` : `left ${anim.duration}ms ${anim.easing}, top ${anim.duration}ms ${anim.easing}, ${base}`) : base;
  return { transition, willChange: 'left, top, transform' } as any;
};

const getDragStylesSafe = (card: BentoCardType) => {
  if (layout.value === 'position' && animations.value.has(card.id)) return {} as any;
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

// Expose addCard method for parent components
defineExpose({
  addCard,
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
  layout?: 'flex' | 'grid' | 'position';
  storageKey?: string;
  debugDropColor?: string;
  dropSpeed?: number;
  dropShadowFadeMs?: number;
  avoidanceDelayMs?: number;
}

const props = defineProps<Props>();

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
  
  if (!isDragging.value) {
    console.error('[DND] Failed to start drag - isDragging is false');
    return;
  }
  
  setViewportGridBounds(gridEl.value);

  if (layout.value === 'position' && gridEl.value) {
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
      if (layout.value !== 'position' || !gridEl.value || !dropRect.value || !draggedCard.value) return
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

    if (layout.value === 'position' && gridEl.value && draggedCard.value) {
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
        dropShadowOpacity.value = 0;
        setTimeout(() => { dropTargetVisible.value = false; }, props.dropShadowFadeMs ?? 220);
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

    if (layout.value === 'position' && draggedCard.value && dropRect.value && gridEl.value) {
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
        dropShadowOpacity.value = 0;
        setTimeout(() => { dropTargetVisible.value = false; }, props.dropShadowFadeMs ?? 220);
      }
    }
  
    // 使用新的基于行的放置逻辑
    if (layout.value !== 'position' && draggedCard.value && dragState.value) {
      const { targetRowIndex, targetCardIndex } = dragState.value;
      
      console.log('[DND] Attempting to place card:', {
        cardId: draggedCard.value.id,
        targetRowIndex,
        targetCardIndex
      });
      
      // 确保目标行存在
      if (targetRowIndex !== undefined) {
        let targetRow = grid.value.rows?.find(r => r.index === targetRowIndex);
        if (!targetRow && dragState.value?.dropRow === undefined) {
          // 创建新行
          console.log('[DND] Creating new row at index:', targetRowIndex);
          targetRow = addRow(targetRowIndex);
        }
        
        // 移动卡片到新行
        console.log('[DND] Moving card to row:', targetRowIndex, 'at position:', targetCardIndex);
        moveCardToRow(draggedCard.value.id, targetRowIndex, targetCardIndex);
      }
      
      saveLayout(props.storageKey);
      if (dropTargetVisible.value) {
        dropShadowOpacity.value = 0;
        setTimeout(() => { dropTargetVisible.value = false; }, props.dropShadowFadeMs ?? 220);
      }
    }
    
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
    if (layout.value !== 'position' || !gridEl.value || !dropRect.value || !draggedCard.value) return;
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
  if (layout.value === 'position' && gridEl.value && draggedCard.value) {
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
    if (layout.value !== 'position' || !gridEl.value || !dropRect.value || !draggedCard.value) return;
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
  if (layout.value === 'position' && gridEl.value && draggedCard.value) {
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
  if (hasPlacedOnce.value) {
    console.log('[Place] drop skipped due to prior mouseup placement');
    return;
  }
  
  // 使用新的基于行的放置逻辑
  if (layout.value !== 'position' && dragState.value) {
    const { targetRowIndex, targetCardIndex } = dragState.value;
    
    if (targetRowIndex !== undefined) {
      let targetRow = grid.value.rows?.find(r => r.index === targetRowIndex);
      if (!targetRow && dragState.value?.dropRow === undefined) {
        targetRow = addRow(targetRowIndex);
      }
      
      moveCardToRow(draggedCard.value.id, targetRowIndex, targetCardIndex);
    }
    
    saveLayout(props.storageKey);
    if (dropTargetVisible.value) {
      dropShadowOpacity.value = 0;
      setTimeout(() => { dropTargetVisible.value = false; }, props.dropShadowFadeMs ?? 220);
    }
  }
  if (layout.value === 'position' && dropRect.value && draggedCard.value && gridEl.value) {
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
    overlapUnresolved.value = false;
  }, 300);
};

// Initialize with some demo cards
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
  if (props.layout) layout.value = props.layout;
  setViewportGridBounds(gridEl.value);
  loadLayout(props.storageKey);
});

onUnmounted(() => {
  const ro = (grid as any)._ro as ResizeObserver | undefined;
  if (ro && gridEl.value) ro.unobserve(gridEl.value);
  hasPlacedOnce.value = false;
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