# 目标
- 将 `.bento-grid` 重构为“多行 Flex”的网格主体：内部由多个 `.grid-row` 组成，每个 `.grid-row` 内渲染若干卡片。
- 鼠标拖拽时按指针位置动态新增 `.grid-row`；阴影在行内精确定位；松手后卡片按阴影位置落入目标行的目标列。
- 保留源行与目标行之间的空行，允许自由排布形成稀疏布局。

# 数据模型
- BentoGridState
  - `rows: Array<BentoCard[]>`：每行的卡片列表，允许空数组表示空行
  - `unit: number`、`gap: number`、`colsH: number`（如 8）`cardWUnits: number`（如 2）
  - 派生：`H = unit + gap`、`itemsPerRow = floor(colsH / cardWUnits)`、`cardWidthPx = cardWUnits * unit + (cardWUnits - 1) * gap`
- 持久化
  - `serialize(): { rows: string[][] }`（仅保存 id 顺序和空行）
  - `deserialize(payload): rows`（恢复空行与顺序）

# 组件结构
- `.bento-grid`（主体容器）
  - `display: flex; flex-direction: column; gap: <gap>`；不设置巨大的固定高度
  - `v-for="row, i in rows"` → `.grid-row`
- `.grid-row`（行容器）
  - `display: flex; flex-wrap: nowrap; gap: <gap>`
  - `position: relative`（用于行内阴影绝对定位）
  - 子元素：`<BentoCard />`（`flex: 0 0 cardWidthPx`，`minHeight` 由 `units.h` 映射）

# 拖拽流程
1. `dragstart`/`mousedown`：
   - 记录源行索引 `sourceRowIndex`、源列索引 `sourceColIndex`
   - 一次性测量 `dragSize = {offsetWidth, offsetHeight}`
2. `dragover`/`mousemove`：
   - 目标行选择：
     - 若命中 `.grid-row` → 用该行；若指针不属于任何 `.grid-row`，若在最后一行下方则新增 `.grid-row` 并选中
   - 行内列选择：
     - 在目标行中获取每个卡片的 `rect.centerX`，选“最后一个 `centerX ≤ pointerX` 的位置 + 1”；空行则 `pos = 0`
   - 阴影位置：
     - `left = pos * cardWidthPx`、`top = 0`，宽高用 `dragSize`，相对 `.grid-row` 绝对定位
3. `drop`/`mouseup`：
   - 从源行移除卡片，插入 `rows[targetRowIndex].splice(pos, 0, card)`
   - 若源行为空数组则保留（允许空行存在，实现稀疏布局）
   - 持久化 `rows`（包含空行）

# 动态增行
- 条件：
  - 指针 `clientY` 超过最后一行 `bottom + threshold` 或 `dropRect.bottom` 超出最后一行
- 动作：
  - `rows.push([])`，并将 `targetRowIndex = rows.length - 1`
- 性能：
  - 用 `requestAnimationFrame` 节流计算与 DOM 查询

# 阴影与原位幽灵
- 原位幽灵：在源行保留半透明占位（相对 `.grid-row` 定位）
- 预估阴影：只在目标行中显示，宽高稳定（使用一次性测量的 `dragSize`），`transform: none`
- 边界：钳制 `left` 在 `[0, rowWidth - dragSize.width]`

# 事件与状态
- 卡片：继续使用 `draggable + dragstart/dragend`，桥接到内部拖拽状态
- 行：每个 `.grid-row` 绑定 `dragover/dragenter/drop`，并在 `.bento-grid` 绑定全局 `dragover` 处理“行外部空白”的增行
- 触摸：使用 `pointer/touch` 的被动监听，保持移动端性能

# 样式与尺寸
- `.grid-row` 的可视宽度为 `colsH * unit + (colsH - 1) * gap`
- 卡片 `flex-basis = cardWidthPx`，高度由 `units.h` 映射
- 行距：容器 `gap` 或行 `margin-bottom: gap`

# 兼容与性能
- Chrome/Firefox/Safari 最新版；移动端采用 `passive` 监听
- 用 RAF 节流 `updateDrag`，避免频繁重排
- DOM 查询仅限行与本行卡片，提高定位速度

# 测试用例
- 拖拽到下一行空白处自动新增行并放置；多次下拖不断新增行
- 拖拽到已有行的中间位置，卡片插入到阴影位置
- 源行与目标行之间的多空行被保留，刷新后仍存在（持久化验证）
- 不同尺寸卡片（`units.h`）的行内摆放与阴影尺寸一致

# 交付步骤
1. 扩展 `BentoGrid` 状态与类型，增加 `rows` 与 H 单位配置
2. 改造模板为多行 `.grid-row`，调整卡片 `flex-basis`
3. 行级拖拽事件与阴影定位实现，支持新增行
4. Drop 重排与持久化（保留空行）
5. `/test` 预置多行数据，验证跨行与新增行交互