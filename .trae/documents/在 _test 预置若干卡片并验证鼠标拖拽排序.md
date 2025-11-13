## 目标
- 将测试入口统一为 `/test`，页面加载时预置若干可拖拽卡片，方便直接测试
- 核验鼠标拖拽移动卡片到任意位置的功能是否完善可用

## 实施步骤
1. 在 `src/pages/TestPage.vue` 的 `onMounted` 中，调用现有的 `addTextCard/addImageCard/...` 方法，预置 6–8 张卡片（含不同 size/units），全部设置 `interactive: true`
2. 明确测试页只用于组件库演示，不依赖根页面；路由暂不动，统一以 `/test` 访问
3. 保持 BentoGrid 默认 `layout='flex'`，并传入合理的 `gap/unit`（如 `gap=16, unit=40`）以匹配参考交互
4. 验证拖拽：确保卡片 `draggable` 与 `dragstart/dragend`，容器 `dragover/dragenter/drop` 都已接入，拖动时显示原位幽灵与预估阴影，松手后数组重排并保存
5. 运行本地预览在 `/test` 下检查交互，确认可以通过鼠标拖拽将卡片移动到其他位置（包括当前内容之外的区域）

## 交付
- 更新后的 `/test` 页面默认展示多张卡片，拖拽排序功能可直接验证，无需手动添加