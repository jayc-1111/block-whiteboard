
Start with Authentication

You can get up and running with Appwrite Authentication in minutes. You can add basic email and password authentication to your app with just a few lines of code.
Signup

You can use the Appwrite Client SDKs to create an account using email and password.

import { Client, Account, ID } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const account = new Account(client);

const user = await account.create({
    userId: ID.unique(), 
    email: 'email@example.com', 
    password: 'password'
});

Login

After you've created your account, users can be logged in using the Create Email Session method.

const session = await account.createEmailPasswordSession({
    email: email, 
    password: password
});

Check authentication state

After logging in, you can check the authentication state of the user.

Appwrite's SDKs are stateless, so you need to manage the session state in your app. You can use the Get Account method to check if the user is logged in.

try {
    const user = await account.get();
    // Logged in
} catch (err) {
    // Not logged in
}

Navigation (Optional)

A common pattern is to use route guards to redirect users to the login page if they are not authenticated. You can check the authentication state on app launch and before entering a protected route by calling get().

Route guard implementations are opinionated and depend on the platform and frame you are using. Take a look at some example usages from different platforms as inspiration.


Accounts

Appwrite Account API is used for user signup and login in client applications. Users can be organized into teams and be given labels, so they can be given different permissions and access different resources.
Account vs Users API

The Account API is the API you should use in your client applications with Client SDKs like web, Flutter, mobile, and native apps. Account API creates sessions, which represent an authenticated user and is attached to a user's account. Sessions respect permissions, which means users can only access resources if they have been granted the correct permissions.

The Users API is a dedicated API for managing users from an admin's perspective. It should be used with backend or server-side applications with Server SDKs. Users API uses API keys instead of sessions. This means they're not restricted by permissions, but by the scopes granted to the API key used.
Signup and login

You can signup and login a user with an account create through email password, phone (SMS), Anonymous, magic URL, and OAuth 2 authentication.
Permissions

You can grant permissions to all users using the Role.users(<STATUS>) role or individual users using the Role.user(<USER_ID>, <STATUS>) role.
Description	Role
Verified users
	Role.users('verified')
Unverified users
	Role.users('unverified')
Verified user
	Role.user(<USER_ID>, 'verified')
Unverified user
	Role.user(<USER_ID>, 'unverified')


Manage users

Appwrite Users API is used for managing users in server applications. Users API can only be used with an API key with the Server SDK, to manage all users. If you need to act on behalf of users through an Appwrite Function or your own backend, use JWT login.
Account vs Users API

The Account API is the API you should use in your client applications with Client SDKs like web, Flutter, mobile, and native apps. Account API creates sessions, which represent an authenticated user and is attached to a user's account. Sessions respect permissions, which means users can only access resources if they have been granted the correct permissions.

The Users API is a dedicated API for managing users from an admin's perspective. It should be used with backend or server-side applications with Server SDKs. Users API uses API keys instead of sessions. This means they're not restricted by permissions, but by the scopes granted to the API key used.

The users API can be used to create users, import users, update user info, get user audit logs, and remove users.


Teams

Teams are a good way to allow users to share access to resources. For example, in a todo app, a user can create a team for one of their todo lists and invite another user to the team to grant the other user access. You can further give special rights to parts of a team using team roles.

The invited user can accept the invitation to gain access. If the user's ever removed from the team, they'll lose access again.

Learn about using Teams for multi-tenancy
Create team

For example, we can create a team called teachers with roles maths, sciences, arts, and literature.

The creator of the team is also granted the owner role. Only those with the owner role can invite and remove members.

import { Client, Teams } from "appwrite";

const client = new Client();

const teams = new Teams(client);

client
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>') // Your project ID
;

const promise = teams.create(
    'teachers',
    'Teachers',
    ['maths', 'sciences', 'arts', 'literature']
);

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Invite a member

You can invite members to a team by creating team memberships. For example, inviting "David" a math teacher, to the teachers team.

import { Client, Teams } from "appwrite";

const client = new Client();

const teams = new Teams(client);

client
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>') // Your project ID
;

const promise = teams.createMembership(
    'teachers',
    ["maths"],
    "david@example.com"
    );

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Using the CLI
Before proceeding

