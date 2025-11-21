import type { AvoidanceContext, AvoidancePlan, AvoidanceMove } from '@/types/plugins';
import type { BentoCard } from '@/types/bento';
import { getUnitsForCard, toGridXY, buildOccupancy, aabbOverlap, canPlace } from './utils';
import { avoidanceState } from './state';

export function onBeforeDrop(ctx: AvoidanceContext): AvoidancePlan | null {
  if (!ctx.draggedCard || !ctx.dropRect) return null;

  const draggedUnits = getUnitsForCard(ctx.draggedCard);
  const targetXY = toGridXY(ctx.dropRect.left, ctx.dropRect.top, ctx.unit, ctx.gap);
  const draggedRect = { x: targetXY.x, y: targetXY.y, w: draggedUnits.w, h: draggedUnits.h };
  const areaKey = `${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}`;

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

  const collisions: BentoCard[] = [];
  for (const c of ctx.cards) {
    if (c.id === ctx.draggedCard.id) continue;
    const u = getUnitsForCard(c);
    const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h };
    if (aabbOverlap(draggedRect, rect)) collisions.push(c);
  }

  if (collisions.length === 0) {
    const prevAreaKey = avoidanceState.activeAreaKey;
    if (prevAreaKey && prevAreaKey !== areaKey) {
      if (avoidanceState.activeAvoid.size > 0) {
        const restores = Array.from(avoidanceState.activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }));
        avoidanceState.activeAvoid.clear();
        avoidanceState.activeAreaKey = '';
        return { moves: restores };
      }
    }
    return null;
  }

  let pendingRestores: AvoidanceMove[] = [];
  if (avoidanceState.activeAreaKey && avoidanceState.activeAreaKey !== areaKey) {
    if (avoidanceState.activeAvoid.size > 0) {
      pendingRestores = Array.from(avoidanceState.activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }));
      avoidanceState.activeAvoid.clear();
      avoidanceState.activeAreaKey = '';
    }
  }

  const movesAll: AvoidanceMove[] = [];
  const stableCollisions = collisions;

  for (const c of collisions) {
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
    if (chosen) {
      movesAll.push({ cardId: c.id, toPosition: { x: chosen.x, y: chosen.y } });
    }
  }

  if (movesAll.length === 0) {
    const restoresAll: AvoidanceMove[] = [];
    for (const [id, orig] of avoidanceState.originals.entries()) {
      restoresAll.push({ cardId: id, toPosition: orig });
    }
    avoidanceState.reservations.clear();
    avoidanceState.originals.clear();
    avoidanceState.activeAvoid.clear();
    avoidanceState.activeAreaKey = '';
    avoidanceState.activeTargetId = '';

    const plan: AvoidancePlan = {
      moves: pendingRestores.length > 0 ? [...pendingRestores, ...restoresAll] : restoresAll
    };

    const originalPos = avoidanceState.dragOriginalPosition;
    if (originalPos) {
      plan.shadowPosition = {
        left: originalPos.x * (ctx.unit + ctx.gap),
        top: originalPos.y * (ctx.unit + ctx.gap)
      };
    }

    return plan;
  }

  avoidanceState.activeAreaKey = areaKey;
  for (const mv of movesAll) {
    const movedCard = stableCollisions.find(c => c.id === mv.cardId)!;
    avoidanceState.activeAvoid.set(mv.cardId, { orig: { x: movedCard.position.x, y: movedCard.position.y }, moved: { x: mv.toPosition.x, y: mv.toPosition.y }, areaKey });
  }

  const plan: AvoidancePlan = {
    moves: pendingRestores.length > 0 ? [...pendingRestores, ...movesAll] : movesAll,
    animations: movesAll.map(m => ({ cardId: m.cardId, type: 'translate', duration: 240, easing: 'cubic-bezier(.22,1,.36,1)', from: avoidanceState.originals.get(m.cardId), to: m.toPosition }))
  };

  return plan;
}