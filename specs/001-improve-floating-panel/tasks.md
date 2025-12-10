# Tasks: 改进 FloatingPanel

**Input**: Design documents from `/specs/001-improve-floating-panel/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are optional for this feature - focus on manual testing and visual verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/` at repository root
- Components: `src/components/`
- Composables: `src/composables/`
- Types: `src/types/`
- Styles: `src/styles/`

---

## Phase 1: Setup (Environment Check)

**Purpose**: Verify development environment and project structure

- [x] T001 Verify TypeScript 5.3.3 and Vue 3.4.15 are installed
- [x] T002 Verify existing FloatingPanel component structure in src/components/FloatingPanel.vue
- [x] T003 Verify existing useFloatingPanel composable in src/composables/useFloatingPanel.ts
- [x] T004 Verify existing useDragAndDrop composable in src/composables/useDragAndDrop.ts

---

## Phase 2: Foundational (Type Extensions)

**Purpose**: Extend type definitions to support storage drag operations

**⚠️ CRITICAL**: These type extensions are needed before implementing drag functionality

- [x] T005 [P] [US2] Extend DragState interface in src/composables/useDragAndDrop.ts to include dragSource: 'grid' | 'storage' | null
- [x] T006 [P] [US2] Add StorageDragState interface in src/types/bento.ts for storage-specific drag state
- [x] T007 [P] [US2] Ensure StoredCard interface extends BentoCard in src/composables/useFloatingPanel.ts

**Checkpoint**: Type definitions ready - drag functionality can now be implemented

---

## Phase 3: User Story 1 - 优化 FloatingPanel 尺寸和外观 (Priority: P1) 🎯 MVP

**Goal**: 全面优化 FloatingPanel 的尺寸（宽度、高度、内边距、间距、卡片预览尺寸），减少至少 30% 的宽度，使面板更加精致紧凑

**Independent Test**: 通过视觉检查和尺寸测量验证面板尺寸是否减小，外观是否更加精致。用户可以独立验证面板不再占用过多屏幕空间，同时保持所有功能的可用性。

### Implementation for User Story 1

- [x] T008 [P] [US1] Optimize FloatingPanel width from 480px to 320px in src/components/FloatingPanel.vue (reduce by 33%)
- [x] T009 [P] [US1] Reduce FloatingPanel padding from 12px to 8px in src/components/FloatingPanel.vue
- [x] T010 [P] [US1] Reduce FloatingPanel gap from 12px to 8px in src/components/FloatingPanel.vue
- [x] T011 [P] [US1] Optimize stored card preview sizes from 60-90px to 48-72px in src/components/FloatingPanel.vue
- [x] T012 [P] [US1] Reduce stored card padding from 6px 8px to 4px 6px in src/components/FloatingPanel.vue
- [x] T013 [P] [US1] Reduce storage cards gap from 6px to 4px in src/components/FloatingPanel.vue
- [x] T014 [US1] Update responsive breakpoints for optimized panel size in src/components/FloatingPanel.vue
- [x] T015 [US1] Verify all buttons and cards remain visible and usable after size optimization
- [x] T016 [US1] Test panel appearance across different screen sizes (mobile, tablet, desktop)

**Checkpoint**: At this point, User Story 1 should be fully functional - panel is more compact and refined while maintaining all functionality

---

## Phase 4: User Story 2 - 实现暂存卡片的拖放功能 (Priority: P1)

**Goal**: 实现暂存卡片的拖放功能，允许用户从暂存区域拖动卡片并放置到网格中的任意有效位置，与现有网格拖放系统保持一致

**Independent Test**: 通过拖放操作验证暂存卡片是否可以被拖动，以及是否能够成功放置到网格中。用户可以独立完成从暂存区域拖动卡片到网格的完整流程。

### Implementation for User Story 2

- [x] T017 [P] [US2] Add startDragFromStorage method to useFloatingPanel composable in src/composables/useFloatingPanel.ts
- [x] T018 [P] [US2] Add endDragFromStorage method to useFloatingPanel composable in src/composables/useFloatingPanel.ts
- [x] T019 [P] [US2] Add isDraggingFromStorage state to useFloatingPanel composable in src/composables/useFloatingPanel.ts
- [x] T020 [US2] Extend useDragAndDrop composable to support storage drag source in src/composables/useDragAndDrop.ts
- [x] T021 [US2] Add draggable attribute and dragstart handler to stored cards in src/components/FloatingPanel.vue
- [x] T022 [US2] Implement drag start handler that checks panel collapsed state in src/components/FloatingPanel.vue
- [x] T023 [US2] Integrate storage drag with grid drop handlers in src/components/BentoGrid.vue
- [x] T024 [US2] Implement automatic avoidance logic for storage cards dropped on grid in src/components/BentoGrid.vue
- [x] T025 [US2] Handle drop failure by returning card to storage area in src/components/BentoGrid.vue
- [x] T026 [US2] Add visual feedback during drag operation (50ms response time) in src/components/FloatingPanel.vue
- [x] T027 [US2] Ensure other stored cards remain visible and interactive during drag in src/components/FloatingPanel.vue
- [x] T028 [US2] Implement drag cancellation when clicking other buttons during drag in src/components/FloatingPanel.vue
- [x] T029 [US2] Disable drag functionality when panel is collapsed in src/components/FloatingPanel.vue
- [x] T030 [US2] Maintain existing click-to-restore functionality alongside drag-and-drop in src/components/FloatingPanel.vue
- [x] T031 [US2] Remove card from storage after successful drop onto grid in src/composables/useFloatingPanel.ts
- [x] T032 [US2] Test drag and drop operation completes in under 2 seconds (SC-002)

