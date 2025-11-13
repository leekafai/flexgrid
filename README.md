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