# Implementation Plan: 优化卡片恢复动画流畅性

**Branch**: `003-restore-card-animation` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-restore-card-animation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

优化卡片从收纳列表恢复到网格的动画流畅性，实现自动拖拽效果。当用户点击收纳列表中的卡片时，卡片应该从收纳列表位置平滑地"被拖拽"到网格目标位置，使用贝塞尔曲线路径模拟手动拖拽的自然效果。**关键改进**：卡片必须在动画完成后再正式添加到网格数据结构中，动画期间卡片保持临时视觉状态，避免卡片先出现在目标位置再跳回收纳列表位置的闪烁问题。主要技术改进包括：实现贝塞尔曲线路径动画、增强拖拽状态视觉反馈、优化动画性能以保持60fps、支持多个并行动画、延迟卡片部署到动画完成后。

## Technical Context

**Language/Version**: TypeScript 5.3.3, Vue 3.4.15  
**Primary Dependencies**: Vue 3 Composition API, Vite 5.0.12, Tailwind CSS 3.4.1  
**Storage**: 内存存储（会话级别），使用 Vue ref 管理动画状态和临时卡片状态  
**Testing**: Vitest 2.0.5, @vue/test-utils 2.4.6  
**Target Platform**: Web 浏览器（现代浏览器，支持 ES2020+，CSS transforms 和 animations）  
**Project Type**: Web 应用（单页应用，Vue 3 SPA）  
**Performance Goals**: 动画流畅度 60fps 或更高，动画时长 400-900ms（根据距离），回弹效果 140ms  
**Constraints**: 支持多个并行动画，动画自动完成不支持取消，目标位置由 bentoGrid API 分配，卡片部署必须延迟到动画完成后  
**Scale/Scope**: 单用户会话，支持多个同时进行的恢复动画，动画性能优化以支持流畅体验

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 代码优先 (Code First)
✅ **通过**: 基于现有代码库实现，已有 `placeCard` API 和 `handleCardPlacedWithAnimation` 基础实现，需要优化动画路径和视觉反馈，并实现延迟部署机制

### 模块化设计 (Modular Design)
✅ **通过**: 
- 单一职责：动画逻辑在 `BentoGrid.vue` 中处理，路径计算可提取为独立函数，临时卡片状态管理独立
- 低耦合：通过事件系统（CustomEvent）通信，不直接访问内部状态
- 接口清晰：使用 TypeScript 类型定义动画参数和状态
- 可复用性：贝塞尔曲线路径计算可提取为通用工具函数

### 架构性能 (Architecture Performance)
✅ **通过**:
- 使用 CSS transforms 和 requestAnimationFrame 优化动画性能
- 动画状态管理使用 Vue ref，响应式更新高效
- 支持多个并行动画，使用独立的动画状态管理
- 使用 willChange 提示浏览器优化动画渲染
- 延迟部署机制避免不必要的 DOM 操作和布局计算

### 代码质量 (Code Quality)
✅ **通过**:
- 遵循现有代码风格（Vue 3 Composition API）
- 使用 TypeScript 确保类型安全
- 动画逻辑清晰，易于维护和测试
- 性能优化代码有明确注释

### 工具使用 (Tool Usage)
✅ **通过**: 使用现有工具和模式，不引入新工具

**Gate Status**: ✅ **PASSED** - 所有宪法原则符合要求

### Post-Design Check (After Phase 1)

**Gate Status**: ✅ **PASSED** - 设计符合所有宪法原则

- ✅ **模块化设计**: 贝塞尔曲线路径计算提取为独立工具函数 (`bezierPath.ts`)，动画逻辑在组件中清晰分离，临时卡片状态管理独立
- ✅ **架构性能**: 使用 CSS transforms 和 requestAnimationFrame 优化性能，支持 GPU 加速，延迟部署减少不必要的 DOM 操作
- ✅ **代码质量**: TypeScript 接口定义清晰，函数职责单一，易于测试和维护
- ✅ **工具使用**: 使用现有工具和模式，不引入新依赖

## Project Structure

### Documentation (this feature)

```text
specs/003-restore-card-animation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── BentoGrid.vue              # 网格组件（需优化动画逻辑和延迟部署机制）
├── composables/
│   ├── useBentoGrid.ts            # 网格状态管理（需修改 placeCard API 支持延迟部署）
│   └── useBentoAnimations.ts      # 动画系统（可能需要扩展）
├── utils/
│   └── bezierPath.ts              # 贝塞尔曲线路径计算工具（已创建）
└── types/
    └── bento.ts                    # 类型定义（可能需要扩展动画相关类型）
```

**Structure Decision**: 单项目结构，Web 应用。动画逻辑主要在 `BentoGrid.vue` 组件中，贝塞尔曲线路径计算提取为独立工具函数以提高可复用性。临时卡片状态管理在动画期间独立于网格数据结构。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
