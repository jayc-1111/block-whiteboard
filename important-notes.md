# Important Notes

### Category Header Button Layout Fix (8/6/2025)
- **Issue**: Category buttons were collapsing away from their proper position
- **Solution**: 
  - Added missing toggle button to the headerButtons container in DOM
  - Set category-title to flex: 1 with margin-right: 8px
  - Added flex-shrink: 0 to header-buttons container
  - Added min-height: 24px to category-header
- **Location**: 
  - js/categories.js (line 95-97)
  - css/items/widget/categories.css (lines 54-91)

### Bookmarks Button Added to Toolbar (8/6/2025)
- **Feature**: Added "Your Bookmarks" button to main toolbar next to "Your Files"
- **Implementation**:
  - Added bookmarks-container div with bookmarks-trigger button
  - Used bookmark icon SVG (filled bookmark shape)
  - Shared CSS styling with file-structure-container for consistency
- **Location**: 
  - index.html (lines 121-130)
  - css/items/menu/file-viewer.css (styling shared with file viewer)

### Bookmarks Modal Implementation (8/6/2025)
- **Feature**: Full-screen modal for bookmarks display
- **Styling**:
  - Modal positioned 12% from all viewport edges (76% width/height)
  - White background with rounded corners
  - Backdrop blur effect on overlay
  - Header with title, dark mode toggle button, and close button
  - Flex layout with left sidebar (250px) and main content area
- **Sidebar Tree Structure**:
  - Example folders: Work (with Projects subfolder), Research, Personal
  - Expandable/collapsible folders with arrow indicators
  - Active state highlighting
  - Tree navigation with example bookmarks
- **Functionality**:
  - Opens on "Your Bookmarks" button click
  - Closes via close button, overlay click, or Escape key
  - Tree folders expand/collapse on click
  - Leaf items update content area when clicked
  - Dark mode toggle button (moon icon) in header
  - Full dark mode support for all elements
- **Location**:
  - index.html (modal HTML structure)
  - css/items/widget/bookmarks-modal.css (all modal styling)
  - js/bookmarks-modal.js (open/close handlers)

## Bookmark Loading After Refresh (Fixed 8/9/2025)
**Problem**: Bookmarks not displaying after page refresh, even though logs show they're loading from Firebase.

**Root Cause**: Cards are created asynchronously with 150ms delays between each card. If you expand a card too quickly after refresh, the bookmarks might not be attached yet.

**Key Code**:
- `cards.js:103`: Bookmarks stored on card DOM element
- `sync-service.js:409`: Cards created with staggered 150ms delays  
- `sync-service.js:453`: Bookmarks ARE passed during restore

**Solution**: Wait for UI to fully load before expanding cards. The logs confirm bookmarks are saving/loading correctly:
- "CARD: Restored card ... with 2 bookmarks" ✓
- "SAVE: Saving card ... with 2 bookmarks" ✓

## Bookmark Editor Module (Aug 2025)
- Created Quill module for composite bookmark+editor widget
- Issue: Quill treats innerHTML as text - must create DOM elements programmatically
- Structure: BlockEmbed blot creates div structure, not innerHTML string
- Widget spans full width compensating for .ql-editor padding
- Nested editor has limited toolbar (bold, italic, links, images, lists)
- Lenis scrolling: Apply to .ql-container (wrapper) with .ql-editor (content)
- Bookmark widget height reduced to 6em, editor 3/4 width, bookmark 1/4 width

## Recent Issues Fixed (8/3/2025)

### 1. Bookmark Screenshot Extension
- **Problem**: html2canvas missing non-HTML elements (canvas, video, etc.)
- **Solution**: Simplified to use only browser's built-in screenshot API
- **Changes**: 
  - Removed element picker functionality
  - Removed html2canvas dependency
  - Now captures full visible tab only
- **Location**: `zenban-firefox-extension/content-script.js` - completely rewritten

