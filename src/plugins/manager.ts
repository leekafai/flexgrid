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
      for (const plugin of registry.values()) {
        const fn = plugin[hook]
        if (typeof fn === 'function') {
          const res = (fn as (ctx: AvoidanceContext) => AvoidancePlan | null).call(plugin as any, ctx)
          if (res && res.moves && res.moves.length > 0) {
            plan = res
          }
        }
      }
      return plan
    }
  }
  return manager
}
