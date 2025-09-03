# Appwrite Migration Guide

## Overview

This document provides a comprehensive guide for migrating from Firebase to Appwrite for the Block Whiteboard (Zenban) application. All Firebase code has been commented out and replaced with stub functions to prevent import errors.

## Firebase → Appwrite Service Mapping

### 1. Authentication Service (authService)

#### Firebase Implementation → Appwrite Equivalent

| Firebase Function | Purpose | Appwrite Implementation |
|------------------|---------|------------------------|
| `authService.signInAnonymously()` | Create guest account | `account.createAnonymousSession()` |
| `authService.signUp(email, password)` | Create new user account | `account.create() + account.createEmailSession()` |
| `authService.signIn(email, password)` | Sign in existing user | `account.createEmailSession(email, password)` |
| `authService.signInWithGoogle()` | OAuth with Google | `account.createOAuth2Session('google', successUrl, failureUrl)` |
| `authService.signOut()` | Sign out current user | `account.deleteSession('current')` |
| `authService.getCurrentUser()` | Get current user | `account.get()` |
| `authService.onAuthStateChange(callback)` | Listen for auth changes | Custom implementation with `account.get()` polling or events |
| `authService.transferAnonymousData(fromUid, toUid)` | Migrate guest data | Custom implementation with Appwrite databases |
| `authService.createUserProfile(user, isGuest)` | Create user profile | `databases.createDocument()` in users collection |
| `authService.updateUserProfileAfterLink(user)` | Update profile after linking | `databases.updateDocument()` in users collection |
| `authService.checkRedirectResult()` | Check OAuth redirect | Handle OAuth callback in Appwrite |

### 2. Database Service (dbService)

#### Firebase Implementation → Appwrite Equivalent

| Firebase Function | Purpose | Appwrite Implementation |
|------------------|---------|------------------------|
| `dbService.saveBoard(boardData)` | Save board to cloud | `databases.createDocument()` or `databases.updateDocument()` |
| `dbService.loadBoards()` | Load all user boards | `databases.listDocuments()` with user filter |
| `dbService.loadBoard(boardId)` | Load specific board | `databases.getDocument(boardId)` |
| `dbService.deleteBoard(boardId)` | Delete board | `databases.deleteDocument(boardId)` |
| `dbService.getUserProfile()` | Get user profile | `databases.getDocument()` from users collection |

### 3. Sync Service (syncService)

#### Firebase Implementation → Appwrite Equivalent

| Firebase Function | Purpose | Appwrite Implementation |
|------------------|---------|------------------------|
| `syncService.init()` | Initialize sync service | Custom initialization with Appwrite |
| `syncService.saveAfterAction(actionName)` | Event-based save with debouncing | Custom implementation with Appwrite databases |
| `syncService.saveCurrentBoard()` | Save current board state | `databases.updateDocument()` with current board data |
| `syncService.loadInitialBoard()` | Load boards on startup | `databases.listDocuments()` after authentication |
| `syncService.loadBoardsFromFirebase()` | Alias for loadInitialBoard | `databases.listDocuments()` |
| `syncService.saveAllBoards()` | Save all boards | Batch `databases.updateDocument()` calls |
| `syncService.deleteBoard(boardId)` | Delete board from cloud | `databases.deleteDocument(boardId)` |
| `syncService.clearLocalData()` | Clear local app state | Custom implementation |
| `syncService.manualSave()` | Force immediate save | `databases.updateDocument()` bypassing debounce |
| `syncService.serializeBoardForFirebase()` | Serialize for cloud storage | Custom serialization for Appwrite |
| `syncService.deserializeBoardFromFirebase()` | Deserialize from cloud | Custom deserialization from Appwrite |

## UI Functions Affected by Firebase Integration

### Authentication UI (authUI)

#### User Interface Elements
1. **Auth Modal** (`firebase/auth-ui.js`)
   - Sign-in/Sign-up tabs
   - Email/password input fields
   - Google sign-in button
   - Error message display
   - Form validation

2. **Toolbar Auth Button** 
   - Sign In button (when not authenticated)
   - User menu with email/guest ID display
   - Sign Out functionality

3. **Sidebar User Info**
   - User email display (authenticated users)
   - Guest ID display (anonymous users)
   - User status indicator

#### UI State Management Functions
- `authUI.init()` - Initialize auth modal and event listeners
- `authUI.show()` - Display authentication modal
- `authUI.hide()` - Hide authentication modal
- `authUI.updateUIForUser(user)` - Update toolbar based on auth state
- `authUI.updateUserInfoForsidebar(user)` - Update sidebar user info
- `authUI.addAuthButton()` - Add auth button to toolbar
- `authUI.addUserInfoTosidebar()` - Add user info to sidebar

### Board Data Synchronization

