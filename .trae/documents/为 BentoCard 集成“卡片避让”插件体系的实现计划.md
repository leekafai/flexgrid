## 目标概述
- 以非侵入式插件架构，为 Bento 系统在 `position` 布局下提供“卡片避让”能力：双向检测（横/纵）、重叠概率评估、四方向（上/下/左/右）可用位置计算、选择路径最多卡片进行移动与平滑动画。
- 性能预算：单次避让计算 ≤ 16ms；不触碰行模型相关逻辑。

## 现状与 position 流程
- `updateDrag` 的 `position` 分支在 `useDragAndDrop.ts`（src/composables/useDragAndDrop.ts:290-306）计算 `dropRect` 与 `dropTarget {x,y}`。
- 落点应用在 `BentoGrid.vue` 的 `handleMouseUp/handleDrop`：调用 `moveCard(id,{x,y})` 并 `saveLayout`（src/components/BentoGrid.vue:214-223、313-321）。
- 已有碰撞函数 `checkCollision(card1, card2)`（src/composables/useDragAndDrop.ts:496）与位置探索 `findValidPosition`（src/composables/useDragAndDrop.ts:518）。

## 插件化架构
- 插件接口：`AvoidancePlugin`
  - `onDragStart(ctx)`：缓存当前网格占用图与拖拽源态。
  - `onDragUpdate(ctx) → AvoidancePlan`：针对 `dropTarget` 执行双向检测、重叠概率评估、四方向候选位置搜索，返回移动计划和动画元数据。
  - `onBeforeDrop(ctx) → AvoidancePlan`：在最终落点前确认并最小化位移。
  - `onDragEnd()`：释放缓存。
- 上下文 `AvoidanceContext`
  - `grid`、`columns/gap/unit/layout`（固定为 `position`）、`draggedCard`、`dropRect/dropTarget`、`gridEl`。
- 计划 `AvoidancePlan`
  - `moves: Array<{ cardId; toPosition: {x,y} }>`；`animations: Array<{ cardId; type: 'flip'|'translate'; duration; easing }>`。
- 管理器与适配器
  - `register/unregister/dispatch`；适配器调用现有 `moveCard(id,{x,y})` 与批量更新。
- 文件建议
  - `src/plugins/avoidance/index.ts`（主插件）
  - `src/plugins/manager.ts`（注册/分发）
  - `src/types/plugins.ts`（接口与上下文类型）

## 避让算法（position 专用）
- 占用矩阵
  - 维度：`columns × maxRows`（按现有卡片 `position.y + height` 的最大值估算）。
  - 标记：为每张卡片根据 `units(w,h)`在占用图上打点，供快速查询。
- 双向检测与重叠概率
  - 拖拽目标 `T={x,y,w,h}` 与每张卡片 `C={x,y,w,h}` 的 AABB 重叠（复用 `checkCollision`）。
  - 概率评分：`overlapArea/draggedArea` 与网格距离权重（越近越高）。
- 四方向可用位置搜索（上/下/左/右）
  - 以冲突卡片为起点，在占用图上做 4 邻域 BFS，目标是找到最近且能完整容纳其 `w×h` 的空块；
  - 搜索边界：`x∈[0, columns-w]`，`y≥0`；剪枝：若累计访问节点或层数超过阈值则早停；
  - 每个方向保留若干最优候选（代价：`曼哈顿距离 + 拟合空块边界偏移`）。
- 选择移动目标
  - 统计每个冲突卡片 `validDirectionsCount`，选择“路径最多”的卡片；同分时选总代价最小；
  - 生成 `moves`，若拖拽目标与被移动卡片仍存在连锁冲突，递归/迭代至上限（保证总时长 ≤ 16ms）。
- 平滑动画
  - 记录被移动卡片的旧 DOMRect，应用新坐标后采用 FLIP：先设置 `transform` 从旧位置过渡到 0，过渡 120–240ms，缓动 `cubic-bezier(.22,1,.36,1)`；
  - 拖拽跟随依旧由现有 `getDragStyles` 控制（src/composables/useDragAndDrop.ts:425-456）。

## 集成改动点（仅 position 路径）
- `BentoGrid.vue`
  - 在 `handleMouseMove/handleDragOver` 的 `layout==='position'` 情况下，构造 `ctx` 并调用 `plugins.dispatch('onDragUpdate', ctx)`；若返回 `plan.moves`，通过适配器批量 `moveCard` 并注入动画。
  - 在 `handleMouseUp/handleDrop` 前调用 `onBeforeDrop`，最终应用位置并 `saveLayout`（现有保存逻辑保留）。
- `useDragAndDrop.ts`
  - 暴露占用矩阵构建与 AABB 工具（复用 `checkCollision`），以供插件内部调用；保留 `findValidPosition` 作为回退。

## 质量保证
- 测试（新增 Vitest）
  - 安装 `vitest/@vue/test-utils` 与脚本 `test`；
  - 用例：多卡冲突、边界卡、稠密网格、连锁冲突、无冲突回退；
  - 性能：以 12 列、40–60 卡的常见规模，`performance.now()` 包围插件核心，平均 ≤ 16ms。
- 兼容性
  - 验证 Chrome/Edge/Firefox 的 HTML5 拖拽与触摸事件；保持 `prefers-reduced-motion` 回退（src/components/BentoGrid.vue:525-532）。

## 文档与示例
- 插件开发指南：接口、上下文、计划结构、注册使用、性能建议。
- 算法说明：占用图、AABB、四方向 BFS、选择策略与复杂度。
- 示例：在 `position` 布局下演示自动避让。

## 验收标准
- 功能：双向检测、四方向位置、路径最多卡片移动与平滑动画在 `position` 布局下稳定运行。
- 性能：中等规模场景下单次避让计算 ≤ 16ms。
- 稳定性：不破坏现有 `position` 流程（src/composables/useDragAndDrop.ts:290-306；src/components/BentoGrid.vue:214-223、313-321）。

## 下一步
- 若确认计划，我将实现插件管理器与“卡片避让”插件，并在 `position` 路径下接入上述钩子。