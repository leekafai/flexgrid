# Tasks: 完善暂存区功能

**Feature**: 002-staging-area-improvements  
**Date**: 2025-12-09  
**Branch**: `002-staging-area-improvements`

## Summary

- **Total Tasks**: 25
- **User Story 1 (P1)**: 5 tasks
- **User Story 2 (P1)**: 12 tasks
- **User Story 3 (P2)**: 5 tasks
- **Foundational**: 3 tasks

## Dependencies

### User Story Completion Order

```
Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (Polish)
```

**Note**: User Story 1 和 User Story 2 都是 P1 优先级，但 US1（角标）是 US2（拖放功能）的基础，因为拖放成功后需要更新角标。User Story 3 依赖前两个故事完成。

### Parallel Execution Opportunities

- **Phase 2**: T002 和 T003 可以并行（类型定义和容量常量）
- **Phase 3**: T004 和 T005 可以并行（composable 和组件修改）
- **Phase 4**: T007-T010 可以并行（都是 UI 事件处理），T011-T013 可以并行（都是拖放逻辑）

## Implementation Strategy

### MVP Scope

**Minimum Viable Product**: User Story 1 (显示暂存卡片数量角标)
- 这是最基础的功能，可以独立测试和交付
- 为后续拖放功能提供基础（角标更新）

### Incremental Delivery

1. **Phase 2 + Phase 3**: 完成角标显示（MVP）
2. **Phase 4**: 添加从网格到暂存区的拖放功能
3. **Phase 5**: 优化从暂存区到网格的拖放体验
4. **Phase 6**: 完善和优化

---

## Phase 1: Setup

*No setup tasks required - using existing project structure*

---

## Phase 2: Foundational

**Goal**: 建立容量限制和类型定义的基础设施

**Independent Test**: 可以独立验证容量限制逻辑和类型定义是否正确

### Tasks

- [x] T001 在 `src/composables/useFloatingPanel.ts` 中添加容量限制常量 `CAPACITY_LIMIT = 10`
- [x] T002 [P] 在 `src/composables/useFloatingPanel.ts` 中添加 `StorageOperationResult` 接口定义（或从 contracts 导入）
- [x] T003 [P] 在 `src/composables/useFloatingPanel.ts` 中添加 `StorageCapacityStatus` 接口定义（或从 contracts 导入）

---

## Phase 3: User Story 1 - 显示暂存卡片数量角标

**Goal**: 在暂存图标上显示数字角标，实时反映暂存卡片数量

**Priority**: P1

**Independent Test**: 添加卡片到暂存区，验证角标显示数量；移除卡片，验证角标更新；清空暂存区，验证角标隐藏

**Acceptance Criteria**:
- 角标在暂存区有卡片时显示
- 角标在暂存区为空时隐藏
- 角标数字与暂存卡片数量一致
- 角标在添加/移除卡片时立即更新（< 100ms）

### Tasks

- [x] T004 [US1] 在 `src/composables/useFloatingPanel.ts` 中确保 `storedCardsCount` 是响应式 computed，返回 `globalStoredCards.value.length`
- [x] T005 [US1] 在 `src/components/FloatingPanel.vue` 中验证角标显示逻辑（第20行），确保 `v-if="storedCardsCount > 0"` 正确绑定
- [x] T006 [US1] 在 `src/components/FloatingPanel.vue` 中优化角标样式，确保 z-index 足够高，位置正确（右上角）
- [x] T007 [US1] 测试角标更新性能，确保在添加/移除卡片时角标在 100ms 内更新

---

## Phase 4: User Story 2 - 实现从网格拖拽到暂存区的完整功能

**Goal**: 实现从网格拖拽卡片到暂存区的完整功能，包括容量限制、视觉反馈和错误处理

**Priority**: P1

**Independent Test**: 从网格拖动卡片到暂存区，验证成功暂存；在容量已满时拖动，验证拒绝并显示反馈；拖动到暂存区外，验证卡片返回网格

**Acceptance Criteria**:
- 可以从网格拖动卡片到暂存区图标或展开列表
- 拖动到暂存区时列表自动展开
- 提供组合视觉反馈（高亮图标 + 提示文本 + 鼠标样式）
- 容量已满时拒绝拖放并显示反馈
- 卡片成功暂存后从网格移除
- 角标数字更新

### Tasks

#### 4.1 容量限制实现

- [x] T008 [US2] 在 `src/composables/useFloatingPanel.ts` 中添加 `isFull` computed，检查 `globalStoredCards.value.length >= CAPACITY_LIMIT`
- [x] T009 [US2] 在 `src/composables/useFloatingPanel.ts` 中添加 `canAcceptDrop` computed，返回 `!isFull.value`
- [x] T010 [US2] 在 `src/composables/useFloatingPanel.ts` 中修改 `addToStorage` 方法，添加容量检查，返回 `StorageOperationResult`
- [x] T011 [US2] 在 `src/composables/useFloatingPanel.ts` 中添加 `checkCapacity` 方法，返回容量检查结果
- [x] T012 [US2] 在 `src/composables/useFloatingPanel.ts` 中添加 `getCapacityStatus` 方法，返回容量状态信息
- [x] T013 [US2] 在 `src/composables/useFloatingPanel.ts` 中更新返回值，导出 `isFull`、`canAcceptDrop`、`checkCapacity`、`getCapacityStatus`

#### 4.2 拖放事件处理

