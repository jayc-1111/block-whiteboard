<!-- TEST: File editing is working! -->

# Zenban - A Zen Kanban Board

Zenban is a visual project management tool that combines the tranquility of zen with the efficiency of kanban boards.

## Features

- **Drag & Drop Interface**: Intuitive file and category management
- **Rich Text Editing**: Powered by Quill editor for formatting notes
- **Multiple Boards**: Organize different projects separately
- **Super Headers**: Create visual groupings with large headers
- **Themes**: Multiple visual themes including Dark, Light, and fun modes
- **Grid Snap**: Align elements to a grid for perfect organization
- **Firebase Integration**: Cloud sync and authentication

## Firebase Setup

1. **Authentication Setup**:
   - Enable Email/Password authentication in Firebase Console
   - Enable Google Sign-In provider
   
2. **Firestore Database**:
   - Create a Firestore database in production mode
   - Apply these security rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Firebase Configuration**:
   - The Firebase config is already set up in `js/firebase-config.js`
   - No additional configuration needed

## Usage

1. **Sign In/Sign Up**: Click the "Sign In" button in the top bar
2. **Create Categories**: Click "Add Category" or right-click on canvas
3. **Add Files**: Click the "+" button in any category
4. **Edit Files**: Click the edit icon that appears on hover
5. **Drag & Drop**: Move files between categories or reposition elements
6. **Save**: Changes auto-save every 30 seconds when signed in

## Development

The app uses vanilla JavaScript with modular architecture:
- `js/firebase-config.js` - Firebase setup and services
- `js/auth-ui.js` - Authentication UI components
- `js/sync-service.js` - Cloud synchronization logic
- `js/boards.js` - Board management
- `js/categories.js` - Category operations
- `js/files.js` - File functionality

## Local Development

1. Clone the repository
2. Serve the files using a local web server (e.g., `python -m http.server`)
3. Open `http://localhost:8000` in your browser

## Future Features

- Real-time collaboration
- File attachments and images
- Board sharing and permissions
- Mobile app version
- Export/Import functionality
