# Tasks: 优化卡片恢复动画流畅性

**Input**: Design documents from `/specs/003-restore-card-animation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification, so no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project structure verification and preparation

- [X] T001 Verify project structure matches implementation plan in `specs/003-restore-card-animation/plan.md`
- [X] T002 [P] Verify existing `placeCard` API in `src/composables/useBentoGrid.ts` supports `animateFrom` parameter
- [X] T003 [P] Verify existing `handleCardPlacedWithAnimation` function in `src/components/BentoGrid.vue` exists and can be optimized

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create Bezier curve path calculation utility in `src/utils/bezierPath.ts` with `calculateBezierPosition` function
- [X] T005 [P] Add `calculateControlPoint` function to `src/utils/bezierPath.ts` for computing control point position
- [X] T006 [P] Add `easeInOutCubic` easing function to `src/utils/bezierPath.ts` for smooth animation timing
- [X] T007 Import and integrate Bezier path utilities in `src/components/BentoGrid.vue`
- [X] T029 [P] Add `TemporaryCardState` interface to `src/specs/003-restore-card-animation/contracts/restore-animation-interfaces.ts` for temporary card state management
- [X] T030 Create temporary card state management system in `src/components/BentoGrid.vue` using Vue ref to track temporary cards during animation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 点击恢复时的自动拖拽动画效果 (Priority: P1) 🎯 MVP

**Goal**: 实现卡片从收纳列表位置平滑"被拖拽"到网格目标位置的自动拖拽动画效果，使用贝塞尔曲线路径模拟手动拖拽的自然效果。**关键要求**：卡片必须在动画完成后再正式添加到网格数据结构中，动画期间卡片保持临时视觉状态。

**Independent Test**: 点击收纳列表中的卡片，验证卡片是否从收纳列表位置平滑移动到网格位置，动画路径是否使用贝塞尔曲线，动画是否流畅自然（60fps），是否有拖拽的视觉反馈，卡片是否不会先出现在目标位置再跳回收纳列表位置。

### Implementation for User Story 1

- [X] T008 [US1] Update `handleCardPlacedWithAnimation` function in `src/components/BentoGrid.vue` to calculate Bezier curve path using `calculateBezierPosition` and `calculateControlPoint`
- [X] T009 [US1] Implement Bezier curve animation loop using `requestAnimationFrame` in `src/components/BentoGrid.vue` to update card position along curve path
- [X] T010 [US1] Add dynamic animation duration calculation based on distance (400-900ms) in `src/components/BentoGrid.vue`
- [X] T011 [US1] Implement initial drag state (scale 1.03, enhanced shadow, z-index 1000) in `src/components/BentoGrid.vue`
- [X] T012 [US1] Implement smooth transition to target position with easing function in `src/components/BentoGrid.vue`
- [X] T013 [US1] Add drop animation (compression then bounce back) when card reaches target position in `src/components/BentoGrid.vue`
- [X] T014 [US1] Implement animation cleanup (remove styles, clear state from Map) after animation completes in `src/components/BentoGrid.vue`
- [X] T015 [US1] Ensure multiple animations can run in parallel without interference in `src/components/BentoGrid.vue`
- [X] T031 [US1] Modify `placeCard` API in `src/composables/useBentoGrid.ts` to support delayed deployment: when `animateFrom` is provided, create temporary card state instead of immediately adding to `grid.value.cards`
- [X] T032 [US1] Implement temporary card element creation in `src/components/BentoGrid.vue` for animation display (card element added to DOM but not to grid data structure)
- [X] T033 [US1] Update `handleCardPlacedWithAnimation` in `src/components/BentoGrid.vue` to use temporary card element instead of searching for card in `grid.value.cards`
- [X] T034 [US1] Implement delayed card deployment in `src/components/BentoGrid.vue`: after animation completes, create formal card and add to `grid.value.cards`, then remove temporary card element

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can click cards in storage list and see smooth Bezier curve animation to grid position. Cards should not appear at target position before animation starts.

---

## Phase 4: User Story 2 - 动画过程中的视觉反馈增强 (Priority: P2)

**Goal**: 增强动画过程中的视觉反馈，包括拖拽状态、速度变化、放置效果等，让动画效果更加专业和吸引人。

**Independent Test**: 观察动画过程中的视觉效果，验证卡片是否有适当的缩放、阴影、透明度变化，动画速度是否有加速和减速过程，放置效果是否满意。

### Implementation for User Story 2

- [X] T016 [US2] Optimize drag state visual feedback (scale transition from 1.03 to 1.00) in `src/components/BentoGrid.vue`
- [X] T017 [US2] Enhance shadow transition (from large shadow to small shadow) during animation in `src/components/BentoGrid.vue`
- [X] T018 [US2] Implement velocity curve visualization through scale and shadow changes in `src/components/BentoGrid.vue`
- [X] T019 [US2] Optimize bounce effect timing and easing function for satisfying completion feedback in `src/components/BentoGrid.vue`
- [X] T020 [US2] Ensure visual feedback is consistent throughout animation duration in `src/components/BentoGrid.vue`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Animation visual feedback should be enhanced and professional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and edge case handling

- [X] T021 [P] Handle edge case: animation when target position is outside viewport in `src/components/BentoGrid.vue`
- [X] T022 [P] Handle edge case: animation during page scroll or window resize in `src/components/BentoGrid.vue`
- [X] T023 [P] Optimize animation performance to prevent frame drops (ensure 60fps) in `src/components/BentoGrid.vue`
- [X] T024 [P] Add performance monitoring for animation smoothness in `src/components/BentoGrid.vue`
- [X] T025 [P] Ensure animation cleanup prevents memory leaks in `src/components/BentoGrid.vue`
- [X] T026 [P] Handle edge case: low performance devices gracefully degrade animation quality in `src/components/BentoGrid.vue`
- [X] T027 [P] Verify multiple simultaneous animations work correctly without performance degradation in `src/components/BentoGrid.vue`
- [X] T035 [P] Ensure temporary card state cleanup when animation is cancelled or fails in `src/components/BentoGrid.vue`
- [X] T036 [P] Verify delayed deployment works correctly with multiple simultaneous animations in `src/components/BentoGrid.vue`
- [X] T037 [P] Test edge case: animation completion when card data is invalid or missing in `src/components/BentoGrid.vue`
- [X] T028 Run quickstart.md validation to ensure implementation matches quickstart guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can start after Foundational phase
  - User Story 2 (P2) can start after Foundational phase (may enhance US1 but independently testable)
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 visual feedback but independently testable

### Within Each User Story

- Core implementation before optimization
- Animation path calculation before visual feedback
- Temporary card state management before animation execution
- Animation execution before delayed deployment
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1 and 2 can start in parallel (if team capacity allows)
- All Polish tasks marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch foundational tasks together:
Task: "Create Bezier curve path calculation utility in src/utils/bezierPath.ts"
Task: "Add calculateControlPoint function to src/utils/bezierPath.ts"
Task: "Add easeInOutCubic easing function to src/utils/bezierPath.ts"
Task: "Add TemporaryCardState interface to contracts"

# After foundational tasks complete, User Story 1 tasks can proceed sequentially
# (they modify the same files and have dependencies)
```

