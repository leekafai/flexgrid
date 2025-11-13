import { ref, computed } from 'vue';
import type { BentoCard, BentoGrid, BentoGridRow, CardSize } from '@/types/bento';

export const useBentoGrid = () => {
  const grid = ref<BentoGrid>({
    id: 'main-grid',
    name: 'Main Grid',
    cards: [],
    rows: [], // 新增：网格行数组
    columns: 12,
    gap: 20,
    unit: 36,
    maxWidth: '960px',
    theme: 'light',
    totalRows: 24,
    overscanRows: 2
  });
  const layout = ref<'flex' | 'grid' | 'position'>('flex');

  const isDragging = ref(false);
  const draggedCard = ref<BentoCard | null>(null);
  const dragOffset = ref({ x: 0, y: 0 });

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
    if (layout.value === 'grid') {
      const unit = grid.value.unit ?? 36;
      const gapPx = grid.value.gap;
      const rows = grid.value.totalRows ?? 24;
      const height = rows * unit + Math.max(0, rows - 1) * gapPx;
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${grid.value.columns}, 1fr)`,
        gridAutoRows: `${grid.value.unit ?? 36}px`,
        gridAutoFlow: 'dense',
        gap: `${grid.value.gap}px`,
        justifyItems: 'stretch',
        alignItems: 'start',
        maxWidth: grid.value.maxWidth,
        width: '100%',
        margin: '0 auto',
        padding: '16px',
        height: `${height}px`,
        position: 'relative'
      } as const;
    }
    if (layout.value === 'position') {
      const unit = grid.value.unit ?? 36;
      const gap = grid.value.gap;
      const toPx = (n: number) => n * (unit + gap);
      const maxY = grid.value.cards.reduce((m, c) => {
        const u = getCardUnits(c);
        const hUnits = u.h;
        return Math.max(m, (c.position?.y ?? 0) + hUnits);
      }, 0);
      const height = toPx(maxY) - gap;
      return {
        display: 'block',
        maxWidth: grid.value.maxWidth,
        width: '100%',
        margin: '0 auto',
        padding: '16px',
        height: `${Math.max(0, height)}px`,
        position: 'relative'
      } as const;
    }
    const gap = `${grid.value.gap}px`;
    const unit = grid.value.unit ?? 36;
    const rows = grid.value.totalRows ?? 24;
    const height = rows * unit + Math.max(0, rows - 1) * grid.value.gap;
    return {
      display: 'flex',
      flexWrap: 'wrap',
      gap,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
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
    
    if (layout.value === 'position') {
      const unit = grid.value.unit ?? 36;
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
    }
    
    if (grid.value.rows && grid.value.rows.length > 0) {
      return {
        gridColumn: `span ${units.w}`,
        gridRow: `span ${units.h}`,
        backgroundColor: card.style?.backgroundColor || '#ffffff',
        color: card.style?.textColor || '#000000',
        borderRadius: card.style?.borderRadius || '12px',
        background: card.style?.gradient || undefined,
        transform: isDragging.value && draggedCard.value?.id === card.id ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.18s cubic-bezier(.2,.8,.2,1), box-shadow 0.18s cubic-bezier(.2,.8,.2,1)',
        cursor: 'move',
        userSelect: 'none',
        willChange: 'transform',
        placeSelf: 'start',
        margin: '0'
      } as const;
    }

    // 回退到旧的flex布局
    if (layout.value === 'grid') {
      return {
        gridColumn: `span ${units.w}`,
        gridRow: `span ${units.h}`,
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
    }
    
    const unit = grid.value.unit ?? 36;
    const gap = grid.value.gap;
    const minWidth = units.w * unit + (units.w - 1) * gap;
    const minHeight = units.h * unit + (units.h - 1) * gap;
    return {
      flex: '0 1 auto',
      minWidth: `${minWidth}px`,
      minHeight: `${minHeight}px`,
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
    const unit = grid.value.unit ?? 36;
    const gap = grid.value.gap;
    const vh = window.innerHeight || (viewportEl?.getBoundingClientRect().height ?? 800);
    const rows = Math.max(6, Math.floor(vh / (unit + gap)) + (grid.value.overscanRows ?? 2));
    grid.value.totalRows = rows;
  };

  const expandRowsForBottom = (bottomPx: number) => {
    const unit = grid.value.unit ?? 36;
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
    } catch {}
  };

  return {
    grid,
    isDragging,
    draggedCard,
    layout,
    addCard,
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
    initializeRows
  };
};
