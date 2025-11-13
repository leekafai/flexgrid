## 目标
- 将现有基于 CSS Grid 的网格系统全面重构为 Flexbox 布局。
- 保留一致的间距、对齐与层次，同时支持卡片动态尺寸（内容宽度自适应、高度随内容自然扩展）。
- 重构拖拽交互：卡片本体跟随指针移动；预估放置位置绘制在网格中，尺寸与被拖动卡片一致。
- 实现移动/平板/桌面端的响应式表现，并完成跨浏览器/跨设备验证。

## 影响范围
- `src/composables/useBentoGrid.ts`：容器/卡片样式计算（当前使用 Grid：80–88、90–107）。
- `src/components/BentoGrid.vue`：模板与样式（当前样式包含 Grid：204–213）。
- `src/composables/useDragAndDrop.ts`：拖拽定位与占位（基于列/单元的计算：10–27、84–99、123–158）。
- `src/components/BentoCard.vue`：基础卡片尺寸与插槽结构（81–90、160–166）。

## 实施步骤
### 1. 容器替换为 Flex
- 将 `getGridStyles` 改为：`display:flex; flex-wrap:wrap; gap:var(--gap); justify-content:flex-start; align-items:flex-start;`
- 去除 `gridTemplateColumns/gridAutoRows`，保留 `maxWidth/width/margin/padding`，并以 CSS 变量统一间距。
- 在 `BentoGrid.vue` 移除 Grid 相关样式（`grid-template-columns` 等），统一为 Flex 容器。

### 2. 卡片尺寸策略（动态）
- 卡片使用 `flex:0 1 auto;`，`width:auto; height:auto;`，让宽度随内容自适应、高度自然扩展。
- 通过 `allowedSizes`（二维数值数组，如 `[[1,2],[2,2]]`）仅作为“最小尺寸”约束：
  - `min-width = w * unit + (w-1) * gap`
  - `min-height = h * unit + (h-1) * gap`
- 默认卡片最小尺寸为 `2H x 2W`；用户切换尺寸时仅更新 `min-width/min-height`，不锁死真实尺寸。

### 3. 拖拽交互改造为 Flex 语义
- 拖拽中：卡片本体跟随指针，使用 `position:fixed`，大小取当前卡片真实尺寸（或由 `units` 推导的最小尺寸），加轻阴影与缩放。
- 预估放置位置（占位框）绘制在容器内：
  - 通过测量容器子元素的布局（`getBoundingClientRect`），计算插入索引（命中行/列位置），而非栅格列坐标。
  - 占位框尺寸与被拖卡片一致（真实 `offsetWidth/offsetHeight` 或从 `units` 计算的最小值）。
  - 样式：浅灰虚线 + 轻阴影 + 圆角，放置在目标插入点附近。
- 放手时：根据计算出的目标索引更新卡片数组顺序（或使用 `order`），实现在 Flex 流里的位置改变。

### 4. 响应式设计
- 移动（320–768）：
  - 容器 `gap:12px`；卡片默认最小宽度约 100%（或 320px clamp），纵向排布。
- 平板（768–1024）：
  - 容器 `gap:14px`；卡片建议最小宽度约 320–420px，形成 2–3 列自适应。
- 桌面（≥1024）：
  - 容器 `gap:16px`；卡片最小宽度 320–480px，形成 3–4 列自适应；保持统一边距与对齐。
- 使用媒体查询或容器查询（优先媒体查询，结合现有 PostCSS/Autoprefixer）。

### 5. 统一视觉与间距
- 建立 CSS 变量：`--unit:36px; --gap:8px; --radius:12px; --shadow:0 6px 18px rgba(0,0,0,.08)`。
- 基础卡片：统一圆角/阴影/边框；去除多余炫技动效，保持极简风。

### 6. 代码改造要点（不立即执行，仅说明）
- `useBentoGrid.ts`
  - 替换 `getGridStyles` 为 Flex；新增 `getCardMinSize(card)` 由 `allowedSizes/units` 计算 `minWidth/minHeight`。
  - `getCardStyles` 返回：`flex:0 1 auto; minWidth/minHeight; width:auto; height:auto;`。
- `BentoGrid.vue`
  - 模板中为每个 `BentoCard` 合并样式：基础尺寸 + 拖拽样式叠加。
  - 容器上监听 `ResizeObserver`（保留），仅用于更新可视宽度相关的断点状态（不再维护固定列数）。
- `useDragAndDrop.ts`
  - 移除列/单元栅格定位；改为计算插入索引：
    1) 记录指针坐标；
    2) 遍历子元素 rect，找最近插入位置；
    3) 更新 `dropTargetIndex` 与 `dropPlaceholderRect`。
  - `getDropTargetStyles` 使用 `dropPlaceholderRect` 绘制占位框，尺寸与被拖动卡片一致。

### 7. 验证与测试
- 交互用例：
  - 单卡也能自由移动位置（验证插入索引与占位框是否正确）。
  - 多卡排列在不同断点下的拖拽与回弹效果、预估框尺寸与位置的一致性。
- 跨浏览器：Chrome/Firefox/Safari/Edge 最新版本；检查 `ResizeObserver` 与 Flex 渲染一致性。
- 跨设备：移动端（iOS/Android），平板与桌面，横竖屏切换。
- 无障碍：拖拽时的焦点与可视反馈不影响可读性；动画在 `prefers-reduced-motion` 下降级。

### 8. 交付与回滚
- 以最小改动覆盖现有 API：保留 `allowedSizes/units`；布局改造对外透明。
- 若 Flex 下出现回流性能问题，提供占位框节流与拖拽采样（`requestAnimationFrame`）作为备选。

### 9. 验收标准
- 拖拽时卡片本体跟随移动，预估框在网格中显示且尺寸一致。
- 卡片宽度根据内容自动适应，高度随内容扩展；不同断点下保持合理间距与对齐。
- 样式统一、视觉极简、层次清晰；在四大浏览器与设备上工作正常。

请确认该计划，我将据此开始代码改造并提交具体改动。