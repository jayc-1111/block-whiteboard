# Appwrite Databases Guide (JavaScript SDK)

## Overview

Appwrite Databases allow you to store and manage structured data. Data is organized into databases, collections (tables), and documents (rows). The JavaScript SDK provides methods to create, read, update, and delete documents.

## Prerequisites

Initialize the Appwrite client and create a Databases instance:

```javascript
import { Client, Databases } from 'appwrite';
const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>'); // Your project ID
const databases = new Databases(client);
```

**Note**: Databases and collections are typically created via the Appwrite Console or server SDK. The client SDK primarily manages documents.

## Get a Document

Retrieve a specific document by its ID:

```javascript
const result = await databases.getDocument({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documentId: '<DOCUMENT_ID>',
    queries: [] // optional
});
console.log(result); // Document data
```

## List Documents

Fetch a list of documents from a collection, with support for queries:

```javascript
const result = await databases.listDocuments(
    '<DATABASE_ID>',
    '<COLLECTION_ID>',
    [
        // Optional queries for filtering, sorting, etc.
        Query.equal('status', 'active'), // Example filter
        Query.limit(10), // Limit results
        Query.orderDesc('createdAt') // Sort by creation date
    ]
);
console.log(result.documents); // Array of documents
```

## Create a Document

Add a new document to a collection:

```javascript
const result = await databases.createDocument({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documentId: 'unique()', // Use 'unique()' for auto-generated ID or specify your own
    data: {
        title: 'My Document',
        content: 'Document content...',
        status: 'active'
    },
    permissions: ["read(\"any\")"] // optional - set access permissions
});
console.log(result); // Created document
```

## Update a Document

Modify an existing document:

```javascript
const result = await databases.updateDocument({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documentId: '<DOCUMENT_ID>',
    data: {
        // Only include fields you want to update
        status: 'updated'
    },
    permissions: ["read(\"any\")"] // optional
});
console.log(result); // Updated document
```

## Delete a Document

Remove a document:

```javascript
const result = await databases.deleteDocument({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documentId: '<DOCUMENT_ID>'
});
console.log(result); // Deletion confirmation
```

## Query Examples

Common query patterns:

```javascript
// Equal filter
Query.equal('fieldName', 'value')

// Search text fields
Query.search('title', 'search term')

// Range queries
Query.greaterThan('price', 10)
Query.lessThanEqual('quantity', 100)

// Sorting
Query.orderAsc('createdAt')
Query.orderDesc('updatedAt')

// Pagination
Query.limit(20)
Query.offset(40)

// Cursor-based pagination
Query.cursorAfter('lastDocumentId')
```

## Bulk Operations

Create multiple documents at once (server SDK recommended for this):

```javascript
// Note: This example is for server SDK - client SDK is rate-limited
const result = await databases.createDocuments({
    databaseId: '<DATABASE_ID>',
    collectionId: '<COLLECTION_ID>',
    documents: [
        { title: 'Document 1', content: '...' },
        { title: 'Document 2', content: '...' }
    ]
});
```

## Real-time Updates

To listen for changes to documents (useful for sync operations):

```javascript
import { Realtime } from 'appwrite';

const realtime = new Realtime(client);
const subscription = realtime.subscribe(
    `databases.${databaseId}.collections.${collectionId}.documents`,
    response => {
        console.log('Document change:', response);
        // Handle real-time updates
    }
);
```

## Error Handling

Wrap database operations in try-catch:

```javascript
try {
    const documents = await databases.listDocuments(databaseId, collectionId);
    // Process documents
} catch (error) {
    console.error('Database error:', error.message);
    // Handle permissions, network, or validation errors
}
```

## Cloud Considerations

- Use authenticated sessions for document access
- Check permissions when creating/updating documents
- Rate limits apply for client SDK operations
- Complex operations (creating databases/collections) should be done via Console or Server SDK

## Additional Resources

- Create databases and collections in the Appwrite Console
- Define collection rules and permissions
- Full queries reference: https://appwrite.io/docs/advanced/platform/queries
- Realtime docs: https://appwrite.io/docs/advanced/platform/realtime
