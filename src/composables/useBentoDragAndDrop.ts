import { ref, computed, type Ref } from 'vue';
import type { BentoCard as BentoCardType, BentoGridRow } from '@/types/bento';

export interface DragState {
  targetRowIndex?: number;
  targetCardIndex?: number;
  dropRow?: BentoGridRow;
}

export interface DropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragDropComposable {
  // State
  draggedCard: Ref<BentoCardType | null>;
  dropTarget: Ref<HTMLElement | null>;
  dropIndex: Ref<number | null>;
  dropRect: Ref<DropRect | null>;
  dragState: Ref<DragState | null>;
  
  // Methods
  updateDrag: (event: MouseEvent | TouchEvent, columns: number, gap: number, unit: number, rows: BentoGridRow[], gridEl: HTMLElement, callback?: () => void) => void;
  endDrag: () => void;
  getDropTargetStyles: (columns: number, gap: number, unit: number, debugColor?: string) => any;
  findValidPosition: (card: BentoCardType, x: number, y: number, cards: BentoCardType[], columns: number, gap: number, unit: number) => { x: number; y: number } | null;
  getDragStyles: (card: BentoCardType, unit: number, gap: number) => any;
  getOriginGhostStyles: (card: BentoCardType, unit: number, gap: number) => any;
  startDrag: (card: BentoCardType, event: MouseEvent | TouchEvent) => void;
}

export function useBentoDragAndDrop(): DragDropComposable {
  const draggedCard = ref<BentoCardType | null>(null);
  const dropTarget = ref<HTMLElement | null>(null);
  const dropIndex = ref<number | null>(null);
  const dropRect = ref<DropRect | null>(null);
  const dragState = ref<DragState | null>(null);
  
  let lastMousePos = { x: 0, y: 0 };
  let dragOffset = { x: 0, y: 0 };
  let ghostElement: HTMLElement | null = null;

  const startDrag = (card: BentoCardType, event: MouseEvent | TouchEvent) => {
    draggedCard.value = card;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    lastMousePos = { x: clientX, y: clientY };
    
    // Calculate drag offset relative to card position
    const cardElement = (event.target as HTMLElement).closest('.bento-grid__card') as HTMLElement;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      dragOffset = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  };

  const updateDrag = (event: MouseEvent | TouchEvent, columns: number, gap: number, unit: number, rows: BentoGridRow[], gridEl: HTMLElement, callback?: () => void) => {
    if (!draggedCard.value) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    lastMousePos = { x: clientX, y: clientY };

    // Calculate grid position
    const gridRect = gridEl.getBoundingClientRect();
    const relativeX = clientX - gridRect.left;
    const relativeY = clientY - gridRect.top;
    
    const cellSize = unit + gap;
    const gridX = Math.max(0, Math.floor(relativeX / cellSize));
    const gridY = Math.max(0, Math.floor(relativeY / cellSize));
    
    // Update drop rect for visual feedback
    const cardUnits = draggedCard.value.units || { w: 2, h: 2 };
    dropRect.value = {
      left: gridX * cellSize,
      top: gridY * cellSize,
      width: cardUnits.w * unit + (cardUnits.w - 1) * gap,
      height: cardUnits.h * unit + (cardUnits.h - 1) * gap
    };

    // Find target row and position for row-based layout
    if (rows && rows.length > 0) {
      let targetRowIndex = 0;
      let currentY = 0;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowHeight = 120; // Default row height
        if (relativeY >= currentY && relativeY < currentY + rowHeight) {
          targetRowIndex = i;
          break;
        }
        currentY += rowHeight + gap;
      }
      
      // Find target card index within row
      const targetRow = rows[targetRowIndex];
      let targetCardIndex = 0;
      
      if (targetRow && targetRow.cards) {
        const rowX = relativeX;
        let currentX = 0;
        
        for (let i = 0; i <= targetRow.cards.length; i++) {
          if (rowX <= currentX + (unit * 1.5)) {
            targetCardIndex = i;
            break;
          }
          currentX += unit + gap;
        }
      }
      
      dragState.value = {
        targetRowIndex,
        targetCardIndex
      };
    }

    if (callback) callback();
  };

  const endDrag = () => {
    if (ghostElement) {
      ghostElement.remove();
      ghostElement = null;
    }
    
    draggedCard.value = null;
    dropTarget.value = null;
    dropIndex.value = null;
    dropRect.value = null;
    dragState.value = null;
  };

  const getDropTargetStyles = (columns: number, gap: number, unit: number, debugColor?: string) => {
    if (!dropRect.value) return {};
    
    return {
      position: 'absolute' as const,
      left: `${dropRect.value.left}px`,
      top: `${dropRect.value.top}px`,
      width: `${dropRect.value.width}px`,
      height: `${dropRect.value.height}px`,
      backgroundColor: debugColor || 'rgba(59, 130, 246, 0.2)',
      border: `2px dashed ${debugColor || 'rgb(59, 130, 246)'}`,
      borderRadius: '8px',
      pointerEvents: 'none' as const,
      zIndex: 998
    };
  };

  const findValidPosition = (card: BentoCardType, x: number, y: number, cards: BentoCardType[], columns: number, gap: number, unit: number): { x: number; y: number } | null => {
    const cardUnits = card.units || { w: 2, h: 2 };
    
    // Simple collision detection
    for (let testY = 0; testY < 100; testY++) {
      for (let testX = 0; testX < columns; testX++) {
        const newPos = { x: testX, y: testY };
        
        // Check if position is valid (within bounds)
        if (testX + cardUnits.w > columns) continue;
        
        // Check collision with other cards
        let collides = false;
        for (const otherCard of cards) {
          if (otherCard.id === card.id) continue;
          
          const otherUnits = otherCard.units || { w: 2, h: 2 };
          const otherPos = otherCard.position;
          
          if (rectOverlap(
            { x: newPos.x, y: newPos.y, w: cardUnits.w, h: cardUnits.h },
            { x: otherPos.x, y: otherPos.y, w: otherUnits.w, h: otherUnits.h }
          )) {
            collides = true;
            break;
          }
        }
        
        if (!collides) {
          return newPos;
        }
      }
    }
    
    return null;
  };

  const getDragStyles = (card: BentoCardType, unit: number, gap: number) => {
    if (!draggedCard.value || draggedCard.value.id !== card.id) return {};
    
    return {
      position: 'fixed' as const,
      zIndex: 999,
      pointerEvents: 'none' as const,
      transform: `translate(${lastMousePos.x - dragOffset.x}px, ${lastMousePos.y - dragOffset.y}px)`,
      opacity: 0.8,
      cursor: 'grabbing'
    };
  };

  const getOriginGhostStyles = (card: BentoCardType, unit: number, gap: number) => {
    if (!draggedCard.value || draggedCard.value.id !== card.id) return {};
    
    return {
      position: 'absolute' as const,
      left: `${card.position.x * (unit + gap)}px`,
      top: `${card.position.y * (unit + gap)}px`,
      width: `${(card.units?.w || 2) * unit + (card.units?.w || 2 - 1) * gap}px`,
      height: `${(card.units?.h || 2) * unit + (card.units?.h || 2 - 1) * gap}px`,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      border: '2px dashed rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      pointerEvents: 'none' as const,
      zIndex: 500
    };
  };

  // Helper function for rectangle overlap detection
  const rectOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  };

  return {
    draggedCard,
    dropTarget,
    dropIndex,
    dropRect,
    dragState,
    updateDrag,
    endDrag,
    getDropTargetStyles,
    findValidPosition,
    getDragStyles,
    getOriginGhostStyles,
    startDrag
  };
}