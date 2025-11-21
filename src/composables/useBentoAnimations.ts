import { ref, type Ref } from 'vue';
import type { BentoCard as BentoCardType } from '@/types/bento';

export interface AnimationPlan {
  animations?: Array<{
    cardId: string;
    duration: number;
    easing: string;
    type: string;
    from?: { x: number; y: number };
    to?: { x: number; y: number };
  }>;
  moves?: Array<{
    cardId: string;
    toPosition: { x: number; y: number };
  }>;
  shadowPosition?: {
    left: number;
    top: number;
  };
}

export interface AnimationState {
  duration: number;
  easing: string;
}

export interface AnimationComposable {
  // State
  animations: Ref<Map<string, AnimationState>>;
  animSuppressMove: Ref<Set<string>>;
  
  // Methods
  getCardAnimationStyles: (card: BentoCardType, isDragging: boolean, draggedCard: BentoCardType | null, layout: string) => any;
  createIntersectionObserver: (callback: (entries: IntersectionObserverEntry[]) => void) => IntersectionObserver;
  applyAnimations: (plan: AnimationPlan | null, moveCard: (cardId: string, position: { x: number; y: number }) => void) => void;
  startPathDebug: (id: string, el: HTMLElement, ax: number, ay: number, bx: number, by: number, duration: number) => void;
}

export function useBentoAnimations(): AnimationComposable {
  const animations = ref(new Map<string, AnimationState>());
  const animSuppressMove = ref(new Set<string>());

  const getCardAnimationStyles = (card: BentoCardType, isDragging: boolean, draggedCard: BentoCardType | null, layout: string) => {
    if (layout !== 'position') return {};
    
    const anim = animations.value.get(card.id);
    const base = 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)';
    const isDragged = draggedCard && draggedCard.id === card.id;
    
    const transition = anim 
      ? (isDragged 
          ? `transform ${anim.duration}ms ${anim.easing}, box-shadow ${anim.duration}ms ${anim.easing}` 
          : `left ${anim.duration}ms ${anim.easing}, top ${anim.duration}ms ${anim.easing}, ${base}`)
      : base;
      
    return { transition, willChange: 'left, top, transform' };
  };

  const createIntersectionObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
    return new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px'
    });
  };

  const applyAnimations = (plan: AnimationPlan | null, moveCard: (cardId: string, position: { x: number; y: number }) => void) => {
    if (!plan || !plan.animations || plan.animations.length === 0) return;
    
    for (const a of plan.animations) {
      if (a.type === 'translate') {
        if (animations.value.has(a.cardId)) continue;
        
        // Handle translate animations
        const el = document.querySelector(`.bento-grid__card[data-id="${a.cardId}"]`) as HTMLElement | null;
        if (el && a.from && a.to) {
          animations.value.set(a.cardId, { duration: a.duration, easing: a.easing });
          animSuppressMove.value.add(a.cardId);
          
          el.style.transition = `transform ${a.duration}ms ${a.easing}`;
          el.style.transform = 'translate(0px, 0px)';
          el.style.willChange = 'transform';
          
          requestAnimationFrame(() => {
            const dx = (a.to!.x - a.from.x) * 100;
            const dy = (a.to!.y - a.from.y) * 100;
            el.style.transform = `translate(${dx}px, ${dy}px)`;
          });
          
          setTimeout(() => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.willChange = '';
            animSuppressMove.value.delete(a.cardId);
            animations.value.delete(a.cardId);
            moveCard(a.cardId, a.to!);
          }, a.duration + 20);
          
          // Add bounce effect
          setTimeout(() => {
            el.classList.add('bento-bounce');
            setTimeout(() => { 
              el.classList.remove('bento-bounce'); 
            }, 180);
          }, a.duration);
        }
      }
    }
    
    // Handle moves
    if (plan.moves && plan.moves.length > 0) {
      for (const mv of plan.moves) {
        if (!animSuppressMove.value.has(mv.cardId)) {
          moveCard(mv.cardId, mv.toPosition);
        }
      }
    }
  };

  const startPathDebug = (id: string, el: HTMLElement, ax: number, ay: number, bx: number, by: number, duration: number) => {
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
      
      if (dev > 4) {
        try { 
          console.warn('[PathDBG]', JSON.stringify({ 
            id, t, expected: { x: ex, y: ey }, 
            actual: { x: cx, y: cy }, deviation: dev 
          })) 
        } catch {}
      }
      
      if (t < 1) { 
        rafId = requestAnimationFrame(poll);
      }
    };
    
    rafId = requestAnimationFrame(poll);
    setTimeout(() => { 
      if (rafId) cancelAnimationFrame(rafId);
    }, duration + 50);
  };

  return {
    animations,
    animSuppressMove,
    getCardAnimationStyles,
    createIntersectionObserver,
    applyAnimations,
    startPathDebug
  };
}