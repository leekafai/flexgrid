import { ref, computed } from 'vue';
import type { BentoCard, BentoGridRow, CardSize } from '@/types/bento';

export interface DragState {
  targetRowIndex: number;
  targetCardIndex: number;
  dropRow?: BentoGridRow;
  dragSource?: 'grid' | 'storage' | null;
}

export const useDragAndDrop = () => {
  const draggedCard = ref<BentoCard | null>(null);
  const dragOffset = ref({ x: 0, y: 0 });
  const dropTarget = ref<{ x: number; y: number } | null>(null);
  const isAnimating = ref(false);
  const pointerPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  const dropRect = ref<{ left: number; top: number; width: number; height: number; rowIndex?: number } | null>(null);
  const dropIndex = ref<number>(-1);
  const dragState = ref<DragState | null>(null);
  const dragSource = ref<'grid' | 'storage' | null>(null);
  const isDragging = ref(false);
  const isDragOverStorage = ref(false);
  const dragSize = ref<{ width: number; height: number } | null>(null);
  const originRect = ref<{ left: number; top: number; width: number; height: number } | null>(null);
  const animateTarget = ref<{ left: number; top: number } | null>(null);
  const tilt = ref<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointer = ref<{ x: number; y: number } | null>(null);
  const tiltZ = ref<number>(0);
  const velX = ref<number>(0);
  const velZ = ref<number>(0);
  const lastUpdateTs = ref<number>(0);
  let inertiaRAF: number | null = null;
  let lastTickTs = 0;
  let rafScheduled = false;
  let lastEvent: { x: number; y: number } | null = null;
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const startInertia = () => {
    if (inertiaRAF) return;
    lastTickTs = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.max(0.016, (now - lastTickTs) / 16.6667);
      lastTickTs = now;
      if (draggedCard.value) {
        const idle = now - lastUpdateTs.value > 80;
        if (idle) {
          const k = 0.12;
          const damping = 0.86;
          // Z 旋转回弹
          velZ.value += -k * tiltZ.value * dt;
          velZ.value *= damping;
          tiltZ.value += velZ.value;
          // X 倾斜回弹
          velX.value += -k * tilt.value.x * dt;
          velX.value *= damping;
          tilt.value = { x: tilt.value.x + velX.value, y: tilt.value.y };
          if (
            Math.abs(tiltZ.value) < 0.05 && Math.abs(velZ.value) < 0.05 &&
            Math.abs(tilt.value.x) < 0.05 && Math.abs(velX.value) < 0.05
          ) {
            tiltZ.value = 0;
            velZ.value = 0;
            tilt.value = { x: 0, y: tilt.value.y };
            velX.value = 0;
          }
        }
        inertiaRAF = requestAnimationFrame(step);
        return;
      }
      inertiaRAF = null;
    };
    inertiaRAF = requestAnimationFrame(step);
  };

  const getUnitsForCard = (card: BentoCard) => {
    if (card.units) return card.units;
    const map: Record<string, { w: number; h: number }> = {
      small: { w: 1, h: 1 },
      medium: { w: 2, h: 1 },
      large: { w: 1, h: 2 },
      wide: { w: 2, h: 2 }
    };
    const size = (card.size as any) || 'wide';
    return map[size] || { w: 2, h: 2 };
  };

  const getDropPosition = (
    clientX: number,
    clientY: number,
    gridElement: HTMLElement,
    columns: number,
    gap: number,
    unit: number
  ) => {
    const rect = gridElement.getBoundingClientRect();
    const cs = getComputedStyle(gridElement);
    const padLeft = parseFloat(cs.paddingLeft || '0') || 0;
    const padTop = parseFloat(cs.paddingTop || '0') || 0;
    const relativeX = Math.max(0, clientX - rect.left - padLeft);
    const relativeY = Math.max(0, clientY - rect.top - padTop);
    
    const cellWidth = unit + gap;
    const cellHeight = unit + gap;
    
    const gridX = Math.floor(relativeX / cellWidth);
    const gridY = Math.floor(relativeY / cellHeight);
    
    return {
      x: Math.max(0, Math.min(gridX, columns - 1)),
      y: Math.max(0, gridY)
    };
  };

  // 新增：查找鼠标位置对应的行
  const findTargetRow = (clientY: number, rows: BentoGridRow[], gridElement: HTMLElement): DragState | null => {
    const containerRect = gridElement.getBoundingClientRect();
    const relativeY = clientY - containerRect.top;
    
    // 计算每行的垂直范围
    const rowRanges = rows.map(row => {
      const rowElement = gridElement.querySelector(`[data-row-id="${row.id}"]`) as HTMLElement;
      if (rowElement) {
        const rowRect = rowElement.getBoundingClientRect();
        return {
          row,
          top: rowRect.top - containerRect.top,
          bottom: rowRect.bottom - containerRect.top,
          height: rowRect.height
        };
      } else {
        // 如果没有DOM元素，根据索引估算位置
        const estimatedTop = row.index * 100; // 假设每行100px高
        return {
          row,
          top: estimatedTop,
          bottom: estimatedTop + 100,
          height: 100
        };
      }
    });
    
    // 查找鼠标所在的行
    let targetRow = null;
    for (const range of rowRanges) {
      if (relativeY >= range.top && relativeY <= range.bottom) {
        targetRow = range;
        break;
      }
    }
    
    // 如果鼠标不在任何行内，创建新的目标行
    if (!targetRow) {
      // 计算应该在哪一行
      let newRowIndex = 0;
      if (rowRanges.length > 0) {
        if (relativeY < rowRanges[0].top) {
          newRowIndex = 0;
        } else if (relativeY > rowRanges[rowRanges.length - 1].bottom) {
          newRowIndex = rowRanges[rowRanges.length - 1].row.index + 1;
        } else {
          // 在中间位置，找到最接近的行
          for (let i = 0; i < rowRanges.length - 1; i++) {
            const currentBottom = rowRanges[i].bottom;
            const nextTop = rowRanges[i + 1].top;
            if (relativeY > currentBottom && relativeY < nextTop) {
              newRowIndex = rowRanges[i + 1].row.index;
              break;
            }
          }
        }
      }
      
      return {
        targetRowIndex: newRowIndex,
        targetCardIndex: 0,
        dropRow: undefined
      };
    }
    
    // 计算在行内的卡片索引
    const rowElement = gridElement.querySelector(`[data-row-id="${targetRow.row.id}"]`) as HTMLElement;
    const cardElements = rowElement ? Array.from(rowElement.querySelectorAll('.bento-grid__card')) as HTMLElement[] : [];
    
    let targetCardIndex = targetRow.row.cards.length; // 默认放在行末
    
    if (cardElements.length > 0) {
      const clientX = lastEvent?.x || 0;
      
      for (let i = 0; i < cardElements.length; i++) {
        const cardRect = cardElements[i].getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        
        if (clientX < cardCenterX) {
          targetCardIndex = i;
          break;
        }
      }
    }
    
    return {
      targetRowIndex: targetRow.row.index,
      targetCardIndex,
      dropRow: targetRow.row
    };
  };

  const startDrag = (card: BentoCard, event: MouseEvent | TouchEvent, source: 'grid' | 'storage' = 'grid') => {
    // 串行处理：检查是否已有拖放操作
    if (isDragging.value) {
      console.warn('[DND] Another drag operation in progress, ignoring');
      return;
    }
    
    isDragging.value = true;
    draggedCard.value = card;
    dragSource.value = source;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    pointerPos.value = { x: clientX, y: clientY };
    console.log('[DND] dnd.startDrag', { id: card.id, source, clientX, clientY });
    lastUpdateTs.value = performance.now();
    startInertia();
    
    if (source === 'storage') {
      // 对于存储卡片，需要从存储卡片元素获取尺寸
      const storageCardEl = (event.target as HTMLElement).closest('.floating-panel__stored-card') as HTMLElement | null;
      if (storageCardEl) {
        const r = storageCardEl.getBoundingClientRect();
        const gridElement = document.querySelector('.bento-grid') as HTMLElement | null;
        if (gridElement) {
          const containerRect = gridElement.getBoundingClientRect();
          const u = getUnitsForCard(card);
          const unit = 89; // 默认单位，实际应从 grid 获取
          const gap = 16; // 默认间距
          const cardWidth = u.w * unit + (u.w - 1) * gap;
          const cardHeight = u.h * unit + (u.h - 1) * gap;
          dragSize.value = { width: cardWidth, height: cardHeight };
          dragOffset.value = {
            x: clientX - r.left,
            y: clientY - r.top
          };
          dropRect.value = {
            left: 0,
            top: 0,
            width: cardWidth,
            height: cardHeight
          };
        }
      }
    } else {
      // 原有逻辑：从网格卡片获取
      const gridElement = document.querySelector('.bento-grid') as HTMLElement | null;
      if (gridElement) {
        const el = gridElement.querySelector(`.bento-grid__card[data-id="${card.id}"]`) as HTMLElement | null;
        if (el) {
          const containerRect = gridElement.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          originRect.value = {
            left: r.left - containerRect.left,
            top: r.top - containerRect.top,
            width: r.width,
            height: r.height
          };
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          dragSize.value = { width: w, height: h };
          dragOffset.value = {
            x: clientX - r.left,
            y: clientY - r.top
          };
          console.log('[DND] originRect', originRect.value);
          dropRect.value = {
            left: originRect.value.left,
            top: originRect.value.top,
            width: originRect.value.width,
            height: originRect.value.height
          };
        }
      }
    }
  };

  const updateDrag = (event: MouseEvent | TouchEvent, columns: number, gap: number, unit: number, rows?: BentoGridRow[], gridElementArg?: HTMLElement, afterUpdate?: () => void) => {
    if (!draggedCard.value) return;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    lastEvent = { x: clientX, y: clientY };
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        if (!draggedCard.value || !lastEvent) return;
        const prev = lastPointer.value || pointerPos.value;
        const dx = lastEvent.x - prev.x;
        const dy = lastEvent.y - prev.y;
        lastPointer.value = { x: lastEvent.x, y: lastEvent.y };
        pointerPos.value = { x: lastEvent.x, y: lastEvent.y };
        const targetTiltY = clamp(dx / 3, -16, 16);
        const targetTiltX = clamp(dy / 2.2, -14, 14);
        tilt.value = {
          x: tilt.value.x * 0.75 + targetTiltX * 0.25,
          y: tilt.value.y * 0.75 + targetTiltY * 0.25
        };
        const speed = Math.hypot(dx, dy);
        const amp = clamp(speed / 2.2, 0, 16);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const sector = Math.round(angle / 45);
        const weight = sector === 0 ? 1
          : sector === 1 ? 0.7
          : sector === 2 ? 0
          : sector === 3 ? -0.7
          : sector === 4 || sector === -4 ? -1
          : sector === -3 ? -0.7
          : sector === -2 ? 0
          : sector === -1 ? 0.7
          : 0;
        const targetTiltZ = clamp(weight * amp, -18, 18);
        tiltZ.value = tiltZ.value * 0.72 + targetTiltZ * 0.28;
        lastUpdateTs.value = performance.now();
        const gridElement = (gridElementArg || (document.querySelector('.bento-grid') as HTMLElement));
        if (gridElement) {
          const draggedSize = dragSize.value ?? (() => {
            const u = getUnitsForCard(draggedCard.value!);
            return { width: u.w * unit + (u.w - 1) * gap, height: u.h * unit + (u.h - 1) * gap };
          })();

          const draggedDom = gridElement.querySelector(`.bento-grid__card[data-id="${draggedCard.value?.id}"]`) as HTMLElement | null;
          const domRect = draggedDom ? draggedDom.getBoundingClientRect() : null;
          const effX = (typeof clientX === 'number' && !Number.isNaN(clientX)) ? clientX : (domRect ? domRect.left + domRect.width / 2 : pointerPos.value.x);
          const effY = (typeof clientY === 'number' && !Number.isNaN(clientY)) ? clientY : (domRect ? domRect.top + domRect.height / 2 : pointerPos.value.y);
          const pos = getDropPosition(effX, effY, gridElement, columns, gap, unit);
          const units = getUnitsForCard(draggedCard.value!);
          const maxX = Math.max(0, columns - units.w);
          const gridX = Math.max(0, Math.min(pos.x, maxX));
          const gridY = Math.max(0, pos.y);
          dropRect.value = {
            left: gridX * (unit + gap),
            top: gridY * (unit + gap),
            width: draggedSize.width,
            height: draggedSize.height
          };
          dropIndex.value = -1;
          dropTarget.value = { x: gridX, y: gridY };
          console.log('[DND] dnd.updateDrag', { 
            id: draggedCard.value.id, 
            pointer: pointerPos.value, 
            dropIndex: dropIndex.value, 
            dropRect: dropRect.value,
            dragState: dragState.value 
          });
          if (afterUpdate) afterUpdate();
        }
      });
    }
  };

  const endDrag = () => {
    isDragging.value = false;
    isDragOverStorage.value = false;
    if (!draggedCard.value) {
      draggedCard.value = null;
      dropTarget.value = null;
      originRect.value = null;
      dropRect.value = null;
      dragState.value = null;
      animateTarget.value = null;
      dragSource.value = null;
      tilt.value = { x: 0, y: 0 };
      lastPointer.value = null;
      tiltZ.value = 0;
      velZ.value = 0;
      velX.value = 0;
      lastUpdateTs.value = 0;
      if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; }
      return;
    }
    const gridElement = document.querySelector('.bento-grid') as HTMLElement | null;
    if (gridElement && dropRect.value) {
      const containerRect = gridElement.getBoundingClientRect();
      animateTarget.value = {
        left: containerRect.left + dropRect.value.left,
        top: containerRect.top + dropRect.value.top
      };
    }
    isAnimating.value = true;
    setTimeout(() => {
      draggedCard.value = null;
      dropTarget.value = null;
      isAnimating.value = false;
      originRect.value = null;
      dropRect.value = null;
      dragState.value = null;
      animateTarget.value = null;
      dragSource.value = null;
      tilt.value = { x: 0, y: 0 };
      lastPointer.value = null;
      tiltZ.value = 0;
      velZ.value = 0;
      velX.value = 0;
      lastUpdateTs.value = 0;
      if (inertiaRAF) { cancelAnimationFrame(inertiaRAF); inertiaRAF = null; }
    }, 480);
  };

  const getDragStyles = (card: BentoCard, unit: number, gap: number) => {
    if (draggedCard.value?.id !== card.id) return {};
    
    const width = dragSize.value?.width ?? (() => {
      const u = getUnitsForCard(card);
      return u.w * unit + (u.w - 1) * gap;
    })();
    const height = dragSize.value?.height ?? (() => {
      const u = getUnitsForCard(card);
      return u.h * unit + (u.h - 1) * gap;
    })();
    const leftPx = (() => {
      if (isAnimating.value && animateTarget.value) return animateTarget.value.left;
      return pointerPos.value.x - dragOffset.value.x;
    })();
    const topPx = (() => {
      if (isAnimating.value && animateTarget.value) return animateTarget.value.top;
      return pointerPos.value.y - dragOffset.value.y;
    })();
    const baseTrans = 'transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms cubic-bezier(.2,.8,.2,1)';
    const moveTrans = 'left 0.45s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.45s cubic-bezier(0.2, 0.9, 0.3, 1), transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1)';
    const lifting = !isAnimating.value;
    const tX = tilt.value.x;
    const tZ = tiltZ.value;
    const transformStr = lifting ? `perspective(700px) translateZ(10px) rotateX(${tX}deg) rotate(${tZ}deg) scale(1.04)` : 'scale(1.01)';
    const elev = lifting ? 22 + Math.min(18, Math.abs(tZ)) : 0;
    const blur = lifting ? Math.round(elev * 2.4) : 0;
    return {
      position: 'fixed' as const,
      zIndex: 1000,
      pointerEvents: 'none',
      left: `${leftPx}px`,
      top: `${topPx}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: transformStr,
      boxShadow: lifting ? `0 ${elev}px ${blur}px rgba(15, 23, 42, 0.18)` : undefined,
      transition: isAnimating.value ? moveTrans : baseTrans
    };
  };

  const getDropTargetStyles = (columns: number, gap: number, unit: number, color?: string) => {
    if (!draggedCard.value || !dropRect.value) return {};
    console.log('[DND] dnd.dropTarget', { dropRect: dropRect.value });
    const bg = color ?? 'rgba(0,0,0,0.1)';
    const border = color ? '1px dashed rgba(255, 0, 0, 0.6)' : '1px dashed rgba(107, 114, 128, 0.5)';
    return {
      position: 'absolute',
      left: `${dropRect.value.left}px`,
      top: `${dropRect.value.top}px`,
      width: `${dropRect.value.width}px`,
      height: `${dropRect.value.height}px`,
      backgroundColor: bg,
      border,
      borderRadius: '12px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
      pointerEvents: 'none',
      zIndex: 999,
      opacity: 0.8,
      transition: 'left 140ms cubic-bezier(.2,.8,.2,1), top 140ms cubic-bezier(.2,.8,.2,1), transform 120ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease',
      willChange: 'left, top, transform, opacity'
    } as const;
  };

  const getOriginGhostStyles = () => {
    if (!originRect.value) return {};
    return {
      position: 'absolute' as const,
      left: `${originRect.value.left}px`,
      top: `${originRect.value.top}px`,
      width: `${originRect.value.width}px`,
      height: `${originRect.value.height}px`,
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.6)',
      boxShadow: '0 10px 32px rgba(0,0,0,0.15)',
      pointerEvents: 'none',
      zIndex: 500,
      transform: 'scale(1)',
      transition: 'opacity 0.12s ease'
    };
  };

  const checkCollision = (card1: BentoCard, card2: BentoCard): boolean => {
    const getCardDimensions = (card: BentoCard) => {
      switch (card.size) {
        case 'small': return { width: 1, height: 1 };
        case 'medium': return { width: 2, height: 1 };
        case 'large': return { width: 1, height: 2 };
        case 'wide': return { width: 2, height: 2 };
        default: return { width: 1, height: 1 };
      }
    };

    const dim1 = getCardDimensions(card1);
    const dim2 = getCardDimensions(card2);

    return !(
      card1.position.x + dim1.width <= card2.position.x ||
      card2.position.x + dim2.width <= card1.position.x ||
      card1.position.y + dim1.height <= card2.position.y ||
      card2.position.y + dim2.height <= card1.position.y
    );
  };

  const findValidPosition = (card: BentoCard, existingCards: BentoCard[], columns = 12): { x: number; y: number } => {
    const maxAttempts = 100;
    let attempts = 0;
    
    // Try to place at the requested position first
    if (dropTarget.value) {
      const testCard = { ...card, position: dropTarget.value };
      const hasCollision = existingCards.some(existing => 
        existing.id !== card.id && checkCollision(testCard, existing)
      );
      
      if (!hasCollision) {
        return dropTarget.value;
      }
    }
    
    // Find next available position
    while (attempts < maxAttempts) {
      const y = Math.floor(attempts / columns);
      const x = attempts % columns;
      
      const testCard = { ...card, position: { x, y } };
      const hasCollision = existingCards.some(existing => 
        existing.id !== card.id && checkCollision(testCard, existing)
      );
      
      if (!hasCollision) {
        return { x, y };
      }
      
      attempts++;
    }
    
    // Fallback to first position if no valid position found
    return { x: 0, y: 0 };
  };

  return {
    draggedCard,
    dragOffset,
    dropTarget,
    isAnimating,
    pointerPos,
    dropRect,
    dropIndex,
    dragState,
    dragSource: computed(() => dragSource.value),
    isDragging: computed(() => isDragging.value),
    isDragOverStorage: computed(() => isDragOverStorage.value),
    startDrag,
    updateDrag,
    endDrag,
    setDragOverStorage: (value: boolean) => {
      isDragOverStorage.value = value;
    },
    getDragStyles,
    getDropTargetStyles,
    getOriginGhostStyles,
    checkCollision,
    findValidPosition
  };
};
