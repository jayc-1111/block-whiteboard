# Feature Planning for Zenban

## Core Features to Implement

### 1. Bookmarking System
**Purpose**: Save and navigate to specific viewport positions

**Core Requirements**:
- Save current viewport position (x, y, zoom level)
- Name and organize bookmarks
- Quick navigation with smooth scrolling
- Visual indicators on canvas
- Keyboard shortcuts for power users
- Persist with board data

**Technical Considerations**:
- Integration with existing state management
- Firefox compatibility for all UI elements
- Performance with many bookmarks
- Visual design consistency with themes

### 2. Firefox Extension Integration
**Purpose**: Extract and import web content directly into boards

**Extension Features**:
- Text selection and extraction
- Image capture and import
- Full page or partial capture
- Metadata preservation (URL, date, title)
- Direct board insertion or clipboard

**Communication Methods**:
1. **Native Messaging** (Recommended)
   - Most secure and reliable
   - Direct communication with local app
   - Requires manifest configuration

2. **Firebase Sync**
   - Extension writes to user's Firebase
   - App picks up changes automatically
   - Works across devices

3. **Custom Protocol Handler**
   - zenban:// URLs
   - Quick but limited data transfer

### 3. Search & Filter System
**Purpose**: Find content across all boards

**Features**:
- Full-text search in cards
- Filter by date, category, tags
- Search history
- Quick jump to results

### 4. Enhanced Card System
**Capabilities**:
- Rich media support (images, videos)
- Code syntax highlighting
- Markdown support
- Card templates
- Card linking/references

### 5. Collaboration Features
**Real-time collaboration**:
- User presence indicators
- Live cursor tracking
- Conflict resolution
- Permission management

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Fix existing bugs (editorContainer, Firebase arrays)
2. Clean up code architecture
3. Improve error handling
4. Add comprehensive logging

### Phase 2: Bookmarks (Week 2)
1. Design bookmark data structure
2. Create bookmark UI components
3. Implement viewport tracking
4. Add smooth navigation
5. Create visual indicators
6. Add keyboard shortcuts

### Phase 3: Extension Foundation (Week 3)
1. Create Firefox extension structure
2. Implement content selection
3. Build communication bridge
4. Add authentication flow

### Phase 4: Extension Features (Week 4)
1. Image capture
2. Metadata extraction
3. Smart formatting
4. Batch operations

### Phase 5: Search System (Week 5)
1. Implement local search
2. Add filters and sorting
3. Create search UI
4. Add search history

## Architecture Decisions

### State Management
- Keep AppState as single source of truth
- Add bookmark state to board structure
- Create bookmark service module

### Data Structure
```javascript
board: {
  id: number,
  name: string,
  categories: [],
  canvasHeaders: [],
  drawingPaths: [],
  bookmarks: [
    {
      id: string,
      name: string,
      viewport: { x, y, zoom },
      created: timestamp,
      lastVisited: timestamp,
      color: string, // for visual indicator
      hotkey: number // 1-9 for quick access
    }
  ],
  metadata: {
    created: timestamp,
    modified: timestamp,
    tags: [],
    collaborators: []
  }
}
```

### Module Structure
```
js/
  bookmarks/
    bookmark-service.js    // Core logic
    bookmark-ui.js        // UI components
    bookmark-indicators.js // Canvas indicators
  
  extension/
    bridge.js            // Communication
    content-parser.js    // Extract web content
    
firefox-extension/
  manifest.json
  background.js
  content-script.js
  popup/
    popup.html
    popup.js
```

## Design Principles

1. **Progressive Enhancement**: Features work independently
2. **Performance First**: Lazy loading, virtualization
3. **Offline First**: Full functionality without internet
4. **Accessibility**: Keyboard navigation, screen readers
5. **Theme Consistency**: Respect user's theme choice

## Testing Strategy

1. Unit tests for core logic
2. Integration tests for Firebase
3. E2E tests for critical flows
4. Manual testing on Firefox/Chrome
5. Performance benchmarks

## Questions to Resolve

1. Should bookmarks be shareable between users?
2. How many bookmarks per board (limit)?
3. Should bookmarks track zoom level?
4. Extension permissions needed?
5. Offline storage for extension?
