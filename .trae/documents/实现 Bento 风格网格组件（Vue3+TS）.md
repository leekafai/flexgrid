# 目标
- 精确复刻参考页面的卡片交互、网格排列与动态重排，视觉与交互相似度≥95%
- 保持 60fps 动画表现，支持大量卡片的滚动性能优化
- 提供完备的 TypeScript 类型与详细 props 文档

# 与现有代码的衔接
- 当前已有基础网格与卡片：`src/components/BentoGrid.vue:1`、`src/components/BentoCard.vue:1`
- 现状采用 Flex Wrap 布局与基础悬停/拖拽动画：
  - Flex Wrap 与“单位格”理念不完全契合参考站的网格占位与紧凑排布
  - 悬停与点击动画主要靠 CSS，未使用 `requestAnimationFrame`
- 计划在不破坏整体结构的前提下：
  - 将网格从 Flex 改为 CSS Grid（更贴近参考站的栅格占位/跨行跨列）
  - 丰富 `useBentoAnimations.ts` 的 RAF 动画管线与交互细节
  - 新增虚拟滚动 composable，解决大量卡片的滚动性能

# 架构设计
- 组件层：
  - `BentoGrid`：网格容器，负责列数/间距/密排、虚拟滚动窗口与加载态
  - `BentoCard`：卡片容器，负责悬停缩放、阴影、点击压感与状态切换
- Composables：
  - `useGridLayout`（改造现有 `useBentoGrid`）：计算列数、单位格大小、卡片跨列跨行（`grid-column: span w; grid-row: span h`）
  - `useCardRAFAnimations`（扩展现有 `useBentoAnimations`）：统一悬停/点击/进场动画，使用 RAF 驱动，降抖与节流
  - `useVirtualScroll`（新增）：基于容器高度与卡片行高，计算可见窗口与 overscan
- 类型与文档：
  - `BentoGridProps`、`BentoItem`、`BreakpointConfig` 等 TS 类型
  - 以 JSDoc + 代码内注释生成详细 props 文档；同时输出一份 props 使用示例

# 实现步骤
## 1. 卡片交互效果
- 悬停缩放与阴影：
  - 悬停目标：`scale(1.02~1.03)`、阴影近似：`0 8px 28px rgba(15,23,42,.12)`，过渡：`transform 180ms cubic-bezier(.2,.8,.2,1)`
  - 在 `BentoCard` 内通过 RAF 平滑插值（避免频繁重排），CSS 只做过渡兜底
- 点击状态：
  - 按下压感：`scale(0.98)`，抬起回弹到 `scale(1)`，RAF 保证曲线平滑
  - 增加“已点击/激活”状态样式，与参考站保持一致的视觉反馈
- 移动端触摸：
  - 使用 `pointer` 事件与 `passive` 监听，合并 `touchstart/mousedown` 路径
  - 粗指针设备维持较低缩放幅度，保证控制稳定（已有触控优化的基础：`src/components/BentoGrid.vue:193`）

## 2. 网格布局要求
- 布局改造为 CSS Grid：
  - 容器：`display: grid; grid-template-columns: repeat(N, 1fr); grid-auto-rows: <unit>; grid-auto-flow: dense; gap: <gap>`
  - 卡片：根据 `units.h/w` 设定 `grid-row/column: span`，更精确匹配参考站的卡片矩形与密排
- 响应式与间距：
  - 断点示例：`≥1280px: 6列 / gap 16px`，`≥1024px: 4列 / gap 14px`，`≥768px: 3列 / gap 12px`，`<768px: 2列 / gap 10px`
  - 与参考站 UI 对齐，使用 Tailwind 变量或内联样式保持精确值
- 动态内容加载重排：
  - 新内容进入后，先进入“测量列队”（避免抖动），再分配 `span` 并触发渐进式进场动画
  - `grid-auto-flow: dense` + 计算 `units`，实现紧凑填充；必要时用轻量级回溯填坑算法

## 3. 性能优化
- `requestAnimationFrame` 动画驱动：
  - 悬停/点击/进场使用 RAF 插值，避免多次 layout thrash
  - 合理使用 `will-change: transform` 与合成层加速
- 虚拟滚动：
  - `useVirtualScroll`：根据 `scrollTop/viewportHeight/rowHeight` 计算 `start/end` 索引与 `overscan`，只渲染可见卡片
  - 支持不等高的卡片：按 `units.h` 映射到行高，维护行段索引
- 加载状态与过渡：
  - 骨架卡片（带 shimmer）：进场后替换为真实卡片，触发轻微缩放
  - `IntersectionObserver` 触发按需加载媒体内容（图片/视频）

## 4. 测试要求
- 桌面浏览器：Chrome/Firefox/Safari 最新版本
  - 验证悬停/点击/进场曲线、阴影与缩放幅度一致性
  - 检查布局在各断点的列数与间距是否匹配
- 移动端触摸：
  - Android Chrome 与 iOS Safari，验证触摸压感与回弹曲线
- 性能与帧率：
  - 使用 RAF 采样器记录动画帧间隔，目标稳定 60fps
  - 列表 500+ 卡片场景下，虚拟滚动保持交互流畅

## 5. 交付标准
- TypeScript 类型：
  - `BentoItem`、`BentoGridProps`、`BreakpointConfig`、`VirtualScrollConfig` 完整定义
- Props 配置文档：
  - 字段、类型、默认值、描述、示例代码
  - 涵盖：`gap/unit/breakpoints/hoverScale/shadow/transition/virtualized/overscan/loading/skeletonCount` 等
- 相似度验证：
  - 以参考站的卡片间距、缩放/阴影曲线、栅格跨列表现为度量项
  - 用对照截图与指标表（列数、gap、hover scale、shadow rgba）打分 ≥95%

# 关键改动点与文件
- `src/components/BentoGrid.vue`
  - 将容器改为 CSS Grid，绑定列数、间距与 `grid-auto-rows`
  - 接入 `useVirtualScroll`，渲染窗口化的卡片集合
- `src/components/BentoCard.vue`
  - 悬停/点击动画改为 RAF 插值，并统一阴影与缩放值
  - 增加“激活态”视觉样式与可配置过渡曲线
- `src/composables/useBentoGrid.ts`
  - 抽象为 `useGridLayout`，计算 `span` 与断点列数
- `src/composables/useBentoAnimations.ts`
  - 扩展为 `useCardRAFAnimations`：引入插值器与状态机
- 新增 `src/composables/useVirtualScroll.ts`
  - 可见窗口、overscan、索引映射工具
- 类型与文档：
  - `src/types/bento.ts` 补充 props 类型、断点与虚拟滚动配置
  - 输出 props 文档（基于 JSDoc + 示例）

# 验证与度量
- 帧率采样：RAF 记录 delta，统计 1s 内平均 fps
- 交互一致性：A/B 观察缩放与阴影曲线，校准到参考站
- 布局一致性：各断点列数与 gap 对照表，手动核验

# 风险与应对
- Flex→Grid 迁移的边界差异：保持 `units` 概念一致，逐步替换样式与计算逻辑
- 不等高卡片的密排：必要时启用轻量回溯填坑算法，避免大片空洞
- 虚拟滚动复杂度：初版按行窗口，后续再优化不等高映射

# 交付物
- 更新后的 `BentoGrid/BentoCard` 组件与 composables
- 完整 TS 类型与 props 文档
- 演示页面与测试指引（含性能指标说明）