Ensure you install the CLI, log in to your Appwrite account, and initialize your Appwrite project.

Use the CLI command appwrite teams create-membership [options] to invite a new member into your team.
Shell

appwrite teams create-membership --team-id "<TEAM_ID>" --roles --phone "+12065550100" --name "<NAME>" --user-id "<USER_ID>"

You can also get, update, and delete a user's membership. However, you cannot use the CLI to configure permissions for team members.

Learn more about the CLI teams commands
Permissions

You can grant permissions to all members of a team using the Role.team(<TEAM_ID>) role or individual roles in the team using the Role.team(<TEAM_ID>, [<ROLE_1>, <ROLE_2>, ...]) role.
Description	Role
All members
	Role.team(<TEAM_ID>)
Select roles
	Role.team(<TEAM_ID>, [<ROLE_1>, <ROLE_2>, ...])

Learn more about permissions
Memberships privacy

In certain use cases, your app may not need to share members' personal information with others. You can safeguard privacy by marking specific membership details as private. To configure this setting, navigate to Auth > Security > Memberships privacy

These details can be made private:

    userName - The member's name
    userEmail - The member's email address
    mfa - Whether the member has enabled multi-factor authentication


Preferences

Preferences allow you to store settings like theme choice, language selection, or notification preferences that are specific to individual users or shared across teams.
User preferences

You can store user preferences on a user's account using Appwrite's Update Preferences endpoint.

Preferences are stored as a key-value JSON object. The maximum allowed size for preferences is 64kB, and an error will be thrown if this limit is exceeded.
Update user preferences

Use the updatePrefs method to store user preferences as a JSON object.

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const account = new Account(client);

const promise = account.updatePrefs({darkTheme: true, language: 'en'});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Get user preferences

Retrieve stored preferences with the getPrefs method.

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const account = new Account(client);

const promise = account.getPrefs();

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Team preferences

Team preferences let you store settings that apply to an entire team of users. They are well-suited for collaborative features like team-wide themes, notification preferences, or feature toggles.

Team preferences are stored as a JSON object in the team row and are limited to 64kB of data. All team members can access these shared preferences.

Learn more about Appwrite Teams
Update team preferences

Store team-wide settings using the updatePrefs method with a team ID.

import { Client, Teams } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const teams = new Teams(client);

const promise = teams.updatePrefs(
    '<TEAM_ID>',
    {
        theme: 'corporate',
        notificationsEnabled: true,
        defaultView: 'kanban'
    }
);

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Get team preferences

Fetch team preferences by passing a team ID to the getPrefs method.

import { Client, Teams } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const teams = new Teams(client);

const promise = teams.getPrefs('<TEAM_ID>');

promise.then(function (prefs) {
    console.log(prefs); // Team preferences
}, function (error) {
    console.log(error);
});

Learn more about storing user preferences


Labels

Labels are a good way to categorize a user to grant them access to resources. For example, a subscriber label can be added to a user once they've purchased a subscription.

const sdk = require('node-appwrite');

const client = new sdk.Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>')                 // Your project ID
    .setKey('98fd4...a2ad2');                    // Your secret API key

const users = new sdk.Users(client);

const promise = users.updateLabels(
    '<USER_ID>',
    [ 'subscriber' ]
);

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

This would correspond with the permissions below.
Description	Code Snippet
Read
	Permissions.read(Role.label('subscriber'))
Update
	Permissions.update(Role.label('subscriber'))
Delete
	Permissions.delete(Role.label('subscriber'))
Create
	Permissions.create(Role.label('subscriber'))


Security

Appwrite provides many security features to keep both your Appwrite project and your user's information secure.
Persistence

Appwrite handles the persistence of the session in a consistent way across SDKs. After authenticating with an SDK, the SDK will persist the session so that the user will not need to log in again the next time they open the app. The mechanism for persistence depends on the SDK.
Best Practice

Only keep user sessions active as long as needed and maintain exactly one instance of the Client SDK in your app to avoid conflicting session data.
	Framework	Storage method
Javascript logo
	Web
	Uses a secure session cookie and falls back to local storage when a session cookie is not available.
