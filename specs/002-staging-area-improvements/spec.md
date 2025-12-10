# Feature Specification: 完善暂存区功能

**Feature Branch**: `002-staging-area-improvements`  
**Created**: 2025-12-09  
**Status**: Draft  
**Input**: User description: "拖拽过去暂存区，暂存列表会短暂出现。但是当我松开鼠标之后，无法放入暂存区。请完善暂存区的功能：1.暂存图标中要有数字角标；2.完整实现暂存逻辑；3.优化拖拽暂存以及从暂存恢复到网格的功能。"

**Updated**: 2025-12-09 - 新增交互方式澄清：
- 收纳卡片通过卡片右上角的按钮进行（收纳=暂存）
- 点击浮动面板的收纳图标时，让收纳列表出现（点击展开，点击关闭）
- 支持从收纳列表中拖拽卡片回到网格中

## Clarifications

### Session 2025-12-09

- Q: 暂存区是否有容量限制？如果有，限制是多少？ → A: 有容量限制，最多可暂存 10 张卡片
- Q: 当暂存区容量已满时，用户尝试暂存新卡片，系统应如何反馈？ → A: 提供视觉提示（如暂存区图标变红/闪烁）+ 拒绝拖放，卡片返回网格原位置
- Q: 当用户同时进行多个拖放操作（例如快速连续拖动多张卡片）时，系统应如何处理？ → A: 串行处理，一次只允许一个拖放操作，新的拖放尝试被阻止直到当前操作完成
- Q: 当用户拖动网格卡片到暂存区时，应提供什么形式的视觉反馈？ → A: 组合反馈：高亮暂存区图标 + 显示提示文本 + 改变鼠标样式
- Q: 当用户拖动卡片到暂存区图标和展开列表的边界区域时，系统如何判断拖放目标？ → A: 图标和展开列表都接受拖放，任一区域都可触发暂存
- Q: 收纳列表的展开方式是什么？ → A: 点击收纳图标展开列表，再次点击收纳图标关闭列表（点击切换展开/收起状态）
- Q: 收纳卡片的方式是什么？ → A: 通过卡片右上角的收纳按钮进行收纳（收纳=暂存）
- Q: 是否支持从收纳列表拖拽卡片回到网格？ → A: 是，支持从收纳列表中拖拽卡片回到网格中

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 显示暂存卡片数量角标 (Priority: P1)

用户需要能够快速了解暂存区中有多少张卡片，无需展开暂存列表。当前暂存图标缺少数量角标，用户无法直观看到暂存状态。

**Why this priority**: 这是基础的信息展示功能，帮助用户快速了解暂存状态，提升用户体验。数量角标是暂存区功能完整性的重要组成部分。

**Independent Test**: 可以通过添加卡片到暂存区来验证角标是否正确显示数量。用户可以独立验证角标数字与暂存卡片数量一致，并且当暂存区为空时角标隐藏。

**Acceptance Scenarios**:

1. **Given** 暂存区中有卡片, **When** 用户查看暂存图标, **Then** 图标右上角显示红色数字角标，显示当前暂存卡片数量
2. **Given** 暂存区为空, **When** 用户查看暂存图标, **Then** 图标上不显示角标
3. **Given** 暂存区中有卡片, **When** 用户添加新卡片到暂存区, **Then** 角标数字立即更新，反映新的卡片数量
4. **Given** 暂存区中有卡片, **When** 用户从暂存区移除卡片, **Then** 角标数字立即更新，当数量为0时角标隐藏

---

### User Story 2 - 实现从网格拖拽到暂存区的完整功能 (Priority: P1)

用户需要能够将网格中的卡片直接拖拽到暂存区进行暂存。当前拖拽到暂存区时列表会短暂出现，但松开鼠标后无法成功放入暂存区，功能不完整。

**Why this priority**: 这是核心的暂存功能，是用户管理网格卡片的主要方式之一。当前功能不完整导致用户无法正常使用暂存功能，严重影响用户体验。

