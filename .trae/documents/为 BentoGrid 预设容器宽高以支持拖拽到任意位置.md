## 现状诊断
- 当前容器样式通过 `minHeight: '80vh'` 预留高度：`src/components/BentoGrid.vue:58`，但未根据可视区域与栅格单位精确计算容器“总行数/总高度”，导致容器外的目标区域不可投放。
- 列数仅按容器宽度+gap估算：`src/components/BentoGrid.vue:113`，缺少“总行数”概念；拖拽过程中 `dropRect` 若超出容器高度不会触发扩容。

## 目标
- 在页面初始与拖拽期间，根据可视区域尺寸（viewport）和栅格单位（`unit + gap`）精确设定 `bento-grid` 的整体宽高，使任意位置（包括当前内容之外）都可作为预估落点。
- 拖拽时如需要更大空间，容器行数与高度动态扩容，保证顺畅的放置反馈。

## 设计方案
- 扩展网格状态：在 `useBentoGrid` 增加 `totalRows` 与 `overscanRows`。
- 维度计算：
  1. 列数：`columns = floor((containerWidth + gap)/(unit + gap))`
  2. 初始总行数：`totalRows = max(existingRows, floor(viewportHeight/(unit + gap))) + overscanRows`
  3. 容器高度：`height = totalRows * unit + (totalRows - 1) * gap`
- 动态扩容：拖拽时若 `dropRect.bottom > height`，计算所需行数增量并更新 `totalRows`，同步 `height`。
- 双布局支持：
  - Flex 模式：设置容器 `height`（非 `minHeight`）并保持 `position: relative`，以承载预估阴影与落点区域。
  - Grid 模式：同时设置 `grid-auto-rows: unit` 与容器 `height`，确保可投放区域与密排一致。
- 事件钩子：
  - `onMounted/resize`：计算 `columns/totalRows/height` 并应用到 `gridStyles`
  - `dragStart/updateDrag`：根据指针与 `dropRect` 动态扩容

## 具体改动
1. `src/types/bento.ts`
   - 新增类型字段：`totalRows?: number; overscanRows?: number;`
2. `src/composables/useBentoGrid.ts`
   - 增加状态与计算函数：`computeGridDimensions(containerEl, viewport)`、`setViewportGridBounds(viewportEl)`
   - 在 `getGridStyles` 中用 `height` 替代固定 `minHeight`，Flex/Grid 分支都返回明确高度
3. `src/components/BentoGrid.vue`
   - 挂载与 `ResizeObserver` 中调用 `setViewportGridBounds`，并在 `handleDragStart/updateDrag` 中根据 `dropRect` 扩容
   - 将模板中的容器样式绑定到动态 `height`（去掉固定 `minHeight`）
4. `src/composables/useDragAndDrop.ts`
   - 在 `updateDrag` 计算出 `dropRect.bottom`，若超限通过回调触发 `totalRows` 扩容

## 边界与优化
- 最大行数保护与渐进扩容（例如每次最多增加 `N` 行）避免高度振荡
- `requestAnimationFrame` 节流扩容判断，避免频繁 reflow
- 触控设备保持 `passive` 监听

## 验证步骤
- 桌面与移动端在 `/test` 页面：快速拖动到当前内容之外位置，应显示预估阴影并可 `drop`
- 缩放窗口：重新计算列数与总行数，容器高度随之调整
- 性能：监测 rAF 帧率，确保 60fps；拖拽过程中无明显跳动

## 交付
- 完整实现上述改动并提供测试用例与演示按钮，确保可视区域驱动的预设宽高满足你的拖拽到任意位置的需求