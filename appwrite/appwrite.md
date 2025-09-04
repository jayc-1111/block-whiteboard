# Appwrite Database Setup Documentation

## Overview

This document outlines the complete database setup for the whiteboard application using Appwrite with a Free Plan optimized approach including authentication integration and storage configuration.

## Database Setup Status

The database has been configured to work within Appwrite's free tier limitations while maintaining full functionality.

### Collections Created

1. **boards** - Main board container
2. **bookmarks** - Bookmark storage with metadata
3. **folders** - Folder hierarchy management
4. **files** - File storage with JSON-embedded content
5. **canvasheaders** - Canvas header text elements
6. **drawingpaths** - Drawing path data storage

### Free Plan Limitations Addressed

**Appwrite Free Plan Constraints:**
- Maximum of 5 attributes per collection
- Storage and API usage limits

**Solution Implemented:** JSON field embedding for complex data structures.

## Files Collection Structure

Due to the 5-attribute limit, the `files` collection uses a compact structure with embedded JSON:

```json
{
  "boardId": "string (required)",
  "folderId": "string (required)",
  "title": "string (required)",
  "content": {
    "text": "file content here...",
    "position": {"left": 100, "top": 200},
    "sections": ["section1", "section2"]
  },
  "bookmarks": []
}
```

## Database Components

### Attributes Created

**Files Collection (5/5 attributes):**
- `boardId` (string, required)
- `folderId` (string, required)
- `title` (string, required)
- `content` (string, required) - JSON-embedded data
- `bookmarks` (string, optional) - JSON bookmark array

**CanvasHeaders Collection (3/3 attributes):**
- `boardId` (string, required)
- `text` (string, required)
- `position` (string, required)

**DrawingPaths Collection (2/2 attributes):**
- `boardId` (string, required)
- `paths` (string, optional)

### Indexes Created

- `files.boardId` - General index for board relationships
- `files.folderId` - Key index for folder relationships
- `canvasheaders.boardId` - Key index for board relationships
- `drawingpaths.boardId` - Key index for board relationships

## Authentication Integration

### Appwrite Built-in User Management Strategy

**Key Principles:**
- Utilize Appwrite's Account API instead of custom user collections
- Store `account.get().$id` in all `userId` fields for user references
- Use `['users']` permissions for all authenticated user access
- Leverage Appwrite's native authentication methods

### Implementation Patterns

**User Reference Pattern:**
```javascript
// Get current user
const user = await account.get();
const userId = user.$id;

// Use for all document references
const boardData = {
    userId: userId,
    name: "My Board",
    // ... other fields
};
```

**Permission System:**
```javascript
// Database document permissions
const permissions = [
    new Permission('read', 'users'),
    new Permission('write', 'users'),
    new Permission('delete', 'users')
];
```

### Authentication Status Summary

- **User Management:** Built-in Appwrite account system
- **Guest Authentication:** Supported via Appwrite anonymous auth
- **Session Handling:** Appwrite's native session management
- **User Preferences:** Store in `account.get().prefs`

## Integration Utility

A utility class `FileContentHelper` has been created to handle JSON embedding operations.

### Usage Examples

**Saving a File:**
```javascript
const fileData = {
    boardId: "board-id",
    folderId: "folder-id",
    title: "Document Title",
    text: "Content",
    position: { left: 100, top: 200 },
    sections: ["Intro", "Body"],
    bookmarks: []
};

const dbReadyObject = FileContentHelper.createFileObject(fileData);
// Save to Appwrite database
```

**Loading a File:**
```javascript
const dbFile = await databases.getDocument('main', 'files', fileId);
const parsedFile = FileContentHelper.parseFileObject(dbFile);

// Access individual components:
console.log(parsedFile.text);      // File content
console.log(parsedFile.position);  // Position coordinates
console.log(parsedFile.sections);  // Section array
```

## Access Methods for Embedded Data

For components embedded in the JSON structure:

```javascript
// Access specific fields without parsing whole object
const position = FileContentHelper.getField(dbFile.content, 'position');
const sections = FileContentHelper.getField(dbFile.content, 'sections');

// Update specific fields efficiently
const updatedContent = FileContentHelper.updateField(
    currentJson,
    'position',
    newPosition
);
```

## Database Status Summary

- **Collections:** 6/6 implemented
- **Attributes:** 10/10 functional (5 + JSON embedding)
- **Indexes:** 4/4 implemented
- **Functional Coverage:** 100% within free tier limits

## Future Upgrade Path

When upgrading from the free tier:

1. Split the `content` JSON into separate attributes:
   - `text` (string)
   - `sections` (string - JSON array)
   - `position` (string - JSON object)

2. Create additional indexes as needed

3. The existing `FileContentHelper` utility will continue functioning

## Storage Configuration

### Appwrite Storage Setup Requirements

**Existing Configuration:**
- Bucket Name: "Bookmark Screenshots"
- Bucket ID: 68b9afed003dc71a4ac3

### Storage Permissions Pattern

```javascript
const bucketPermissions = [
    new Permission('create', 'users'),
    new Permission('read', 'users'),
    new Permission('write', 'users'),
    new Permission('delete', 'users')
];
```

### File Operations Examples

**Upload Files:**
```javascript
// Use Appwrite Storage API for uploads
const uploadResponse = await storage.createFile(
    '68b9afed003dc71a4ac3',  // Bucket ID
    uniqueId(),
    fileObject
);
```

**Access File URLs:**
```javascript
// Get download URL
const fileUrl = storage.getFileDownload(
    '68b9afed003dc71a4ac3',
    fileId
);
```

## Data Type Guidelines

### String Field Size Recommendations
- **ID Fields:** 36 characters (UUID format)
- **Title Fields:** 255 characters (common titles/names)
- **URL Fields:** 2048 characters (browser compatibility)
- **Description Fields:** 5000 characters (flexible content)
- **Content Fields:** 10000 characters (JSON embedding)

### JSON Handling Strategy
- Store complex objects as stringified JSON
- Use `FileContentHelper` for JSON-embedded fields
- Manual parse/stringify for other JSON fields

## Success Criteria & Testing

### Authentication Testing Requirements
- Email/password registration and login
- OAuth provider integration (Google, GitHub)
- Guest authentication functionality
- Session management verification

### Database Operations Validation
- All 6 collections functional
- Permissions working correctly
- Data persistence across sessions
- Performance within limits

### User Experience Verification
- Seamless authentication flow
- Proper data isolation by user
- Guest user feature availability
- Error handling and fallback states

## Risk Assessment Summary

### Low Risk Areas
- Database schema changes
- Permission system updates
- Documentation changes

### Medium Risk Areas
- Authentication flow integration
- Sync service modifications
- Storage bucket configuration

### Mitigation Strategies
- Comprehensive authentication testing
- Gradual user isolation verification
- Emergency rollback plans
- Progressive feature rollout

## Timeline Expectations

### Implementation Phases
- **Authentication Integration:** 2-3 hours
- **Database Integration:** 1-2 hours
- **Documentation Updates:** 1 hour
- **Testing & Validation:** 2-3 hours

**Total Estimated Time:** 6-9 hours

## Project Files

- `MANUAL_SETUP_README.md` - Complete setup instructions with highlighting
- `MIGRATION_PLAN.md` - Original migration planning document
- `file-content-helper.js` - JSON embedding utility for data operations
- `appwrite-config.js` - Configuration settings
- `database-setup.js` - Database setup service and schemas

## Last Updated

September 4, 2025