**Independent Test**: 可以通过从网格拖动卡片到暂存区来验证拖放功能是否完整。用户可以独立完成从网格拖动卡片到暂存区的完整流程，验证卡片成功从网格移除并添加到暂存区。

**Acceptance Scenarios**:

1. **Given** 网格中有可拖动的卡片, **When** 用户开始拖动卡片, **Then** 卡片跟随鼠标移动，显示拖放预览
2. **Given** 用户正在拖动网格中的卡片, **When** 鼠标移动到暂存区图标上方, **Then** 暂存列表自动展开，显示当前暂存卡片，并提供视觉反馈表明可以放置
3. **Given** 用户拖动卡片到暂存区图标或展开的暂存列表区域, **When** 用户释放鼠标, **Then** 卡片从网格中移除并成功添加到暂存区，角标数字更新
4. **Given** 用户拖动卡片到暂存区, **When** 卡片成功暂存, **Then** 网格布局自动调整，其他卡片填补空位（如适用）
5. **Given** 用户拖动卡片到暂存区外, **When** 用户释放鼠标, **Then** 卡片返回到网格原始位置，不进行暂存操作

---

### User Story 3 - 优化从暂存区恢复到网格的拖拽功能 (Priority: P2)

用户需要能够流畅地将暂存区的卡片拖拽回网格。当前从暂存区拖拽到网格的功能已存在，但需要优化拖放体验，包括视觉反馈、放置精度和错误处理。

**Why this priority**: 虽然基础功能已存在，但优化拖放体验可以提升用户操作效率和满意度，使暂存区功能更加完善和易用。

**Independent Test**: 可以通过从暂存区拖动卡片到网格来验证拖放体验是否优化。用户可以独立验证拖放过程流畅，视觉反馈清晰，放置位置准确。

**Acceptance Scenarios**:

1. **Given** 暂存区中有卡片, **When** 用户开始拖动暂存卡片, **Then** 卡片立即跟随鼠标，显示清晰的拖放预览，被拖动的卡片在暂存列表中显示半透明状态
2. **Given** 用户正在拖动暂存卡片, **When** 鼠标移动到网格上方, **Then** 网格显示精确的放置预览，指示卡片将被放置的确切位置
3. **Given** 用户拖动暂存卡片到网格的有效位置, **When** 用户释放鼠标, **Then** 卡片从暂存区移除并成功放置到网格指定位置，角标数字更新
4. **Given** 用户拖动暂存卡片到网格的冲突位置, **When** 用户释放鼠标, **Then** 系统自动避让到最近的可用位置，或拒绝放置并返回暂存区
5. **Given** 用户拖动暂存卡片到网格外, **When** 用户释放鼠标, **Then** 卡片返回到暂存区，不进行任何操作

---

### Edge Cases

