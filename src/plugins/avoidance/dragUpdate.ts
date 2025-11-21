import type { AvoidanceContext, AvoidancePlan, AvoidanceMove } from '@/types/plugins';
import type { BentoCard } from '@/types/bento';
import { getUnitsForCard, toGridXY, buildOccupancy, bfsNearest, aabbOverlap, canPlace } from './utils';
import { avoidanceState } from './state';

export function onDragUpdate(ctx: AvoidanceContext): AvoidancePlan | null {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const minInterval = 0;
  if (now - avoidanceState.lastDispatchTs < minInterval) return null;
  avoidanceState.lastDispatchTs = now;
  if (!ctx.draggedCard || !ctx.dropRect) return null;

  const draggedUnits = getUnitsForCard(ctx.draggedCard);
  const targetXY = toGridXY(ctx.dropRect.left, ctx.dropRect.top, ctx.unit, ctx.gap);
  const draggedRect = { x: targetXY.x, y: targetXY.y, w: draggedUnits.w, h: draggedUnits.h };
  const areaKey = `${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}`;

  if (import.meta.env.MODE === 'development') {
    console.log(`[Avoidance] 输入阴影: left=${ctx.dropRect.left}, top=${ctx.dropRect.top} -> 网格 (${draggedRect.x},${draggedRect.y}) 目标尺寸 ${draggedRect.w}x${draggedRect.h}`);
  }

  const collisions: BentoCard[] = [];
  for (const c of ctx.cards) {
    if (c.id === ctx.draggedCard.id) continue;
    const u = getUnitsForCard(c);
    const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h };
    const isOverlap = aabbOverlap(draggedRect, rect);
    if (import.meta.env.MODE === 'development') {
      console.log(`[Avoidance] 碰撞检测: 拖动卡片 ${ctx.draggedCard.id} (${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}) vs ${c.id} (${rect.x},${rect.y},${rect.w},${rect.h}) = ${isOverlap}`);
    }
    if (isOverlap) collisions.push(c);
  }

  if (import.meta.env.MODE === 'development') {
    console.log(`[Avoidance] 检测到 ${collisions.length} 个碰撞:`, collisions.map(c => c.id));
  }

  const prev = avoidanceState.prevShadowRect;
  if (prev && prev.areaKey === areaKey) {
    const prevCoveredIds = avoidanceState.prevCoveredIds;
    const currentCoveredIds = new Set(collisions.map(c => c.id));
    const collisionSetChanged = prevCoveredIds.size !== currentCoveredIds.size || !Array.from(prevCoveredIds).every(id => currentCoveredIds.has(id));
    if (import.meta.env.MODE === 'development') {
      console.log('[Avoidance] 区域未变，碰撞集合是否变化:', collisionSetChanged);
    }
  }

  avoidanceState.prevShadowRect = { left: ctx.dropRect.left, top: ctx.dropRect.top, areaKey };
  avoidanceState.prevCoveredIds = new Set(collisions.map(c => c.id));

  const delayMs = Math.max(0, (ctx as any).avoidanceDelayMs ?? 100);
  const overlapMap: Map<string, number> = avoidanceState.overlapStartTs;
  const currentIds = new Set(collisions.map(c => c.id));
  for (const id of currentIds) {
    if (!overlapMap.has(id)) overlapMap.set(id, now);
  }
  for (const id of Array.from(overlapMap.keys())) {
    if (!currentIds.has(id)) overlapMap.delete(id);
  }
  const stableCollisions = collisions.filter(c => {
    const ts = overlapMap.get(c.id);
    return ts !== undefined && now - ts >= delayMs;
  });

  let occ = buildOccupancy(ctx.cards.filter(c => c.id !== ctx.draggedCard.id), ctx.columns);
  for (const res of avoidanceState.reservations.values()) {
    for (let dy = 0; dy < res.h; dy++) {
      const row = occ[res.y + dy];
      if (!row) continue;
      for (let dx = 0; dx < res.w; dx++) {
        const gx = res.x + dx;
        if (gx >= 0 && gx < ctx.columns) row[gx] = 1;
      }
    }
  }

  for (let dy = 0; dy < draggedRect.h; dy++) {
    const row = occ[draggedRect.y + dy];
    if (!row) continue;
    for (let dx = 0; dx < draggedRect.w; dx++) {
      const gx = draggedRect.x + dx;
      if (gx >= 0 && gx < ctx.columns) row[gx] = 1;
    }
  }

  if (stableCollisions.length === 0) {
    avoidanceState.activeAreaKey = areaKey;
    return null;
  }

  const intersectArea = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return 0;
    return (x2 - x1) * (y2 - y1);
  };

  const order = stableCollisions
    .map(c => {
      const u = getUnitsForCard(c);
      const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h };
      return { c, area: intersectArea(draggedRect, rect) };
    })
    .sort((a, b) => b.area - a.area)
    .map(x => x.c);

  const movesAll: AvoidanceMove[] = [];
  for (const c of order) {
    const u = getUnitsForCard(c);
    const adj: Array<{ x: number; y: number }> = [
      { x: c.position.x, y: Math.max(0, c.position.y - 1) },
      { x: c.position.x, y: c.position.y + 1 },
      { x: Math.max(0, c.position.x - 1), y: c.position.y },
      { x: c.position.x + 1, y: c.position.y }
    ];

    let chosen: { x: number; y: number } | null = null;
    for (const cand of adj) {
      const overlapsShadow = !(cand.x + u.w <= draggedRect.x || draggedRect.x + draggedRect.w <= cand.x || cand.y + u.h <= draggedRect.y || draggedRect.y + draggedRect.h <= cand.y);
      if (overlapsShadow) continue;
      if (canPlace(occ, ctx.columns, cand.x, cand.y, u.w, u.h)) { chosen = cand; break; }
    }

    if (!chosen) {
      const bfs = bfsNearest(occ, ctx.columns, { x: c.position.x, y: c.position.y }, u);
      if (bfs) {
        const overlapsShadowBfs = !(bfs.x + u.w <= draggedRect.x || draggedRect.x + draggedRect.w <= bfs.x || bfs.y + u.h <= draggedRect.y || draggedRect.y + draggedRect.h <= bfs.y);
        if (!overlapsShadowBfs) chosen = bfs;
      }
    }

    if (chosen) {
      const lastMove = avoidanceState.lastMoves.get(c.id);
      if (!lastMove || lastMove.x !== chosen.x || lastMove.y !== chosen.y) {
        movesAll.push({ cardId: c.id, toPosition: { x: chosen.x, y: chosen.y } });
        avoidanceState.lastMoves.set(c.id, { x: chosen.x, y: chosen.y, ts: now });
        avoidanceState.activeAvoid.set(c.id, { orig: { x: c.position.x, y: c.position.y }, moved: { x: chosen.x, y: chosen.y }, areaKey });
        const uC = getUnitsForCard(c);
        avoidanceState.reservations.set(c.id, { x: chosen.x, y: chosen.y, w: uC.w, h: uC.h });
        avoidanceState.originals.set(c.id, { x: c.position.x, y: c.position.y });

        for (let dy = 0; dy < uC.h; dy++) {
          const row = occ[chosen.y + dy];
          if (!row) continue;
          for (let dx = 0; dx < uC.w; dx++) {
            const gx = chosen.x + dx;
            if (gx >= 0 && gx < ctx.columns) row[gx] = 1;
          }
        }
      }
    } else {
      if (import.meta.env.MODE === 'development') {
        console.log(`[Avoidance] 邻近位置不可用（${c.id}）`);
      }
    }
  }

  avoidanceState.activeAreaKey = areaKey;

  if (movesAll.length === 0) {
    if (import.meta.env.MODE === 'development') {
      console.log('[Avoidance] 无移动计划（movesOut.length=0）');
    }
    return null;
  }

  const plan: AvoidancePlan = {
    moves: movesAll,
    animations: movesAll.map(m => ({ cardId: m.cardId, type: 'translate', duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', from: avoidanceState.originals.get(m.cardId), to: m.toPosition }))
  };

  if (import.meta.env.MODE === 'development') {
    console.log('[Avoidance] 生成移动计划:', plan.moves);
    console.log('[Avoidance] 当前避让快照: activeAvoid=', Array.from(avoidanceState.activeAvoid.entries()), 'reservations=', Array.from(avoidanceState.reservations.entries()));
  }

  return plan;
}