### 2. Element Picker Visibility
- **Problem**: Element selection highlight was hard to see (light blue)
- **Solution**: Changed to bright pink (#ff1493) with glow effect
- **Location**: `zenban-firefox-extension/element-picker.js` line 11

### 3. Quill Editor Initialization Errors
- **Problem**: Quill throwing "emitter is undefined" errors when creating bookmark cards
- **Solution**: Added longer timeout for DOM to be ready before Quill initialization
- **Location**: `js/bookmarks.js` line 367

### 4. Bookmark Display Issues
- **Problem**: Bookmarks appearing as white/blank in Quill editor
- **Solution**: Implemented sidebar approach instead of embedding in Quill
- **Files Created**: 
  - `js/bookmark-sidebar.js` - Sidebar module for Quill
  - `css/items/widget/bookmark-sidebar.css` - Sidebar styling
  - `js/bookmark-integration.js` - Simple integration helpers
- **Approach**: Bookmarks now appear in a synchronized sidebar next to each editor

### 5. Previous AppState Refactor
- Successfully refactored to centralized state management
- Fixed numerous errors related to state synchronization
- All board operations now go through AppState

## Recent Issues Fixed (8/4/2025)

### 6. Guest User Firebase Errors & Empty Board Prevention
- **Problem**: "No document to update" errors for guest users, risk of empty boards overwriting data
- **Solution**: Added validation to prevent empty boards from being saved to Firebase
- **Changes**:
  - Added empty board validation in `sync-service.js` saveCurrentBoard method (lines ~450)
  - Board must have at least one category, header, or drawing to save
  - Returns success but marks as skipped for empty boards
  - User document creation now uses setDoc with merge:true in firebase-config.js
- **Key Learning**: Always validate board content before Firebase saves to prevent data loss

### 7. Duplicate Categories from Live Sync
- **Problem**: Categories appearing duplicated after creation due to live sync reloading UI
- **Solution**: Disabled live sync and added local change detection
- **Changes**:
  - Added `window.LIVE_SYNC_DISABLED = true` flag in index.html
  - Modified sync-service.js to mark local changes with timestamp
  - Updated live-sync-service.js to skip UI updates for local changes (within 3 seconds)
  - Added isLocalChange flag to track when saves originate locally
- **Key Learning**: Live sync can cause UI duplication when it reacts to your own saves

### 8. Duplicate Initial Board Load
- **Problem**: Board loaded twice on startup causing duplicate categories
- **Solution**: Removed redundant board loads and added duplicate prevention
- **Changes**:
  - Removed duplicate `loadBoardsFromFirebase()` calls from guest-auth-init.js
  - Added `isLoadingInitialBoard` flag to prevent concurrent loads
- **Root Cause**: Both sync service and guest auth were triggering board loads on auth state change
- **Key Learning**: Always use single source of truth for initialization - let sync service handle all board loading

### Button Visibility in Expanded Cards (Fixed 8/6/2025)
- **Issue**: Save/Delete buttons disappeared in expanded card view
- **Cause**: CSS rule `.card.expanded .expanded-card-buttons { display: none; }` was hiding the buttons
- **Solution**: Replaced hiding rule with proper button styling in cards.css
- **Location**: css/items/widget/cards.css (lines 456-499)

### Plain Text Paste Implementation (8/6/2025)
- **Feature**: Strip formatting when pasting into card titles and Quill editor
- **Implementation**:
  - Card titles: Added paste event listener to extract plain text only
  - Quill editor: Configured clipboard module with `matchVisual: false`
- **Location**: js/cards.js (lines 50-54 and 615-617)

### Dark Mode Toggle for Quill Editor (8/6/2025)
- **Feature**: Added dark mode toggle button with moon icon to Quill toolbar
- **Implementation**:
  - Custom toolbar button 'dark-mode' with handler function
  - Moon icon SVG added via setTimeout after initialization
  - Toggles dark-mode class on editor, toolbar, and container
  - Persists dark mode state on card.darkModeEnabled property
  - Restores dark mode when card is re-expanded
- **Styling**: Dark gray backgrounds (#2d2d2d toolbar, #1e1e1e editor, #1a1a1a card background) with white text
- **Location**: 
  - js/cards.js (lines 639-661 for handler, 665-703 for icon and restore, 234-350 for expand apply)
  - css/scripts/quill-overrides.css (lines 3-114 for dark mode styles)

### 55. Replaced Butter.js with GSAP ScrollSmoother (8/27/2025)
- **Problem**: Butter.js wasn't smoothing expanded cards, switched to GSAP ScrollSmoother
- **Solution**: Implemented GSAP ScrollSmoother for smooth scrolling
- **Changes**:
  - Removed butter.js files and references
  - Added GSAP CDN (gsap, ScrollTrigger, ScrollSmoother)
  - Created ScrollSmoother structure (#smooth-wrapper, #smooth-content)
  - Added init/cleanup functions
- **Files**:
  - `js/expanded-card-scroll-smoother.js` - ScrollSmoother module
  - `css/scripts/expanded-card-scroll-smoother.css` - Styles
  - `js/cards.js` - Updated expandCard/collapseCard
  - `index.html` - GSAP CDN scripts
- **Test**: Check console for "✅ GSAP ScrollSmoother initialized"

### 58. Removed All Smooth Scrolling Except Lenis (8/27/2025)
- **Decision**: Removed all smooth scrolling attempts for expanded cards
- **Files Removed**:
  - mrD-SmoothScroller 
  - expanded-card-scroll-smoother
  - expanded-card-smooth-scroll
  - expanded-card-momentum-scroll
- **Kept**: Lenis smooth scroll for main whiteboard
- **Result**: Expanded cards use native browser scrolling

## Known Issues to Watch
- Quill initialization timing can still be finicky with dynamic content
- Element screenshot quality depends on html2canvas limitations (no cross-origin images)
- Bookmark sidebar needs testing with multiple cards/categories

## Development Notes
- Always check console for detailed debug logs (debug.js provides comprehensive logging)
- Firebase sync is event-based, not using auto-save intervals
- Extension communicates via postMessage with specific message types
- Board validation is critical - empty boards should never overwrite existing data

## Strategic Decision (8/4/2025)

### Extension Communication Approach Change
- **Problem**: 24 hours spent fighting browser extension sandboxing issues
- **Root Cause**: PostMessage restrictions, tab injection failures, duplicate listeners
- **Decision**: Pivot from direct extension-to-applet communication to server-based bridge
- **Solution**: Extension uploads screenshots to server, applet polls/subscribes for updates
- **Benefits**: No browser security restrictions, reliable, testable, works across tabs
- **Next Steps**: Implement Firebase Cloud Function endpoint for screenshot upload/retrieval

## Major Bookmark System Refactor (8/4/2025)

### Complete Bookmark System Wipe and Restart
- **Problem**: Overly complex bookmark implementation with multiple overlapping systems
- **Decision**: Wipe all applet-side bookmark code and restart with simple browser storage approach
- **Files Removed**:
  - `js/bookmarks.js` - Complex Quill integration with dual listeners
  - `js/bookmark-sidebar.js` - Broken sidebar DOM manipulation approach
  - `js/bookmark-handler.js` - Duplicate message listener
  - `js/bookmark-integration.js` - Unused integration helpers
  - `js/extension-listener.js` - Another duplicate listener
  - `js/test-bookmark.js` - Test file
  - `css/items/widget/bookmark-sidebar.css` - Sidebar styles
  - `css/items/widget/bookmarks.css` - Old complex styles
  - `css/items/widget/bookmarks-fix.css` - Patch file for broken styles
  - `css/items/widget/bookmark-card-widget.css` - Fancy card styles (consolidated)
- **Final Structure**:
  - `js/bookmarks.js` - Main bookmark manager using localStorage
  - `css/items/widget/bookmark-widget.css` - All bookmark styling
- **New Approach**:
  - Single bookmark manager using localStorage/sessionStorage
  - No Quill integration - simple DOM append
  - Focus on clean CSS and proper fitting
  - Test with mock data before extension integration
- **Key Learning**: Start simple, focus on styling and UX before complex integration

## Recent Issues Fixed (8/20/2025)

### 53. Fixed Bookmark Screenshot & Timestamp Issues (8/20/2025)
- **Problem 1**: Extension sending malformed Unix timestamp (1755679823111 = year 2525)
- **Problem 2**: Screenshot data not displaying despite being captured
- **Root Causes**:
  - Extension generating incorrect timestamp (possibly Date.now() error)
  - Property mismatch: extension sends `screenshotData` but code looked for `screenshot`
- **Solutions**:
  - Added timestamp validation: if > 10000000000000, use current time
  - Check `bookmarkData.screenshotData` first, then fallback to `screenshot`
  - Fixed date display to handle ISO strings properly
  - Added debug logging to track data flow
- **Files Modified**:
  - `bookmark-destination-selector.js` - Lines 663-691 (timestamp fix & property check)
  - `cards.js` - Lines 720-800 (debug logging & date display fix)
- **Testing**: Look for 🔍 DEBUG logs in console when adding bookmarks

## Recent Issues Fixed (8/29/2025)

### Settings Dropdown Hover Fix - Complete (8/29/2025)
- **Problem**: Settings dropdown not displaying on hover despite previous positioning fix
- **Root Cause**: Missing `position: absolute` in `.settings-menu` rule in dropdowns.css
- **Solution**: Added `position: absolute` to enable proper positioning from hamburger.css
- **Technical Details**: 
  - hamburger.css provides `left: 100%; bottom: 0;` positioning
  - dropdowns.css needed `position: absolute` for these rules to take effect
  - Without position property, the left/bottom values were ignored
- **Result**: Settings dropdown now appears properly on hover to the right of menu item
- **Location**: `css/items/sidebar/dropdowns.css` - added position absolute to .settings-menu

## Recent Issues Fixed (8/8/2025)

### 52. Fixed Bookmark Persistence and Card Order Issues (8/9/2025)
- **Problem 1**: Bookmarks disappearing after refresh
- **Root Cause**: Bookmarks saved but cards recreated without restoring bookmark property
- **Problem 2**: Cards switching positions after refresh
- **Root Cause**: Expanded cards saved out of slot order
- **Solutions**:
  - Added bookmark restoration logging in addCardToCategory
  - Fixed card save order by processing slots sequentially
  - Track originalSlotIndex when expanding cards
  - Save expanded cards in their original slot position
  - Added detailed bookmark logging throughout save/load cycle
- **Files Modified**:
  - `js/cards.js` - Added bookmark restoration logging and slot tracking
  - `js/boards.js` - Fixed save order to preserve slot positions
- **Key Fix**: Process card slots in order rather than DOM order when saving

### 51. Added Save Notifications for Bookmark Additions (8/9/2025)
- **Problem**: No "Saved to Firebase" notification when adding bookmarks to cards
- **Root Cause**: Bookmark save code wasn't triggering the notification system
- **Solution**: Added `showSaveNotification` calls when bookmarks are saved
- **Changes**:
  - Added notification in `addBookmarkToCard` function for regular cards
  - Added notification in expanded card modal handler
  - Shows "Saving..." then "Saved" after 1 second
- **File**: `js/bookmark-destination-selector.js`
- **Result**: Users now see clear feedback when bookmarks are saved to Firebase

### 50. Fixed Card Collapse When Adding Bookmark to Expanded Card (8/9/2025)
- **Problem**: Adding a bookmark to an expanded card caused the card to collapse/exit
- **Root Cause**: Modal clicks were bubbling through to the overlay beneath, triggering card collapse
- **Solution**: Added event.stopPropagation() to all modal click handlers
- **Changes**:
  - Added stopPropagation to "Add to Open Card" button handler
  - Added stopPropagation to "Choose Another Card" button handler
  - Added stopPropagation to modal overlay click handler
  - Added onclick handler to modal content to prevent bubbling
  - Increased modal z-index to 10000001 (above overlay)
- **File**: `js/bookmark-destination-selector.js`
- **Result**: Card now stays expanded when adding bookmarks

### 49. Fixed Extension Blocking After Modal Cancel (8/9/2025)
- **Problem**: After canceling bookmark import modal, extension failed to capture new bookmarks
- **Root Cause**: Canceled bookmarks remained in localStorage, blocking new ones
- **Solution**: Added localStorage cleanup when modal is closed/canceled
- **Files**: `js/bookmark-destination-selector.js`
- **Changes**: 
  - Clean up `zenban_bookmark_*` keys from localStorage on modal close
  - Added X close button to expanded card choice modal
  - Added click-outside-to-close for expanded card modal
  - All cancel methods now clean up localStorage

### 48. Fixed "Save Failed" on Card Exit (8/9/2025)
- **Problem**: "Save Failed" appeared when exiting expanded cards with bookmarks
- **Root Cause**: Multiple concurrent saves triggered when collapsing card, causing race condition
- **Solution**: Added `isSaveInProgress` flag to prevent concurrent saves
- **Changes**: Modified `manualSaveWhiteboard()` to skip if save already in progress
- **Also**: Better error handling to treat queued saves as success, not failure
- **File**: `js/boards.js`

### 47. Bookmark Save Not Triggering on Expanded Cards (8/9/2025)
- **Problem**: Adding bookmarks to expanded cards didn't trigger save events
- **Root Cause**: `saveAfterAction` was being awaited but it's not an async function
- **Solution**: Removed `await` from `window.syncService.saveAfterAction()` calls
- **Files Modified**: `js/bookmark-destination-selector.js`
- **Key Learning**: Check if functions are async before awaiting them
- **Added**: Debug logging to track save flow

### 46. Bookmark Persistence Fix (8/9/2025)
- **Problem**: Bookmarks disappearing after page refresh and cards swapping positions
- **Root Cause**: When loading cards from saved data in `loadBoard()`, bookmarks weren't being passed to `addCardToCategory()`
- **Solution**: Updated `boards.js` to pass bookmarks as fourth parameter when loading cards
- **Code Change**: 
  ```javascript
  // Before:
  addCardToCategory(catIndex, cardData.title, cardData.content);
  // After:
  addCardToCategory(catIndex, cardData.title, cardData.content, cardData.bookmarks);
  ```
- **Location**: `js/boards.js` line 303 in loadBoard function
- **Key Learning**: Always check that all saved data is being passed through when restoring state

## Recent Issues Fixed (8/8/2025)

### 42. Dev Mode Disables Custom Context Menu (8/8/2025)
- **Feature**: When dev mode is active, custom right-click menu is disabled
- **Purpose**: Allows browser's native context menu with "Inspect Element" to show
- **Implementation**: Added checks for `window.devModeActive || AppState.get('devMode')`
- **Location**: `js/context-menu.js` - Three check points:
  - `showContextMenu()` function
  - `showWhiteboardContextMenu()` function
  - Main contextmenu event listener
- **Result**: In dev mode, right-click shows browser menu everywhere

## Recent Issues Fixed (8/8/2025)

### 41. Pure CSS Hover for Submenus (8/8/2025)
- **Problem**: Settings submenu and file dropdown not appearing on hover
- **Solution**: Used opacity/visibility transitions instead of display none/block:
  ```css
  .submenu {
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s, visibility 0.2s;
  }
  .parent:hover .submenu {
    opacity: 1;
    visibility: visible;
  }
  ```
- **Applied to**:
  - Settings menu: `#settingsItem:hover .settings-menu`
  - File dropdown: `#yourFilesItem:hover .file-structure-dropdown`
  - Customization submenu: `.has-submenu:hover .customization-submenu`
- **Removed**: All JavaScript hover handling for both menus
- **Key**: opacity/visibility works better than display for nested hovers

## Recent Issues Fixed (8/5/2025)

### 9. Context Menu on Expanded Cards
- **Problem**: Custom right-click context menu was appearing over expanded cards, blocking native browser context menu
- **Solution**: Modified context menu logic to allow default browser menu on expanded cards
- **Changes**:
  - Updated `js/context-menu.js` setupContextMenu function
  - Added check for `card.classList.contains('expanded')` to skip custom menu
  - Moved `e.preventDefault()` after expanded card checks
  - Now returns early to allow default browser context menu on expanded cards
  - Also prevents whiteboard context menu when an expanded card exists
- **Key Learning**: Don't universally prevent default - check conditions first to allow native behavior when appropriate

### 10. Quill Editor Padding on Expanded Cards
- **Problem**: Main Quill editor had too much horizontal padding (15px) on expanded cards
- **Solution**: Reduced left and right padding to 5px for better space utilization
- **Changes**:
  - Updated `css/scripts/quill-overrides.css`
  - Changed `.card.expanded .ql-editor` padding from `12px 15px` to `12px 5px`
  - Kept vertical padding at 12px for readability
- **Location**: Line 111 in quill-overrides.css

### 11. Bookmark Widget Size Reduction
- **Problem**: Bookmark widget had excessively large text and icons making it look disproportionate
- **Solution**: Reduced sizes across all bookmark widget elements for a more compact, professional appearance
- **Changes in `css/items/widget/bookmark-widget.css`**:
  - Visual area height: 6em → 4em
  - Placeholder icon: 3em → 1.5em
  - Delete button: 2em → 1.5em width/height, 1.2em → 0.8em font size
  - Title font: 0.9em → 0.8em
  - URL font: 0.75em → 0.65em
  - Action buttons: 0.75em → 0.65em font size
  - Reduced padding throughout for tighter spacing
- **Result**: More professional, space-efficient bookmark widgets that fit better with overall UI
- **Additional fix in `js/bookmarks.js`**: Removed emoji icons from action buttons (❤️ → "Like", 💬 → "Note", 👁️ → "Visit") to prevent oversized icon rendering

### 12. Complete Removal of Old Bookmark System (8/5/2025)
- **Problem**: Old bookmark system with card-bookmarks and bookmark-widget was still present in codebase
- **Solution**: Removed all old bookmark-related code
- **Files Removed**:
  - `js/bookmarks.js` → `js/_old_bookmarks.js.bak`
  - `css/items/widget/bookmark-widget.css` → `css/items/widget/_old_bookmark-widget.css.bak`
- **HTML Changes in index.html**:
  - Removed `<link>` tag for bookmark-widget.css
  - Removed `<script>` tag for bookmarks.js  
  - Removed bookmark sidebar div
  - Removed test bookmark button from toolbar
- **Result**: Cleaned up codebase, removed unused bookmark system that was causing confusion
- **Additional cleanup in `js/cards.js`**: Removed hidden `card-bookmarks` div creation in `addCardToCategory` function

### 13. Applied Compact Bookmark Widget Styles to Bookmark Editor (8/5/2025)
- **Problem**: Bookmark widgets inside bookmark-editor-widget still had large text and oversized elements
- **Solution**: Applied the same compact styles to `.bookmark-widget-container .bookmark-widget`
- **Changes in `css/items/widget/bookmark-editor-widget.css`**:
  - Added all compact styles with `.bookmark-widget-container` parent selector
  - Visual area height: 4em
  - Placeholder icon: 1.5em
  - Delete button: 1.5em size, 0.8em font
  - Title: 0.8em, URL: 0.65em
  - Action buttons: 0.65em font, reduced padding
  - Added night mode support for all compact styles
- **Result**: Consistent compact bookmark widget appearance throughout the application
- **Additional fix in `js/quill-modules/bookmark-editor-module.js`**: Removed emoji icons from action buttons (❤️ → "Like", 💬 → "Note", 👁️ → "Visit")

### 16. Expanded Card Redesign with Editor.js Integration (8/5/2025)
- **Problem**: Need to replace Quill editor with Editor.js and redesign expanded card layout
- **Solution**: Implemented unified white page design with flex grid layout
- **Changes**:
  - **In `css/items/widget/cards.css`**:
    - Created unified white background expanded card
    - Added header section with title and buttons in same div
    - Split main content into editor section (left) and bookmarks section (right)
    - Editor section uses flex: 1, bookmarks section fixed at 350px
    - Added bookmark card styling with shadow effects
  - **In `js/cards.js`**:
    - Integrated Editor.js initialization in `initializeEditorJS` function
    - Created `createBookmarkCard` function for bookmark display
    - Updated `expandCard` to create new layout structure
    - Save button saves Editor.js content to card's initialContent
- **Layout Structure**:
  - Header: Title (left) + Save/Delete buttons (right)
  - Main: Editor section (flex: 1) + Bookmarks section (350px)
  - Bookmark cards show title, description, URL, and date
- **Result**: Clean, unified white page design with Editor.js ready for content editing

### 17. Expanded Card Positioning Update (8/5/2025)
- **Problem**: Needed better visibility and size constraints for expanded cards
- **Solution**: Repositioned expanded card to touch bottom of browser window
- **Changes in `css/items/widget/cards.css`**:
  - Positioned card at bottom with `bottom: 0` instead of centered
  - Height set to 2/3 of viewport: `calc(100vh * 2/3)`
  - Min-width: 1100px, max-width: 1400px
  - Min-height: 600px
  - Changed animation from fadeIn to slideUp
  - Border radius only on top corners (8px 8px 0 0)
  - Overlay only covers top 1/3 of screen
- **Result**: More prominent expanded card that maximizes content visibility

### 18. Fixed Card Duplication on Expand/Collapse (8/5/2025)
- **Problem**: Expanding and collapsing cards duplicated page elements each time
- **Root Cause**: `collapseCard` function wasn't properly restoring original card structure
- **Issues Found**:
  - Looking for wrong wrapper class ('content-wrapper' instead of 'expanded-card-content')
  - Card title wasn't being moved back from header to original position
  - Expanded wrapper wasn't being fully removed
- **Solution**: Updated `collapseCard` function in `js/cards.js`
  - Find correct wrapper with `.expanded-card-content` class
  - Move title back to card before card-content element
  - Remove entire expanded wrapper after restoring title
- **Result**: Card structure properly restored on collapse, preventing duplication

### 19. Replaced Editor.js with Lexical Editor (8/5/2025)
- **Problem**: Editor.js text wasn't wrapping properly, needed more flexible editor
- **Solution**: Replaced Editor.js with Facebook's Lexical editor
- **Changes**:
  - **In `index.html`**:
    - Removed all Editor.js plugin scripts
    - Added Lexical modules via ESM imports
    - Made Lexical available globally via window object
  - **In `js/cards.js`**:
    - Replaced `initializeEditorJS` function with Lexical implementation
    - Updated save functionality to use Lexical's `editorState.toJSON()`
    - Updated collapse cleanup to destroy Lexical instance
    - Added history plugin for undo/redo support
  - **In `css/items/widget/cards.css`**:
    - Removed all Editor.js specific styles (ce-* classes)
    - Added Lexical editor styles with proper typography
    - Added text formatting classes (bold, italic, etc.)
- **Benefits**: Better text wrapping, cleaner API, smaller bundle size
- **Note**: Lexical uses contenteditable directly with better control

### 20. Fixed Lexical CDN Implementation (8/5/2025)
- **Problem**: Lexical wasn't loading properly, stuck in infinite retry loop
- **Solution**: Used ESM modules from esm.run CDN
- **Changes**:
  - **In `index.html`**:
    - Used `https://esm.run/lexical@0.12.4` for main library
    - Added plain-text and history plugins via ESM imports
    - Made modules available globally on window object
  - **In `js/cards.js`**:
    - Added retry limit (50 attempts) to prevent infinite loops
    - Used proper Lexical API: `createEditor`, `setRootElement`
    - Registered plain text and history plugins
    - Used `editor.update()` for content manipulation
  - **In `css/items/widget/cards.css`**:
    - Styled `.lexical-editor` with proper text wrapping
- **Key learnings**: 
  - Use ESM modules for Lexical in vanilla JS
  - Register plain text plugin for basic editing
  - Use `editor.update()` for all DOM manipulations

### 21. Lexical Editor Setup with CDN (8/5/2025)
- **Problem**: User added Lexical source repo but needed built files
- **Solution**: Using CDN versions from unpkg.com
- **Changes**:
  - **In `index.html`**:
    - Using CDN URLs for Lexical v0.17.1
    - Loads: Lexical.js, LexicalPlainText.js, LexicalRichText.js, LexicalHistory.js, LexicalUtils.js
  - **In `lexical-editor.js`**:
    - Checks for `window.LexicalRichText` module
    - Uses rich text plugin for formatting support
  - **Moved**: `lexical-main` source repo to `lexical-main.bak`
- **Note**: Editor automatically initializes when cards are expanded
- **Location**: Editor appears in the left section of expanded card flex grid

### 22. Complete TipTap Editor Implementation with All Extensions (8/6/2025)
- **Problem**: Need a full-featured rich text editor with all extensions for vanilla JavaScript
- **Solution**: Implemented TipTap editor with comprehensive extension set
- **Implementation Details**:
  - **File**: `js/tiptap-editor.js` - Complete editor manager with all extensions
  - **CSS**: `css/items/widget/tiptap-editor.css` - Comprehensive styling for editor and toolbar
  - **Test**: `test-tiptap.html` - Full test page with all features demonstrated
- **Extensions Included**:
  - **Text Formatting**: Bold, Italic, Underline, Strike, Subscript, Superscript
  - **Structure**: Headings (H1-H3), Paragraphs, Blockquotes, Horizontal Rules
  - **Lists**: Bullet lists, Numbered lists, Task lists (with checkboxes)
  - **Tables**: Full table support with resizable columns
  - **Code**: Code blocks with syntax highlighting via lowlight
  - **Media**: Images (with base64 support), YouTube video embedding
  - **Links**: Clickable links with target="_blank"
  - **Styling**: Text color, Font family, Highlight, Text alignment
  - **Features**: Character count, Placeholder text, Undo/Redo (100 depth)
- **Toolbar Implementation**:
  - Organized in logical groups with visual separators
  - Active state indicators on buttons
  - Color picker and font selector dropdowns
  - Character count display
  - All buttons properly wired to editor commands
- **Key Technical Details**:
  - Uses ESM imports from esm.sh CDN
  - Fallback to contenteditable if initialization fails
  - Auto-saves content to card.initialContent on update
  - Proper cleanup with destroy method
  - Works with existing card expand/collapse system
- **Testing**: Use test-tiptap.html to verify all features work correctly

### 23. TipTap Inline Initialization Fix (8/6/2025)
- **Problem**: TipTap module wasn't loading properly due to ES module timing issues
- **Solution**: Created inline initialization approach that follows TipTap's recommended pattern
- **Changes**:
  - Created `js/tiptap-inline-init.js` - Simpler inline initialization
  - Updated `cards.js` to use `window.initializeTipTapInline`
  - Script dynamically creates ES module script tags for each editor instance
  - Stores editor references in `window.tiptapEditors` object by container ID
- **Key Learning**: ES modules need to be loaded inline or with proper async handling
- **Test Files**:
  - `test-tiptap-simple.html` - Minimal working example
  - `test-tiptap.html` - Full featured test page
- **Benefits**: More reliable initialization, follows TipTap docs pattern exactly

### 24. Back to Quill - The Editor Saga Ends (8/6/2025)
- **Decision**: After trying Editor.js, Lexical, and TipTap, returned to Quill
- **Removed**:
  - All TipTap files (moved to .bak)
  - All Editor.js references
  - All Lexical references
  - Test files for other editors
- **Restored**: Quill initialization in cards.js with standard toolbar
- **Lesson**: Sometimes the first choice was the right choice

### 14. Fixed Missing Quill Scrollbars (8/5/2025)
- **Problem**: Quill editor scrollbars disappeared in both main expanded cards and bookmark editor widgets
- **Solution**: Added proper overflow settings and custom scrollbar styling
- **Changes**:
  - **In `bookmark-editor-widget.css`**:
    - Added `display: flex; flex-direction: column` to `.nested-editor`
    - Changed `.ql-container` to use `flex: 1` and explicit `overflow-y: auto`
    - Added `max-height: calc(300px - 42px)` to ensure proper constraint
  - **In `quill-overrides.css`**:
    - Added `overflow-y: auto; overflow-x: hidden` to `.card.expanded .ql-container`
    - Added custom scrollbar styling for consistency (thin, styled scrollbars)
- **Result**: Scrollbars now appear properly when content exceeds the container height in both contexts
- **Additional fixes**: 
  - Changed scrollbar target from `.ql-container` to `.ql-editor` as that's the actual scrolling element
  - Set `overflow: visible` on `.card.expanded` and `.content-wrapper` to prevent parent scrolling
  - Added global override for Quill's default overflow handling
  - Set explicit `max-height: 500px` on expanded card editor to ensure scrolling triggers
- **Final solution**:
  - Set `.ql-container` to `overflow: visible` to let children handle scrolling
  - Set `.ql-editor` with `min-height` and `max-height` to create scrollable area
  - Used `overflow-y: auto` for scrollbar to appear only when needed
  - Added global webkit scrollbar styles for all `.ql-editor` elements
- **Ultimate fix**: Used fixed `height: 400px` for expanded card editor and `height: 150px` for nested editor to guarantee scrolling behavior

### 15. Switched Bookmark Widget to Bubble Theme (8/5/2025)
- **Problem**: Snow theme with toolbar took up too much space in bookmark widget
- **Solution**: Switched nested editor in bookmark widget from snow theme to bubble theme
- **Changes**:
  - **In `bookmark-editor-module.js`**:
    - Changed theme from 'snow' to 'bubble'
    - Removed toolbar module configuration
  - **In `index.html`**:
    - Added `quill.bubble.css` stylesheet
  - **In `bookmark-editor-widget.css`**:
    - Removed toolbar styling
    - Updated border radius for container (6px instead of 0 0 6px 6px)
    - Added night mode support for bubble tooltip
  - **In `quill-overrides.css`**:
    - Added bubble theme specific styles
    - Set z-index for tooltip to ensure visibility
    - Added padding adjustments for bubble theme editor
    - Increased nested editor height to 180px (from 150px) since no toolbar
    - Added styling for bubble tooltip buttons and inputs
- **Result**: Cleaner, more compact bookmark widget with floating toolbar that appears only when text is selected

### 25. Clear Board Button Moved to Settings Menu (8/7/2025)
- **Problem**: Clear board button was cluttering the main toolbar
- **Solution**: Moved clear board functionality into the settings menu dropdown
- **Changes**:
  - Removed clear board button from main toolbar in index.html
  - Added 'Clear Board' option to settings menu
  - Maintained confirmation dialog for safety
- **Location**: 
  - index.html (settings menu structure)
  - js/ui-controls.js (event handler for clear board option)

### 26. Fixed Header Deletion Not Saving (8/7/2025)
- **Problem**: Deleting a whiteboard header didn't trigger data save
- **Root Cause**: Missing save call after header deletion in canvas-headers.js
- **Solution**: Added saveCurrentBoard() and syncService save calls after header deletion
- **Location**: js/canvas-headers.js (deleteCanvasHeader function)

### 27. Claire Sans Font as Default (8/7/2025)
- **Feature**: Set Claire Sans as the default font for entire application
- **Implementation**:
  - Created `/fonts` directory with font files
  - Added `custom-fonts.css` with @font-face declarations
  - Applied font globally to body element
  - Includes three weights: Light (300), Regular (400), Bold (700)
- **Font Files**:
  - `claire-sans-light.otf` - Light weight
  - `claire-sans.otf` - Regular weight
  - `claire-sans-bold.otf` - Bold weight
- **Location**: 
  - `/fonts/` - Font files directory
  - `/css/base/custom-fonts.css` - Font declarations and application

### 28. File Tree Viewer in Hamburger Menu (8/7/2025)
- **Feature**: File tree dropdown appears on hover over "Your Files" in hamburger menu
- **Implementation**:
  - Hierarchical folder/file tree structure
  - Expandable/collapsible folders with arrow indicators
  - Folder icons change when expanded (open folder vs closed)
  - File icons for .whiteboard files
  - Click folders to expand/collapse
  - Click files to open (shows notification)
- **Structure**:
  - Mock workspace with Projects, Personal, Templates, Recent folders
  - Files have .whiteboard extension
  - Tree persists expanded state during session
- **Files Created**:
  - `js/file-tree.js` - File tree implementation with mock data
- **Location**:
  - `js/file-tree.js` - Main file tree functionality
  - `js/hamburger-menu.js` - Integration with hamburger menu
  - `css/items/toolbar/hamburger.css` - Tree styling
  - `index.html` - Script inclusion

### 29. Fixed File Tree Duplication Issue (8/7/2025)
- **Problem**: File tree dropdown was showing duplicate categories and cards
- **Root Cause**: 
  - `|| true` condition always refreshed tree on every hover
  - mouseenter event fired multiple times as mouse moved within element
  - No debouncing to prevent rapid function calls
- **Solution**: 
  - Removed `|| true` condition to only initialize once per hover session
  - Added 100ms debouncing with clearTimeout to prevent rapid calls
  - Added mouseleave handler to reset initialization flag after 1 second
  - Split populateFileTree into two functions with DOM safety checks
  - Added console logging to help debug any remaining issues
- **Location**: `js/hamburger-menu.js` - populateFileTree function and event handlers
- **Key Learning**: Always debounce hover events and use proper initialization flags

### 30. Fixed CSS MIME Type Mismatch Error (8/7/2025)
- **Problem**: Getting MIME type mismatch error for auth-button.css ("text/html" instead of CSS)
- **Root Cause**: HTML was referencing wrong path `css/items/menu/auth-button.css` but file was at `css/items/toolbar/auth-button.css`
- **Solution**: Updated HTML to reference correct file path
- **Location**: index.html line 44 - corrected CSS link href
- **Key Learning**: MIME type mismatch usually means file doesn't exist at specified path

### 31. Fixed File Tree Not Showing Cards (8/7/2025)
- **Problem**: File tree dropdown showed categories but no cards underneath them
- **Root Cause**: 
  - Cards are stored as DOM elements in `category.cards` array
  - File tree code was trying to access `card.title` on DOM elements
  - Should have been accessing `cardElement.querySelector('.card-title').textContent`
- **Solution**: 
  - Updated populateFileTreeContent to extract titles from DOM elements
  - Changed `category.title` to `category.element.querySelector('.category-title').textContent`
  - Changed `card.title` to `cardElement.querySelector('.card-title').textContent`
  - Added null-safe fallbacks for untitled items
- **Location**: `js/hamburger-menu.js` - populateFileTreeContent function
- **Key Learning**: Always understand the actual data structure being used - DOM elements vs data objects

### 32. Enhanced File Tree Debugging (8/7/2025)
- **Problem**: File tree showing "Unknown Category" despite setting category titles
- **Investigation**: Added comprehensive debugging to understand data structure
- **Changes**:
  - Added logging for boards, currentBoardId, and board structure
  - Added fallback to check both `currentBoard.categories` and `AppState.get('categories')`
  - Enhanced category title extraction with detailed logging
  - Enhanced card title extraction with null-safety checks
  - Added warnings when DOM elements or queries fail
- **Purpose**: Determine whether categories are stored in board or AppState
- **Location**: `js/hamburger-menu.js` - populateFileTreeContent function
- **Next Step**: Test and see console output to identify the actual data structure issue

### 33. Fixed Dual Data Structure Issue in File Tree (8/7/2025)
- **Problem**: File tree showing "Unknown Category" and "Card element is not a valid DOM element"
- **Root Cause**: Two different data structures being used:
  - **Live Categories**: `{ element: <DOM>, cards: [<DOM elements>] }` (created in UI)
  - **Saved Categories**: `{ title: "New Category", cards: [{ title: "New Card" }] }` (from Firebase)
- **Solution**: Modified file tree to detect and handle both data structures:
  - For categories: Check `category.element` first, then fallback to `category.title`
  - For cards: Check `cardElement.querySelector` first, then fallback to `cardElement.title`
  - Added appropriate logging for each structure type
- **Files Changed**: `js/hamburger-menu.js` - populateFileTreeContent function
- **Result**: File tree now works with both live and saved data
- **Key Learning**: Always account for different data representations in the same system

### 34. Debugging Card Save/Load Disconnect (8/7/2025)
- **Problem**: Categories show correctly but cards still not appearing in file tree
- **Investigation**: Console shows `cards: []` in saved data despite cards being created
- **Root Cause**: Potential disconnect between card DOM placement and save process
- **Debugging Added**:
  - **Card Creation**: Logs when cards are added, where placed, DOM verification
  - **Board Save**: Logs cards found in DOM, titles, and final saved count
  - **DOM Structure**: Verifies card hierarchy (category -> cards-grid -> card-slot -> card)
- **Expected DOM Structure**:
  ```
  .category
  └── .cards-grid
      └── .card-slot
          └── .card (this is what save looks for)
  ```
- **Location**: 
  - `js/cards.js` - addCardToCategory function (card creation debugging)
  - `js/boards.js` - saveCurrentBoard function (save process debugging)
- **Next**: Test card creation and check console for DOM placement vs save detection

### 35. Fixed Card Save/Display Timing Issue (8/7/2025)
- **Problem**: Cards being created and saved successfully but not appearing in file tree
- **Root Cause**: File tree reading from stale Firebase data instead of live AppState data
- **Evidence from Debug Logs**:
  - ✅ **Card Creation**: Cards added to DOM correctly ("Total cards now in category DOM: 4")
  - ✅ **Card Saving**: Cards detected and saved ("Cards saved for category: 3")
  - ❌ **File Tree**: Still showed `cards: []` because reading from old Firebase data
- **Solution**: Changed file tree priority to read from live AppState first:
  - **Priority 1**: `AppState.get('categories')` (live data with DOM elements)
  - **Priority 2**: `currentBoard.categories` (saved Firebase data)
- **Technical Issue**: 
  - **AppState**: Contains live categories with DOM elements and current cards
  - **currentBoard**: Contains stale Firebase data from last load
  - File tree was using currentBoard instead of live AppState
- **Location**: `js/hamburger-menu.js` - populateFileTreeContent function
- **Result**: File tree should now show current cards immediately after creation

### 36. Fixed File Tree Dropdown Hover Gap Issue (8/7/2025)
- **Problem**: Gap between "Your Files" menu item and dropdown caused dropdown to disappear when moving mouse to it
- **UX Issue**: Users couldn't interact with dropdown because mouse movement would lose hover state
- **Solution**: Eliminated gap and improved hover behavior
- **Changes Made**:
  - **CSS**: Removed `margin-left: 8px` gap so dropdown touches menu item (`margin-left: 0`)
  - **CSS**: Added hover state for dropdown itself to keep it visible when hovering over it
  - **CSS**: Added invisible bridge area (`::after` pseudo-element) to extend hover zone
  - **CSS**: Improved hover selectors with `#yourFilesItem .file-structure-dropdown:hover`
- **Technical Details**:
  - Dropdown now positioned with `left: 100%; margin-left: 0` (no gap)
  - Hover bridge extends 8px from menu item to dropdown
  - CSS handles hover persistence instead of JavaScript
- **Location**: `css/items/widget/file-tree-dropdown.css`
- **Result**: Smooth hover experience - users can move from menu item to dropdown without it disappearing

### 37. Improved File Tree Dropdown Hover with JavaScript Control (8/7/2025)
- **Problem**: CSS-only hover approach still had timing issues - dropdown disappeared before user could reach it
- **Root Cause**: CSS hover states can be unreliable with complex mouse movements and timing
- **Solution**: Switched to JavaScript-controlled dropdown with proper timing and event handling
- **Key Improvements**:
  - **JavaScript Control**: Added `.show` class instead of CSS `:hover` for reliable state management
  - **Timing Delays**: 300ms delay before hiding dropdown allows smooth mouse movement
  - **Event Delegation**: Uses document-level event listeners to handle dropdown hover states
  - **Overlap Positioning**: `left: calc(100% - 2px)` creates slight overlap to ensure connection
  - **Relational Target Checking**: Checks if mouse is moving between menu item and dropdown
- **Technical Implementation**:
  ```javascript
  // Show/hide with proper timing
  clearHideTimeout(); // Cancel hide when entering area
  hideTimeout = setTimeout(() => hideDropdown(), 300); // Delay hide
  
  // Event delegation for dropdown hover
  document.addEventListener('mouseenter', handler, true);
  ```
- **Location**: 
  - `js/hamburger-menu.js` - Enhanced hover handling with timing
  - `css/items/widget/file-tree-dropdown.css` - Positioning and show class
- **Result**: Reliable hover experience - dropdown stays visible during mouse movement

### 38. Fixed Dropdown Container Blue Hover Issue (8/7/2025)
- **Problem**: Dropdown container was getting blue hover background instead of just individual items
- **Root Cause**: Conflicting CSS styles between `hamburger.css` and `file-tree-dropdown.css`
- **Issue Found**: hamburger.css had older styles that were overriding the newer dropdown styles:
  ```css
  #yourFilesItem .file-structure-list li:hover {
      background-color: #5353ff; /* This was affecting everything */
  }
  ```
- **Solution**: Removed conflicting styles from hamburger.css
- **Changes Made**:
  - **Removed** all dropdown styling from `hamburger.css`
  - **Kept** only `#yourFilesItem { position: relative; }` for positioning
  - **Cleaned** up old hover styles that were affecting container
- **Result**: Now only individual categories and cards get blue hover, not the container
- **Location**: 
  - `css/items/toolbar/hamburger.css` - Removed conflicting styles
  - `css/items/widget/file-tree-dropdown.css` - Now has full control
- **Key Learning**: Always check for conflicting CSS when styles don't behave as expected

### 39. Fixed Dropdown Not Appearing After CSS Cleanup (8/7/2025)
- **Problem**: After removing conflicting styles, dropdown stopped appearing on hover
- **Root Cause**: Removed too much CSS - lost opacity/visibility transitions needed for dropdown to show
- **Missing Styles**: When cleaning hamburger.css, accidentally removed essential visibility styles:
  ```css
  opacity: 0; visibility: hidden; /* Initial hidden state */
  opacity: 1; visibility: visible; /* Show state */
  transition: all 0.3s ease; /* Smooth transitions */
  ```
- **Solution**: Added back visibility styles to file-tree-dropdown.css
- **Changes Made**:
  - **Added** initial hidden state: `opacity: 0; visibility: hidden; transform: translateX(-10px);`
  - **Enhanced** `.show` class: `opacity: 1; visibility: visible; transform: translateX(0);`
  - **Added** smooth transition: `transition: all 0.3s ease;`
  - **Removed** conflicting animation keyframes
- **Technical Details**:
  - Dropdown starts hidden with opacity 0 and slight left offset
  - JavaScript adds `.show` class which triggers smooth transition to visible
  - 300ms transition creates smooth slide-in effect
- **Location**: `css/items/widget/file-tree-dropdown.css`
- **Result**: Dropdown now appears smoothly with proper visibility and no container hover effects

### 40. Simplified File Tree Back to Pure CSS (8/7/2025)
- **Problem**: JavaScript hover handling was overcomplicating and breaking the dropdown functionality
- **User Decision**: "Let's rid all this JavaScript stuff because it's breaking stuff more. Let's try pure CSS solution just make the menu and submenu touch."
- **Solution**: Stripped out all JavaScript hover logic, went back to simple CSS-only approach
- **Changes Made**:
  - **JavaScript**: Removed all show/hide logic, kept only tree population
  - **CSS**: Simplified to pure `:hover` states with no transitions
  - **Positioning**: `left: 100%` for direct adjacency (no gaps)
  - **Bridge**: Added 4px invisible bridge to prevent hover loss
  - **Removed**: All opacity, visibility, transform animations
- **Final CSS Approach**:
  ```css
  .file-structure-dropdown { display: none; left: 100%; }
  #yourFilesItem:hover .file-structure-dropdown,
  .file-structure-dropdown:hover { display: block; }
  #yourFilesItem::after { /* invisible bridge */ }
  ```
- **Benefits**:
  - **Simpler**: No JavaScript timing issues
  - **Reliable**: Pure CSS hover states
  - **Fast**: Instant show/hide, no animations
  - **Clean**: Only individual categories/cards get blue hover
- **Location**: 
  - `js/hamburger-menu.js` - Removed complex hover handling
  - `css/items/widget/file-tree-dropdown.css` - Back to simple CSS
- **Result**: Simple, reliable dropdown that just works with no gaps

## Firefox Extension Bookmark Integration (8/8/2025)

### 43. Extension Tab-Switching Issue (RESOLVED with localStorage Bridge)
- **Problem**: Extension switches tabs but doesn't inject bookmark data or show modal
- **Symptoms**:
  - Extension button clicks but nothing happens
  - Tab switches to Block Whiteboard but no modal appears
  - Functions `processBookmarkOnce` and `handleBookmarkData` are defined but not called
- **Debugging Steps Taken**:
  - Fixed manifest.json - removed unsupported "tabCapture" permission
  - Added debug logging to background.js to track message flow
  - Updated URL detection to support any localhost port
  - Verified functions are available in cards.js
- **Root Cause Found**: Duplicate message listeners in content-script.js
  - Two `browser.runtime.onMessage.addListener` blocks were conflicting
  - Bottom listener was overriding the top one
- **Solution Implemented**:
  - Consolidated to single message listener
  - Fixed content script to properly call `captureForBlockWhiteboard()`
  - Enhanced debugging with emoji markers (🎯) for extension logs
  - Added function existence checks before calling
- **Extension Flow**:
  1. User clicks extension button on any webpage
  2. Background script sends 'activateElementPicker' to content script
  3. Content script captures screenshot via browser API
  4. Content script sends 'sendToBlockWhiteboard' to background
  5. Background finds Block Whiteboard tab
  6. Injects concurrent-block.js then calls processBookmarkOnce()
  7. processBookmarkOnce() calls handleBookmarkData() in cards.js
  8. Modal appears for bookmark destination selection
- **Files Modified**:
  - `zenban-firefox-extension/content-script.js` - Fixed duplicate listeners
  - `zenban-firefox-extension/background.js` - Added comprehensive debugging
  - `js/cards.js` - Already has handleBookmarkData function
  - `js/bookmark-destination-selector.js` - Shows modal for card selection
- **Testing Instructions**:
  1. Reload extension in Firefox (about:debugging)
  2. Open browser console (F12) on both extension background page and app page
  3. Look for 🔬 EXTENSION logs in app console
  4. Look for 🎯 EXTENSION logs when clicking extension button
  5. Use test-extension-integration.html to verify functions work
- **Debugging Markers**:
  - 🔬 marks app-side logs (cards.js)
  - 🎯 marks extension injection logs (background.js)
  - 🌉 marks extension bridge logs (extension-bridge.js)
  - Console logs show full flow from click to modal

### 44. localStorage Bridge Implementation (8/8/2025)
- **Problem**: Script injection was unreliable due to browser security restrictions
- **Solution**: Implemented localStorage bridge for extension-to-app communication
- **How It Works**:
  1. Extension captures screenshot and metadata
  2. Extension finds/opens Block Whiteboard tab
  3. Extension writes bookmark data to localStorage with key `zenban_bookmark_[timestamp]`
  4. App listens for storage events via `extension-bridge.js`
  5. Bridge detects bookmark keys and calls `handleBookmarkData()`
  6. Modal appears for destination selection
- **Key Components**:
  - `extension-bridge.js` - Listens for localStorage changes
  - `background.js` - Writes to localStorage instead of script injection
  - Storage key pattern: `zenban_bookmark_[timestamp]`
  - Auto-cleanup after processing
- **Testing**:
  - Open console and run: `window.testExtensionBridge()`
  - This simulates extension data without needing the extension
- **Benefits**:
  - No script injection needed
  - Works across all security contexts
  - Handles pending bookmarks on page load
  - More reliable than postMessage or script injection
- **localStorage Cleanup**:
  - Automatically keeps only last 5 bookmarks in localStorage
  - Older bookmarks auto-deleted when new ones arrive
  - Prevents localStorage bloat
  - Cleanup runs on page load and after each new bookmark
- **Element Picker Reconnected**:
  - Element picker functionality restored in content-script.js
  - User can select specific elements to capture
  - Pink highlight box shows selected element
  - ESC key cancels selection
  - Element bounds included in bookmark data
- **Capture Modes**:
  - **Full Page**: Default mode, captures entire visible page
  - **Element Picker**: Visual selection of specific elements
  - Toggle mode with `toggleElementPicker` message
- **Files Updated**:
  - `extension-bridge.js` - Added cleanup logic for old bookmarks
  - `content-script.js` - Reconnected element picker
  - `manifest.json` - Added element-picker.js to web_accessible_resources
- **One-at-a-Time Processing**:
  - Only processes most recent bookmark on page load
  - Single bookmark flow for simplicity
  - User attention focused on one bookmark at a time

### 45. Extension Complete Fix - Multiple Issues Resolved (8/8/2025)
- **Problem 1**: Extension stopped working after first screenshot
- **Root Causes**:
  - Message handling wasn't properly returning values
  - Missing error boundaries causing extension crashes
  - isCapturing flag wasn't being reset
- **Fixes**:
  - Added try/catch blocks in background script
  - Added finally block to always reset isCapturing flag
  - Changed message handling to use synchronous responses
  - Added proper error handling to prevent crashes
  
- **Problem 2**: Modal couldn't create new cards when board was empty
- **Solution**: Added "Create New Card" button in bookmark destination modal
- **How it works**:
  - Shows blue "Create New Card" button at top of tree
  - If no categories exist, creates "Bookmarks" category
  - Creates new card and adds bookmark immediately
  - Optionally expands card to show the new bookmark
  
- **Problem 3**: Second bookmark failed to show modal
- **Root Causes**:
  - Notification error `window.simpleNotifications.showNotification is not a function` breaking execution
  - Modal state not properly resetting after first use
  - Cards disappearing from DOM when expanded (moved to document.body)
- **Fixes Applied**:
  - Fixed notification error with try/catch and proper function name
  - Enhanced modal close function to properly reset state
  - Added category ID tracking to cards (`card.dataset.categoryId`)
  - Modified board save to include expanded cards
  - Return card from `addCardToCategory` for proper reference
  
- **Board Save Fix**:
  - When cards are expanded, they move to `document.body`
  - Now checks for expanded cards and includes them in save
  - Tracks category ID to know where card belongs
  - Bookmarks now saved with card data
  
- **Extension Reset**:
  - Added proper error handling in `captureAndSend`
  - Always resets `isCapturing` flag even on errors
  - Logs success/failure for debugging
  
- **Files Updated**:
  - `bookmark-destination-selector.js` - Fixed notification error, improved modal reset
  - `boards.js` - Fixed save to include expanded cards
  - `cards.js` - Added category tracking, card IDs, return statement
  - `content-script.js` - Improved error handling
  - `extension-bridge.js` - Added success logging
  - `background.js` - Added error boundaries to prevent crashes

### 47. Firefox Extension Screenshot Dialog Implementation (Current)
- **Feature**: Added dialog asking users to choose screenshot capture method
- **Implementation**: Shows modal with three options when extension button clicked:
  - Full Page Screenshot (purple button) - Captures entire visible page
  - Select Specific Element (green button) - Activates element picker for targeted capture
  - Cancel (gray button) - Closes dialog without capturing
- **Technical Details**:
  - Removed old conditional logic checking `useElementPicker` setting
  - Now always shows dialog regardless of settings (as requested)
  - Dialog has overlay with backdrop blur effect
  - Includes hover effects and keyboard support (ESC to cancel)
  - Uses inline styles for reliability across different websites
- **Function**: `showCaptureDialog()` in content-script.js
- **Message Flow**:
  1. Browser action triggers 'activateElementPicker' message
  2. Content script shows dialog instead of immediately capturing
  3. User selects capture method or cancels
  4. Full page uses `captureForBlockWhiteboard()`
  5. Element selection activates `window.zenbanPicker.activate()`
- **Benefits**: 
  - Better user control over what gets captured
  - Clear visual feedback with modern UI
  - Prevents accidental full-page captures
  - Defaults to user choice rather than settings
- **Location**: 
  - `zenban-firefox-extension/content-script.js` (lines 213-368)
  - Dialog created dynamically in DOM with high z-index (2147483647)

### 46. Bookmark Display After Refresh Issue - FIXED (8/9/2025)
- **Problem**: Bookmarks loaded from Firebase but didn't display after refresh
- **Root Causes**: 
  1. Modal bookmark functions only updated DOM, not AppState
  2. Firebase serialization was preserving bookmarks but needed explicit initialization
- **Solution Implemented**:
  - Added unique IDs to cards (`card.dataset.cardId`) for tracking between DOM and AppState
  - Modified `expandCard` to find card's location in AppState and restore bookmarks if missing
  - Made bookmark operations (add, reorder) update AppState immediately
  - Store card IDs in saved board data and restore them when loading
  - Track card location (`appStateLocation`) when expanding for direct AppState updates
  - Fixed bookmark modal functions to update AppState when adding bookmarks
  - Added explicit bookmark array initialization in Firebase serialization
- **How it works now**:
  - When card expands, it finds itself in AppState by ID or title
  - If `card.bookmarks` is missing, restores from AppState
  - All bookmark changes update both DOM and AppState
  - Modal bookmark additions now properly update AppState
  - Bookmarks persist through refresh because they're in AppState and Firebase

### 59. Sections Not Saving with Lenis Scrolling (12/18/2024)
- **Problem**: Card sections added via "Add Section" button not saving to Firebase when Lenis is reinitialized
- **Root Causes**:
  1. Sections stored only on card DOM element (`card.sections`), not properly passed to Firebase
  2. `reinitializeModalLenis()` potentially losing section data when destroying/recreating Lenis
  3. `addCardToCategory()` function not accepting sections parameter when loading from Firebase
  4. Firebase sync service not passing sections when restoring cards
- **Debugging Added**:
  - Added comprehensive logging throughout section creation, save, and load flow
  - Track section IDs and bookmarks at each stage
  - Log when sections are backed up/restored during Lenis reinitialization
- **Solution Implemented**:
  1. **Fixed `addCardToCategory` signature**: Now accepts sections as 5th parameter
  2. **Fixed Firebase loading**: `sync-service.js` now passes sections when creating cards from Firebase  
  3. **Protected sections during Lenis reinit**: Added backup/restore of sections in `reinitializeModalLenis()`
  4. **Added debug logging**: Track sections throughout save/load cycle
- **Files Modified**:
  - `js/cards.js`: 
    - Updated `addCardToCategory` to accept and store sections from Firebase
    - Enhanced `reinitializeModalLenis` to backup/restore sections
    - Added debug logging for section tracking
  - `js/boards.js`: Added debug logging for section saves
  - `firebase/sync-service.js`: Updated to pass sections when loading cards
- **How it works now**:
  - Sections are stored on card element: `card.sections = sections || []`
  - When saving, sections are included in board data
  - When loading from Firebase, sections are passed through and restored
  - Lenis reinitialization backs up sections before destroy and restores after
  - All section operations update AppState for persistence
- **Testing**:
  - Create card with sections and bookmarks
  - Save to Firebase (check console for "SAVE DEBUG" logs)
  - Refresh page
  - Check console for "LOAD DEBUG" logs showing sections restored
  - Expand card - sections should appear with bookmarks intact