import type { AvoidancePlugin, AvoidanceContext, AvoidancePlan } from '@/types/plugins'

export const placementPlugin: AvoidancePlugin = {
  name: 'placement-animate',
  onBeforeDrop(ctx: AvoidanceContext): AvoidancePlan | null {
    if (!ctx.draggedCard || !ctx.dropRect) return null
    const unit = ctx.unit
    const gap = ctx.gap
    const cell = unit + gap
    const gridX = Math.max(0, Math.floor(ctx.dropRect.left / cell))
    const gridY = Math.max(0, Math.floor(ctx.dropRect.top / cell))
    const from = { x: ctx.draggedCard.position.x, y: ctx.draggedCard.position.y }
    const to = { x: gridX, y: gridY }
    if (from.x === to.x && from.y === to.y) return null
    const easing = 'cubic-bezier(0.34,1.56,0.64,1)'
    return {
      moves: [],
      animations: [
        { cardId: ctx.draggedCard.id, type: 'translate', duration: 300, easing, from, to }
      ]
    }
  }
}