#### Board Operations
1. **Board Creation/Loading**
   - `initializeBoard()` - Wait for Firebase sync vs create default content
   - `loadBoard(boardId)` - Load specific board from Firebase
   - `saveCurrentBoard()` - Save current board state to Firebase

2. **Real-time Sync Operations**
   - Event-based saving after user actions
   - Debounced save operations (300ms delay)
   - Save status indicator updates
   - Error handling and retry logic

#### Data Flow Functions
- `saveAfterAction(actionName)` - Triggered after every user action
- Board state serialization/deserialization
- Save queue management and processing
- Conflict resolution between local and remote data

### Save Status Indicator

#### UI Elements
1. **Save Status Display**
   - "Saving to cloud..." indicator
   - "Saved to cloud" confirmation
   - "Unsaved changes" warning
   - "Error saving" alert

2. **Manual Save Button**
   - Save button with loading states
   - Success/error visual feedback
   - Manual save trigger

#### Status Update Functions
- `updateSaveStatus(status)` - Update save indicator
- `addSaveIndicator()` - Add save status to toolbar
- Manual save button state management

### User Actions That Trigger Firebase Sync

#### Folder Operations
1. **Folder Management**
   - `createFolder()` → `syncService.saveAfterAction('folder created')`
   - `deleteFolder()` → `syncService.saveAfterAction('folder deleted')`
   - `toggleFolder()` → `syncService.saveAfterAction('folder toggled')`
   - Folder title editing → `syncService.saveAfterAction('folder title edited')`
   - Folder dragging → `syncService.saveAfterAction('folder moved')`

#### File Operations
2. **File Management**
   - `addFileToFolder()` → `syncService.saveAfterAction('file added')`
   - `deleteFile()` → `syncService.saveCurrentBoard()`
   - File content editing → Auto-save via sync service
   - File dragging → `syncService.saveAfterAction('file drag')`

#### Canvas Operations
3. **Canvas Headers**
   - `addCanvasHeader()` → `syncService.saveAfterAction('header created')`
   - `deleteCanvasHeader()` → `syncService.saveAfterAction('header deleted')`
   - Header text editing → `syncService.saveAfterAction('header text edited')`
   - Header dragging → `syncService.saveAfterAction('canvas header moved')`

#### Drawing Operations
4. **Canvas Drawing**
   - Drawing path creation → `syncService.saveAfterAction('drawing updated')`
   - Drawing clearing → `syncService.saveAfterAction('drawing cleared')`
   - Drawing state persistence to board data

#### Bookmark Operations
5. **Bookmark Management**
   - `addBookmarkToFile()` → `syncService.saveAfterAction('bookmark added')`
   - `addBookmarkToSection()` → `syncService.saveAfterAction('bookmark added to section')`
   - Bookmark organization → Various saveAfterAction calls

#### Board Operations
6. **Board Management**
   - `clearBoard()` → `syncService.saveAfterAction('board cleared')`
   - Board switching → `syncService.saveCurrentBoard()` before switch
   - Dev mode toggle → `syncService.markPendingChanges()`

### Guest Account Management

#### Guest Session Handling
1. **Automatic Guest Creation**
   - `initializeGuestAuth()` - Create anonymous session if no user
   - Guest ID persistence in localStorage
   - Session validation and cleanup

2. **Guest to User Migration**
   - `transferAnonymousData()` - Migrate guest data to real account
   - Account linking during sign-up process
   - Data preservation during account creation

#### Guest UI Elements
- Guest ID display in toolbar and sidebar
- Guest session persistence across page refreshes
- Guest data transfer notifications

### Error Handling and Network Management

#### Firebase Error Handling
1. **Authentication Errors**
   - User-friendly error messages for auth failures
   - Network connection error handling
   - OAuth popup/redirect error management

2. **Database Errors**
   - Save operation retry logic with exponential backoff
   - Data size validation (900KB limit for Firestore)
   - Permission and authentication error handling

#### Connection Monitoring
- Online/offline status detection
- Connection restoration handling
- Save queue management during network issues

### Development and Debug Features

#### Debug Information
1. **Dev Mode Integration**
   - User authentication status display
   - Board data statistics
   - Save operation logging
   - Firebase environment validation

2. **Debug Logging**
   - Authentication state changes
   - Sync operation progress
   - Error details and stack traces
   - Firebase service availability checks

## Appwrite Migration Steps

### 1. Setup Appwrite Project

```javascript
// Replace Firebase config with Appwrite config
const client = new Client()
    .setEndpoint('YOUR_APPWRITE_ENDPOINT')
    .setProject('YOUR_PROJECT_ID');

const account = new Account(client);
const databases = new Databases(client);
```

### 2. Database Schema Design