Javascript logo
	Flutter
	Uses a session cookie stored in Application Documents through the path_provider package.
Javascript logo
	Apple
	Uses a session cookie stored in UserDefaults.
Javascript logo
	Android
	Uses a session cookie stored in SharedPreferences.
Session limits

In Appwrite versions 1.2 and above, you can limit the number of active sessions created per user to prevent the accumulation of unused but active sessions. New sessions created by the same user past the session limit delete the oldest session.

You can change the session limit in the Security tab of the Auth Service in your Appwrite Console. The default session limit is 10 with a maximum configurable limit of 100.
Permissions

Security is very important to protect users' data and privacy. Appwrite uses a permissions model coupled with user sessions to ensure users need correct permissions to access resources. With all Appwrite services, including databases and storage, access is granted at the collection, bucket, document, or file level. These permissions are enforced for client SDKs and server SDKs when using JWT, but are ignored when using a server SDK with an API key.
Password history

Password history prevents users from reusing recent passwords. This protects user accounts from security risks by enforcing a new password every time it's changed.

Password history can be enabled in the Auth service's Security tab on the Appwrite Console. You can choose how many previous passwords to remember, up to a maximum of 20, and block users from reusing them.
Password dictionary

Password dictionary protects users from using bad passwords. It compares the user's password to the 10,000 most common passwords and throws an error if there's a match. Together with rate limits, password dictionary will significantly reduce the chance of a malicious actor guessing user passwords.

Password dictionary can be enabled in the Auth service's Security tab on the Appwrite Console.
Password hashing

Appwrite protects passwords by using the Argon2 password-hashing algorithm.

Argon 2 is a resilient and secure password hashing algorithm that is also the winner of the Password Hashing Competition.

Appwrite combines Argon 2 with the use of techniques such as salting, adjustable work factors, and memory hardness to securely handle passwords.

If an user is imported into Appwrite with hash differnt than Argon2, the password will be re-hashed on first successful user's sign in. This ensures all passwords are stored as securely as possible.
Personal data

Encourage passwords that are hard to guess by disallowing users to pick passwords that contain personal data. Personal data includes the user's name, email, and phone number.

Disallowing personal data can be enabled in the Auth service's Security tab on the Appwrite Console.
Session alerts

Enable email alerts for your users so that whenever another session is created for their account, they will be alerted to the new session.

You won't receive notifications when logging in using Magic URL, Email OTP, or OAuth2 since these authentication methods already verify user access to their systems, establishing the authentication's legitimacy.

To toggle session alerts, navigate to Auth > Security > Session alerts.
Memberships privacy

In certain use cases, your app may not need to share members' personal information with others. You can safeguard privacy by marking specific membership details as private. To configure this setting, navigate to Auth > Security > Memberships privacy

These details can be made private:

    userName - The member's name
    userEmail - The member's email address
    mfa - Whether the member has enabled multi-factor authentication

Mock phone numbers

Creating and using mock phone numbers allows users to test SMS authentication without needing an actual phone number. This can be useful for testing edge cases where a user doesn't have a phone number but needs to sign in to your application using SMS.

To create a mock phone number, navigate to Auth > Security > Mock Phone Numbers. After defining a mock phone number, you need to define a specific OTP code that will be used for SMS sign-in instead of the SMS secret code sent to a real phone number.


Tokens

Tokens are short-lived secrets created by an Appwrite Server SDK that can be exchanged for session by a Client SDK to log in users. Some auth methods like Magic URL login, Email OTP login, or Phone (SMS) login already generate tokens.

You can also create custom tokens using the Create token endpoint of the Users API. This can be used to implement custom authentication flows.

Tokens are created with the following properties:
Property	Type	Description
$id
	string
	Token ID.
$createdAt
	string
	Token creation date in ISO 8601 format.
userId
	string
	User ID.
secret
	string
	Token secret key. This will return an empty string unless the response is returned using an API key or as part of a webhook payload.
expire
	string
	Token expiration date in ISO 8601 format.

Many Appwrite authentication methods use a token-base flow to authenticate users. For token-based authentication methods, there are two high level steps to authenticate a user:
Token login

You can find different usage of tokens in the Appwrite.
Custom token login
Email OTP login
Email magic URL
Phone (SMS) OTP



