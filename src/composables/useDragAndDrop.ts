import { ref } from 'vue';
import type { BentoCard, BentoGridRow, CardSize } from '@/types/bento';

export interface DragState {
  targetRowIndex: number;
  targetCardIndex: number;
  dropRow?: BentoGridRow;
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
  const dragSize = ref<{ width: number; height: number } | null>(null);
  const originRect = ref<{ left: number; top: number; width: number; height: number } | null>(null);
  const animateTarget = ref<{ left: number; top: number } | null>(null);
  let rafScheduled = false;
  let lastEvent: { x: number; y: number } | null = null;

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

  const startDrag = (card: BentoCard, event: MouseEvent | TouchEvent) => {
    draggedCard.value = card;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    pointerPos.value = { x: clientX, y: clientY };
    console.log('[DND] dnd.startDrag', { id: card.id, clientX, clientY });
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
        pointerPos.value = { x: lastEvent.x, y: lastEvent.y };
        const gridElement = (gridElementArg || (document.querySelector('.bento-grid') as HTMLElement));
        if (gridElement) {
          const draggedSize = dragSize.value ?? (() => {
            const u = getUnitsForCard(draggedCard.value!);
            return { width: u.w * unit + (u.w - 1) * gap, height: u.h * unit + (u.h - 1) * gap };
          })();
          
          const isPosition = gridElement.getAttribute('data-layout') === 'position';
          if (!isPosition && rows && rows.length > 0) {
            const newDragState = findTargetRow(clientY, rows, gridElement);
            if (newDragState) {
              dragState.value = newDragState;
              
              // 计算阴影位置
              const containerRect = gridElement.getBoundingClientRect();
              let shadowTop = 0;
              let shadowLeft = 0;
              
              if (newDragState.dropRow) {
                // 如果目标行存在，计算在行内的位置
                const rowElement = gridElement.querySelector(`[data-row-id="${newDragState.dropRow.id}"]`) as HTMLElement;
                if (rowElement) {
                  const rowRect = rowElement.getBoundingClientRect();
                  shadowTop = rowRect.top - containerRect.top;
                  
                  // 计算在行内的水平位置
                  if (newDragState.dropRow.cards.length === 0 || newDragState.targetCardIndex === 0) {
                    shadowLeft = 16; // 行的左边距
                  } else if (newDragState.targetCardIndex >= newDragState.dropRow.cards.length) {
                    // 放在行末
                    const lastCardElement = rowElement.querySelector('.bento-grid__card:last-child') as HTMLElement;
                    if (lastCardElement) {
                      const lastCardRect = lastCardElement.getBoundingClientRect();
                      shadowLeft = lastCardRect.right - containerRect.left + gap;
                    } else {
                      shadowLeft = 16;
                    }
                  } else {
                    // 插入到指定位置
                    const targetCardElement = rowElement.querySelectorAll('.bento-grid__card')[newDragState.targetCardIndex] as HTMLElement;
                    if (targetCardElement) {
                      const targetCardRect = targetCardElement.getBoundingClientRect();
                      shadowLeft = targetCardRect.left - containerRect.left;
                    } else {
                      shadowLeft = 16;
                    }
                  }
                }
              } else {
                // 新行，计算垂直位置
                if (rows.length > 0) {
                  const sortedRows = [...rows].sort((a, b) => a.index - b.index);
                  let insertAfter = null;
                  
                  for (let i = 0; i < sortedRows.length; i++) {
                    if (newDragState.targetRowIndex < sortedRows[i].index) {
                      break;
                    }
                    insertAfter = sortedRows[i];
                  }
                  
                  if (insertAfter) {
                    const afterElement = gridElement.querySelector(`[data-row-id="${insertAfter.id}"]`) as HTMLElement;
                    if (afterElement) {
                      const afterRect = afterElement.getBoundingClientRect();
                      shadowTop = afterRect.bottom - containerRect.top + gap;
                    }
                  } else {
                    shadowTop = 16; // 第一行
                  }
                } else {
                  shadowTop = 16; // 没有任何行
                }
                shadowLeft = 16;
              }
              
              dropRect.value = {
                left: Math.max(0, shadowLeft),
                top: Math.max(0, shadowTop),
                width: draggedSize.width,
                height: draggedSize.height,
                rowIndex: newDragState.targetRowIndex
              };
              
              dropIndex.value = newDragState.targetCardIndex;
            }
          } else {
            const isPositionElse = gridElement.getAttribute('data-layout') === 'position';
            if (isPositionElse) {
              const draggedDom = gridElement.querySelector(`.bento-grid__card[data-id="${draggedCard.value?.id}"]`) as HTMLElement | null;
              const domRect = draggedDom ? draggedDom.getBoundingClientRect() : null;
              const effX = (typeof clientX === 'number' && !Number.isNaN(clientX)) ? clientX : (domRect ? domRect.left + domRect.width / 2 : pointerPos.value.x);
              const effY = (typeof clientY === 'number' && !Number.isNaN(clientY)) ? clientY : (domRect ? domRect.top + domRect.height / 2 : pointerPos.value.y);
              const pos = getDropPosition(effX, effY, gridElement, columns, gap, unit);
              const units = getUnitsForCard(draggedCard.value!);
              const maxX = Math.max(0, columns - units.w);
              const gridX = Math.max(0, Math.min(pos.x, maxX));
              const gridY = Math.max(0, pos.y);
              const containerRect = gridElement.getBoundingClientRect();
              if (process.env.NODE_ENV === 'development') {
                console.log('[DND] position 阴影坐标->网格:', { effX, effY, gridX, gridY, units })
              }
              dropRect.value = {
                left: gridX * (unit + gap),
                top: gridY * (unit + gap),
                width: draggedSize.width,
                height: draggedSize.height
              };
              dropIndex.value = -1;
              dropTarget.value = { x: gridX, y: gridY };
            } else {
              // 回退到旧的逻辑
              const children = Array.from(gridElement.querySelectorAll('.bento-grid__card')) as HTMLElement[];
              const targetEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
              let idx = -1;
              if (targetEl) {
                const cardEl = targetEl.closest('.bento-grid__card') as HTMLElement | null;
                if (cardEl) idx = children.indexOf(cardEl);
              }

              const draggedEl = gridElement.querySelector(`.bento-grid__card[data-id="${draggedCard.value?.id}"]`) as HTMLElement | null;
              const others = children.filter(el => el !== draggedEl);
              const containerRect = gridElement.getBoundingClientRect();

              if (idx === -1) {
                const rowTolerance = 8;
                const rects = others
                  .map(el => ({ el, rect: el.getBoundingClientRect(), domIndex: children.indexOf(el) }))
                  .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);

                const rows: Array<{ top: number; items: typeof rects }> = [];
                rects.forEach(item => {
                  const last = rows[rows.length - 1];
                  if (!last || Math.abs(item.rect.top - last.top) > rowTolerance) {
                    rows.push({ top: item.rect.top, items: [item] });
                  } else {
                    last.items.push(item);
                  }
                });

                let rowIdx = 0;
                for (let i = 0; i < rows.length; i++) {
                  const top = rows[i].top;
                  const nextTop = i + 1 < rows.length ? rows[i + 1].top : Infinity;
                  if (clientY >= top && clientY < nextTop) { rowIdx = i; break; }
                  if (clientY >= nextTop) rowIdx = i + 1;
                }
                rowIdx = Math.min(rowIdx, Math.max(0, rows.length - 1));

                const items = (rows[rowIdx]?.items ?? []).sort((a, b) => a.rect.left - b.rect.left);
                let posIdx = 0;
                for (let i = 0; i < items.length; i++) {
                  const cx = items[i].rect.left + items[i].rect.width / 2;
                  if (clientX >= cx) posIdx = i + 1;
                }
                if (items.length === 0) {
                  idx = children.length;
                } else if (posIdx >= items.length) {
                  idx = items[items.length - 1].domIndex + 1;
                } else {
                  idx = items[posIdx].domIndex;
                }
              }
              dropIndex.value = idx;

              if (idx >= 0 && idx < children.length) {
                const refRect = children[idx].getBoundingClientRect();
                dropRect.value = {
                  left: Math.max(0, Math.min(refRect.left - containerRect.left, containerRect.width - draggedSize.width)),
                  top: Math.max(0, Math.min(refRect.top - containerRect.top, containerRect.height - draggedSize.height)),
                  width: draggedSize.width,
                  height: draggedSize.height
                };
              } else {
                const leftGuess = Math.max(0, Math.min(clientX - containerRect.left - draggedSize.width / 2, containerRect.width - draggedSize.width));
                const topGuess = Math.max(0, Math.min(clientY - containerRect.top - draggedSize.height / 2, containerRect.height - draggedSize.height));
                dropRect.value = {
                  left: leftGuess,
                  top: topGuess,
                  width: draggedSize.width,
                  height: draggedSize.height
                };
              }
            }
          }
          
          dropTarget.value = { x: 0, y: 0 };
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
    if (!draggedCard.value) {
      draggedCard.value = null;
      dropTarget.value = null;
      originRect.value = null;
      dropRect.value = null;
      dragState.value = null;
      animateTarget.value = null;
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
    }, 300);
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
    return {
      position: 'fixed' as const,
      zIndex: 1000,
      pointerEvents: 'none',
      left: `${leftPx}px`,
      top: `${topPx}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: 'none',
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12)',
      transition: isAnimating.value ? 'left 0.28s cubic-bezier(0.22, 1, 0.36, 1), top 0.28s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
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
      transition: 'transform 0.1s ease, left 0.1s ease, top 0.1s ease, opacity 220ms ease'
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
    startDrag,
    updateDrag,
    endDrag,
    getDragStyles,
    getDropTargetStyles,
    getOriginGhostStyles,
    checkCollision,
    findValidPosition
  };
};