#### Users Collection
```json
{
  "userId": "string (document ID)",
  "email": "string",
  "isGuest": "boolean",
  "plan": "string",
  "boardCount": "integer",
  "createdAt": "datetime",
  "lastUpdated": "datetime"
}
```

#### Boards Collection
```json
{
  "boardId": "string (document ID)", 
  "userId": "string (relationship)",
  "name": "string",
  "folders": "json",
  "canvasHeaders": "json", 
  "drawingPaths": "json",
  "lastModified": "datetime",
  "isDevMode": "boolean"
}
```

### 3. Authentication Implementation

#### Replace Firebase Auth
```javascript
// Sign up
const user = await account.create(ID.unique(), email, password);
await account.createEmailSession(email, password);

// Sign in
await account.createEmailSession(email, password);

// Anonymous session
await account.createAnonymousSession();

// OAuth
await account.createOAuth2Session('google', successUrl, failureUrl);

// Get current user
const user = await account.get();

// Sign out
await account.deleteSession('current');
```

### 4. Database Operations Implementation

#### Replace Firebase Firestore
```javascript
// Save board
await databases.createDocument(
    'DATABASE_ID',
    'BOARDS_COLLECTION_ID', 
    boardId,
    boardData
);

// Load boards
const boards = await databases.listDocuments(
    'DATABASE_ID',
    'BOARDS_COLLECTION_ID',
    [Query.equal('userId', userId)]
);

// Load specific board
const board = await databases.getDocument(
    'DATABASE_ID',
    'BOARDS_COLLECTION_ID',
    boardId
);

// Delete board
await databases.deleteDocument(
    'DATABASE_ID',
    'BOARDS_COLLECTION_ID',
    boardId
);
```

### 5. Real-time Updates (Optional)

```javascript
// Subscribe to board changes
client.subscribe(`databases.DATABASE_ID.collections.BOARDS_COLLECTION_ID.documents.${boardId}`, response => {
    // Handle real-time updates
    console.log(response);
});
```

### 6. Error Handling Implementation

```javascript
// Replace Firebase error codes with Appwrite error handling
try {
    await account.createEmailSession(email, password);
} catch (error) {
    if (error.code === 401) {
        return 'Invalid email or password';
    } else if (error.code === 429) {
        return 'Too many requests. Please try again later';
    }
    return 'Authentication failed. Please try again.';
}
```

## Key Files to Update

### Core Service Files (Already Commented Out)
- `firebase/firebase-config.js` - Replace with Appwrite client setup
- `firebase/sync-service.js` - Reimplement with Appwrite databases
- `firebase/auth-ui.js` - Update auth service calls
- `firebase/guest-auth-init.js` - Replace with Appwrite anonymous sessions
- `firebase/firebase-error-handler.js` - Update error handling

### JavaScript Files with Firebase References
- `js/boards.js` - Board loading/saving logic
- `js/folders.js` - Folder operations and sync calls
- `js/files.js` - File operations and sync calls  
- `js/canvas-headers.js` - Header operations and sync calls
- `js/drawing/canvas-drawing.js` - Drawing sync calls
- `js/bookmark-destination-selector.js` - Bookmark sync calls
- `js/clear-board.js` - Board clearing sync calls
- `js/mode.js` - Dev mode auth checks
- `js/drag-drop.js` - Drag operation sync calls
- `js/dev-mode-controls.js` - Auth status checks

### HTML File
- `index.html` - Replace Firebase module imports with Appwrite initialization

## Testing Strategy

### 1. Authentication Testing
- Test email/password sign-up and sign-in
- Test OAuth flow with Google
- Test anonymous session creation
- Test account linking and data migration
- Test session persistence across page refreshes

### 2. Data Synchronization Testing
- Test board creation, loading, and deletion
- Test real-time sync operations
- Test offline/online behavior
- Test save error handling and retry logic
- Test data serialization/deserialization

### 3. UI Integration Testing
- Test auth state changes update UI correctly
- Test save status indicator updates
- Test error message display
- Test guest account UI elements
- Test dev mode integration

## Migration Checklist

- [ ] Set up Appwrite project and database collections
- [ ] Implement Appwrite authentication service
- [ ] Implement Appwrite database service  
- [ ] Update auth UI to use Appwrite
- [ ] Implement sync service with Appwrite
- [ ] Update all saveAfterAction calls
- [ ] Implement error handling for Appwrite
- [ ] Test authentication flows
- [ ] Test data synchronization
- [ ] Test UI state management
- [ ] Test offline/online behavior
- [ ] Update environment configuration
- [ ] Deploy and test in production

## Notes

- All Firebase code has been commented out with comprehensive documentation
- Stub exports prevent import errors during development
- Search for "TODO: Replace with Appwrite" comments for specific implementation points
- The existing UI and user experience should remain identical after migration
- Consider implementing real-time subscriptions for live collaboration features