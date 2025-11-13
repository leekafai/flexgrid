# Bento 组件 Props 配置文档

## BentoGrid Props
- `columns?: number`：初始列数，缺省按容器宽度与 `unit+gap` 自动计算
- `gap?: number`：网格间距（像素），默认 8–16（响应式调整）
- `unit?: number`：网格行高单位（像素），用于 `grid-auto-rows`
- `breakpoints?: { mobile: number; tablet: number; desktop: number }`：断点配置（可用于自适应列数）
- `virtualized?: boolean`：是否启用内容虚拟化（窗口外卡片展示骨架并延迟渲染）
- `overscan?: number`：虚拟化超采样行数，默认 2
- `hoverScale?: number`：全局悬停缩放幅度，默认 1.03
- `shadowStrength?: number`：全局悬停阴影不透明度，默认 0.12

## BentoCard Props
- `hoverScale?: number`：卡片悬停缩放幅度，默认继承 Grid 或 1.03
- `shadowStrength?: number`：卡片悬停阴影不透明度，默认继承 Grid 或 0.12
- `interactive?: boolean`：是否允许拖拽等交互，默认 `false`

## 类型定义
详见 `src/types/bento.ts`：
- `BreakpointConfig`、`VirtualScrollConfig`、`BentoGridProps`、`BentoCardProps`

## 使用示例
```vue
<BentoGrid :gap="16" :unit="40" :virtualized="true" :overscan="2">
  <BentoCard :card="item" :hoverScale="1.03" :shadowStrength="0.12" />
</BentoGrid>
```

## 备注
- 当启用虚拟化时，滚动窗口外的卡片会显示骨架占位并使用 IntersectionObserver 延迟渲染内容，以确保滚动性能与 60fps 动画表现。
