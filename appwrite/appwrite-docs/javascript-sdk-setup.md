# Appwrite JavaScript SDK Setup Guide

## Installation

Install the Appwrite JavaScript SDK using npm:

```shell
npm install appwrite@18.1.1
```

## Client Initialization (Cloud Appwrite)

Initialize the client for cloud-hosted Appwrite with your project details:

```javascript
import { Client, Account } from 'appwrite';
export const client = new Client();
client
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>'); // Replace with your project ID
export const account = new Account(client);
export { ID } from 'appwrite';
```

**Note**: Replace `<REGION>` with your cloud region (e.g., 'us-east') and `<PROJECT_ID>` with your actual project ID from the Appwrite Console.

## Configuration

- **Endpoint**: Always use `https://REGION.cloud.appwrite.io/v1` for cloud deployments
- **Project ID**: Found in your Appwrite Console project settings
- **Session Management**: SDK handles sessions automatically for client apps

## Initial Setup Steps

1. Create a project at https://cloud.appwrite.io
2. Note your project ID from the Dashboard
3. Install the SDK and initialize as shown above
4. Start using services like Authentication and Databases
