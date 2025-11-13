import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { BentoCard, AnimationType } from '@/types/bento';

export const useBentoAnimations = () => {
  const visibleCards = ref<Set<string>>(new Set());
  const animationQueue = ref<string[]>([]);

  const animationConfigs: Record<AnimationType, any> = {
    fade: {
      initial: { opacity: 0, transform: 'translateY(20px)' },
      animate: { opacity: 1, transform: 'translateY(0)' },
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    },
    slide: {
      initial: { opacity: 0, transform: 'translateX(-30px)' },
      animate: { opacity: 1, transform: 'translateX(0)' },
      transition: 'opacity 0.5s ease, transform 0.5s ease'
    },
    scale: {
      initial: { opacity: 0, transform: 'scale(0.8)' },
      animate: { opacity: 1, transform: 'scale(1)' },
      transition: 'opacity 0.4s ease, transform 0.4s ease'
    },
    bounce: {
      initial: { opacity: 0, transform: 'scale(0.5)' },
      animate: { opacity: 1, transform: 'scale(1)' },
      transition: 'opacity 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  };

  const observeCard = (cardId: string) => {
    visibleCards.value.add(cardId);
    if (!animationQueue.value.includes(cardId)) {
      animationQueue.value.push(cardId);
      processAnimationQueue();
    }
  };

  const unobserveCard = (cardId: string) => {
    visibleCards.value.delete(cardId);
    const index = animationQueue.value.indexOf(cardId);
    if (index > -1) {
      animationQueue.value.splice(index, 1);
    }
  };

  const processAnimationQueue = () => {
    if (animationQueue.value.length === 0) return;
    
    const cardId = animationQueue.value.shift();
    if (cardId) {
      // Simulate animation delay
      setTimeout(() => {
        // Animation completed
      }, 100);
      
      // Process next card in queue
      setTimeout(processAnimationQueue, 150);
    }
  };

  const getCardAnimationStyles = (card: BentoCard) => {
    const config = animationConfigs[card.animation || 'fade'];
    const isVisible = visibleCards.value.has(card.id);
    
    return {
      ...config.initial,
      ...(isVisible ? config.animate : {}),
      transition: config.transition
    };
  };

  const createIntersectionObserver = (cardId: string, element: HTMLElement) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observeCard(cardId);
          } else {
            unobserveCard(cardId);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(element);
    return observer;
  };

  const createHoverAnimation = (element: HTMLElement, card: BentoCard) => {
    let isHovered = false;
    
    const handleMouseEnter = () => {
      isHovered = true;
      element.style.transform = 'translateY(-4px) scale(1.02)';
      element.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
    };

    const handleMouseLeave = () => {
      isHovered = false;
      element.style.transform = 'translateY(0) scale(1)';
      element.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  };

  const createClickAnimation = (element: HTMLElement) => {
    const handleMouseDown = () => {
      element.style.transform = 'scale(0.95)';
      element.style.transition = 'transform 0.1s ease';
    };

    const handleMouseUp = () => {
      element.style.transform = 'scale(1)';
      element.style.transition = 'transform 0.2s ease';
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  };

  return {
    visibleCards,
    animationQueue,
    getCardAnimationStyles,
    createIntersectionObserver,
    createHoverAnimation,
    createClickAnimation,
    observeCard,
    unobserveCard
  };
};