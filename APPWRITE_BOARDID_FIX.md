# Appwrite Database Schema Fixes

## Problems Identified

We discovered two schema mismatches between collections in the Appwrite database:

### 1. Missing boardId Attribute

1. The **boards** collection did NOT have a "boardId" attribute
2. But the **folders**, **canvasHeaders**, and **drawingPaths** collections all had "boardId" attributes

This mismatch caused errors when trying to save boards:
```
Invalid document structure: Unknown attribute: "boardId"
```

### 2. Timestamp Field Handling

After fixing the boardId issue, we encountered a second problem with timestamp fields:

```
Invalid document structure: Unknown attribute: "updatedAt"
```

The code was trying to directly write to `updatedAt` and `createdAt` fields, but in Appwrite these are system fields that are automatically provided with $ prefixes (`$createdAt` and `$updatedAt`).

## Solutions Implemented

### 1. BoardId Fix

1. Added the missing "boardId" attribute to the boards collection:
   - Type: string
   - Size: 36 characters (to stay within Appwrite ID limits)
   - Required: false (to maintain compatibility with existing records)

2. Updated test-board-fix.js to include the boardId field in test documents:
   ```javascript
   const minimalData = {
       useriD: currentUser.$id,
       name: 'Test Board ' + new Date().toLocaleTimeString(),
       boardId: documentId, // Use the document ID as the boardId
       folders: '[]',
       canvasHeaders: '[]',
       drawingPaths: '[]',
       isDevMode: false,
       onboardingShown: false
   };
   ```

### 2. Timestamp Fields Fix

1. Removed `updatedAt` and `createdAt` fields from all data objects being sent to Appwrite:
   ```javascript
   // BEFORE: Including timestamp fields (causes error)
   const saveData = {
       useriD: currentUser.$id,
       name: boardData.name || 'Untitled Board',
       boardId: boardData.id.toString(),
       folders: foldersStr,
       canvasHeaders: headersStr,
       drawingPaths: pathsStr,
       updatedAt: new Date().toISOString(), // PROBLEMATIC
       createdAt: new Date().toISOString(), // PROBLEMATIC
       isDevMode: boardData.isDevMode || false,
       onboardingShown: boardData.onboardingShown || false
   };
   
   // AFTER: Removing timestamp fields (works correctly)
   const saveData = {
       useriD: currentUser.$id,
       name: boardData.name || 'Untitled Board',
       boardId: boardData.id.toString(),
       folders: foldersStr,
       canvasHeaders: headersStr,
       drawingPaths: pathsStr,
       isDevMode: boardData.isDevMode || false,
       onboardingShown: boardData.onboardingShown || false
   };
   ```

2. The fix was applied to:
   - test-board-fix.js (test document creation)
   - appwrite-config.js (main saveBoard function)
   - fixes.js (safeCreateDocument helper)

## Schema Consistency

The appwrite-config.js file was already set up to include the boardId attribute in the saveData object:
```javascript
const saveData = {
    useriD: currentUser.$id,
    name: boardData.name || 'Untitled Board',
    boardId: boardData.id.toString(), // The database schema expects a string
    folders: foldersStr,
    canvasHeaders: headersStr,
    drawingPaths: pathsStr,
    // ... other fields
};
```

## Testing The Fix

You can test if the fix is working properly by:

1. Opening the app and using the "Appwrite Board Fix" panel that appears in the bottom-right corner
2. Click "Create Test" to test document creation with the updated schema
3. Click "Diagnose Schema" to verify the boardId field is present in the schema
4. Click "Fix Board" to attempt to fix the current board with the correct schema

## Important Note

This fix ensures that documents in the boards collection include a boardId field, which is consistent with the other collections (folders, canvasHeaders, and drawingPaths). This is essential for proper cross-collection referencing in the database.
