## 行为准则
- 阴影覆盖即候选：仅对当前被阴影覆盖的卡片计算避让。
- 四向检查：基于阴影的网格位置，检测上/下/左/右是否存在可容纳空间；有则避让，无则不避让。
- 强制放置回退：用户松手强行放置但仍无可避让空间时，被拖拽卡片平滑复位到原始位置，避免重叠。

## 关键状态与数据
- `shadowRect`: 当前阴影像素矩形；`shadowGridRect`: 转换为网格坐标 `{x,y,w,h}`。
- `prevShadowGridRect`: 上一次阴影网格矩形；用于位置变化检测与节流。
- `coveredCards`: 与 `shadowGridRect` AABB 有交叠的卡片集合（阴影下的卡片）。
- `occupancy`: 由现有卡片构建的占用矩阵（columns × rows）。
- `lastMoves`: 上一次已应用的避让移动 `{cardId -> {x,y}}`；用于 DOM diff。

## 阴影位置变化检测
- 在拖拽的 RAF 回调中计算 `shadowGridRect`；与 `prevShadowGridRect` 比较：
  - 像素阈值：位移 < 5px（或网格坐标未变）则认为“无变化”，跳过避让计算与 DOM 操作。
  - 当变化发生时，更新 `prevShadowGridRect` 并继续避让计算。

## 被覆盖卡片识别
- 仅对 `coveredCards` 参与避让，使用网格坐标 AABB：`aabbOverlap(shadowGridRect, cardRect)`。
- 优先级：按与阴影的重叠面积从大到小排序，确保阴影正下方的卡片优先移动（已在插件中做基础支持）。

## 四方向可用空间检查与路径选择
- 对每个被覆盖卡片 `c`：
  - 以 `c.position` 为起点，进行 4 邻域检查（上/下/左/右），在占用矩阵上搜索最近可容纳其 `w×h` 的空块：
    - 先执行方向的单步探测；若某方向立即可放置则优先使用。
    - 若单步不可放置，启动限深 BFS（方向优先次序：上→下→左→右；最大节点数/层数限制以保证 < 16ms）。
  - 结果为候选 `{direction, pos}` 列表；选择策略：
    - 首选存在方向的卡片；若多卡皆有方向，取重叠面积最大者；同面积时取“总位移成本最小”。
- 若所有被覆盖卡都无可用方向，则不下发避让移动。

## DOM 操作差异比较（Diff）
- 生成本次避让移动 `currentMoves: Array<{cardId, toPosition}>`。
- 与 `lastMoves` 比较：
  - 若某卡片目标坐标与上次一致，跳过该条 DOM 操作。
  - 若本次集合与上次完全一致，整体跳过应用（避免不必要的重排/重绘）。
- 仅对发生变化的卡片调用 `moveCard(cardId, toPosition)`。
- 应用后更新 `lastMoves`。

## 用户松手处理（落点前后）
- 在 `handleMouseUp/handleDrop`：
  - 先将拖拽目标转为网格坐标 `intended` 并做碰撞检测：若冲突，先调用避让计算（`onBeforeDrop`）尝试解决。
  - 若仍冲突（无可避让），将被拖拽卡片回退到 `dragOriginPos`，并将拖拽覆盖层动画目标更新为原始位置；动画持续 ≤ 300ms。
  - 若不冲突，正常放置，并执行插件的最终避让计划（若有）。

## 动画与性能
- 计算只在 RAF 回调中运行；对阴影位置进行像素阈值判断（5px）以跳过微小波动。
- 避让的动画统一在 200–300ms，缓动 `cubic-bezier(.22,1,.36,1)`，禁止 `left/top` 过渡引起错误来源的飞入动画。
- 节流：同一 `areaKey`（阴影网格矩形）内只下发一次避让；离开区域或无冲突时批量还原。

## 集成点
- `BentoGrid.vue`
  - 在拖拽移动中构造上下文并调用 `plugins.dispatch('onDragUpdate', ctx)`；新增阴影变化阈值判断与 DOM diff 应用，仅执行必要移动。
  - 在 `handleMouseUp` 与 `handleDrop` 段执行“碰撞→避让→回退/放置”的流程；落点后分发 `onDragEnd` 清理状态。
- `useDragAndDrop.ts`
  - 复用 `dropRect` 与 `getDropPosition`；在 RAF 内协同；保留现有 `animateTarget` 收尾动画。
- `avoidance/index.ts`
  - 扩展：阴影变化检测、仅对 `coveredCards` 计算、四方向检查、生成 `currentMoves`、与 `lastMoves` 做 diff 后返回计划。

## 测试与验收
- 用例：
  - 阴影覆盖单卡/多卡，存在与不存在可用方向（应避让/不避让）。
  - 阴影位置在 5px 内微动（不重复计算/不下发 DOM 操作）。
  - 区域切换批量还原与重新避让。
  - 强制放置回退：无可避让时，拖拽卡复位且无重叠。
- 性能：50 卡、12 列场景平均计算 ≤ 20ms；在目标情况下可迭代至 ≤ 16ms。

## 交付步骤
1. 在插件中增加 `prevShadowGridRect/lastMoves`、阈值比较与被覆盖卡检索；实现方向检查与限深 BFS；返回计划前做 DOM diff。
2. 在 `BentoGrid.vue` 拖拽移动时基于阴影变化阈值决定是否调用插件；应用返回计划时仅对变化卡片执行移动；落点前做碰撞→避让→回退/放置。
3. 在 `onDragEnd` 清理插件状态；完善单元测试覆盖上述场景与性能。
4. 验收与微调：根据交互体验调整阈值（默认 5px）与动画时间（≤ 300ms）。