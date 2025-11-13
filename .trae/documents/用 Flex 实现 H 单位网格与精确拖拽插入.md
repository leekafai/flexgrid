## 思路总览
- 用 Flex + 固定“列单位 H”实现与参考站一致的栅格占位与密排：容器宽度预设为 `colsH`（例如 8H），每个卡片宽度固定为 `cardH`（例如 2H）。
- 行高以 `unit+gap` 为一行单元，容器高度按行数预设并可在拖拽时动态扩容；插入索引由指针的 `(rowIndex, colIndex)` 直接映射得到，视觉阴影与最终位置一致。

## 关键约束
- 列单位：`H = unit + gap`；容器宽度：`W = cols * unit + (cols - 1) * gap`；示例：`cols=8`、`cardWUnits=2` → 每行固定 4 张卡片
- 行单位：`rowH = unit + gap`；容器高度：`H = totalRows * unit + (totalRows - 1) * gap`

## 具体实现
### 1) Props 与状态
- 在 `BentoGrid` 增加 props：`cols?: number`（默认 8）、`cardWUnits?: number`（默认 2）、`unit?: number`、`gap?: number`、`overscanRows?: number`
- 在 `useBentoGrid.ts` 增加：`cols`、`cardWUnits`、`totalRows`、`overscanRows`，并计算：
  - 容器宽度：`width = cols * unit + (cols - 1) * gap`
  - 容器高度：`height = totalRows * unit + (totalRows - 1) * gap`
  - 每行可放 `itemsPerRow = Math.floor(cols / cardWUnits)`（在 8H/2H 情况下为 4）

### 2) Flex 样式
- 容器：`display:flex; flex-wrap:wrap; gap:<gap>; width:<calc>; height:<calc>; position:relative`
- 卡片：`flex: 0 0 <cardWidthPx>`；其中 `<cardWidthPx> = cardWUnits * unit + (cardWUnits - 1) * gap`
- 卡片高度仍以 `units.h` 映射到 `minHeight`，保持视觉一致。

### 3) 插入索引计算（核心）
- 在 `useDragAndDrop.updateDrag` 中，用指针坐标直接映射网格坐标：
  - `relativeX = clientX - containerRect.left`
  - `relativeY = clientY - containerRect.top`
  - `colIndex = clamp(floor(relativeX / (unit + gap)) / cardWUnits) * cardWUnits → 转为卡片起始列（步长 cardWUnits）`，再取 `posInRow = clamp(floor(relativeX / ((unit + gap) * cardWUnits)), 0, itemsPerRow)`
  - `rowIndex = clamp(floor(relativeY / (unit + gap)), 0, totalRows-1)`
  - `targetIndex = rowIndex * itemsPerRow + posInRow`
- 使用 `targetIndex` 作为 `dropIndex`，并渲染阴影矩形：
  - `left = posInRow * cardWidthPx`
  - `top = rowIndex * (unit + gap)`
  - 阴影宽高取一次性测量的 `dragSize`（已修复），与原卡片一致

### 4) 动态扩容行数
- 若 `top + dragSize.height > containerHeight`：
  - 计算需要的 `rowsNeeded = ceil((top + dragSize.height + gap) / (unit + gap))`
  - 更新 `totalRows = max(totalRows, rowsNeeded + overscanRows)`；容器高度随之增长

### 5) Drop 重排与偏移修正
- `reorderCardByIndex(cardId, targetIndex)`：
  - 先移除当前项得到 `currentIndex`，若 `currentIndex < targetIndex` 则 `targetIndex--`
  - 插入到 `targetIndex`
- 继续保存布局到 `localStorage`

### 6) 视觉与交互
- 影子与原位幽灵已存在；影子位置改为基于 `(rowIndex, posInRow)` 的网格坐标，保证“阴影在哪里，松手就到哪里”
- RAF 节流保持 60fps；`touchstart/move/end` 监听保持 `passive`

## 代码改动点
- `src/types/bento.ts`：为 `BentoGrid` 增加 `cols`, `cardWUnits`, `overscanRows`
- `src/composables/useBentoGrid.ts`：
  - 计算容器宽高、`itemsPerRow`，返回到 `getGridStyles`
  - 暴露 `expandRowsForBottom` 与预设 `setViewportGridBounds`
- `src/composables/useDragAndDrop.ts`：
  - 替换为基于 `(rowIndex, posInRow)` 的 `computeTargetIndex`；更新 `dropRect.left/top`
  - 保留一次性 `dragSize`，阴影不缩放
- `src/components/BentoGrid.vue`：
  - 容器绑定 `width/height` 与 `dragover/dragenter/drop`，使用 `dropIndex` 重排

## 验证
- `/test`：8H 容器，2H 卡片 → 每行 4 张；拖拽到第二行的任意位置：阴影与最终位置一致，不再“回到第一行尾部”
- 行可动态增减：当拖拽到容器底部之外时自动扩容

## 备注
- 此方案在 Flex 前提下保证插入位置与视觉阴影对齐（卡片统一 2H 宽）；若未来支持不等宽卡片，建议在 Flex 上继续用“行分组 + 中心点”兜底，或切换到 CSS Grid 获得更加稳定的跨列占位。