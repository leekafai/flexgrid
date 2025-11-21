import type { AvoidancePlugin, AvoidanceContext, AvoidancePlan } from '@/types/plugins';
import { avoidanceState, resetAvoidanceState } from './state';
import { onDragUpdate } from './dragUpdate';
import { onBeforeDrop } from './beforeDrop';

export const avoidancePlugin: AvoidancePlugin = {
  name: 'position-avoidance',

  onDragStart(ctx: AvoidanceContext) {
    resetAvoidanceState();
    if (ctx.draggedCard) {
      avoidanceState.dragOriginalPosition = { x: ctx.draggedCard.position.x, y: ctx.draggedCard.position.y };
    }
  },

  onDragUpdate(ctx: AvoidanceContext): AvoidancePlan | null {
    return onDragUpdate(ctx);
  },

  onBeforeDrop(ctx: AvoidanceContext): AvoidancePlan | null {
    return onBeforeDrop(ctx);
  },

  onDragEnd() {
    resetAvoidanceState();
  }
};
