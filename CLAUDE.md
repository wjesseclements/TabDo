# CLAUDE.md

## Project Overview

TabDo is a minimalist Firefox browser extension that transforms the new-tab page into a to-do list with three columns: Daily, Recurring Daily, and Weekly.

**Repository:** https://github.com/wjesseclements/TabDo

## Key Constraints

- **Privacy-First:** NO external APIs, cloud services, or network requests
- **Local Storage Only:** Use browser.storage.local API exclusively
- **Performance:** <200ms load time, <50ms task operations
- **Minimal Dependencies:** Only SortableJS for drag-and-drop
- **Browser:** Firefox ≥109 (Manifest v3) primary target

## Project Structure

```
TabDo/
├── manifest.json       # Firefox extension manifest v3
├── newtab.html        # Entry point - new tab override
├── src/
│   ├── main.ts        # Core app logic and state management
│   ├── styles.css     # Light/dark themes, animations
│   └── types.ts       # TypeScript interfaces
├── dist/              # Build output (git-ignored)
├── .github/
│   └── workflows/     # CI/CD for AMO submission
└── docs/
    └── CHANGELOG.md   # User-facing release notes
```

## Technology Stack

- TypeScript 5.x (strict mode enabled)
- Vite 5 for building
- Vanilla TypeScript (no framework - optimized for performance)
- SortableJS for drag-and-drop (lazy loaded)
- Jest + Testing Library for tests
- No CSS frameworks - vanilla CSS only

## Development Commands

```bash
npm install          # Install dependencies
npm run dev         # Start dev server with HMR
npm run build       # Production build to dist/
npm run test        # Run test suite
npm run type-check  # TypeScript validation
npm run lint        # ESLint checks
npm run extension   # Load in Firefox for testing
```

## Coding Conventions

- Use functional components with hooks (if React)
- Prefer const over let, never use var
- Use early returns to reduce nesting
- Name event handlers: handleXxx
- CSS classes: kebab-case
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with 'I' prefix (e.g., ITask)

## Data Model

```typescript
interface ITask {
  id: string;          // UUID v4
  text: string;        // Task description
  checked: boolean;    // Completion state
  createdAt: number;   // Unix timestamp
  order: number;       // Display order
}

interface IAppState {
  version: 1;
  lists: {
    daily: ITask[];
    recurringDaily: ITask[];
    weekly: ITask[];
  };
  theme: 'light' | 'dark';
  lastReset: number;   // Unix timestamp
}
```

## Critical Business Logic

1. **Reset Rules (midnight local time):**
   - Daily: DELETE all checked items
   - Recurring Daily: UNCHECK all items (preserve)
   - Weekly: NO automatic reset

2. **Task Operations:**
   - New tasks prepend (most recent first)
   - Drag only within same list
   - Immediate save to storage on any change

3. **Theme Logic:**
   - Default to system preference
   - Manual override persists
   - Smooth 250ms transition

## Performance Requirements

- First meaningful paint: <200ms
- Task operations: <50ms
- Drag animations: 60fps
- Storage writes: debounce 100ms

## Testing Strategy

- Unit test all pure functions
- Integration test storage operations
- E2E test critical user flows
- Mock browser.storage.local in tests

## Common Tasks

When implementing features:
1. Always check PRD section first
2. Write tests before implementation
3. Ensure accessibility (ARIA labels, keyboard nav)
4. Test both light/dark themes
5. Verify <200ms performance target

## Git Workflow

- Branch from main: `feature/description`
- Commit format: `type: description` (feat/fix/docs/test)
- PR requires: passing tests, performance check
- Squash merge to main

## Error Handling

- Gracefully handle storage quota errors
- Show user-friendly messages
- Never lose user data
- Log errors to console (dev only)

## Security Considerations

- Sanitize all user input (XSS prevention)
- No eval() or innerHTML with user data
- Content Security Policy in manifest
- Minimal permissions requested

## Accessibility

- WCAG 2.2 Level AA compliance
- Full keyboard navigation
- Focus indicators on all interactive elements
- Proper ARIA labels and roles
- Test with screen readers

## Build & Release

1. Run full test suite
2. Build production bundle
3. Test in Firefox manually
4. Update version in manifest.json
5. Update CHANGELOG.md
6. Create GitHub release
7. Submit to AMO (addons.mozilla.org)

## Known Gotchas

- Firefox storage.local has 10MB limit
- Manifest v3 requires service workers (not background scripts)
- SortableJS needs specific Firefox touch handling
- Dark theme requires explicit color-scheme CSS

---

## Implementation Progress

### ✅ Completed (Phase 1-4)
- **Core Infrastructure**: Project setup, TypeScript configuration, Vite build system
- **Extension Manifest**: Firefox Manifest v3 with proper permissions and CSP
- **UI Components**: Three-column layout with responsive design and animations
- **State Management**: Complete storage layer with debounced saves and validation
- **Task Operations**: Full CRUD operations with drag & drop reordering
- **Reset Logic**: Midnight reset rules for daily/recurring tasks
- **Theme System**: Light/dark themes with system preference detection
- **Settings Panel**: Modal with theme toggle, keyboard shortcuts, and data management
- **Accessibility**: WCAG 2.2 Level AA compliance with ARIA labels and keyboard navigation
- **Performance**: <200ms load time with lazy loading and performance monitoring

### 🔄 Current Status
All core features are implemented and working. The extension is functionally complete with:
- Performance monitoring system tracking load times and operation speeds
- Lazy loading of SortableJS for optimal initial load performance
- Comprehensive accessibility features including screen reader support
- Responsive design working across desktop and mobile viewports

### 📋 Next Steps (Remaining Tasks)
1. **Testing Implementation** (Phase 5)
   - Unit tests for core functions and classes
   - Integration tests for storage operations
   - E2E tests for critical user workflows
   - Performance regression tests

2. **Build Pipeline** (Phase 6)
   - GitHub Actions CI/CD configuration
   - Automated testing on pull requests
   - Build validation and deployment

3. **Documentation & Release** (Phase 7)
   - Create comprehensive changelog
   - Prepare AMO submission materials
   - Generate extension screenshots and descriptions

### 🎯 Performance Metrics
- **Bundle Size**: 23.27 kB main.js (7.20 kB gzipped)
- **Load Time Target**: <200ms (with monitoring and warnings)
- **Task Operations**: <50ms (with performance tracking)
- **Lazy Loading**: SortableJS loaded on-demand to reduce initial bundle

### 🚀 Ready for Testing
The extension is now ready for comprehensive testing and can be loaded in Firefox for manual testing using `npm run extension`.