Identities

Identities enable linking multiple authentication methods to a single user account. This allows users to access a unified account through various OAuth2 providers.

An identity is another way to refer to a user account. A single user can have multiple identities, each corresponding to different authentication methods. Currently, identities are primarily used with OAuth2 providers. When a user logs in via an OAuth2 provider, an identity is created and linked to their Appwrite account. This system enables:

    Connecting multiple OAuth2 accounts to a single Appwrite account
    Maintaining consistent access regardless of login method
    Tracking which external providers are linked to an account

Use cases

Identities are primarily used in the following scenarios:

    OAuth2 authentication: When users authenticate through any OAuth2 provider
    Account management: When users want to link or unlink external provider accounts
    User profile consolidation: When maintaining a single user profile across multiple authentication methods

Create new identities

To create a new identity:

    The user must be logged into their Appwrite account
    Initiate the OAuth2 authentication flow for the desired provider
    The new identity will be automatically created and linked to the current account

For implementation details and code examples, refer to the OAuth2 documentation.
Manage email addresses

Each email address must be unique across all users and identities. For example, if a user with email joe@example.com creates an identity using other@company.com, that second email becomes reserved. This means no other user can create either a new account or a new identity using other@company.com. This restriction helps maintain consistent user identity across your application.
List and delete identities

Users and administrators can manage identities through various operations available in the Account API:

    List identities
    Delete an identity

For detailed API specifications and code examples, refer to the Account API Reference.
Clean up identities

When a user account is deleted:

    Associated identities (and related targets) are removed via a background job
    This deletion is asynchronous and may not be immediate due to queue processing times
    In testing scenarios where instant deletion is required, manually remove identities (and targets) before deleting the user account

Best practices

A good user experience typically includes clear visibility of connected providers and straightforward identity management.

Verify email addresses where possible and implement proper session management. Secure identity deletion can help prevent unauthorized access.

Testing should ideally cover the cleanup of test identities and email conflict scenarios.


Email and password login

Email and password login is the most commonly used authentication method. Appwrite Authentication promotes a safer internet by providing secure APIs and promoting better password choices to end users. Appwrite supports added security features like blocking personal info in passwords, password dictionary, and password history to help users choose good passwords.
Signup

You can use the Appwrite Client SDKs to create an account using email and password.
Web

import { Client, Account, ID } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>'); // Your project ID

const account = new Account(client);