**Checkpoint**: At this point, User Story 2 should be fully functional - users can drag cards from storage to grid with proper conflict handling

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, testing, and validation

- [x] T033 [P] Verify all existing functionality still works (add cards, remove stored cards, collapse/expand)
- [x] T034 [P] Test visual feedback appears within 50ms of drag start (SC-004)
- [x] T035 [P] Test drag and drop success rate meets 95% requirement (SC-003)
- [x] T036 [P] Validate panel width reduction meets 30% minimum requirement (SC-001)
- [x] T037 [P] Test responsive design across mobile, tablet, and desktop breakpoints
- [x] T038 [P] Verify performance: 60fps smooth animations during drag operations
- [x] T039 Code cleanup and refactoring: remove any unused code or comments
- [x] T040 Update component documentation if needed
- [x] T041 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Story 2 drag functionality
- **User Story 1 (Phase 3)**: Can start immediately after Setup - No dependencies on other phases
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - Requires type extensions
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Setup (Phase 1) - Completely independent
- **User Story 2 (P1)**: Must wait for Foundational (Phase 2) - Requires type extensions but independent of US1

### Within Each User Story

- User Story 1: All CSS optimization tasks can run in parallel
- User Story 2: Type extensions first, then composable methods, then component integration
- Core implementation before integration
- Story complete before moving to polish phase

### Parallel Opportunities

- **Phase 1**: All setup tasks can run in parallel
- **Phase 2**: All type extension tasks marked [P] can run in parallel
- **Phase 3 (US1)**: All CSS optimization tasks marked [P] can run in parallel
- **Phase 4 (US2)**: 
  - Type extensions (T017-T019) can run in parallel
  - Component integration tasks depend on composable methods
- **Phase 5**: All validation tasks marked [P] can run in parallel
- **User Stories**: US1 and US2 can be worked on in parallel after Phase 2 (if different developers)

---

## Parallel Example: User Story 1

```bash
# Launch all CSS optimization tasks together:
Task: "Optimize FloatingPanel width from 480px to 320px in src/components/FloatingPanel.vue"
Task: "Reduce FloatingPanel padding from 12px to 8px in src/components/FloatingPanel.vue"
Task: "Reduce FloatingPanel gap from 12px to 8px in src/components/FloatingPanel.vue"
Task: "Optimize stored card preview sizes from 60-90px to 48-72px in src/components/FloatingPanel.vue"
Task: "Reduce stored card padding from 6px 8px to 4px 6px in src/components/FloatingPanel.vue"
Task: "Reduce storage cards gap from 6px to 4px in src/components/FloatingPanel.vue"
```

---

## Parallel Example: User Story 2 (Type Extensions)

```bash
# Launch all type extension tasks together:
Task: "Extend DragState interface in src/composables/useDragAndDrop.ts"
Task: "Add StorageDragState interface in src/types/bento.ts"
Task: "Ensure StoredCard interface extends BentoCard in src/composables/useFloatingPanel.ts"
Task: "Add startDragFromStorage method to useFloatingPanel composable"
Task: "Add endDragFromStorage method to useFloatingPanel composable"
Task: "Add isDraggingFromStorage state to useFloatingPanel composable"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (environment check)
2. Complete Phase 3: User Story 1 (尺寸优化)
3. **STOP and VALIDATE**: Test User Story 1 independently - verify panel is more compact
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Environment ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - compact panel!)
3. Complete Phase 2: Foundational → Type extensions ready
4. Add User Story 2 → Test independently → Deploy/Demo (Full feature!)
5. Complete Phase 5: Polish → Final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together
2. Developer A: User Story 1 (尺寸优化) - can start immediately
3. Developer B: Phase 2 (Foundational) → User Story 2 (拖放功能) - sequential
4. Both stories complete independently
5. Team completes Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [US1] / [US2] labels map tasks to specific user stories for traceability
- Each user story should be independently completable and testable
- User Story 1 can be completed independently without User Story 2
- User Story 2 requires Phase 2 type extensions but is independent of User Story 1
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Visual testing is primary - no unit tests required unless explicitly requested
- Performance targets: 50ms visual feedback, <2s drag operation, 60fps animations

