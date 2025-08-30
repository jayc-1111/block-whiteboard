# Important Notes for Zenban Firefox Extension

## CropperJS Loading Issue (2025-08-03)

### Update: 4K Display Scaling Issue
- Element bounds were off on high DPI displays
- Fixed by multiplying coordinates by `window.devicePixelRatio`
- Both CropperJS and fallback cropper now handle DPR correctly

### Problem
- CropperJS library failing to load with "ReferenceError: Cropper is not defined"
- Error occurs in crop-tool.js when trying to instantiate new Cropper
- cropper.min.js file exists (37KB) and is properly configured in manifest.json

### Solution Applied
1. **Loaded CropperJS directly in manifest.json**:
   - Added cropper.min.js to content_scripts array before other scripts
   - Removed dynamic loading function completely
   - CropperJS now loads automatically with content scripts

2. **Simplified crop-tool.js**:
   - Removed loadCropperJS function
   - Direct check for Cropper availability
   - Removed callback wrapper

3. **Added fallback cropper** that works without CropperJS:
   - Uses native Canvas API for cropping
   - Automatically crops to element bounds if provided
   - Falls back to full screenshot if no bounds

4. **Created download helper** (download-cropper.html) to fetch latest version from CDN if needed

### Root Cause Analysis
- CropperJS might not be attaching to window object immediately
- Content scripts run in isolated context which can affect global variable access
- Timing issue between script load and availability

### Future Improvements
- Consider bundling CropperJS differently
- Could try using ES6 modules if Firefox extension supports it
- Monitor if fallback cropper is sufficient and remove CropperJS dependency

## Failed Import Display Issue (2025-08-03)
- Bookmarks showing placeholder "Our Bookmark Screenshot Here!" instead of actual screenshots
- Fixed by changing data key from `screenshot` to `screenshotData` in content-script.js
- The whiteboard app expects the field name `screenshotData`

## Notes on Appstate Refactor
- Recent refactor to use appstate pattern caused multiple errors
- Errors have been slowly corrected
- Be cautious when making structural changes

## Duplicate Bookmark Messages Issue (2025-08-03)
- Bookmarks were being processed multiple times causing Quill.js errors
- Root cause: Both postMessage and background script were sending to app
- App has duplicate listeners in bookmarks.js and extension-listener.js
- Attempted solutions:
  1. Direct function call - failed because handleBookmarkData not in global scope
  2. Unique message type - requires app code changes
- Current status: Extension sends one message, but app processes it twice
- **Fix needed in app**: Add deduplication to handleBookmarkData function

## 404 Error for undefined (2025-08-03)
- App trying to load http://127.0.0.1:5500/undefined
- Likely a missing favicon or resource URL

## Tab Switch Bookmark Failure (2025-08-08)
### Problem
- First bookmark works perfectly and loads into file
- Second bookmark attempt switches tabs but fails to create modal
- Extension appears to stop without error messages
- No console errors in extension debugger

### Root Cause Found
- JavaScript const variable redeclaration error when executeScript runs multiple times
- Error: "redeclaration of const bookmarkData"
- Variables persist in tab context between executeScript calls

### Solution Applied
- Wrapped executeScript code in IIFE (Immediately Invoked Function Expression)
- Creates new scope for each execution, preventing variable conflicts
- Changed `const bookmarkData = ...` to `(function() { const bookmarkData = ...; })();`

## UX Improvement: Expanded File Bookmark Modal (2025-08-08)
- Issue: Bookmarks automatically added to expanded files without user confirmation
- Solution: Added modal asking "Add to open file?" or "Add elsewhere"
- Prevents accidental additions to wrong files

### Debugging Improvements
- Added heartbeat monitoring to track content script lifecycle
- Enhanced logging with emoji prefixes for better tracking
- Content script remained alive - issue was only with localStorage write
