# Research: 改进 FloatingPanel

**Date**: 2025-12-09  
**Feature**: 001-improve-floating-panel  
**Purpose**: 研究技术方案和最佳实践，为实施计划提供依据

## Research Areas

### 1. Vue 3 拖放系统集成

**Research Task**: 如何将暂存卡片的拖放功能集成到现有的网格拖放系统中？

**Findings**:
- 现有系统使用 `useDragAndDrop.ts` composable 管理拖放状态
- 拖放系统通过 `draggedCard` ref 跟踪当前拖动的卡片
- 网格组件通过事件监听器处理拖放事件（dragenter, dragover, drop）
- 需要扩展拖放系统以支持从 FloatingPanel 启动的拖放操作

**Decision**: 复用现有的 `useDragAndDrop` composable，扩展其功能以支持暂存卡片的拖放
- 在 FloatingPanel 中调用 `startDrag` 时传入暂存卡片
- 使用相同的拖放状态管理和视觉反馈机制
- 在 `endDrag` 时处理卡片从暂存区域移除并添加到网格

**Rationale**: 
- 保持代码一致性，避免重复实现
- 利用现有的避让算法和动画系统
- 减少代码复杂度，提高可维护性

**Alternatives Considered**:
- 创建新的拖放 composable：被拒绝，因为会导致代码重复和维护成本增加
- 使用第三方拖放库（如 vue-draggable）：被拒绝，因为需要重构现有系统，风险较高

### 2. CSS 尺寸优化策略

**Research Task**: 如何全面优化 FloatingPanel 的尺寸，使其更加精致紧凑？

**Findings**:
- 当前面板最小宽度为 480px，需要减少至少 30%（约 336px 或更小）
- 需要优化内边距（当前 12px）、间距（当前 6px）、卡片预览尺寸
- 响应式设计需要考虑移动端适配

**Decision**: 采用渐进式尺寸优化策略
- 宽度：从 480px 减少到 320px（减少 33%）
- 内边距：从 12px 减少到 8px
- 间距：从 6px 减少到 4px
- 卡片预览：从 60-90px 减少到 48-72px
- 高度：自适应内容，但设置最大高度限制

**Rationale**:
- 保持视觉平衡和可用性
- 确保所有功能按钮和卡片仍然清晰可见
- 响应式设计在不同屏幕尺寸下都能良好工作

**Alternatives Considered**:
- 仅优化宽度：被拒绝，因为其他尺寸指标也会影响"精致"感
- 更激进的尺寸减少：被拒绝，因为可能影响可用性

### 3. 拖放冲突处理策略

**Research Task**: 如何实现自动避让和冲突处理？

**Findings**:
- 现有网格系统已有避让算法（通过 plugins.dispatch('onDragUpdate')）
- 避让算法会尝试找到最近的可用位置
- 如果无法避让，插件可以返回 shadowPosition 指示原始位置

**Decision**: 复用现有的避让系统
- 暂存卡片拖放到网格时，使用相同的避让逻辑
- 如果避让失败，卡片返回暂存区域
- 在拖放过程中显示视觉反馈（drop preview）

**Rationale**:
- 保持行为一致性，用户期望相同
- 利用现有经过测试的避让算法
- 减少实现复杂度

**Alternatives Considered**:
- 拒绝所有冲突放置：被拒绝，因为用户体验较差
- 强制替换冲突卡片：被拒绝，因为可能丢失用户数据

### 4. 拖放过程中的交互处理

**Research Task**: 如何处理拖放过程中用户点击其他按钮的情况？

**Findings**:
- Vue 3 事件系统支持事件冒泡和阻止
- 需要在拖放状态中检测其他按钮点击
- 需要清理拖放状态并恢复 UI

**Decision**: 在拖放过程中监听全局点击事件
- 检测到点击其他按钮时，调用 `endDrag` 并返回卡片到暂存区域
- 然后执行点击的操作（添加卡片、删除、折叠等）
- 使用事件委托优化性能

**Rationale**:
- 提供清晰的交互反馈
- 防止拖放状态与按钮操作冲突
- 符合常见 UI 交互模式

**Alternatives Considered**:
- 禁用所有按钮：被拒绝，因为限制用户操作
- 忽略点击：被拒绝，因为可能导致状态不一致

### 5. 性能优化策略

**Research Task**: 如何确保拖放操作的流畅性和性能？

**Findings**:
- 现有系统使用 requestAnimationFrame 优化动画
- CSS transitions 使用硬件加速
- 需要避免不必要的重渲染

**Decision**: 采用现有性能优化策略
- 使用 requestAnimationFrame 更新拖放位置
- 使用 CSS transforms 而非 position 属性（硬件加速）
- 使用 computed 和 ref 避免不必要的响应式更新
- 视觉反馈在 50ms 内显示（符合 SC-004）

**Rationale**:
- 保持与现有系统一致的性能特征
- 利用浏览器硬件加速
- 确保 60fps 流畅动画

**Alternatives Considered**:
- 使用第三方动画库：被拒绝，因为增加依赖且现有方案已足够
- 降低动画帧率：被拒绝，因为影响用户体验

## Summary

所有研究问题均已解决，技术方案明确：
1. ✅ 复用现有拖放系统，扩展支持暂存卡片
2. ✅ 渐进式尺寸优化，保持可用性
3. ✅ 复用现有避让算法
4. ✅ 全局事件监听处理拖放中断
5. ✅ 使用现有性能优化策略

**Status**: ✅ **COMPLETE** - 所有研究完成，可以进入 Phase 1 设计阶段

