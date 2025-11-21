import type { AvoidancePlugin, PluginManager, AvoidanceContext, AvoidancePlan } from '@/types/plugins'

export const createPluginManager = (): PluginManager => {
  const registry = new Map<string, AvoidancePlugin>()
  const manager: PluginManager = {
    register(plugin: AvoidancePlugin) {
      registry.set(plugin.name, plugin)
    },
    unregister(name: string) {
      registry.delete(name)
    },
    dispatch(hook: keyof AvoidancePlugin, ctx: AvoidanceContext): AvoidancePlan | null {
      const moves: AvoidancePlan['moves'] = []
      const animations: NonNullable<AvoidancePlan['animations']> = []
      let shadowPosition: AvoidancePlan['shadowPosition'] | undefined
      let cancelDrop = false
      for (const plugin of registry.values()) {
        const fn = plugin[hook]
        if (typeof fn === 'function') {
          const res = (fn as (ctx: AvoidanceContext) => AvoidancePlan | null).call(plugin as any, ctx)
          if (res) {
            if (res.moves && res.moves.length > 0) moves.push(...res.moves)
            if (res.animations && res.animations.length > 0) animations.push(...res.animations)
            if (!shadowPosition && res.shadowPosition) shadowPosition = res.shadowPosition
            if (res.cancelDrop) cancelDrop = true
          }
        }
      }
      if (moves.length > 0 || animations.length > 0 || shadowPosition || cancelDrop) {
        const plan: AvoidancePlan = { moves }
        if (animations.length > 0) plan.animations = animations
        if (shadowPosition) plan.shadowPosition = shadowPosition
        if (cancelDrop) plan.cancelDrop = true
        return plan
      }
      return null
    }
  }
  return manager
}
