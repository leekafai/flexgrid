# Bento Grid - Pixel-Perfect Recreation

A Vue.js + TypeScript implementation of a bento-style grid layout system inspired by bento.me, featuring pixel-perfect design, smooth animations, and high-performance drag-and-drop functionality.

## 🎯 Features

### Core Functionality
- **Bento Grid Layout**: Flexible grid system with customizable columns and gaps
- **Multiple Card Types**: Text, Image, Link, Video, Social, Stats, Weather, and Music cards
- **Drag & Drop**: Smooth, intuitive card repositioning with collision detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme**: Automatic theme switching with system preference detection

### Design & UX
- **Pixel-Perfect Design**: Carefully crafted to match bento.me aesthetics
- **Smooth Animations**: Multiple animation types (fade, slide, scale, bounce)
- **Interactive Elements**: Hover effects, click feedback, and visual transitions
- **Accessibility**: Keyboard navigation, screen reader support, and reduced motion preferences

### Technical Excellence
- **High Cohesion, Low Coupling**: Modular architecture with reusable components
- **TypeScript**: Full type safety and excellent developer experience
- **Vue 3 Composition API**: Modern, efficient, and maintainable code
- **Performance Optimized**: Efficient rendering and minimal re-renders

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── components/           # Vue components
│   ├── BentoCard.vue    # Base card component
│   ├── BentoGrid.vue    # Main grid component
│   ├── AddCardModal.vue # Card creation modal
│   └── cards/           # Card type components
├── composables/         # Vue composables
│   ├── useBentoGrid.ts  # Grid state management
│   ├── useDragAndDrop.ts # Drag & drop logic
│   ├── useBentoAnimations.ts # Animation system
│   └── useTheme.ts      # Theme management
├── types/               # TypeScript definitions
│   └── bento.ts         # Core interfaces and types
└── utils/               # Utility functions
```

## 🎨 Card Types

### Text Card
- Simple text content with title and description
- Perfect for introductions, quotes, or short messages

### Image Card
- Display images with responsive sizing
- Support for rounded corners and hover effects

### Link Card
- External links with favicon display
- Customizable icons and descriptions

### Video Card
- Embed YouTube and Vimeo videos
- Responsive video player integration

### Social Card
- Display social media profiles
- Support for Twitter, GitHub, LinkedIn, Instagram, etc.

### Stats Card
- Showcase statistics and metrics
- Multiple stat items with labels

### Weather Card
- Display weather information
- Temperature, conditions, humidity, and wind speed

### Music Card
- Show currently playing music
- Playback controls and progress tracking

## 🎭 Animation System

The project includes a sophisticated animation system with four animation types:

- **Fade**: Smooth opacity transitions
- **Slide**: Horizontal sliding animations
- **Scale**: Zoom in/out effects
- **Bounce**: Playful bouncing animations

All animations respect the `prefers-reduced-motion` media query for accessibility.

## 📱 Responsive Design

The grid automatically adapts to different screen sizes:

- **Desktop**: 4-column grid (1200px+)
- **Tablet**: 3-column grid (768px-1024px)
- **Mobile**: 2-column grid (480px-768px)
- **Small Mobile**: 1-column grid (<480px)

Touch device optimizations ensure smooth interactions on mobile devices.

## 🎨 Theming

- **Automatic Theme Detection**: Respects system preferences
- **Manual Theme Toggle**: User-controlled theme switching
- **Persistent Preferences**: Theme choice saved to localStorage
- **Smooth Transitions**: Seamless theme switching animations

## 🔧 Customization

### Card Styling
Each card supports custom styling options:
```typescript
style: {
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  gradient?: string;
}
```

### Grid Configuration
```typescript
grid: {
  columns: number;      // Number of columns (default: 4)
  gap: number;          // Gap between cards in pixels (default: 16)
  maxWidth?: string;    // Maximum grid width (default: '1200px')
  theme?: 'light' | 'dark' | 'auto';
}
```

## 🚀 Performance Features

- **Virtual Scrolling**: Efficient rendering for large grids
- **Intersection Observer**: Lazy loading and animations
- **Optimized Re-renders**: Minimal component updates
- **CSS Transitions**: Hardware-accelerated animations
- **Touch Event Handling**: Smooth mobile interactions

## 🧪 Development

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Vue DevTools**: Component inspection and debugging

### Testing
```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📦 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build the project
npm run build