---

## Parallel Example: User Story 2

```bash
# User Story 2 tasks can run in parallel after User Story 1 is complete
# (they enhance existing functionality in the same file)
Task: "Optimize drag state visual feedback in src/components/BentoGrid.vue"
Task: "Enhance shadow transition during animation in src/components/BentoGrid.vue"
Task: "Implement velocity curve visualization in src/components/BentoGrid.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (including delayed deployment mechanism)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Click card in storage list
   - Verify Bezier curve animation works
   - Verify animation is smooth (60fps)
   - Verify visual feedback is present
   - **Verify card does NOT appear at target position before animation starts**
   - **Verify card is formally added to grid only after animation completes**
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Enhanced visual feedback)
4. Add Polish tasks → Test edge cases → Deploy/Demo (Production ready)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core animation + delayed deployment)
   - Developer B: User Story 2 (visual feedback enhancement) - can start after US1 or in parallel
3. Stories complete and integrate independently
4. Polish tasks can be distributed across team members

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Most tasks modify `src/components/BentoGrid.vue` - be careful with parallel execution on same file
- Bezier path utility (`src/utils/bezierPath.ts`) is foundational and must be completed before user stories
- **Delayed deployment mechanism is critical**: Cards must NOT be added to grid data structure until animation completes
- Temporary card elements must be properly cleaned up to prevent memory leaks
