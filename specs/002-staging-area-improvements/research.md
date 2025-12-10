# Research: 完善暂存区功能

**Feature**: 完善暂存区功能  
**Date**: 2025-12-09  
**Status**: Complete

## Research Tasks

### 1. 现有代码库分析

**Task**: 分析现有暂存区实现和拖放系统

**Findings**:
- `FloatingPanel.vue` 已实现基础 UI，包含暂存图标和展开列表
- `useFloatingPanel.ts` 提供暂存状态管理，包括 `addToStorage`、`removeFromStorage` 等方法
- `useDragAndDrop.ts` 提供拖放基础设施，支持 `'grid' | 'storage'` 两种拖放源
- 角标已部分实现（第20行），但可能存在问题
- 从网格到暂存区的拖放处理不完整（松开鼠标后无法放入）

**Decision**: 基于现有代码扩展，不重构

**Rationale**: 现有架构合理，只需修复和完善功能

**Alternatives considered**: 
- 重构整个拖放系统 - 被拒绝，因为现有系统工作良好，只需修复特定问题

### 2. 容量限制实现方案

**Task**: 研究如何在 Vue 3 中实现容量限制和反馈机制

**Findings**:
- Vue 3 computed 可以实时计算容量状态
- 使用 CSS 类绑定实现视觉反馈（图标变红/闪烁）
- 在 `addToStorage` 方法中添加容量检查

**Decision**: 在 `useFloatingPanel.ts` 的 `addToStorage` 方法中添加容量检查，返回成功/失败状态

**Rationale**: 简单直接，符合现有代码模式

**Alternatives considered**:
- 使用状态机管理容量状态 - 被拒绝，过度设计
- 在组件层检查容量 - 被拒绝，违反单一职责原则

### 3. 拖放目标区域检测

**Task**: 研究如何检测拖放目标（图标 vs 展开列表）

**Findings**:
- HTML5 Drag and Drop API 的 `dragover` 和 `drop` 事件可以检测目标元素
- Vue 事件处理可以绑定到多个元素
- 使用事件委托或分别处理两个区域的拖放事件

**Decision**: 在 `FloatingPanel.vue` 中为图标和展开列表分别添加拖放事件处理，两者都接受拖放

**Rationale**: 符合规范要求（图标和展开列表都接受拖放），实现简单

**Alternatives considered**:
- 仅图标接受拖放 - 被拒绝，不符合规范
- 使用单一事件处理函数 - 被拒绝，需要区分目标区域

### 4. 视觉反馈实现方案

**Task**: 研究如何实现组合视觉反馈（高亮 + 提示文本 + 鼠标样式）

**Findings**:
- CSS 类绑定可以实现高亮效果
- Vue 条件渲染可以显示提示文本
- CSS `cursor` 属性可以改变鼠标样式
- 使用 Vue 响应式状态跟踪拖放悬停状态

**Decision**: 
- 使用 `:class` 绑定实现图标高亮
- 使用 `v-if` 显示提示文本
- 使用 CSS `cursor: move` 或自定义光标
- 添加 `isDragOverStorage` 响应式状态

**Rationale**: 符合 Vue 3 最佳实践，性能良好

**Alternatives considered**:
- 使用第三方拖放库 - 被拒绝，现有系统已足够
- 使用 Canvas 绘制反馈 - 被拒绝，过度复杂

### 5. 串行拖放处理

**Task**: 研究如何实现串行拖放处理（一次只允许一个操作）

**Findings**:
- 使用布尔标志 `isDragging` 跟踪拖放状态
- 在开始新拖放时检查标志，如果已有拖放则阻止
- Vue 3 ref 可以跨组件共享状态

**Decision**: 在 `useDragAndDrop.ts` 中使用现有的 `isDragging` 状态，在开始新拖放时检查并阻止

**Rationale**: 利用现有状态管理，最小化代码更改

**Alternatives considered**:
- 使用队列系统 - 被拒绝，过度设计
- 使用 Promise 链 - 被拒绝，增加复杂度

## Summary

所有研究任务已完成，技术方案已确定。主要决策：
1. 基于现有代码扩展，不重构
2. 在 composable 层实现容量限制
3. 图标和展开列表都接受拖放
4. 使用 Vue 响应式和 CSS 实现视觉反馈
5. 利用现有拖放状态实现串行处理

无需外部库或新技术，所有功能都可以使用现有技术栈实现。