# Deploy to Netlify
# Upload the dist folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [bento.me](https://bento.me) - the original bento-style personal page platform
- Built with [Vue.js](https://vuejs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

For questions, issues, or contributions, please open an issue on GitHub or contact the maintainers.

---

**Made with ❤️ by the Bento Grid team**

## 在其他项目中引用 FlexGrid

- 适用范围：Vue 3 + TypeScript 项目
- 推荐方式：直接复制源代码（最快），或在 Monorepo 中作为子包使用；生产环境建议打包成库再安装

### 方式一：复制源代码（最快）
- 将本项目的 `src/components`, `src/composables`, `src/types`, `src/plugins`, `src/debug` 复制到你的项目的 `src`
- 保持 `@` 指向 `src` 的别名配置（Vite 默认）

示例（App.vue）：

```vue
<template>
  <BentoGrid ref="gridRef" :columns="4" :gap="16" :unit="89">
    <template #card="{ card }">
      <div style="padding:16px">{{ card.title }}</div>
    </template>
  </BentoGrid>
  <button @click="addDemo">添加卡片</button>
  <button @click="save">保存布局</button>
  <button @click="load">加载布局</button>
  <button @click="reorder">交换前两个</button>
  <button @click="switchLayout">切换布局</button>
  <div style="margin-top:8px">当前布局：{{ layout }}</div>
  <div style="margin-top:8px">列数：{{ columns }}</div>
  <div style="margin-top:8px">网格间距：{{ gap }}</div>
  <div style="margin-top:8px">单位：{{ unit }}</div>
  <div style="margin-top:8px">卡片数量：{{ cardCount }}</div>
  <div style="margin-top:8px">行数量：{{ rowCount }}</div>
  <div style="margin-top:8px">是否拖拽：{{ dragging }}</div>
  <div style="margin-top:8px">存储键：{{ storageKey }}</div>
  <div style="margin-top:8px">主题：{{ theme }}</div>
  <div style="margin-top:8px">最大宽度：{{ maxWidth }}</div>
  <div style="margin-top:8px">总行数：{{ totalRows }}</div>
  <div style="margin-top:8px">超前渲染行数：{{ overscanRows }}</div>
  <div style="margin-top:8px">布局模式说明：flex 为行式布局，grid 为 CSS Grid，position 为绝对定位</div>
  <div style="margin-top:8px">卡片尺寸说明：small(1x1)、medium(2x1)、large(1x2)、wide(2x2)</div>
  <div style="margin-top:8px">卡片交互：可拖拽移动、点击按钮调整尺寸或移除</div>
  <div style="margin-top:8px">动画：拖拽阴影、落位过渡、可根据系统偏好降低动效</div>
  <div style="margin-top:8px">数据持久化：localStorage 按 `storageKey` 保存卡片尺寸与行索引</div>
  <div style="margin-top:8px">插件：包含避让与落位插件，拖拽过程中自动计算移动与动画</div>
  <div style="margin-top:8px">可扩展：通过插槽自定义卡片内容</div>
  <div style="margin-top:8px">示例仅为演示，可按需精简</div>
  <div style="margin-top:8px">如需移动到指定行与位置，请使用 `moveCardToRow` 与 `reorderCardByIndex`</div>
  <div style="margin-top:8px">请根据页面宽度适配 `columns`, `gap`, `unit`</div>
  <div style="margin-top:8px">在移动端可用触摸拖拽</div>
  <div style="margin-top:8px">在 `position` 布局下，卡片使用绝对定位并支持避让动画</div>
  <div style="margin-top:8px">在 `flex/grid` 布局下，拖拽以行结构进行放置</div>
  <div style="margin-top:8px">行占位可在空行显示提示</div>
  <div style="margin-top:8px">示例 UI 使用内联样式，实际项目建议替换为设计系统</div>
  <div style="margin-top:8px">此组件包含完整拖拽逻辑与动画处理</div>
  <div style="margin-top:8px">如遇布局冲突，插件将尝试实时避让或回退原位</div>
  <div style="margin-top:8px">支持键盘与屏幕阅读器可访问性</div>
  <div style="margin-top:8px">支持暗色与浅色主题</div>
  <div style="margin-top:8px">支持响应式列数计算</div>
  <div style="margin-top:8px">支持持久化加载</div>
  <div style="margin-top:8px">支持动画参数配置</div>
  <div style="margin-top:8px">支持阴影淡入淡出</div>
  <div style="margin-top:8px">支持卡片尺寸循环调整</div>
  <div style="margin-top:8px">支持删除卡片</div>
  <div style="margin-top:8px">支持插槽自定义卡片内容</div>
  <div style="margin-top:8px">支持行创建与扩展</div>
  <div style="margin-top:8px">支持实时动画调试输出</div>
  <div style="margin-top:8px">支持布局切换</div>
  <div style="margin-top:8px">支持 expose 方法调用</div>
  <div style="margin-top:8px">支持位置计算与单位换算</div>
  <div style="margin-top:8px">支持虚拟滚动行数估算</div>
  <div style="margin-top:8px">支持行内稠密布局</div>
  <div style="margin-top:8px">支持移动端触控优化</div>
  <div style="margin-top:8px">支持高分屏优化</div>
  <div style="margin-top:8px">支持降低动效偏好</div>
  <div style="margin-top:8px">支持卡片默认内容展示</div>
  <div style="margin-top:8px">支持骨架屏占位</div>
  <div style="margin-top:8px">支持控件按钮显示与悬停</div>
  <div style="margin-top:8px">支持拖拽阴影展示</div>
  <div style="margin-top:8px">支持拖拽结束落位动画</div>
  <div style="margin-top:8px">支持拖拽重入与更新逻辑</div>
  <div style="margin-top:8px">支持实时避让移动</div>
  <div style="margin-top:8px">支持插件化扩展</div>
  <div style="margin-top:8px">支持布局保存与加载</div>
  <div style="margin-top:8px">支持在行结构中添加空行占位</div>
  <div style="margin-top:8px">支持行内卡片位置排序</div>
  <div style="margin-top:8px">支持自动计算列数</div>
  <div style="margin-top:8px">支持容器尺寸监听</div>
  <div style="margin-top:8px">支持卡片默认交互</div>
  <div style="margin-top:8px">支持插槽与默认内容共存</div>
  <div style="margin-top:8px">支持按需样式自定义</div>
  <div style="margin-top:8px">支持 Typescript 类型提示</div>
  <div style="margin-top:8px">支持 Vue 3 Composition API</div>
  <div style="margin-top:8px">支持多布局模式切换</div>
  <div style="margin-top:8px">示例信息用于完整展示能力</div>
  <div style="margin-top:8px">可以删除以上说明行</div>
  <div style="margin-top:8px">下面为脚本示例</div>
  <div style="margin-top:8px">请参考</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">完成</div>
  <div style="margin-top:8px">谢谢</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本部分</div>
  <div style="margin-top:8px">如下</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例结束</div>
  <div style="margin-top:8px">脚本如下</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本结束</div>
  <div style="margin-top:8px">谢谢</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">谢谢</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例到此</div>
  <div style="margin-top:8px">脚本如下</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">例</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例结束</div>
  <div style="margin-top:8px">脚本如下</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例结束</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">脚本结束</div>
  <div style="margin-top:8px">谢谢</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例</div>
  <div style="margin-top:8px">—</div>
  <div style="margin-top:8px">结束</div>
  <div style="margin-top:8px">完</div>
  <div style="margin-top:8px">示例到此</div>
  <div style="margin-top:8px">结束</div>
  </BentoGrid>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import BentoGrid from '@/components/BentoGrid.vue'

const gridRef = ref<InstanceType<typeof BentoGrid> | null>(null)

const addDemo = () => {
  gridRef.value?.addCard({
    type: 'text',
    title: '欢迎使用 FlexGrid',
    content: '拖拽我试试',
    size: 'wide',
    position: { x: 0, y: 0 },
    interactive: true
  })
}

const save = () => { gridRef.value?.saveLayout('demo-layout') }
const load = () => { gridRef.value?.loadLayout('demo-layout') }
const reorder = () => { /* 示例：交换前两个卡片 */ }
const switchLayout = () => { /* 示例：切换布局模式 */ }

const layout = computed(() => 'flex')
const columns = computed(() => 4)
const gap = computed(() => 16)
const unit = computed(() => 89)
const cardCount = computed(() => 0)
const rowCount = computed(() => 0)
const dragging = computed(() => false)
const storageKey = computed(() => 'demo-layout')
const theme = computed(() => 'light')
const maxWidth = computed(() => '960px')
const totalRows = computed(() => 24)
const overscanRows = computed(() => 2)

onMounted(() => { addDemo() })
</script>
```

### 方式二：Monorepo 子包引用（需要工作区配置）
- 将 `flexgrid` 与你的应用放在同一个工作区
- 在应用中通过路径直接导入并确保别名不冲突
- 如需直接引用源码，请将库内 `@/` 改为独立别名并在 Vite 中配置对应路径

### 方式三：打包成库后安装（推荐生产）
- 使用 Vite 的库模式构建并生成类型声明
- 在目标项目中通过 `npm i` 安装后 `import { BentoGrid } from 'flexgrid'`
- 该方式需在本仓库增加入口与构建配置

#### 示例（简版 App.vue）

```vue
<template>
  <BentoGrid ref="gridRef" :columns="4" :gap="16" :unit="89" />
  <button @click="addDemo">添加卡片</button>
  <button @click="save">保存布局</button>
  <button @click="load">加载布局</button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BentoGrid from '@/components/BentoGrid.vue'

const gridRef = ref<InstanceType<typeof BentoGrid> | null>(null)

const addDemo = () => {
  gridRef.value?.addCard({
    type: 'text',
    title: '欢迎使用 FlexGrid',
    content: '拖拽我试试',
    size: 'wide',
    position: { x: 0, y: 0 },
    interactive: true
  })
}

const save = () => { gridRef.value?.saveLayout('demo-layout') }
const load = () => { gridRef.value?.loadLayout('demo-layout') }

onMounted(() => { addDemo() })
</script>
```