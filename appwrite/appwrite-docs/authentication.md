# Appwrite Authentication Guide (JavaScript SDK)

## Overview

Appwrite Authentication supports multiple methods including email/password. The JavaScript SDK handles sessions automatically for client applications.

## Prerequisites

Initialize the Appwrite client (see javascript-sdk-setup.md).

```javascript
import { account } from './path-to-client';
```

## User Registration

Create a new user account:

```javascript
import { ID } from 'appwrite';

const user = await account.create(
    ID.unique(),
    'email@example.com',
    'password'
);
```

To create account with name:

```javascript
import { ID } from 'appwrite';

const user = await account.create(
    ID.unique(),
    'email@example.com',
    'password',
    'User Name'
);
```

## Login

Authenticate an existing user:

```javascript
const session = await account.createEmailPasswordSession(
    email,
    password
);
```

## Check Authentication Status

Verify if user is logged in and get user info:

```javascript
try {
    const user = await account.get();
    // User is authenticated
    console.log("User:", user);
    // Proceed with authenticated flow
} catch (error) {
    // User is not authenticated
    console.log("Not authenticated:", error);
    // Redirect to login or show login UI
}
```

## Logout

Delete current session:

```javascript
await account.deleteSession('current');
// User is now logged out
```

## Route Protection Example (General)

In your app, check authentication before rendering protected content:

```javascript
// On app load or route change
async function checkAuth() {
    try {
        const user = await account.get();
        // Show protected content
        return user;
    } catch (err) {
        // Redirect to login or handle unauthorized
        throw new Error("Unauthorized");
    }
}
```

## Additional Authentication Methods

Appwrite also supports:
- OAuth (Google, GitHub, etc.)
- Email OTP (one-time passwords)
- Phone SMS authentication
- Anonymous sessions
- Multi-factor authentication (MFA)

## Error Handling

Always wrap authentication calls in try-catch blocks:

```javascript
try {
    const session = await account.createEmailPasswordSession(email, password);
    // Success
} catch (error) {
    console.error(error.message);
    // Handle specific errors (invalid credentials, account blocked, etc.)
}
```

## Cloud Support

All authentication methods work with cloud Appwrite at `https://REGION.cloud.appwrite.io/v1`.

For OAuth: Use `account.createOAuth2Session(provider)` and handle redirects.

Check full docs at https://appwrite.io/docs/products/auth for additional methods.
