import type { AvoidancePlugin, AvoidanceContext, AvoidancePlan, AvoidanceMove } from '@/types/plugins'
import type { BentoCard } from '@/types/bento'
import { getUnitsForCard, toGridXY, buildOccupancy, bfsNearest, aabbOverlap } from './utils'

export const avoidancePlugin: AvoidancePlugin = {
  name: 'position-avoidance',
  _lastDispatchTs: 0 as any,
  _lastMoves: new Map<string, { x: number; y: number; ts: number }>() as any,
  _activeAvoid: new Map<string, { orig: { x: number; y: number }; moved: { x: number; y: number }; areaKey: string }>() as any,
  _activeAreaKey: '' as any,
  _prevShadowRect: null as any,
  _prevCoveredIds: new Set<string>() as any,
  _reservations: new Map<string, { x: number; y: number; w: number; h: number }>() as any,
  _originals: new Map<string, { x: number; y: number }>() as any,
  _activeTargetId: '' as any,
  onDragStart(ctx: AvoidanceContext) {
    (this as any)._lastDispatchTs = 0
    ;(this as any)._lastMoves.clear()
    ;(this as any)._activeAvoid.clear()
    ;(this as any)._activeAreaKey = ''
    ;(this as any)._prevShadowRect = null
    ;(this as any)._prevCoveredIds = new Set<string>()
    ;(this as any)._reservations.clear()
    ;(this as any)._originals.clear()
    ;(this as any)._activeTargetId = ''
    return null as any
  },
  onDragUpdate(ctx: AvoidanceContext): AvoidancePlan | null {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const minInterval = 100
    if (now - (this as any)._lastDispatchTs < minInterval) return null
    ;(this as any)._lastDispatchTs = now
    if (!ctx.draggedCard || !ctx.dropRect) return null
    const draggedUnits = getUnitsForCard(ctx.draggedCard)
    const targetXY = toGridXY(ctx.dropRect.left, ctx.dropRect.top, ctx.unit, ctx.gap)
    const draggedRect = { x: targetXY.x, y: targetXY.y, w: draggedUnits.w, h: draggedUnits.h }
    const areaKey = `${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}`

    // 关键改进：只有当阴影区域真正改变时才重新计算
    const prev = (this as any)._prevShadowRect
    if (prev && prev.areaKey === areaKey) {
      // 区域键相同表示网格位置没有变化，不需要重新计算避让
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Avoidance] 阴影位置未变 (${areaKey})，跳过避让计算`)
      }
      return null
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Avoidance] 阴影位置变化: ${prev ? prev.areaKey : 'none'} -> ${areaKey}`)
    }
    
    // 更新前一个阴影矩形记录
    (this as any)._prevShadowRect = { left: ctx.dropRect.left, top: ctx.dropRect.top, areaKey }

    let occ = buildOccupancy(ctx.cards.filter(c => c.id !== ctx.draggedCard.id), ctx.columns)
    // 将当前预留写入占用，避免被当作可用空间
    for (const res of (this as any)._reservations.values()) {
      for (let dy = 0; dy < res.h; dy++) {
        const row = occ[res.y + dy]
        if (!row) continue
        for (let dx = 0; dx < res.w; dx++) {
          const gx = res.x + dx
          if (gx >= 0 && gx < ctx.columns) row[gx] = 1
        }
      }
    }
    const collisions: BentoCard[] = []
    for (const c of ctx.cards) {
      if (c.id === ctx.draggedCard.id) continue
      const u = getUnitsForCard(c)
      const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
      if (aabbOverlap(draggedRect, rect)) collisions.push(c)
    }
    if (collisions.length === 0) {
      // 改进：只有当阴影区域真正改变时，才清除避让状态
      const prevAreaKey = (this as any)._activeAreaKey
      if (prevAreaKey && prevAreaKey !== areaKey) {
        // 区域改变时，清除之前的避让状态
        if ((this as any)._activeAvoid.size > 0) {
          const restores = Array.from((this as any)._activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }))
          ;(this as any)._activeAvoid.clear()
          ;(this as any)._activeAreaKey = ''
          return { moves: restores }
        }
      }
      return null
    }

    if ((this as any)._activeAreaKey && (this as any)._activeAreaKey === areaKey) {
      // 保持单卡锁，但允许在覆盖集合变化时重新计算（已通过上方 coveredIds 检测触发）
    }

    let pendingRestores: AvoidanceMove[] = []
    if ((this as any)._activeAreaKey && (this as any)._activeAreaKey !== areaKey) {
      if ((this as any)._activeAvoid.size > 0) {
        pendingRestores = Array.from((this as any)._activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }))
        ;(this as any)._activeAvoid.clear()
        ;(this as any)._activeAreaKey = ''
      }
      // 同步释放预留
      if ((this as any)._activeTargetId) {
        (this as any)._reservations.delete((this as any)._activeTargetId)
        (this as any)._activeTargetId = ''
      }
    }

    const intersectArea = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
      const x1 = Math.max(a.x, b.x)
      const y1 = Math.max(a.y, b.y)
      const x2 = Math.min(a.x + a.w, b.x + b.w)
      const y2 = Math.min(a.y + a.h, b.y + b.h)
      if (x2 <= x1 || y2 <= y1) return 0
      return (x2 - x1) * (y2 - y1)
    }
    const sorted = collisions
      .map(c => {
        const u = getUnitsForCard(c)
        const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
        return { card: c, area: intersectArea(draggedRect, rect) }
      })
      .sort((a, b) => b.area - a.area)

    let best: { card: BentoCard; pos: { x: number; y: number }; routes: number } | null = null
    for (const item of sorted) {
      const c = item.card
      const u = getUnitsForCard(c)
      const candidates: Array<{ x: number; y: number }> = []
      const up = bfsNearest(occ, ctx.columns, { x: c.position.x, y: Math.max(0, c.position.y - 1) }, u)
      if (up) candidates.push(up)
      const down = bfsNearest(occ, ctx.columns, { x: c.position.x, y: c.position.y + 1 }, u)
      if (down) candidates.push(down)
      const left = bfsNearest(occ, ctx.columns, { x: Math.max(0, c.position.x - 1), y: c.position.y }, u)
      if (left) candidates.push(left)
      const right = bfsNearest(occ, ctx.columns, { x: c.position.x + 1, y: c.position.y }, u)
      if (right) candidates.push(right)
      if (candidates.length === 0) continue
      let chosen = candidates[0]
      let bestDist = Math.abs(chosen.x - c.position.x) + Math.abs(chosen.y - c.position.y)
      for (const cand of candidates) {
        const d = Math.abs(cand.x - c.position.x) + Math.abs(cand.y - c.position.y)
        if (d < bestDist) { bestDist = d; chosen = cand }
      }
      const routes = candidates.length
      if (!best || item.area > intersectArea(draggedRect, { x: best.card.position.x, y: best.card.position.y, w: getUnitsForCard(best.card).w, h: getUnitsForCard(best.card).h }) || (item.area === intersectArea(draggedRect, { x: best.card.position.x, y: best.card.position.y, w: getUnitsForCard(best.card).w, h: getUnitsForCard(best.card).h }) && routes > best.routes)) {
        best = { card: c, pos: chosen, routes }
      }
    }

    if (!best) {
      if (pendingRestores.length > 0) return { moves: pendingRestores }
      return null
    }
    const lastMove = (this as any)._lastMoves.get(best.card.id)
    const sameAsLast = lastMove && lastMove.x === best.pos.x && lastMove.y === best.pos.y
    if (sameAsLast && now - lastMove.ts < 300) { // 减少防抖时间到300ms，提供更灵敏的响应
      return null
    }
    ;(this as any)._activeAreaKey = areaKey
    const movedCard = collisions.find(c => c.id === best!.card.id)!
    ;(this as any)._activeAvoid.set(best.card.id, { orig: { x: movedCard.position.x, y: movedCard.position.y }, moved: { x: best.pos.x, y: best.pos.y }, areaKey })
    // 记录预留，以防后续计算把该位置视为可用
    const uBest = getUnitsForCard(movedCard)
    ;(this as any)._reservations.set(best.card.id, { x: best.pos.x, y: best.pos.y, w: uBest.w, h: uBest.h })
    ;(this as any)._originals.set(best.card.id, { x: movedCard.position.x, y: movedCard.position.y })
    ;(this as any)._activeTargetId = best.card.id
    const move: AvoidanceMove = { cardId: best.card.id, toPosition: best.pos }
    const isSame = sameAsLast
    if (!isSame) (this as any)._lastMoves.set(best.card.id, { x: best.pos.x, y: best.pos.y, ts: now })
    const movesOut = pendingRestores.length > 0 ? [...pendingRestores, ...(isSame ? [] : [move])] : (isSame ? [] : [move])
    if (movesOut.length === 0) return null
    const plan: AvoidancePlan = {
      moves: movesOut,
      animations: movesOut.map(m => ({ cardId: m.cardId, type: 'translate', duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }))
    }
    return plan
  },
  onBeforeDrop(ctx: AvoidanceContext): AvoidancePlan | null {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (!ctx.draggedCard || !ctx.dropRect) return null
    const draggedUnits = getUnitsForCard(ctx.draggedCard)
    const targetXY = toGridXY(ctx.dropRect.left, ctx.dropRect.top, ctx.unit, ctx.gap)
    const draggedRect = { x: targetXY.x, y: targetXY.y, w: draggedUnits.w, h: draggedUnits.h }
    const areaKey = `${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}`

    let occ = buildOccupancy(ctx.cards.filter(c => c.id !== ctx.draggedCard.id), ctx.columns)
    for (const res of (this as any)._reservations.values()) {
      for (let dy = 0; dy < res.h; dy++) {
        const row = occ[res.y + dy]
        if (!row) continue
        for (let dx = 0; dx < res.w; dx++) {
          const gx = res.x + dx
          if (gx >= 0 && gx < ctx.columns) row[gx] = 1
        }
      }
    }
    const collisions: BentoCard[] = []
    for (const c of ctx.cards) {
      if (c.id === ctx.draggedCard.id) continue
      const u = getUnitsForCard(c)
      const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
      if (aabbOverlap(draggedRect, rect)) collisions.push(c)
    }
    if (collisions.length === 0) {
      // 改进：使用与 onDragUpdate 相同的逻辑处理无碰撞情况
      const prevAreaKey = (this as any)._activeAreaKey
      if (prevAreaKey && prevAreaKey !== areaKey) {
        if ((this as any)._activeAvoid.size > 0) {
          const restores = Array.from((this as any)._activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }))
          ;(this as any)._activeAvoid.clear()
          ;(this as any)._activeAreaKey = ''
          return { moves: restores }
        }
      }
      return null
    }

    let pendingRestores: AvoidanceMove[] = []
    if ((this as any)._activeAreaKey && (this as any)._activeAreaKey !== areaKey) {
      if ((this as any)._activeAvoid.size > 0) {
        pendingRestores = Array.from((this as any)._activeAvoid.entries()).map(([id, info]) => ({ cardId: id, toPosition: info.orig }))
        ;(this as any)._activeAvoid.clear()
        ;(this as any)._activeAreaKey = ''
      }
    }

    let best: { card: BentoCard; pos: { x: number; y: number }; routes: number } | null = null
    for (const c of collisions) {
      const u = getUnitsForCard(c)
      const candidates: Array<{ x: number; y: number }> = []
      const up = bfsNearest(occ, ctx.columns, { x: c.position.x, y: Math.max(0, c.position.y - 1) }, u)
      if (up) candidates.push(up)
      const down = bfsNearest(occ, ctx.columns, { x: c.position.x, y: c.position.y + 1 }, u)
      if (down) candidates.push(down)
      const left = bfsNearest(occ, ctx.columns, { x: Math.max(0, c.position.x - 1), y: c.position.y }, u)
      if (left) candidates.push(left)
      const right = bfsNearest(occ, ctx.columns, { x: c.position.x + 1, y: c.position.y }, u)
      if (right) candidates.push(right)
      if (candidates.length === 0) continue
      let chosen = candidates[0]
      let bestDist = Math.abs(chosen.x - c.position.x) + Math.abs(chosen.y - c.position.y)
      for (const cand of candidates) {
        const d = Math.abs(cand.x - c.position.x) + Math.abs(cand.y - c.position.y)
        if (d < bestDist) { bestDist = d; chosen = cand }
      }
      const routes = candidates.length
      if (!best || routes > best.routes) {
        best = { card: c, pos: chosen, routes }
      }
    }

    if (!best) {
      // 无法避让，回滚所有预留
      const restoresAll: AvoidanceMove[] = []
      for (const [id, orig] of (this as any)._originals.entries()) {
        restoresAll.push({ cardId: id, toPosition: orig })
      }
      ;(this as any)._reservations.clear()
      ;(this as any)._originals.clear()
      ;(this as any)._activeAvoid.clear()
      ;(this as any)._activeAreaKey = ''
      ;(this as any)._activeTargetId = ''
      return { moves: pendingRestores.length > 0 ? [...pendingRestores, ...restoresAll] : restoresAll }
    }
    ;(this as any)._activeAreaKey = areaKey
    const movedCard = collisions.find(c => c.id === best!.card.id)!
    ;(this as any)._activeAvoid.set(best.card.id, { orig: { x: movedCard.position.x, y: movedCard.position.y }, moved: { x: best.pos.x, y: best.pos.y }, areaKey })
    const move: AvoidanceMove = { cardId: best.card.id, toPosition: best.pos }
    const plan: AvoidancePlan = {
      moves: pendingRestores.length > 0 ? [...pendingRestores, move] : [move],
      animations: [{ cardId: best.card.id, type: 'translate', duration: 200, easing: 'cubic-bezier(.22,1,.36,1)' }]
    }
    return plan
  },
  onDragEnd() {
    (this as any)._lastDispatchTs = 0
    ;(this as any)._lastMoves.clear()
    ;(this as any)._activeAvoid.clear()
    ;(this as any)._activeAreaKey = ''
    ;(this as any)._reservations.clear()
    ;(this as any)._originals.clear()
    ;(this as any)._activeTargetId = ''
  }
}
