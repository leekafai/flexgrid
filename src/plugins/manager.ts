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
      let plan: AvoidancePlan | null = null
      const animations: NonNullable<AvoidancePlan['animations']> = []
      for (const plugin of registry.values()) {
        const fn = plugin[hook]
        if (typeof fn === 'function') {
          const res = (fn as (ctx: AvoidanceContext) => AvoidancePlan | null).call(plugin as any, ctx)
          if (res && res.animations && res.animations.length > 0) animations.push(...res.animations)
          if (res && res.moves && res.moves.length > 0) plan = { moves: res.moves }
        }
      }
      if (plan) {
        if (animations.length > 0) plan.animations = animations
        return plan
      }
      if (animations.length > 0) return { moves: [], animations }
      return null
    }
  }
  return manager
}