- 当用户快速拖动卡片到暂存区时，系统是否能正确识别拖放目标并成功暂存？
- 当暂存区已展开时，用户拖动网格卡片到暂存区，系统是否能正确识别拖放区域？
- 当用户拖动卡片到暂存区图标和展开列表的边界区域时，系统应接受任一区域作为有效的拖放目标，图标和展开列表都接受拖放操作
- 当网格卡片被拖动到暂存区时，如果卡片尺寸较大，系统是否能正确处理？
- 当用户尝试同时进行多个拖放操作时，系统必须串行处理，一次只允许一个拖放操作，新的拖放尝试被阻止直到当前操作完成
- 当暂存区达到最大容量限制（10张卡片）时，系统必须拒绝新的暂存请求，提供视觉反馈（如暂存区图标变红/闪烁），并将卡片返回网格原位置
- 当用户拖动暂存卡片到网格时，如果网格已满，系统如何提示用户？
- 当用户拖动卡片过程中网络中断或页面刷新，系统如何保持数据一致性？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a numeric badge on the storage icon showing the count of stored cards
- **FR-002**: System MUST hide the badge when storage area is empty
- **FR-003**: System MUST update the badge count immediately when cards are added to or removed from storage
- **FR-004**: System MUST allow users to drag cards from grid to storage area icon or expanded storage list, with both areas accepting drop operations
- **FR-004a**: System MUST allow users to store cards by clicking the store button in the top right corner of cards (store = stage)
- **FR-005**: System MUST expand storage list when user clicks the storage icon (toggle expand/collapse on click)
- **FR-005a**: System MUST automatically expand storage list when user drags grid card over storage icon (for drag-and-drop convenience)
- **FR-006**: System MUST provide visual feedback when dragging card over storage area, including: highlighting storage icon (background/border change), displaying hint text (e.g., "释放以暂存"), and changing cursor style to indicate drop capability
- **FR-007**: System MUST successfully store card in storage area when user drops grid card onto storage area
- **FR-008**: System MUST remove card from grid after successful drop onto storage area
- **FR-009**: System MUST update storage badge count after card is stored
- **FR-010**: System MUST handle drop outside storage area by returning card to original grid position
- **FR-011**: System MUST optimize drag-and-drop experience from storage area to grid with smooth visual feedback
- **FR-012**: System MUST show precise drop preview on grid when dragging card from storage area
- **FR-013**: System MUST handle position conflicts when dropping storage card onto grid by attempting automatic avoidance or rejecting drop
- **FR-014**: System MUST return storage card to storage area if drop onto grid fails or is cancelled
- **FR-015**: System MUST maintain existing click-to-restore functionality as alternative to drag-and-drop
- **FR-016**: System MUST provide clear visual indication of dragged card state (e.g., semi-transparent in storage list)
- **FR-017**: System MUST enforce maximum capacity limit of 10 cards in storage area
- **FR-018**: System MUST reject drop operation when storage area is at capacity (10 cards) and user attempts to store additional card, returning card to original grid position
- **FR-019**: System MUST provide visual feedback (e.g., storage icon turns red/flashes) when storage area is at capacity and user attempts to drop a card
- **FR-020**: System MUST process drag-and-drop operations serially, allowing only one operation at a time and blocking new drag attempts until current operation completes

### Key Entities *(include if feature involves data)*

- **StoredCard**: Represents a card temporarily stored in storage area, contains card data and storage timestamp
- **StorageBadge**: Visual indicator showing count of stored cards, displayed on storage icon
- **DragState**: Tracks current drag operation state, including dragged card, source (grid or storage), drop target, and visual feedback
- **StorageArea**: UI component that displays storage icon, badge, and expandable list of stored cards

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Storage badge displays correct count matching stored cards 100% of the time, updating within 100ms of storage changes
- **SC-002**: Users can successfully drag and drop cards from grid to storage area in under 2 seconds per operation, with 95% success rate
- **SC-003**: Storage list automatically expands when dragging grid card over storage icon, with expansion animation completing within 200ms
- **SC-004**: Visual feedback during drag operation appears within 50ms of entering storage area
- **SC-005**: 95% of drag-and-drop operations from storage area to grid complete successfully without errors
- **SC-006**: Drop preview on grid appears within 50ms and accurately reflects final card position
- **SC-007**: Users report improved satisfaction with storage area functionality in usability testing, with task completion rate above 90%

## Assumptions

- Storage area has a maximum capacity limit of 10 cards
- All grid cards can be stored in storage area regardless of size or type (subject to capacity limit)
- Storage area state persists during user session (no requirement for cross-session persistence specified)
- Drag-and-drop operations use standard mouse/touch events, no special input devices required
- Grid layout automatically adjusts when cards are removed for storage (existing behavior)

## Dependencies

- Existing drag-and-drop infrastructure in `useDragAndDrop` composable
- Existing storage management in `useFloatingPanel` composable
- Existing grid layout system in `BentoGrid` component
- Existing card data model and position management