- [x] T014 [US2] 在 `src/components/FloatingPanel.vue` 中为暂存图标添加拖放事件处理（`@dragover.prevent`、`@dragenter.prevent`、`@dragleave`、`@drop.prevent`）
- [x] T015 [US2] 在 `src/components/FloatingPanel.vue` 中为展开列表添加拖放事件处理（`@dragover.prevent`、`@dragenter.prevent`、`@dragleave`、`@drop.prevent`）
- [x] T016 [US2] 在 `src/components/FloatingPanel.vue` 中添加 `isDragOverStorage` ref 状态
- [x] T017 [US2] 在 `src/components/FloatingPanel.vue` 中实现 `handleDragEnter` 方法，设置 `isDragOverStorage = true` 并展开列表
- [x] T018 [US2] 在 `src/components/FloatingPanel.vue` 中实现 `handleDragOver` 方法，根据 `canAcceptDrop` 设置 `dropEffect`
- [x] T019 [US2] 在 `src/components/FloatingPanel.vue` 中实现 `handleDragLeave` 方法，检查是否真的离开暂存区
- [x] T020 [US2] 在 `src/components/FloatingPanel.vue` 中实现 `handleDropFromGrid` 方法，调用 `addToStorage` 并处理结果

#### 4.3 视觉反馈

- [x] T021 [US2] 在 `src/components/FloatingPanel.vue` 中添加拖放悬停时的 CSS 类绑定（`:class="{ 'floating-panel__storage-trigger--drag-over': isDragOverStorage }"`）
- [x] T022 [US2] 在 `src/components/FloatingPanel.vue` 中添加容量已满时的 CSS 类绑定（`:class="{ 'floating-panel__storage-trigger--full': isFull && isDragOverStorage }"`）
- [x] T023 [US2] 在 `src/components/FloatingPanel.vue` 中添加提示文本显示（`v-if="isDragOverStorage && !isFull"` 显示"释放以暂存"）
- [x] T024 [US2] 在 `src/components/FloatingPanel.vue` 中添加容量已满提示文本（`v-else-if="isDragOverStorage && isFull"` 显示"暂存区已满"）
- [x] T025 [US2] 在 `src/components/FloatingPanel.vue` 的样式中添加拖放悬停、容量已满、提示文本的 CSS 样式

#### 4.4 拖放状态管理

- [x] T026 [US2] 在 `src/composables/useDragAndDrop.ts` 中添加 `isDragOverStorage` ref 状态
- [x] T027 [US2] 在 `src/composables/useDragAndDrop.ts` 中添加 `setDragOverStorage` 方法，设置 `isDragOverStorage` 值
- [x] T028 [US2] 在 `src/composables/useDragAndDrop.ts` 中更新返回值，导出 `isDragOverStorage` 和 `setDragOverStorage`

#### 4.5 网格集成

- [x] T029 [US2] 在 `src/components/BentoGrid.vue` 中确保 `handleCardStore` 方法正确移除卡片并触发事件
- [x] T030 [US2] 在 `src/components/FloatingPanel.vue` 中处理从网格移除卡片的逻辑（通过事件或直接调用）

---

## Phase 5: User Story 3 - 优化从暂存区恢复到网格的拖拽功能

**Goal**: 优化从暂存区拖拽卡片到网格的体验，包括视觉反馈和错误处理

**Priority**: P2

**Independent Test**: 从暂存区拖动卡片到网格，验证流畅的拖放体验；拖动到冲突位置，验证自动避让；拖动到网格外，验证卡片返回暂存区

**Acceptance Criteria**:
- 拖动暂存卡片时显示清晰的拖放预览
- 被拖动的卡片在暂存列表中显示半透明状态
- 网格显示精确的放置预览
- 冲突时自动避让或拒绝放置
- 角标数字更新

### Tasks

- [x] T031 [US3] 在 `src/components/FloatingPanel.vue` 中确保被拖动的卡片显示半透明状态（`:class="{ 'floating-panel__stored-card--dragging': isDraggingFromStorage && draggedCard?.id === card.id }"`）
- [x] T032 [US3] 在 `src/components/FloatingPanel.vue` 的样式中优化 `.floating-panel__stored-card--dragging` 样式（opacity: 0.5, cursor: grabbing）
- [x] T033 [US3] 在 `src/components/BentoGrid.vue` 中验证从暂存区拖放的卡片处理逻辑，确保使用现有的避让系统
- [x] T034 [US3] 在 `src/composables/useFloatingPanel.ts` 中确保 `endDragFromStorage` 在成功时正确移除卡片并更新角标
- [x] T035 [US3] 测试从暂存区到网格的拖放性能，确保拖放预览在 50ms 内显示

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: 完善功能，包括串行拖放处理、错误处理和性能优化

**Independent Test**: 快速连续拖动多张卡片，验证串行处理；测试各种边界情况

### Tasks

- [x] T036 在 `src/composables/useDragAndDrop.ts` 的 `startDrag` 方法中添加串行处理检查，如果 `isDragging.value` 为 true 则阻止新拖放
- [x] T037 在 `src/components/FloatingPanel.vue` 中优化 `handleStorageMouseLeave` 方法，确保在拖放时不收起列表
- [x] T038 添加错误处理，确保容量已满时正确拒绝拖放并返回卡片到网格
- [x] T039 优化性能，确保视觉反馈在 50ms 内显示，角标更新在 100ms 内完成
- [x] T040 测试所有边界情况：快速拖动、容量已满、拖放到边界区域、并发拖放等

---

## Notes

- 所有任务都基于现有代码扩展，不重构
- 遵循 Vue 3 Composition API 和 TypeScript 最佳实践
- 确保所有响应式状态使用 ref/computed
- 性能目标：角标更新 < 100ms，视觉反馈 < 50ms，拖放操作 < 2 秒