const promise = account.create({
    userId: '[USER_ID]',
    email: 'email@example.com',
    password: ''
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Passwords are hashed with Argon2, a resilient and secure password hashing algorithm.
Login

After an account is created, users can be logged in using the Create Email Session route.
Web

import { Client, Account } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>'); // Your project ID

const account = new Account(client);

const promise = account.createEmailPasswordSession({
    email: 'email@example.com',
    password: 'password'
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Verification

After logging in, the email can be verified through the account create verification route. The user doesn't need to be verified to log in, but you can restrict resource access to verified users only using permissions through the user([USER_ID], "verified") role.

First, send a verification email. Specify a redirect URL which users will be redirected to. The verification secrets will be appended as query parameters to the redirect URL. In this example, the redirect URL is https://example.com/verify.
Web

import { Client, Account } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>') // Your project ID

const account = new Account(client);

const promise = account.createVerification({
    url: 'https://example.com/verify'
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Next, implement the verification page in your app. This page will parse the secrets passed in through the userId and secret query parameters. In this example, the code below will be found in the page served at https://example.com/verify.

Since the secrets are passed in through url params, it will be easiest to perform this step in the browser.
Web

import { Client, Account } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>'); // Your project ID

const account = new Account(client);

const urlParams = new URLSearchParams(window.location.search);
const secret = urlParams.get('secret');
const userId = urlParams.get('userId');

const promise = account.updateVerification({
    userId,
    secret
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Password Recovery

If a user forgets their password, they can initiate a password recovery flow to recover their password. The Create Password Recovery endpoint sends the user an email with a temporary secret key for password reset. When the user clicks the confirmation link, they are redirected back to the password reset URL with the secret key and email address values attached to the URL as query strings.

Only redirect URLs to domains added as a platform on your Appwrite Console will be accepted. URLs not added as a platform are rejected to protect against redirect attacks.
Web

import { Client, Account } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>'); // Your project ID

const promise = account.createRecovery({
    email: 'email@example.com',
    url: 'https://example.com/recovery'
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

After receiving an email with the secret attached to the redirect link, submit a request to the Create Password Recovery (confirmation) endpoint to complete the recovery flow. The verification link sent to the user's email address is valid for 1 hour.
Web

import { Client, Account } from "appwrite";

const client = new Client()
    .setProject('<PROJECT_ID>'); // Your project ID

const promise = account.updateRecovery({
    userId: '<USER_ID>',
    secret: '<SECRET>',
    password: 'password'
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Security

Appwrite's security first mindset goes beyond a securely implemented authentication API. You can enable features like password dictionary, password history, and disallow personal data in passwords to encourage users to pick better passwords. By enabling these features, you protect user data and teach better password choices, which helps make the internet a safer place.


Preferences storage

Preferences allow users to customize their experience in your application. You can save settings like theme choice, language selection, or notification preferences. Appwrite provides multiple ways to store these preferences, depending on your needs.

There are four main options for storing user preferences in applications using Appwrite:
Browser localStorage

The browser's localStorage API is a standard web technology that persists data in the user's browser.

    Device-specific: Settings are only available on the current device
    Simple key-value storage
    No server-side processing required
    Data persists even after browser sessions end
    Limited to 5MB per origin in most browsers

JavaScript

// Store a preference using the browser's built-in localStorage API
localStorage.setItem('darkMode', 'true');

// Retrieve a preference
const darkMode = localStorage.getItem('darkMode');

User preferences

Appwrite provides a built-in user preferences system through the Account API, allowing you to store preferences directly on the user object.

    Persists across all user devices
    Stored as a JSON object
    Limited to 64kB of data
    Simple API for updating and retrieving

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const account = new Account(client);

// Update preferences
const promise = account.updatePrefs({
    darkTheme: true,
    language: 'en',
    notificationsEnabled: true
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

// Get preferences
const getPrefs = account.getPrefs();

getPrefs.then(function (prefs) {
    console.log(prefs); // { darkTheme: true, language: 'en', notificationsEnabled: true }
}, function (error) {
    console.log(error);
});

Learn more about user preferences
Team preferences

Team preferences let you store settings that apply to an entire team of users, well-suited for collaborative features.

    Shared across all team members
    Useful for team-wide settings like theme, notification preferences, or feature toggles
    Stored as a JSON object in the team
    Limited to 64kB of data

import { Client, Teams } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const teams = new Teams(client);

// Update team preferences
const promise = teams.updatePrefs(
    '<TEAM_ID>',
    {
        theme: 'corporate',
        notificationsEnabled: true,
        defaultView: 'kanban'
    }
);

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

// Get team preferences
const promise = teams.getPrefs('<TEAM_ID>');

promise.then(function (prefs) {
    console.log(prefs); // Team preferences
}, function (error) {
    console.log(error);
});

Learn more about team preferences
Appwrite Databases

For complex preference structures or when storing larger amounts of data, Appwrite Databases offer a flexible solution.

    Schema validation for structured data
    Support for complex data types and relationships
    Unlimited storage capacity (subject to project limits)
    Advanced querying capabilities
    Fine-grained access control

import { Client, TablesDB, ID, Query } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');                 // Your project ID

const tablesDB = new TablesDB(client);

// Store user preferences in a database
const promise = tablesDB.createRow(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    ID.unique(),
    {
        userId: '<USER_ID>',
        theme: {
            mode: 'dark',
            primaryColor: '#3498db',
            fontSize: 'medium'
        },
        dashboard: {
            layout: 'grid',
            widgets: ['calendar', 'tasks', 'notes'],
            defaultView: 'week'
        },
        notifications: {
            email: true,
            push: true,
            frequency: 'daily'
        }
    }
);

// Retrieve user preferences
const getUserPrefs = tablesDB.listRows(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    [
        Query.equal('userId', '<USER_ID>')
    ]
);

Learn more about Appwrite Databases


Verify user

User verification in Appwrite allows you to verify user email addresses and phone numbers. Users don't need to be verified to log in, but you can restrict resource access to verified users only using permissions.
Verify email

To verify a user's email, first ensure the user is logged in so that the verification email can be sent to the user who created the account. Then, send the verification email specifying a redirect URL. The verification secrets will be appended as query parameters to the redirect URL.

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>') // Your project ID

const account = new Account(client);

const promise = account.createVerification({
    url: 'https://example.com/verify'
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

After the user clicks the link in the email, they will be redirected to your site with the query parameters userId and secret. If you're on a mobile platform, you will need to create the appropriate deep link to handle the verification.

Next, implement the verification page that handles the redirect.

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const account = new Account(client);

const urlParams = new URLSearchParams(window.location.search);
const secret = urlParams.get('secret');
const userId = urlParams.get('userId');

const promise = account.updateVerification({
    userId,
    secret
});

promise.then(function (response) {
    console.log(response); // Success
}, function (error) {
    console.log(error); // Failure
});

Verify phone

To verify a phone number, first ensure the user is logged in and has a phone number set on their account.

const response = await account.updatePhone({
    phone: '+12065550100',
    password: 'password'
});

Then initiate verification by calling createPhoneVerification.

const response = await account.createPhoneVerification();

After the user receives the verification code, complete verification by calling updatePhoneVerification.

const response = await account.updatePhoneVerification({
    userId: '[USER_ID]',
    secret: '[SECRET]'
});

Restrict access

You can restrict resource access to verified users in two ways:

    Use user([USER_ID], "verified") to restrict access to a specific verified user
    Use users("verified") to restrict access to any verified user

Verification events

The following events are triggered during the verification process:

    users.*.verification.* - Triggers on any user's verification token event
    users.*.verification.*.create - Triggers when a verification token for a user is created
    users.*.verification.*.update - Triggers when a verification token for a user is validated

Each event returns a Token Object.


Checking auth status

One of the first things your application needs to do when starting up is to check if the user is authenticated. This is an important step in creating a great user experience, as it determines whether to show login screens or protected content.
Check auth with account.get()

The recommended approach for checking authentication status is to use the account.get() method when your application starts:

import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const account = new Account(client);

// Check if user is logged in
async function checkAuthStatus() {
    try {
        // If successful, user is authenticated
        const user = await account.get();
        console.log("User is authenticated:", user);
        // Proceed with your authenticated app flow
        return user;
    } catch (error) {
        console.error("User is not authenticated:", error);
        // Redirect to login page or show login UI
        // window.location.href = '/login';
        return null;
    }
}

// Call this function when your app initializes
checkAuthStatus();

Missing scope error

When a user is not authenticated and you call account.get(), you might see an error message like:

User (role: guests) missing scope (account)

This error is telling you that:

    The current user has the role of "guest" (unauthenticated visitor)
    This guest user does not have the required permission scope to access account information
    This is the expected behavior when a user is not logged in

Authentication flow

In a typical application flow:

    Call account.get() when your app starts
    If successful → User is authenticated → Show the main app UI
    If error → User is not authenticated → Redirect to login screen

Best practices

    Call account.get() early in your application lifecycle
    Handle both authenticated and unauthenticated states gracefully
    Show appropriate loading states while checking authentication
    Implement proper error handling to avoid showing error messages to users

    
Multi-factor authentication

Multi-factor authentication (MFA) greatly increases the security of your apps by adding additional layers of protection. When MFA is enabled, a malicious actor needs to compromise multiple authentication factors to gain unauthorized access. Appwrite Authentication lets you easily implement MFA in your apps, letting you build more securely and quickly.
Looking for MFA on your Console account?

This page covers MFA for your app's end-users. If you are looking for MFA on your Appwrite Console account, please refer to the Console MFA page.

Appwrite currently allows two factors of authentication. More factors of authentication will be available soon.

Here are the steps to implement MFA in your application.
Display recovery codes

Initialize your Appwrite SDK's Client, Account, and Avatars. You'll use Avatars API to generate a QR code for the TOTP authenticator app, you can skip this import if you're not using TOTP.

import { Client, Account, Avatars } from "appwrite";

const client = new Client();

const account = new Account(client);
const avatars = new Avatars(client);

client
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>') // Your project ID
;

Before enabling MFA, you should display recovery codes to the user. The codes are single use passwords the user can use to access their account if they lose access to their MFA email, phone, or authenticator app. These codes can only be generated once, warn the users to save them.

The code will look like this, display them to the user and remind them to save the codes in a secure place.
JSON

{
    "recoveryCodes": [
        "b654562828",
        "a97c13d8c0",
        "311580b5f3",
        "c4262b3f88",
        "7f6761afb4",
        "55a09989be",
    ]
}

These codes can be used to complete the Complete challenge step if the user loses access to their MFA factors. Generate the recovery codes by calling account.createMfaRecoveryCodes().

const response = await account.createMfaRecoveryCodes();
console.log(response.recoveryCodes);

Verify MFA factors

Any verified email, phone number, or TOTP authenticator app can be used as a factor for MFA. Before they can be used as a factor, they need to be verified.

First, set your user's email if they haven't already.

const response = await account.updateEmail({
    email: 'email@example.com',
    password: 'password'
});

Then, initiate verification for the email by calling account.createEmailVerification(). Calling createEmailVerification will send a verification email to the user's email address with a link with the query parameter userId and secret.

const res = await account.createVerification({
    url: 'https://example.com/verify-email'
});

After the user clicks the link in the email, they will be redirected to your site with the query parameters userId and secret. If you're on a mobile platform, you will need to create the appropriate deep link to handle the verification.

Finally, verify the email by calling account.updateVerification() with userId and secret.

const response = await account.updateVerification({
    userId: '<USER_ID>',
    secret: '<SECRET>'
});

Enable MFA on an account

You can enable MFA on your account by calling account.updateMFA(). You will need to have added more than 1 factors of authentication to an account before the MFA is enforced.

const result = await account.updateMFA({
    enabled: true
});

Initialize login

Begin your login flow with the default authentication method used by your app, for example, email password.

const session = await account.createEmailPasswordSession(
    'email@example.com', // email
    'password' // password
);

Check for multi-factor

Upon successful login in the first authentication step, check the status of the login by calling account.get(). If more than one factors are required, you will receive the error user_more_factors_required. Redirect the user in your app to perform the MFA challenge.

try {
    const response = await account.get();
    console.log(response);
} catch (error) {
    console.log(error);
    if (error.type === `user_more_factors_required`){
        // redirect to perform MFA
    }
    else {
        // handle other errors
    }
}

List factors

You can check which factors are enabled for an account using account.listMfaFactors(). The returned object will be formatted like this.
Web

{
    totp: true, // time-based one-time password
    email: false, // email
    phone: true // phone
}

const factors = await account.listMfaFactors();
// redirect based on factors returned.

Create challenge

Based on the factors available, initialize an additional auth step. Calling these methods will send a challenge to the user. You will need to save the challenge ID to complete the challenge in a later step.

Appwrite will use a verified email on the user's account to send the challenge code via email. Note that this is only valid as a second factor if the user did not initialize their login with email OTP.

const challenge = await account.createMfaChallenge(
    'email'  // factor
);

// Save the challenge ID to complete the challenge later
const challengeId = challenge.$id;

Complete challenge

Once the user receives the challenge code, you can pass the code back to Appwrite to complete the challenge.

const response = await account.updateMfaChallenge(
    '<CHALLENGE_ID>', // challengeId
    '<OTP>' // otp
);

After completing the challenge, the user is now authenticated and all requests will be authorized. You can confirm this by running account.get()
Recovery

In case your user needs to recover their account, they can use the recovery codes generated in the first step with the recovery code factor. Initialize the challenge by calling account.createMfaChallenge() with the factor recoverycode.

const challenge = await account.createMfaChallenge(
    'recoverycode' // factor
);

// Save the challenge ID to complete the challenge later
const challengeId = challenge.$id;

Then complete the challenge by calling account.updateMfaChallenge() with the challenge ID and the recovery code.

const response = await account.updateMfaChallenge(
    '<CHALLENGE_ID>', // challengeId
    '<RECOVERY_CODE>' // otp
);
