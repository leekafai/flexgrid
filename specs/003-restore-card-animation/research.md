# Research: 优化卡片恢复动画流畅性

**Feature**: 003-restore-card-animation  
**Date**: 2025-12-09  
**Purpose**: 研究贝塞尔曲线路径动画实现和性能优化方案

## Research Areas

### 1. 贝塞尔曲线路径动画实现

**Decision**: 使用二次贝塞尔曲线（Quadratic Bezier Curve）实现平滑路径动画

**Rationale**:
- 二次贝塞尔曲线提供平滑自然的曲线，适合模拟手动拖拽效果
- 计算复杂度低（O(1)），性能开销小
- 易于控制曲线形状，可以通过控制点调整路径弯曲程度
- 浏览器原生支持贝塞尔曲线计算，无需额外库

**Alternatives considered**:
- **三次贝塞尔曲线（Cubic Bezier）**: 提供更多控制点，但计算复杂度更高，对于简单路径过度设计
- **直线路径**: 实现简单但视觉效果不够自然，不符合"模拟手动拖拽"的需求
- **分段路径（先水平后垂直）**: 实现简单但路径不自然，不符合平滑曲线的要求

**Implementation approach**:
- 使用二次贝塞尔曲线公式：`B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂`
- 起点 P₀：收纳列表卡片中心位置
- 控制点 P₁：根据起点和终点动态计算，偏向起点方向以模拟拖拽起始时的加速
- 终点 P₂：网格卡片中心位置
- 使用缓动函数 `cubic-bezier(.2,.8,.2,1)` 控制速度曲线

### 2. 动画性能优化策略

**Decision**: 使用 CSS transforms 和 requestAnimationFrame 优化动画性能

**Rationale**:
- CSS transforms 使用 GPU 加速，性能优于 left/top 属性
- requestAnimationFrame 确保动画与浏览器重绘同步，避免掉帧
- willChange 提示浏览器优化渲染，提前分配 GPU 资源
- 避免在动画过程中触发 layout 和 paint，只触发 composite

**Alternatives considered**:
- **使用 left/top 属性**: 会触发 layout，性能较差
- **使用 Web Animations API**: 功能强大但浏览器支持度略低，复杂度较高
- **使用第三方动画库（如 GSAP）**: 功能丰富但增加依赖，不符合项目轻量化原则

**Implementation approach**:
- 使用 `transform: translate3d()` 进行位置动画（GPU 加速）
- 使用 `transform: scale()` 进行缩放动画
- 使用 `box-shadow` 进行阴影动画（注意性能影响）
- 使用 `requestAnimationFrame` 确保动画同步
- 设置 `willChange: 'transform, box-shadow, opacity'` 提示浏览器优化

### 3. 多个并行动画管理

**Decision**: 每个动画使用独立的动画状态管理，通过 Map 数据结构跟踪多个动画

**Rationale**:
- Map 数据结构提供 O(1) 的查找和更新性能
- 每个动画有独立的 cardId，可以独立管理生命周期
- 使用 `animSuppressMove` Set 防止动画过程中的位置更新冲突
- 动画完成后自动清理状态，避免内存泄漏

**Alternatives considered**:
- **队列管理**: 按顺序执行动画，但不符合"多个动画并行"的需求
- **全局动画锁**: 阻止新动画直到当前完成，但不符合用户体验要求
- **动画池管理**: 过度设计，对于卡片恢复场景不需要

**Implementation approach**:
- 使用 `Map<string, AnimationState>` 管理多个动画状态
- 每个动画使用唯一的 cardId 作为 key
- 动画完成后从 Map 中移除，清理相关状态
- 使用 `animSuppressMove` Set 防止动画过程中的位置更新

### 4. 视觉反馈优化

**Decision**: 使用拖拽状态反馈（缩放、阴影、层级）提供清晰的视觉指示

**Rationale**:
- 缩放效果（1.03 → 1.00）提供"拾起"的视觉反馈
- 阴影变化（大阴影 → 小阴影）模拟高度变化
- 提高 z-index 确保动画卡片在最上层
- 不使用轨迹线或运动模糊，保持界面简洁

**Alternatives considered**:
- **运动轨迹线**: 视觉干扰较大，不符合简洁设计原则
- **运动模糊效果**: 实现复杂，性能开销大，浏览器支持度不一致
- **透明度变化**: 可能影响卡片内容可读性

**Implementation approach**:
- 初始状态：`scale(1.03)`, `box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18)`, `z-index: 1000`
- 移动过程：平滑过渡到 `scale(1.00)`, `box-shadow: 0 8px 28px rgba(15, 23, 42, 0.04)`
- 放置效果：先压缩到 `scale(0.98)`，然后回弹到 `scale(1.00)`

### 5. 动画时长和速度曲线

**Decision**: 根据距离动态计算动画时长（400-900ms），使用缓动函数模拟物理运动

**Rationale**:
- 距离越远，动画时长越长，符合用户直觉
- 400-900ms 范围确保动画既不会太快错过，也不会太慢感觉迟钝
- `cubic-bezier(.2,.8,.2,1)` 提供加速和减速效果，模拟物理运动
- 回弹效果使用弹性缓动函数 `cubic-bezier(0.34, 1.56, 0.64, 1)`

**Alternatives considered**:
- **固定时长**: 不符合不同距离的动画需求
- **线性速度**: 视觉效果不够自然
- **纯缓入缓出**: 缺少加速阶段，不够生动

**Implementation approach**:
- 计算起点到终点的距离：`distance = Math.hypot(dx, dy)`
- 根据距离计算时长：`duration = Math.max(400, Math.min(900, Math.round((distance / 1000) * 1000)))`
- 使用 `cubic-bezier(.2,.8,.2,1)` 作为主要缓动函数
- 回弹效果使用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性缓动

## Summary

所有研究领域已确定实现方案：
1. ✅ 贝塞尔曲线路径：使用二次贝塞尔曲线
2. ✅ 性能优化：CSS transforms + requestAnimationFrame
3. ✅ 多动画管理：Map 数据结构独立管理
4. ✅ 视觉反馈：拖拽状态（缩放、阴影、层级）
5. ✅ 动画时长：根据距离动态计算（400-900ms）

所有决策基于现有代码库架构和性能要求，无需引入新的依赖或工具。


