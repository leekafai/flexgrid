import { describe, it, expect } from 'vitest'
import { avoidancePlugin } from '@/plugins/avoidance/index'
import { getUnitsForCard } from '@/plugins/avoidance/utils'

const makeCard = (id: string, x: number, y: number, size: 'small'|'medium'|'large'|'wide' = 'wide') => ({
  id,
  type: 'demo',
  content: '',
  size,
  position: { x, y },
  interactive: true
})

describe('position avoidance plugin', () => {
  it('detects overlap and produces a move plan', () => {
    const unit = 80
    const gap = 20
    const columns = 12
    const dragged = makeCard('d', 0, 0, 'wide')
    const cards = [
      dragged,
      makeCard('a', 0, 0, 'wide'),
      makeCard('b', 3, 0, 'medium')
    ]
    const rect = { left: 0 * (unit + gap), top: 0 * (unit + gap), width: getUnitsForCard(dragged).w * unit, height: getUnitsForCard(dragged).h * unit }
    const ctx: any = { gridEl: { } as any, columns, gap, unit, draggedCard: dragged, dropRect: rect, dropTarget: { x: 0, y: 0 }, cards }
    const plan = avoidancePlugin.onDragUpdate!(ctx)
    expect(plan).toBeTruthy()
    expect(plan!.moves.length).toBeGreaterThan(0)
    const moved = plan!.moves[0].cardId
    expect(['a']).toContain(moved)
  })

  it('performance stays within 20ms on 50 cards', () => {
    const unit = 80
    const gap = 20
    const columns = 12
    const dragged = makeCard('d', 5, 5, 'wide')
    const cards = Array.from({ length: 50 }).map((_, i) => makeCard('c'+i, i % columns, Math.floor(i / columns), i % 2 === 0 ? 'small' : 'medium'))
    cards.push(dragged)
    const rect = { left: 5 * (unit + gap), top: 5 * (unit + gap), width: getUnitsForCard(dragged).w * unit, height: getUnitsForCard(dragged).h * unit }
    const ctx: any = { gridEl: { } as any, columns, gap, unit, draggedCard: dragged, dropRect: rect, dropTarget: { x: 5, y: 5 }, cards }
    const t0 = performance.now()
    const plan = avoidancePlugin.onDragUpdate!(ctx)
    const t1 = performance.now()
    expect(t1 - t0).toBeLessThanOrEqual(20)
  })
})
