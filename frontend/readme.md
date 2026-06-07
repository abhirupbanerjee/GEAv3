# Grenada EA Portal - Frontend

Next.js 14 application for the Government of Grenada Enterprise Architecture Portal.

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser at http://localhost:3000
```

### Build for Production

```bash
# Build static export
npm run build

# Output will be in /out directory
```

## Project Structure

```
frontend/
├── public/
│   └── images/              # Static images (add your images here)
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   ├── globals.css      # Global styles
│   │   └── about/
│   │       └── page.tsx     # About page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx   # Navigation
│   │   │   └── Footer.tsx   # Footer
│   │   ├── home/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── StrategyCard.tsx
│   │   │   ├── VisionStrategy.tsx
│   │   │   └── NewsUpdates.tsx
│   │   └── ChatBot.tsx      # AI Assistant
│   └── config/
│       ├── env.ts           # Environment config
│       ├── content.ts       # Static content
│       └── navigation.ts    # Navigation items
├── Dockerfile               # Multi-stage build
├── nginx.conf              # Web server config
└── package.json
```

## Key Features

- ✅ Next.js 14 with TypeScript
- ✅ Tailwind CSS for styling
- ✅ Static Site Generation (SSG)
- ✅ Responsive design
- ✅ AI Chatbot integration with session persistence
- ✅ Build-time configuration injection

## Configuration

Configuration is injected at **build time** via Docker build arguments. See `Dockerfile` for details.

### Local Development

For local development, update `src/config/env.ts` with your test URLs.

### Production Build

Configuration is generated during Docker build from `.env.dev` file.

## Adding Images

Place your images in `public/images/`:

1. **grenada-coastal.png** - Hero image (1920x500px recommended)
2. **digital-strategy.jpg** - Vision section (800x600px recommended)

## Pages

### Home Page (`/`)
- Hero section with coastal Grenada image
- Strategic Focus Areas (3 cards)
- Vision & Strategy section
- EA News Updates (3 cards)

### About Page (`/about`)
- Information about DTA
- GEA framework details
- Contact information

## Components

### Layout Components
- **Header**: Navigation with mobile menu
- **Footer**: Links and copyright
- **ChatBot**: Floating AI assistant with session state

### Home Components
- **HeroSection**: Hero banner with overlay
- **StrategyCard**: Reusable card component
- **VisionStrategy**: Two-column section with image
- **NewsUpdates**: News cards grid

## Styling

Using Tailwind CSS with custom configuration:

- Primary color: `#667eea` (purple-blue)
- Secondary color: `#764ba2` (purple)
- Custom utility classes in `globals.css`

## Deployment

### Docker Build

```bash
# Build image
docker build -t grenada-frontend \
  --build-arg WIKI_URL=https://wiki.gea.abhirup.app \
  --build-arg DMS_URL=https://dms.gea.abhirup.app \
  [... other args ...] \
  .

# Run container
docker run -p 80:80 grenada-frontend
```

### Docker Compose

See main `docker-compose.yml` in project root.

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Performance

- Lighthouse score target: 90+
- Page load time: < 2s
- Time to interactive: < 3s

## Development Tips

1. **Hot Reload**: Changes auto-reload in dev mode
2. **TypeScript**: Run `npm run build` to check for type errors
3. **Styling**: Use Tailwind classes, avoid custom CSS when possible
4. **Images**: Optimize before adding (use TinyPNG or similar)

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Build errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Static export issues
- Ensure no dynamic routes without generateStaticParams
- Check Next.js config has `output: 'export'`

## License

© 2025 Government of Grenada. All rights reserved.