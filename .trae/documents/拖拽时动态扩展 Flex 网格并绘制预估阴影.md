## 目标
- 在用户开始拖动卡片时，动态扩展网格（Flex 容器），为可能出现的新行预留空间。
- 根据指针位置实时预测用户可能放置的行/列（以单位制计算），并在该位置绘制与被拖卡片尺寸一致的阴影。
- 保持 Flex 布局（非 Grid），同时维持统一间距、对齐与极简视觉。

## 数据模型与单位
- 统一单位：`unit = 36px`、`gap = 8px`，以 `(unit + gap)` 为网格步长。
- 列数计算：`cols = floor((containerWidth + gap) / (unit + gap))`，拖拽开始时和窗口/容器变化时更新。
- 卡片最小尺寸：`minWidth = w*unit + (w-1)*gap`、`minHeight = h*unit + (h-1)*gap`（默认 2x2），Flex 下允许内容自适应增大。

## 拖拽生命周期改造
### 1) onDragStart（开始拖动）
- 快照容器矩形 `gridRect = gridEl.getBoundingClientRect()` 与当前子元素 rect 列表。
- 计算当前 `cols` 并缓存到拖拽上下文。
- 计算被拖卡片的最小尺寸（或实际尺寸）。
- 根据当前指针位置预估行列：
  - `relX = pointerX - gridRect.left`
  - `relY = pointerY - gridRect.top`
  - `col = clamp(floor(relX / (unit + gap)), 0, cols-1)`
  - `row = max(0, floor(relY / (unit + gap)))`
- 计算阴影矩形：`left = col*(unit+gap)`、`top = row*(unit+gap)`、`width/height` 与拖卡一致。
- 若阴影底部超出容器当前高度，则提升容器 `minHeight = shadowBottom + safePadding`，实现“动态扩展网格”。

### 2) onDragMove（拖动中）
- 以 `requestAnimationFrame` 节流，实时更新指针坐标与 `cols`（当容器宽度变化时）。
- 重复行/列预测并更新阴影矩形；当阴影底部超出容器高度时同步提高 `minHeight`。
- 计算 Flex 插入索引：`index = clamp(row*cols + col, 0, cards.length)`，用于放手后的