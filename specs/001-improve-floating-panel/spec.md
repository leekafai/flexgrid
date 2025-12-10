# Feature Specification: 改进 FloatingPanel

**Feature Branch**: `001-improve-floating-panel`  
**Created**: 2025-12-09  
**Status**: Draft  
**Input**: User description: "本项目是一个方便其他项目使用的自由网格系统。使用flex作为布局。现阶段我们已经实现了网格中卡片的自由移动。接下来新需求：我们要改进FloatingPanel的使用。当前FloatingPanel存在的问题是：尺寸太大，不精致；卡片暂存存在问题，例如暂存卡片无法拖动放回网格中。"

## Clarifications

### Session 2025-12-09

- Q: 当用户拖动暂存卡片到网格中，但目标位置已被其他卡片占用时，系统应如何处理？ → A: 自动避让到最近的可用位置，如果无法避让则拒绝放置并返回暂存区域
- Q: 当 FloatingPanel 处于折叠状态时，用户是否仍然可以拖动暂存卡片？ → A: 折叠状态下禁用拖放，用户必须展开面板才能拖动卡片
- Q: 当用户正在拖动暂存卡片时，如果点击 FloatingPanel 中的其他按钮，系统应如何处理？ → A: 取消当前拖放操作，执行点击的操作（卡片返回暂存区域）
- Q: 除了宽度，是否还需要优化其他尺寸指标？ → A: 全面优化所有尺寸指标（宽度、高度、内边距、间距、卡片尺寸）
- Q: 当暂存区域有多个卡片时，拖动其中一个卡片，其他卡片的显示和交互应如何变化？ → A: 其他卡片保持可见和可操作（可点击恢复、可删除），被拖动的卡片显示拖放预览

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 优化 FloatingPanel 尺寸和外观 (Priority: P1)

用户希望 FloatingPanel 占用更少的屏幕空间，同时保持精致美观的外观。当前面板尺寸过大，影响用户对网格内容的查看和操作。

**Why this priority**: 这是基础的用户体验改进，直接影响用户对产品的第一印象和使用感受。更紧凑精致的面板设计可以提升整体界面的专业性和可用性。

**Independent Test**: 可以通过视觉检查和尺寸测量来验证面板尺寸是否减小，外观是否更加精致。用户可以独立验证面板不再占用过多屏幕空间，同时保持所有功能的可用性。

**Acceptance Scenarios**:

1. **Given** 用户打开包含 FloatingPanel 的页面, **When** 查看 FloatingPanel 的外观, **Then** 面板尺寸明显减小，视觉上更加精致紧凑
2. **Given** FloatingPanel 显示在屏幕上, **When** 用户查看网格内容, **Then** 面板不会过度遮挡网格内容，用户可以正常查看和操作网格
3. **Given** FloatingPanel 处于展开状态, **When** 用户查看面板内部元素, **Then** 所有功能按钮和暂存卡片仍然清晰可见且易于操作

---

### User Story 2 - 实现暂存卡片的拖放功能 (Priority: P1)

用户需要能够从 FloatingPanel 的暂存区域拖动卡片，并将其放回网格中的任意位置。当前暂存卡片只能通过点击恢复，无法自由拖动放置。

**Why this priority**: 这是核心功能改进，与网格系统的拖放交互保持一致，提供更直观和灵活的操作方式。用户期望暂存卡片能够像网格中的卡片一样被拖动。

**Independent Test**: 可以通过拖放操作来验证暂存卡片是否可以被拖动，以及是否能够成功放置到网格中。用户可以独立完成从暂存区域拖动卡片到网格的完整流程。

**Acceptance Scenarios**:

1. **Given** FloatingPanel 暂存区域中有卡片, **When** 用户开始拖动暂存卡片, **Then** 卡片跟随鼠标移动，显示拖放预览效果
2. **Given** 用户正在拖动暂存卡片, **When** 鼠标移动到网格上方, **Then** 网格显示放置预览，指示卡片将被放置的位置
3. **Given** 用户拖动暂存卡片到网格的某个位置, **When** 用户释放鼠标, **Then** 卡片从暂存区域移除并成功放置到网格的指定位置
4. **Given** 用户拖动暂存卡片到网格外或无效区域, **When** 用户释放鼠标, **Then** 卡片返回到暂存区域，不进行任何操作

---

### Edge Cases

- 当暂存区域有多个卡片时，拖动其中一个卡片时，其他卡片保持可见和可操作（可点击恢复、可删除），被拖动的卡片显示拖放预览效果
- 当用户快速拖动暂存卡片时，系统是否能正确响应并显示流畅的拖放动画？
- 当网格已满或目标位置存在冲突时，系统首先尝试自动避让到最近的可用位置；如果无法避让（例如网格已满），则拒绝放置并将卡片返回暂存区域
- 当用户在拖动暂存卡片的过程中点击其他按钮（添加卡片、删除、折叠等）时，系统取消当前拖放操作，卡片返回暂存区域，并执行点击的操作
- 当 FloatingPanel 处于折叠状态时，拖放功能被禁用，用户必须展开面板才能拖动暂存卡片
- 当屏幕尺寸较小时，优化后的面板尺寸是否仍然合适？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reduce FloatingPanel's overall dimensions (width, height, padding, spacing, card preview sizes) while maintaining all functionality
- **FR-002**: System MUST improve FloatingPanel's visual design to be more refined and compact across all dimensional aspects
- **FR-003**: System MUST allow users to drag cards from FloatingPanel's storage area when panel is expanded (dragging disabled when panel is collapsed)
- **FR-004**: System MUST enable users to drop stored cards onto the grid at any valid position
- **FR-005**: System MUST provide visual feedback during drag operation from storage area
- **FR-011**: System MUST cancel ongoing drag operation and return card to storage area when user clicks other buttons in FloatingPanel during drag
- **FR-012**: System MUST keep other stored cards visible and fully interactive (clickable to restore, deletable) while one card is being dragged
- **FR-006**: System MUST show drop preview on the grid when dragging stored cards over it
- **FR-007**: System MUST remove cards from storage area after successful drop onto grid
- **FR-008**: System MUST handle invalid drop scenarios (outside grid, conflicting positions) gracefully by attempting automatic avoidance to nearest valid position, and if avoidance fails, rejecting the drop and returning card to storage area
- **FR-009**: System MUST maintain existing click-to-restore functionality as an alternative to drag-and-drop
- **FR-010**: System MUST ensure optimized panel size works across different screen sizes

### Key Entities *(include if feature involves data)*

- **StoredCard**: Represents a card temporarily stored in FloatingPanel, contains card data and storage timestamp
- **DragState**: Tracks the current drag operation state, including dragged card, drop target, and visual feedback
- **FloatingPanel**: UI component that displays stored cards and provides card management interface

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: FloatingPanel's width is reduced by at least 30% compared to current implementation, with proportional optimization of height, padding, spacing, and card preview sizes, while maintaining usability
- **SC-002**: Users can successfully drag and drop stored cards from FloatingPanel to grid in under 2 seconds per operation
- **SC-003**: 95% of drag-and-drop operations from storage area complete successfully without errors
- **SC-004**: Visual feedback during drag operation appears within 50ms of drag start
- **SC-005**: Panel maintains all existing functionality (add cards, remove stored cards, collapse/expand) after optimization
- **SC-006**: Users report improved satisfaction with panel appearance and interaction in usability testing
