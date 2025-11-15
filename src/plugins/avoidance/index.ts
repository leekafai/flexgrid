import type { AvoidancePlugin, AvoidanceContext, AvoidancePlan, AvoidanceMove } from '@/types/plugins'
import type { BentoCard } from '@/types/bento'
import { getUnitsForCard, toGridXY, buildOccupancy, bfsNearest, aabbOverlap, canPlace } from './utils'

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
    const minInterval = 0
    if (now - (this as any)._lastDispatchTs < minInterval) return null
    ;(this as any)._lastDispatchTs = now
    if (!ctx.draggedCard || !ctx.dropRect) return null
    const draggedUnits = getUnitsForCard(ctx.draggedCard)
    const targetXY = toGridXY(ctx.dropRect.left, ctx.dropRect.top, ctx.unit, ctx.gap)
    const draggedRect = { x: targetXY.x, y: targetXY.y, w: draggedUnits.w, h: draggedUnits.h }
    const areaKey = `${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}`
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Avoidance] 输入阴影: left=${ctx.dropRect.left}, top=${ctx.dropRect.top} -> 网格 (${draggedRect.x},${draggedRect.y}) 目标尺寸 ${draggedRect.w}x${draggedRect.h}`)
    }
    const collisions: BentoCard[] = []
    for (const c of ctx.cards) {
      if (c.id === ctx.draggedCard.id) continue
      const u = getUnitsForCard(c)
      const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
      const isOverlap = aabbOverlap(draggedRect, rect)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Avoidance] 碰撞检测: 拖动卡片 ${ctx.draggedCard.id} (${draggedRect.x},${draggedRect.y},${draggedRect.w},${draggedRect.h}) vs ${c.id} (${rect.x},${rect.y},${rect.w},${rect.h}) = ${isOverlap}`)
      }
      if (isOverlap) collisions.push(c)
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Avoidance] 检测到 ${collisions.length} 个碰撞:`, collisions.map(c => c.id))
    }

    const prev = (this as any)._prevShadowRect
    if (prev && prev.areaKey === areaKey) {
      const prevCoveredIds = (this as any)._prevCoveredIds
      const currentCoveredIds = new Set(collisions.map(c => c.id))
      const collisionSetChanged = prevCoveredIds.size !== currentCoveredIds.size || !Array.from(prevCoveredIds).every(id => currentCoveredIds.has(id))
      if (process.env.NODE_ENV === 'development') {
        console.log('[Avoidance] 区域未变，碰撞集合是否变化:', collisionSetChanged)
      }
      // 不再跳过，仍继续计算以确保即时避让
    }

    (this as any)._prevShadowRect = { left: ctx.dropRect.left, top: ctx.dropRect.top, areaKey };
    ;(this as any)._prevCoveredIds = new Set(collisions.map(c => c.id))

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
    // 将阴影区域视为占用，避免把拖拽目标位置当作可用空间
    for (let dy = 0; dy < draggedRect.h; dy++) {
      const row = occ[draggedRect.y + dy]
      if (!row) continue
      for (let dx = 0; dx < draggedRect.w; dx++) {
        const gx = draggedRect.x + dx
        if (gx >= 0 && gx < ctx.columns) row[gx] = 1
      }
    }
    if (collisions.length === 0) {
      // 无碰撞时保持当前避让快照，不进行恢复；跟随阴影更新区域键
      (this as any)._activeAreaKey = areaKey
      return null
    }

    // 注意：我们已经在上面的逻辑中处理了区域相同的情况，这里不需要重复处理

    let pendingRestores: AvoidanceMove[] = []
    // 区域改变时不恢复之前的避让，持续沿用快照与预留，避免回弹

    const intersectArea = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
      const x1 = Math.max(a.x, b.x)
      const y1 = Math.max(a.y, b.y)
      const x2 = Math.min(a.x + a.w, b.x + b.w)
      const y2 = Math.min(a.y + a.h, b.y + b.h)
      if (x2 <= x1 || y2 <= y1) return 0
      return (x2 - x1) * (y2 - y1)
    }
    // 基于阴影起点优先选择被覆盖的卡片（确保“移到谁的位置就让谁”）
    // 多卡同时避让：对所有碰撞卡片尝试“邻近位置”避让（仅上下左右一格）
    const movesAll: AvoidanceMove[] = []
    // 覆盖优先：按交叠面积从大到小处理，保证最受影响的卡先让位
    const order = collisions
      .map(c => {
        const u = getUnitsForCard(c)
        const rect = { x: c.position.x, y: c.position.y, w: u.w, h: u.h }
        return { c, area: intersectArea(draggedRect, rect) }
      })
      .sort((a, b) => b.area - a.area)
      .map(x => x.c)
    for (const c of order) {
      const u = getUnitsForCard(c)
      const adj: Array<{ x: number; y: number }> = [
        { x: c.position.x, y: Math.max(0, c.position.y - 1) },
        { x: c.position.x, y: c.position.y + 1 },
        { x: Math.max(0, c.position.x - 1), y: c.position.y },
        { x: c.position.x + 1, y: c.position.y }
      ]
      let chosen: { x: number; y: number } | null = null
      for (const cand of adj) {
        const overlapsShadow = !(cand.x + u.w <= draggedRect.x || draggedRect.x + draggedRect.w <= cand.x || cand.y + u.h <= draggedRect.y || draggedRect.y + draggedRect.h <= cand.y)
        if (overlapsShadow) continue
        if (canPlace(occ, ctx.columns, cand.x, cand.y, u.w, u.h)) { chosen = cand; break }
      }
      // 邻近失败时，回退到 BFS 最近可达位置
      if (!chosen) {
        const bfs = bfsNearest(occ, ctx.columns, { x: c.position.x, y: c.position.y }, u)
        if (bfs) {
          const overlapsShadowBfs = !(bfs.x + u.w <= draggedRect.x || draggedRect.x + draggedRect.w <= bfs.x || bfs.y + u.h <= draggedRect.y || draggedRect.y + draggedRect.h <= bfs.y)
          if (!overlapsShadowBfs) chosen = bfs
        }
      }
      if (chosen) {
        const lastMove = (this as any)._lastMoves.get(c.id)
        if (!lastMove || lastMove.x !== chosen.x || lastMove.y !== chosen.y) {
          movesAll.push({ cardId: c.id, toPosition: { x: chosen.x, y: chosen.y } })
          ;(this as any)._lastMoves.set(c.id, { x: chosen.x, y: chosen.y, ts: now })
          ;(this as any)._activeAvoid.set(c.id, { orig: { x: c.position.x, y: c.position.y }, moved: { x: chosen.x, y: chosen.y }, areaKey })
          const uC = getUnitsForCard(c)
          ;(this as any)._reservations.set(c.id, { x: chosen.x, y: chosen.y, w: uC.w, h: uC.h })
          ;(this as any)._originals.set(c.id, { x: c.position.x, y: c.position.y })
          // 写入选中位置到占用矩阵，避免后续选择冲突
          for (let dy = 0; dy < uC.h; dy++) {
            const row = occ[chosen.y + dy]
            if (!row) continue
            for (let dx = 0; dx < uC.w; dx++) {
              const gx = chosen.x + dx
              if (gx >= 0 && gx < ctx.columns) row[gx] = 1
            }
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Avoidance] 邻近位置不可用（${c.id}）`)
        }
      }
    }

    ;(this as any)._activeAreaKey = areaKey

    const movesOut = pendingRestores.length > 0 ? [...pendingRestores, ...movesAll] : movesAll
    if (movesOut.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Avoidance] 无移动计划（movesOut.length=0）')
      }
      return null
    }
    const plan: AvoidancePlan = {
      moves: movesOut,
      animations: movesOut.map(m => ({ cardId: m.cardId, type: 'vector', duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', from: (this as any)._originals.get(m.cardId), to: m.toPosition }))
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[Avoidance] 生成移动计划:', plan.moves)
      console.log('[Avoidance] 当前避让快照: activeAvoid=', Array.from((this as any)._activeAvoid.entries()), 'reservations=', Array.from((this as any)._reservations.entries()))
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

    const movesAll: AvoidanceMove[] = []
    for (const c of collisions) {
      const u = getUnitsForCard(c)
      const adj: Array<{ x: number; y: number }> = [
        { x: c.position.x, y: Math.max(0, c.position.y - 1) },
        { x: c.position.x, y: c.position.y + 1 },
        { x: Math.max(0, c.position.x - 1), y: c.position.y },
        { x: c.position.x + 1, y: c.position.y }
      ]
      let chosen: { x: number; y: number } | null = null
      for (const cand of adj) {
        const overlapsShadow = !(cand.x + u.w <= draggedRect.x || draggedRect.x + draggedRect.w <= cand.x || cand.y + u.h <= draggedRect.y || draggedRect.y + draggedRect.h <= cand.y)
        if (overlapsShadow) continue
        if (canPlace(occ, ctx.columns, cand.x, cand.y, u.w, u.h)) { chosen = cand; break }
      }
      if (chosen) {
        movesAll.push({ cardId: c.id, toPosition: { x: chosen.x, y: chosen.y } })
      }
    }

    if (movesAll.length === 0) {
      // 无法避让：按需求，拖拽失败则回到原位，并恢复所有避让
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
    for (const mv of movesAll) {
      const movedCard = collisions.find(c => c.id === mv.cardId)!
      ;(this as any)._activeAvoid.set(mv.cardId, { orig: { x: movedCard.position.x, y: movedCard.position.y }, moved: { x: mv.toPosition.x, y: mv.toPosition.y }, areaKey })
    }
    const plan: AvoidancePlan = {
      moves: pendingRestores.length > 0 ? [...pendingRestores, ...movesAll] : movesAll,
      animations: movesAll.map(m => ({ cardId: m.cardId, type: 'vector', duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' }))
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
