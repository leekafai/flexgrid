## 问题定位
- `dropIndex` 在未命中卡片时简单回退到 `children.length`，导致总是插到末尾（第一行尾部的表现）。
- 计算索引时未排除“被拖卡片”，且未对“移除后目标索引偏移”做校准（当前项在目标前时应 `index--`）。

## 修复目标
- 鼠标所在的行与列位置应唯一映射到一个线性插入索引，松手后卡片按阴影位置进入该索引。
- 适配分散排布与不同卡片宽高；不依赖命中元素也能正确选择目标位置。

## 技术方案
1. 行分组与列排序（Flex）
- 在 `updateDrag` 收集除“被拖卡片”外所有子卡片的 `rect`；
- 以 `rect.top` 聚类形成行（阈值 `rowTolerance≈8px`），每行按 `rect.left` 排序；
- 生成 `rows: Array<{ top:number, items: Array<{el, rect, domIndex}> }>` 与一个 `flatOrder` 映射。

2. 目标行/列选择
- 若命中元素，索引为命中元素的 `domIndex`（并根据 `pointerX` 判断是插入其前还是后，使用中心点）；
- 若未命中：
  - 以 `pointerY` 找到所在行（`rows[i].top ≤ pointerY < nextTop`），若超过最后一行则选最后一行；
  - 在该行内以 `pointerX` 与每个 item 的中心 `cx` 比较，选择“最后一个 `cx ≤ pointerX` 的位置 +1”；无命中则插在行首或行末。

3. 线性索引映射与偏移校准
- 将行内位置映射回全局线性 `targetIndex = rows[i].items[pos].domIndex`（或行起始索引 + pos），
- 若 `currentIndex < targetIndex`，在实际重排前执行 `targetIndex--`（当前项移除导致右侧索引左移）。

4. 阴影矩形位置与尺寸
- 阴影 `dropRect` 使用缓存的 `dragSize` 宽高；
- 其 `left/top` 按选中行的 `top` 与按 `pointerX` 插入位置的左边界估算（若插在行末则参考最后一项的 `rect.right + gap`，并在容器宽内钳制）。

5. 事件与持久化
- `drop` 时调用新计算的 `targetIndex` 完成重排；继续保存到 `localStorage`。

## 修改点
- `src/composables/useDragAndDrop.ts`
  - 在 `updateDrag` 构建 `rows` 与新的 `computeTargetIndex(pointer)` 函数，替换当前的回退逻辑。
  - 阴影 `dropRect` 的 `left/top` 依据选中行/列估算位置，而非仅靠命中元素。
- `src/composables/useBentoGrid.ts`
  - `reorderCardByIndex` 在移除后对 `targetIndex` 做偏移校正。

## 验证
- `/test`：将第一行卡片拖到第二行空白处，阴影位置与松手后的卡片位置一致。
- 拖拽不同大小卡片与分散排布组合，始终按指针所在行列正确插入。

## 额外
- 保留现有 `[DND]` 调试日志，新增 `targetIndex/row/col` 输出，便于定位边界情况。