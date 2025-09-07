# Appwrite Cloud Quick Start Guide

## Create Your Project

1. Sign up/login at https://cloud.appwrite.io
2. Click "Create Project"
3. Choose your project name
4. Select your preferred region for data hosting

Your project will be assigned a unique Project ID and endpoint URL in the format: `https://REGION.cloud.appwrite.io/v1`

## Set Up Authentication and Database

### In the Console:

1. **Authentication**:
   - Go to Auth section
   - Enable providers (Email, OAuth2 providers like Google)
   - Configure email settings for verification

2. **Databases**:
   - Create a new Database
   - Add Collections (tables) for your data
   - Define attributes (columns) for each collection
   - Set permissions (who can read/write)

### In Your Code:

Follow the setup guide in `javascript-sdk-setup.md` for client initialization.

## Basic Usage Example

```javascript
import { Client, Account, Databases, ID } from 'appwrite';

// Initialize
const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const account = new Account(client);
const databases = new Databases(client);

// Create account
const user = await account.create(
    ID.unique(),
    'user@example.com',
    'password123'
);

// Login
await account.createEmailPasswordSession(
    'user@example.com',
    'password123'
);

// Check auth
const currentUser = await account.get();

// Create document
await databases.createDocument({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documentId: ID.unique(),
    data: { name: 'My Item' }
});
```

## Next Steps

- Explore authentication options in `authentication.md`
- Build data operations with `databases.md`
- Check your project metrics in the Cloud Console
- Monitor usage and billing

## Security Notes

- Never expose your Project ID or API keys in client-side code
- Use environment variables for sensitive data
- Configure CORS settings in Console for your domain
- Set up proper collection permissions

## Pricing

Appwrite Cloud is free for basic usage:
- 100GB Bandwidth/month
- 100GB Storage/month
- 200K Requests/month

See https://appwrite.io/pricing for full details.

For full documentation, visit https://appwrite.io/docs/quick-starts/web
