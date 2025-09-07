# Appwrite Setup Guide

## 🚀 Quick Start

Your Block Whiteboard application is now ready to use Appwrite! Follow these steps to complete the setup:

## 1. Create Appwrite Project

1. Go to [Appwrite Cloud](https://cloud.appwrite.io) or set up a [self-hosted Appwrite instance](https://appwrite.io/docs/installation)
2. Create a new project
3. Note down your:
   - **Project ID**
   - **Endpoint URL** (e.g., `https://sfo.cloud.appwrite.io/v1`)

## 2. Configure Database

### Create Database
1. In your Appwrite console, go to **Databases**
2. Click **Create Database**
3. Name it `zenban` (or any name you prefer)
4. Note down the **Database ID**

### Create Collections

#### Users Collection
1. Click **Create Collection**
2. Name: `users`
3. Add these attributes:
   - `userId` (String, required) - User's account ID
   - `email` (String, required) - User's email address
   - `createdAt` (DateTime, required) - Account creation date
   - `plan` (String, required, default: 'free') - User's plan type
   - `boardCount` (Integer, required, default: 0) - Number of boards
   - `isGuest` (Boolean, required, default: false) - Whether user is guest

#### Boards Collection
1. Click **Create Collection**
2. Name: `boards`
3. Add these attributes:
   - `userId` (String, required) - Owner's user ID
   - `id` (Integer, required) - Board ID (for local compatibility)
   - `name` (String, required) - Board name
   - `folders` (String, required) - JSON string of folder data
   - `canvasHeaders` (String, required) - JSON string of header data
   - `drawingPaths` (String, required) - JSON string of drawing data
   - `lastModified` (DateTime, required) - Last modification date
   - `isDevMode` (Boolean, default: false) - Dev mode flag
   - `onboardingShown` (Boolean, default: false) - Onboarding status

### Set Permissions

#### Users Collection Permissions
- **Create**: `users` (authenticated users can create their profile)
- **Read**: `user:[USER_ID]` (users can read their own profile)
- **Update**: `user:[USER_ID]` (users can update their own profile)
- **Delete**: `user:[USER_ID]` (users can delete their own profile)

#### Boards Collection Permissions
- **Create**: `users` (authenticated users can create boards)
- **Read**: `user:[USER_ID]` (users can read their own boards)
- **Update**: `user:[USER_ID]` (users can update their own boards)
- **Delete**: `user:[USER_ID]` (users can delete their own boards)

## 3. Enable Authentication

1. Go to **Auth** in your Appwrite console
2. Enable these authentication methods:
   - **Email/Password** (required)
   - **Anonymous Sessions** (required for guest accounts)
   - **Google OAuth** (optional, but recommended)

### For Google OAuth (Optional)
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add your domain to authorized origins
4. Copy Client ID and Client Secret to Appwrite

## 4. Update Configuration

Edit `appwrite/appwrite-config.js` and replace these values:

```javascript
const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1', // Your Appwrite endpoint
    projectId: 'YOUR_PROJECT_ID', // Your project ID
    databaseId: 'YOUR_DATABASE_ID', // Your database ID
    collections: {
        users: 'users', // Your users collection ID
        boards: 'boards' // Your boards collection ID
    }
};
```

## 5. Test Your Setup

1. Open `index.html` in your browser
2. The app should automatically:
   - Create an anonymous session (guest account)
   - Show a guest ID in the toolbar
   - Allow you to create folders and files
   - Save data to Appwrite when you make changes

### Test Authentication
1. Click **Sign In** button
2. Try creating an account with email/password
3. Your guest data should transfer to your new account
4. Sign out and sign back in to verify persistence

### Test Google OAuth (if enabled)
1. Click **Sign In** → **Continue with Google**
2. Complete OAuth flow
3. Verify your boards are preserved

## 6. Verify Data in Appwrite Console

1. Go to **Databases** → **zenban** (your database)
2. Check **users** collection - should see your user profile
3. Check **boards** collection - should see your board data

## 🔧 Troubleshooting

### Common Issues

#### "Project not found" Error
- Verify your `projectId` in `appwrite-config.js`
- Ensure your project is active in Appwrite console

#### "Collection not found" Error
- Check your `databaseId` and collection IDs in config
- Ensure collections exist and have correct names

#### Authentication Errors
- Verify authentication methods are enabled
- Check domain permissions for OAuth
- Ensure anonymous sessions are enabled

#### Permission Denied Errors
- Review collection permissions
- Ensure users can create/read/update their own documents
- Check attribute permissions

### Debug Information

Your app includes comprehensive debug logging:
- Open browser console (F12)
- Look for messages starting with:
  - `🔷 APPWRITE:` - Configuration and setup
  - `🔄 SYNC:` - Data synchronization
  - `👤 AUTH:` - Authentication events

### Reset and Start Over

If you need to reset:
1. Delete all documents from both collections
2. Clear browser localStorage: `localStorage.clear()`
3. Reload the page - new guest account will be created

## 📊 Performance Tips

### Optimize for Production

1. **Enable Compression** in Appwrite settings
2. **Set up CDN** for faster global access
3. **Monitor Usage** in Appwrite console
4. **Set up Backups** for important data

### Database Optimization

1. **Add Indexes** for frequently queried fields:
   - `userId` in both collections
   - `lastModified` in boards collection
2. **Monitor Query Performance** in Appwrite console

## 🔒 Security Best Practices

1. **Review Permissions** regularly
2. **Enable 2FA** for your Appwrite account
3. **Monitor Usage** for suspicious activity
4. **Keep Appwrite Updated** (if self-hosting)

## 🎉 You're Ready!

Your Block Whiteboard is now powered by Appwrite! You have:

✅ **Real-time data sync** - Changes save automatically to cloud
✅ **User authentication** - Email/password and Google OAuth
✅ **Guest accounts** - Anonymous users can try the app
✅ **Data migration** - Guest data transfers to real accounts
✅ **Offline support** - App works without internet (local storage)
✅ **Cross-device sync** - Access your boards from anywhere

## 📚 Next Steps

- Explore [Appwrite Functions](https://appwrite.io/docs/functions) for serverless logic
- Set up [Real-time subscriptions](https://appwrite.io/docs/realtime) for live collaboration
- Add [File Storage](https://appwrite.io/docs/storage) for image uploads
- Implement [Teams](https://appwrite.io/docs/teams) for board sharing

---

**Need Help?** 
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Discord](https://discord.gg/GSeTUeA)
- [GitHub Issues](https://github.com/appwrite/appwrite/issues)
