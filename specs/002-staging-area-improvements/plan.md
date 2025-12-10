# Implementation Plan: 完善暂存区功能

**Branch**: `002-staging-area-improvements` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-staging-area-improvements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

完善暂存区功能，包括：1) 在暂存图标上显示数字角标；2) 完整实现从网格拖拽到暂存区的功能；3) 优化从暂存区恢复到网格的拖拽体验。主要技术改进包括：添加容量限制（10张卡片）、实现完整的拖放处理逻辑、优化视觉反馈机制。

## Technical Context

**Language/Version**: TypeScript 5.3.3, Vue 3.4.15  
**Primary Dependencies**: Vue 3 Composition API, Vite 5.0.12, Tailwind CSS 3.4.1  
**Storage**: 内存存储（会话级别），使用 Vue ref 管理状态  
**Testing**: Vitest 2.0.5, @vue/test-utils 2.4.6  
**Target Platform**: Web 浏览器（现代浏览器，支持 ES2020+）  
**Project Type**: Web 应用（单页应用，Vue 3 SPA）  
**Performance Goals**: 拖放操作响应时间 < 50ms，角标更新 < 100ms，视觉反馈 < 50ms  
**Constraints**: 暂存区容量限制 10 张卡片，串行处理拖放操作，支持触摸设备  
**Scale/Scope**: 单用户会话，暂存区最多 10 张卡片，网格卡片数量无限制

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 代码优先 (Code First)
✅ **通过**: 基于现有代码库实现，无需额外研究

### 模块化设计 (Modular Design)
✅ **通过**: 
- 单一职责：`useFloatingPanel` 管理暂存状态，`FloatingPanel.vue` 负责 UI 展示
- 低耦合：通过 composable 接口交互，不直接访问内部状态
- 接口清晰：使用 TypeScript 接口定义 composable 返回值
- 可复用性：拖放逻辑在 `useDragAndDrop` 中复用

### 架构性能 (Architecture Performance)
✅ **通过**:
- 使用 Vue computed 响应式更新角标，避免不必要的重新计算
- 串行处理拖放操作，避免并发冲突
- 视觉反馈使用 CSS 过渡，性能开销小

### 代码质量 (Code Quality)
✅ **通过**:
- 遵循现有代码风格（Vue 3 Composition API）
- 使用 TypeScript 确保类型安全
- 函数职责单一，易于测试

### 工具使用 (Tool Usage)
✅ **通过**: 使用现有工具和模式，不引入新工具

**Gate Status**: ✅ **PASSED** - 所有宪法原则符合要求

## Project Structure

### Documentation (this feature)

```text
specs/002-staging-area-improvements/
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
│   └── FloatingPanel.vue          # 暂存区 UI 组件（需修改）
├── composables/
│   ├── useFloatingPanel.ts        # 暂存区状态管理（需修改）
│   └── useDragAndDrop.ts          # 拖放逻辑（需修改）
└── types/
    └── bento.ts                    # 类型定义（需扩展）

tests/
└── [待添加暂存区相关测试]
```

**Structure Decision**: 使用现有的 Vue 3 单页应用结构，在现有组件和 composable 基础上扩展功能，不创建新的模块结构。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

无违反项。
