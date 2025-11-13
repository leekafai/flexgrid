## 目标
- 去掉“大高度预设”的容器做法，改为“多行 Flex 行容器”，每行一个 `<div class="bento-row">`，跨行拖拽即跨行容器插入。
- 保持参考站的 H 单位栅格：例如总宽度 8H、卡片宽度 2H；行数可动态增减。

## 数据与类型
- `BentoGrid` 增加：
  - `rows: BentoCard[][]`（渲染源，按行存卡）
  - `colsH: number`（如 8）、`cardWUnits: number`（如 2）、`unit: number`、`gap: number`
- 兼容旧 `cards`：初始化时把 `cards` 平铺为若干行（每行 `itemsPerRow = floor(colsH / cardWUnits)`），后续以 `rows` 为准。

## 布局结构
- 模板：
  - `<div class="bento-grid">`
    - `v-for row in rows`
      - `<div class="bento-row">`（行容器：`display:flex; flex-wrap:nowrap; gap:<gap>`）
        - `v-for card in row` 渲染 `BentoCard`，卡片样式：`flex: 0 0 <cardWidthPx>`，高度按 `units.h` 映射。
- 容器不再设固定高度；行容器高度由内容决定，新增行即新增一个 `<div>`。

## 拖拽算法（Flex 多行）
- 指针坐标→目标行列：
  1. `rowIndex`：用 `document.elementFromPoint` 或行 `getBoundingClientRect()` 判断命中的行；若在最后一行下方，创建新行并设为目标行。
  2. `posInRow`：在目标行中，按每个卡片 `centerX` 与指针 `clientX` 比较，选择“最后一个 `cx ≤ clientX` 的位置 + 1”；空行则为 0。
- 阴影与原位幽灵：
  - 阴影插入到目标行容器中（绝对定位相对 `.bento-row` 或使用占位元素），宽高为测量到的 `dragSize`，`left/top` 按目标行定位，平滑过渡。
- Drop 重排：
  - 从源行移除被拖卡片，插入到 `rows[rowIndex].splice(posInRow, 0, card)`；若源行为空则删除该行。
  - 更新并持久化（`localStorage`：将 `rows` 扁平化并保存 `id` 顺序）。

## 行增减策略
- 增行：当指针落在最后一行下方或阴影底部超过最后一行 `bottom`，在 RAF 节流后 `rows.push([])`。
- 删行：在 Drop 或取消拖拽时，若某行为空，移除该行；保留至少一行。

## 事件接入
- 卡片：`draggable + dragstart/dragend`（已接入），继续作为触发桥；同时支持 `mousedown/touchstart`。
- 行容器：为每个 `.bento-row` 绑定 `dragover/dragenter/drop`，将指针事件限定在目标行，精确计算 `posInRow`。
- Grid 容器：保留全局 `dragover` 以处理“在行外部空白处”增行。

## 栅格单位与样式
- 常量：`H = unit + gap`；
  - 宽：`cardWidthPx = cardWUnits * unit + (cardWUnits - 1) * gap`
  - 行间距：行容器 `margin-bottom: gap` 或由容器 `gap` 控制。
- 响应式：`colsH` 可按断点调整（如 8→6→4），`itemsPerRow` 随之变更；在 `ResizeObserver` 中重建行（或仅影响展示，不打散数据）。

## 辅助与优化
- 统一日志前缀 `[DND]`：输出 `rowIndex/posInRow/dragSize/dropRect`，便于定位。
- RAF 节流 `updateDrag`，事件监听 `passive`。

## 交付步骤
1. 类型扩展与 `rows` 初始化（从 `cards` 映射）。
2. 模板改成多行 `.bento-row` 并调整样式与卡片 `flex-basis`。
3. 拖拽更新：行内/跨行插入索引计算；行容器 `dragover/drop` 接入；
4. 增减行逻辑；空行移除与持久化。
5. `/test` 页面：预置若干卡片，验证跨行拖拽与动态增行。

## 验证
- 把第一行卡片拖到下方空白：自动新增第二行，松手后卡片就在第二行阴影所示的位置。
- 不断向下拖，行数持续增加；拖回上方行也能正确插入。

## 注意点
- 多行 Flex 的顺序即 DOM 顺序，插入位置与视觉一致；无需预设巨大高度。
- 若未来出现不等宽卡片，行内 `posInRow` 仍基于中心点计算，保持稳定体验。