export type AvoidanceDirection = 'up' | 'down' | 'left' | 'right'

export interface AvoidanceMove {
  cardId: string
  toPosition: { x: number; y: number }
}

export interface AvoidanceAnimation {
  cardId: string
  type: 'flip' | 'translate'
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  duration: number
  easing: string
}

export interface AvoidancePlan {
  moves: AvoidanceMove[]
  animations?: AvoidanceAnimation[]
}

export interface AvoidanceContext {
  gridEl: HTMLElement
  columns: number
  gap: number
  unit: number
  draggedCard: any
  dropRect: { left: number; top: number; width: number; height: number }
  dropTarget: { x: number; y: number } | null
  cards: any[]
}

export interface AvoidancePlugin {
  name: string
  onDragStart?(ctx: AvoidanceContext): void
  onDragUpdate?(ctx: AvoidanceContext): AvoidancePlan | null
  onBeforeDrop?(ctx: AvoidanceContext): AvoidancePlan | null
  onDragEnd?(): void
}

export interface PluginManager {
  register(plugin: AvoidancePlugin): void
  unregister(name: string): void
  dispatch(hook: keyof AvoidancePlugin, ctx: AvoidanceContext): AvoidancePlan | null
}
