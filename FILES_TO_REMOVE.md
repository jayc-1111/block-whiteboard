# Files Marked for Removal

This document lists all files that have been marked for removal. Each file has been tagged with a comment explaining why it's safe to delete.

## Status
✅ All files have been marked with removal comments
✅ All imports and script tags have been commented out
✅ Recovery option has been updated to use console command

## Firebase Directory Files

### 1. auth-ui-backup.js
- **Reason**: Backup file of auth-ui.js
- **Status**: Not imported or used anywhere
- **Path**: `firebase/auth-ui-backup.js`

### 2. auth-reset-utility.js
- **Reason**: Development utility for testing authentication
- **Function**: Provides `window.forceAuthReset()`
- **Status**: Not needed in production
- **Path**: `firebase/auth-reset-utility.js`

### 3. auth-status-checker.js
- **Reason**: Development utility for debugging auth issues
- **Function**: Provides `window.checkAuthStatus()`
- **Status**: Not needed in production
- **Path**: `firebase/auth-status-checker.js`

### 4. popup-test-utility.js
- **Reason**: Development utility for testing popup blocking
- **Function**: Provides `window.testPopupBlocking()`
- **Status**: Not needed in production
- **Path**: `firebase/popup-test-utility.js`

### 5. live-sync-service.js
- **Reason**: Live sync feature is disabled
- **Issue**: Was causing duplicate categories and UI issues
- **Status**: Disabled via `window.LIVE_SYNC_DISABLED = true`
- **Path**: `firebase/live-sync-service.js`

### 6. live-sync-ui.js
- **Reason**: UI component for disabled live sync feature
- **Note**: Duplicate exists in js directory
- **Status**: Feature is disabled
- **Path**: `firebase/live-sync-ui.js`

## JS Directory Files

### 7. live-sync-ui.js
- **Reason**: Duplicate of firebase/live-sync-ui.js
- **Status**: Live sync is disabled
- **Path**: `js/live-sync-ui.js`

### 8. backup-recovery-ui.js
- **Reason**: Unused backup recovery UI
- **Status**: Not referenced anywhere in codebase
- **Note**: Recovery handled by `recoverBoard()` function
- **Path**: `js/backup-recovery-ui.js`

## CSS Directory Files

### 9. live-sync-indicator.css
- **Reason**: CSS for disabled live sync feature
- **Status**: Feature is disabled
- **Path**: `css/dev-mode/live-sync-indicator.css`

### 10. live-sync.css
- **Reason**: CSS for disabled live sync feature
- **Status**: Feature is disabled
- **Path**: `css/dev-mode/live-sync.css`

## Changes Made to index.html

1. Commented out imports for:
   - auth-reset-utility.js
   - popup-test-utility.js
   - auth-status-checker.js
   - live-sync-service.js
   - live-sync-ui.js

2. Commented out CSS links for:
   - live-sync-indicator.css
   - live-sync.css

## To Delete These Files

Run these commands from the project root:

```bash
# Firebase directory
rm firebase/auth-ui-backup.js
rm firebase/auth-reset-utility.js
rm firebase/auth-status-checker.js
rm firebase/popup-test-utility.js
rm firebase/live-sync-service.js
rm firebase/live-sync-ui.js

# JS directory
rm js/live-sync-ui.js
rm js/backup-recovery-ui.js

# CSS directory
rm css/dev-mode/live-sync-indicator.css
rm css/dev-mode/live-sync.css
```

## Notes

- All development utilities have been marked but not deleted yet
- Live sync was causing duplicate category issues and has been disabled
- The core functionality (auth, sync, boards) remains intact
- No production features are affected by these removals
