import { ref, computed } from 'vue';
import type { BentoCard, BentoGrid, BentoGridRow, CardSize } from '@/types/bento';
import { collidesAt, findValidPosition } from '@/utils/bentoGridUtils';
// import { bentoGridValidationService } from '@/services/BentoGridValidationService';

export const useBentoGrid = () => {
  const grid = ref<BentoGrid>({
    id: 'main-grid',
    name: 'Main Grid',
    cards: [],
    rows: [], // 新增：网格行数组
    columns: 12,
    gap: 28,
    unit: 89,
    maxWidth: '960px',
    theme: 'light',
    totalRows: 24,
    overscanRows: 2
  });
  

  const isDragging = ref(false);
  const draggedCard = ref<BentoCard | null>(null);
  const dragOffset = ref({ x: 0, y: 0 });

  // 新增：验证相关状态
  const isValidating = ref(false);
  const validationErrors = ref<string[]>([]);
  const validationWarnings = ref<string[]>([]);
  
  // 新增：实时进度指示器状态
  const validationProgress = ref({
    percentage: 0,
    currentPhase: '',
    processedCards: 0,
    totalCards: 0,
    estimatedTimeRemaining: 0
  });

  // 初始化网格行结构
  const initializeRows = () => {
    if (!grid.value.rows) {
      grid.value.rows = [];
    }
    
    // 根据现有卡片创建行结构
    const rowMap = new Map<number, BentoCard[]>();
    
    grid.value.cards.forEach(card => {
      const rowIndex = card.rowIndex ?? Math.floor(card.position.y / 100); // 默认根据位置计算行
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, []);
      }
      rowMap.get(rowIndex)!.push(card);
    });
    
    // 转换为行数组并排序
    grid.value.rows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([index, cards]) => ({
        id: `row-${index}`,
        index,
        cards: cards.sort((a, b) => a.position.x - b.position.x) // 按x位置排序
      }));
  };
  const rowsUsedByCards = () => {
    return grid.value.cards.reduce((m, c) => {
      const u = getCardUnits(c);
      const hUnits = u.h;
      return Math.max(m, (c.position?.y ?? 0) + hUnits);
    }, 0);
  };

  const ensureReservedRowsFromCards = () => {
    const n = rowsUsedByCards();
    const current = grid.value.totalRows ?? 24;
    const extra = grid.value.overscanRows ?? 2;
    grid.value.totalRows = Math.max(n + extra, current);
  };

  const addCard = (card: Omit<BentoCard, 'id'>) => {
    const newCard: BentoCard = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rowIndex: card.rowIndex ?? grid.value.rows?.length ?? 0
    };
    
    grid.value.cards.push(newCard);
    
    // 更新行结构
    if (grid.value.rows) {
      const targetRow = grid.value.rows.find(row => row.index === newCard.rowIndex);
      if (targetRow) {
        targetRow.cards.push(newCard);
        targetRow.cards.sort((a, b) => a.position.x - b.position.x);
      } else {
        // 创建新行
        grid.value.rows.push({
          id: `row-${newCard.rowIndex}`,
          index: newCard.rowIndex!,
          cards: [newCard]
        });
        grid.value.rows.sort((a, b) => a.index - b.index);
      }
    }
    ensureReservedRowsFromCards();
  };

  /**
   * 在网格中放置卡片，支持指定坐标或自动计算不覆盖的位置
   * @param card 要放置的卡片（不包含 id）
   * @param position 可选的位置坐标，如果不提供则自动计算
   * @param animateFrom 可选的动画起始位置（像素坐标），如果提供则创建从该位置到目标位置的动画
   * @returns 返回实际放置的位置坐标和卡片 id
   */
  const placeCard = (
    card: Omit<BentoCard, 'id'>,
    position?: { x?: number; y?: number },
    animateFrom?: { x: number; y: number }
  ): { x: number; y: number; cardId: string } => {
    const columns = grid.value.columns;
    let finalPosition: { x: number; y: number };

    if (position && position.x !== undefined && position.y !== undefined) {
      // 如果提供了位置，先检查是否冲突
      const testCard: BentoCard = {
        ...card,
        id: 'temp-id',
        position: { x: position.x, y: position.y }
      };
      
      if (!collidesAt(testCard, { x: position.x, y: position.y }, grid.value.cards)) {
        // 位置可用，直接使用
        finalPosition = { x: position.x, y: position.y };
      } else {
        // 位置冲突，自动查找不冲突的位置
        const validPos = findValidPosition(
          testCard,
          position.x,
          position.y,
          grid.value.cards,
          columns,
          200 // maxAttempts
        );
        
        if (validPos) {
          finalPosition = validPos;
        } else {
          // 如果找不到有效位置，从指定位置开始向下查找
          finalPosition = { x: position.x, y: position.y };
          // 继续向下查找，直到找到不冲突的位置
          for (let y = position.y; y < position.y + 100; y++) {
            const testPos = { x: position.x, y };
            if (!collidesAt(testCard, testPos, grid.value.cards)) {
              finalPosition = testPos;
              break;
            }
          }
        }
      }
    } else {
      // 没有提供位置，自动计算一个不覆盖的位置
      const testCard: BentoCard = {
        ...card,
        id: 'temp-id',
        position: { x: 0, y: 0 }
      };
      
      const validPos = findValidPosition(
        testCard,
        0,
        0,
        grid.value.cards,
        columns,
        200 // maxAttempts
      );
      
      if (validPos) {
        finalPosition = validPos;
      } else {
        // 如果找不到有效位置，使用默认位置 (0, 0)
        finalPosition = { x: 0, y: 0 };
      }
    }

    // 如果需要动画，使用延迟部署机制：不立即添加到网格，而是创建临时卡片状态
    if (animateFrom) {
      // 生成临时卡片ID
      const tempCardId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 触发动画事件，传递临时卡片数据（不包含ID）
      setTimeout(() => {
        const event = new CustomEvent('card-placed-with-animation', {
          detail: {
            cardId: tempCardId,
            tempCard: card, // 不包含 id 的卡片数据
            from: animateFrom,
            to: finalPosition
          }
        });
        document.dispatchEvent(event);
      }, 0);
      
      // 返回临时卡片ID，不添加到网格
      return { x: finalPosition.x, y: finalPosition.y, cardId: tempCardId };
    }
    
    // 不需要动画时，正常添加卡片到网格
    const newCard: BentoCard = {
      ...card,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rowIndex: card.rowIndex ?? grid.value.rows?.length ?? 0,
      position: finalPosition
    };
    
    grid.value.cards.push(newCard);
    
    // 更新行结构
    if (grid.value.rows) {
      const targetRow = grid.value.rows.find(row => row.index === newCard.rowIndex);
      if (targetRow) {
        targetRow.cards.push(newCard);
        targetRow.cards.sort((a, b) => a.position.x - b.position.x);
      } else {
        // 创建新行
        grid.value.rows.push({
          id: `row-${newCard.rowIndex}`,
          index: newCard.rowIndex!,
          cards: [newCard]
        });
        grid.value.rows.sort((a, b) => a.index - b.index);
      }
    }
    ensureReservedRowsFromCards();

    return { x: finalPosition.x, y: finalPosition.y, cardId: newCard.id };
  };

  const removeCard = (cardId: string) => {
    const index = grid.value.cards.findIndex(card => card.id === cardId);
    if (index > -1) {
      const card = grid.value.cards[index];
      grid.value.cards.splice(index, 1);
      
      // 从行中移除
      if (grid.value.rows && card.rowIndex !== undefined) {
        const row = grid.value.rows.find(r => r.index === card.rowIndex);
        if (row) {
          const cardIndex = row.cards.findIndex(c => c.id === cardId);
          if (cardIndex > -1) {
            row.cards.splice(cardIndex, 1);
          }
        }
      }
    }
  };

  const updateCard = (cardId: string, updates: Partial<BentoCard>) => {
    const card = grid.value.cards.find(card => card.id === cardId);
    if (card) {
      Object.assign(card, updates);
    }
  };

  const moveCard = (cardId: string, newPosition: { x: number; y: number }) => {
    updateCard(cardId, { position: newPosition });
  };

  const resizeCard = (cardId: string, newSize: CardSize) => {
    updateCard(cardId, { size: newSize });
  };

  const startDrag = (card: BentoCard, event: MouseEvent | TouchEvent) => {
    isDragging.value = true;
    draggedCard.value = card;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    dragOffset.value = { x: clientX, y: clientY };
    
    return { isDragging: isDragging.value, draggedCard: draggedCard.value };
  };

  const getCardUnits = (card: BentoCard) => {
    if (card.units) return card.units;
    const map: Record<CardSize, { w: number; h: number }> = {
      small: { w: 1, h: 1 },
      medium: { w: 2, h: 1 },
      large: { w: 1, h: 2 },
      wide: { w: 2, h: 2 }
    };
    const size = (card.size as CardSize) || 'wide';
    return map[size] || { w: 2, h: 2 };
  };

  const getGridStyles = computed(() => {
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const toPx = (n: number) => n * (unit + gap);
    const maxY = grid.value.cards.reduce((m, c) => {
      const u = getCardUnits(c);
      const hUnits = u.h;
      return Math.max(m, (c.position?.y ?? 0) + hUnits);
    }, 0);
    const usedHeight = Math.max(0, toPx(maxY) - gap);
    const reservedRows = grid.value.totalRows ?? 0;
    const reservedHeight = reservedRows > 0 ? Math.max(0, reservedRows * unit + Math.max(0, reservedRows - 1) * gap) : 0;
    const height = Math.max(usedHeight, reservedHeight);
    return {
      display: 'block',
      maxWidth: grid.value.maxWidth,
      width: '100%',
      margin: '0 auto',
      padding: '16px',
      height: `${height}px`,
      position: 'relative'
    } as const;
  });

  const getCardStyles = (card: BentoCard) => {
    const units = getCardUnits(card);
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const toPx = (n: number) => n * (unit + gap);
    const left = toPx(card.position?.x ?? 0);
    const top = toPx(card.position?.y ?? 0);
    const width = units.w * unit + (units.w - 1) * gap;
    const height = units.h * unit + (units.h - 1) * gap;
    return {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: card.style?.backgroundColor || '#ffffff',
      color: card.style?.textColor || '#000000',
      borderRadius: card.style?.borderRadius || '12px',
      background: card.style?.gradient || undefined,
      transform: isDragging.value && draggedCard.value?.id === card.id ? 'scale(1.02)' : 'scale(1)',
      transition: 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)',
      cursor: 'move',
      userSelect: 'none',
      willChange: 'transform'
    } as const;
  };

  // 新增：在指定位置添加新行
  const addRow = (index: number) => {
    if (!grid.value.rows) {
      grid.value.rows = [];
    }
    
    // 检查是否已存在
    const existingRow = grid.value.rows.find(row => row.index === index);
    if (existingRow) {
      return existingRow;
    }
    
    const newRow: BentoGridRow = {
      id: `row-${index}`,
      index,
      cards: []
    };
    
    grid.value.rows.push(newRow);
    grid.value.rows.sort((a, b) => a.index - b.index);
    
    return newRow;
  };

  // 新增：跨行移动卡片
  const moveCardToRow = (cardId: string, targetRowIndex: number, targetCardIndex?: number) => {
    const card = grid.value.cards.find(c => c.id === cardId);
    if (!card || !grid.value.rows) return;
    
    const sourceRowIndex = card.rowIndex;
    
    // 从源行移除
    if (sourceRowIndex !== undefined) {
      const sourceRow = grid.value.rows.find(r => r.index === sourceRowIndex);
      if (sourceRow) {
        const cardIndex = sourceRow.cards.findIndex(c => c.id === cardId);
        if (cardIndex > -1) {
          sourceRow.cards.splice(cardIndex, 1);
        }
      }
    }
    
    // 添加到目标行
    let targetRow = grid.value.rows.find(r => r.index === targetRowIndex);
    if (!targetRow) {
      targetRow = addRow(targetRowIndex);
    }
    
    card.rowIndex = targetRowIndex;
    
    if (targetCardIndex !== undefined) {
      targetRow.cards.splice(targetCardIndex, 0, card);
    } else {
      targetRow.cards.push(card);
    }
  };

  const reorderCardByIndex = (cardId: string, index: number) => {
    const currentIndex = grid.value.cards.findIndex(c => c.id === cardId);
    if (currentIndex === -1) return;
    const [item] = grid.value.cards.splice(currentIndex, 1);
    // 当原位置在目标位置之前时，移除会使右侧元素左移一位，需要修正目标索引
    const adjustedIndex = currentIndex < index ? index - 1 : index;
    const clamped = Math.max(0, Math.min(adjustedIndex, grid.value.cards.length));
    grid.value.cards.splice(clamped, 0, item);
    
    // 重新初始化行结构
    if (grid.value.rows) {
      initializeRows();
    }
  };

  const setViewportGridBounds = (viewportEl?: HTMLElement | null) => {
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const vh = window.innerHeight || (viewportEl?.getBoundingClientRect().height ?? 800);
    const rows = Math.max(6, Math.floor(vh / (unit + gap)) + (grid.value.overscanRows ?? 2));
    grid.value.totalRows = rows;
  };

  const expandRowsForBottom = (bottomPx: number) => {
    const unit = grid.value.unit ?? 89;
    const gap = grid.value.gap;
    const currentRows = grid.value.totalRows ?? 24;
    const currentHeight = currentRows * unit + Math.max(0, currentRows - 1) * gap;
    if (bottomPx <= currentHeight) return;
    const neededRows = Math.ceil((bottomPx + gap) / (unit + gap));
    grid.value.totalRows = Math.max(currentRows, neededRows + (grid.value.overscanRows ?? 2));
  };

  const saveLayout = (key = 'bento-layout') => {
    const payload = {
      cards: grid.value.cards.map(c => ({ id: c.id, size: c.size, units: c.units, type: c.type, rowIndex: c.rowIndex }))
    };
    localStorage.setItem(key, JSON.stringify(payload));
  };

  const loadLayout = (key = 'bento-layout') => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { cards: Array<{ id: string; size?: CardSize; units?: { h: number; w: number }; type: string; rowIndex?: number }> };
      const map = new Map(payload.cards.map(c => [c.id, c]));
      grid.value.cards = grid.value.cards.map(c => {
        const m = map.get(c.id);
        if (!m) return c;
        return { ...c, size: m.size ?? c.size, units: m.units ?? c.units, type: m.type ?? c.type, rowIndex: m.rowIndex ?? c.rowIndex };
      });
      
      // 重新初始化行结构
      if (grid.value.rows) {
        initializeRows();
      }
      ensureReservedRowsFromCards();
    } catch {}
  };

  // 新增：JSON数据加载和验证功能
  // const loadJsonData = async (jsonData: any, options?: any) => {
  //   isValidating.value = true;
  //   validationErrors.value = [];
  //   validationWarnings.value = [];
    
  //   // 重置进度
  //   validationProgress.value = {
  //     percentage: 0,
  //     currentPhase: '初始化',
  //     processedCards: 0,
  //     totalCards: 0,
  //     estimatedTimeRemaining: 0
  //   };

  //   try {
  //     // 解析JSON数据为BentoCard数组
  //     const bentoCards = bentoGridValidationService.parseJsonToBentoCards(jsonData);
      
  //     if (bentoCards.length === 0) {
  //       throw new Error('JSON数据中未找到有效的卡片数据');
  //     }
      
  //     // 更新总卡片数
  //     validationProgress.value.totalCards = bentoCards.length;
  //     validationProgress.value.currentPhase = '解析数据';
  //     validationProgress.value.percentage = 10;

  //     const result = await bentoGridValidationService.loadJsonData(jsonData, {
  //       ...options,
  //       onProgress: (progress: any) => {
  //         // 更新进度
  //         validationProgress.value = {
  //           ...validationProgress.value,
  //           percentage: progress.percentage || 0,
  //           currentPhase: progress.phase || '验证中',
  //           processedCards: progress.processedCards || 0,
  //           estimatedTimeRemaining: progress.estimatedTimeRemaining || 0
  //         };
  //       }
  //     });
      
  //     // 更新验证状态
  //     validationErrors.value = result.errors;
  //     validationWarnings.value = result.warnings;
      
  //     // 完成进度
  //     validationProgress.value.percentage = 100;
  //     validationProgress.value.currentPhase = '完成';
      
  //     // 如果验证成功，更新网格数据
  //     if (result.isValid) {
  //       grid.value.cards = result.fixedCards;
  //       initializeRows();
  //       ensureReservedRowsFromCards();
  //     }
      
  //     return result;
  //   } catch (error) {
  //     validationErrors.value.push(error instanceof Error ? error.message : String(error));
  //     validationProgress.value.currentPhase = '错误';
  //     throw error;
  //   } finally {
  //     isValidating.value = false;
  //   }
  // };

  // 新增：验证当前网格状态
  // const validateCurrentGrid = async () => {
  //   return await bentoGridValidationService.validateCurrentGrid();
  // };

  // 新增：清除验证结果
  const clearValidationResults = () => {
    validationErrors.value = [];
    validationWarnings.value = [];
    // bentoGridValidationService.clearValidationResult();
  };

  return {
    grid,
    isDragging,
    draggedCard,
    // 新增：验证相关状态
    isValidating,
    validationErrors,
    validationWarnings,
    // 新增：实时进度指示器状态
    validationProgress,
    addCard,
    placeCard,
    removeCard,
    updateCard,
    moveCard,
    resizeCard,
    startDrag,
    getCardUnits,
    getGridStyles,
    getCardStyles,
    reorderCardByIndex,
    saveLayout,
    loadLayout,
    setViewportGridBounds,
    expandRowsForBottom,
    addRow,
    moveCardToRow,
    initializeRows,
    // 新增：JSON加载和验证功能
    // loadJsonData,
    // validateCurrentGrid,
    clearValidationResults
  };
};
