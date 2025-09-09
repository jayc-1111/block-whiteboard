# Appwrite Realtime & SDK Compatibility Integration Guide

This guide explains how to integrate the Appwrite Realtime functionality and SDK Compatibility Layer into your application, both automatically and manually.

## Overview

The integration consists of three main components:

1. **SDK Compatibility Layer** (`sdk-compatibility.js`): Provides compatibility across different Appwrite SDK versions
2. **Realtime Service** (`realtime-service.js`): Enhances realtime functionality with collection-level event handlers and improved error recovery
3. **Realtime Integration** (`realtime-integration.js`): Integrates the realtime service with the main application

## Automatic Installation

The simplest way to integrate these components is using the automated installer:

1. Open your application in a web browser
2. Open the browser console (F12)
3. Run the following command:

```javascript
// Navigate to the installer page or load the script directly
// Then run the installer
appwriteRealtimeInstaller.install().then(result => {
    console.log('Installation result:', result);
    if (result.success) {
        console.log('Installation completed successfully!');
        // Reload the page to apply changes
        setTimeout(() => location.reload(), 2000);
    } else {
        console.error('Installation failed:', result.message);
        // Show manual instructions
        appwriteRealtimeInstaller.printInstructions();
    }
});
```

4. Reload the page to see the changes take effect

## Manual Installation

If the automatic installation fails, you can manually integrate the components:

### Step 1: Add Script Tags to Index.html

Add the following script tags to your `index.html` file, after the Appwrite SDK script but before your application initialization scripts:

```html
<!-- Appwrite Realtime Integration -->
<script src="appwrite/sdk-compatibility.js"></script> <!-- Appwrite SDK compatibility layer -->
<script src="appwrite/realtime-service.js"></script> <!-- Appwrite realtime service -->
<script src="appwrite/realtime-integration.js"></script> <!-- Appwrite realtime integration -->
```

### Step 2: Verify File Paths

Ensure all three files are in the correct locations:

- `appwrite/sdk-compatibility.js`
- `appwrite/realtime-service.js`
- `appwrite/realtime-integration.js`

If your file structure is different, adjust the paths in the script tags accordingly.

## Understanding the Components

### SDK Compatibility Layer

The SDK compatibility layer provides:

- Version detection for Appwrite SDK
- Consistent interfaces across different SDK versions
- Automatic adaptation to API changes between versions
- Support for older Appwrite SDK methods

Key functions:
- `detectAppwriteVersion()`: Detects the loaded SDK version
- `initAppwriteWithCompatibility(config)`: Initializes Appwrite with compatibility support
- `createCompatibleDatabaseService(client, databaseId)`: Creates a database service with consistent methods
- `createCompatibleAccountService(client)`: Creates an account service with consistent methods

### Realtime Service

The realtime service enhances Appwrite's built-in realtime capabilities with:

- Collection-level event handlers for specific document events
- Improved error recovery and reconnection logic
- Connection health monitoring
- Debounced updates to prevent UI flickering

Key events handled:
- Board creation, updates, and deletion
- Folder changes with optimized batching
- Canvas header modifications
- Drawing path updates

### Realtime Integration

The integration module connects the realtime service with your application:

- Enhances the sync service with realtime event handlers
- Provides visual status indicators
- Handles realtime events like board creation, updates, and deletion
- Manages the UI updates when remote changes occur

## Advanced Configuration

### Customizing Event Handlers

You can customize how realtime events are handled by modifying the event handlers in `realtime-service.js`:

```javascript
// Example: Customize board update handler
eventHandlers.boards.update = (payload) => {
    debug.info('Custom board update handler', { id: payload.$id });
    // Your custom logic here
};
```

### Adding Custom Collections

To add realtime support for custom collections:

1. Open `realtime-service.js`
2. Add your collection to the `eventHandlers` object:

```javascript
// Example: Add custom collection
eventHandlers.myCustomCollection = {
    create: (payload) => {
        debug.info('Custom collection created', { id: payload.$id });
        // Your custom creation logic
    },
    update: (payload) => {
        debug.info('Custom collection updated', { id: payload.$id });
        // Your custom update logic
    },
    delete: (payload) => {
        debug.info('Custom collection deleted', { id: payload.$id });
        // Your custom deletion logic
    }
};
```

3. Update the channel subscriptions in the `setupChannels()` method

## Troubleshooting

### Common Issues

1. **Script not found errors**
   - Ensure all files are in the correct locations
   - Check for typos in file paths
   - Verify file permissions

2. **Realtime not connecting**
   - Check browser console for errors
   - Verify Appwrite project configuration
   - Ensure realtime functionality is enabled in Appwrite console

3. **Event handlers not working**
   - Verify collection IDs match those in your Appwrite configuration
   - Check that your event naming matches the Appwrite events format
   - Ensure the sync service has the expected methods

### Debug Logging

All components include detailed debug logging:

- SDK Compatibility: Prefixed with `🔷 SDK COMPAT:`
- Realtime Service: Prefixed with `🔄 REALTIME:`
- Realtime Integration: Prefixed with `🔄 RT INTEGRATION:`

To enable verbose logging, set the debug flag:

```javascript
window.Debug = window.Debug || {};
window.Debug.verbose = true;
```

## Testing Realtime Functionality

A test page is included to verify realtime functionality:

1. Open `appwrite/test-realtime.html` in your browser
2. The test page will connect to your Appwrite project
3. Create, update, or delete documents to see realtime events in action
4. Check the connection status indicator for realtime connection health

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Realtime API](https://appwrite.io/docs/realtime)
- [SDK Compatibility Guide](https://github.com/appwrite/sdk-for-web)

## Support

If you encounter issues with this integration, please:

1. Check the troubleshooting section above
2. Review browser console logs for specific error messages
3. Verify your Appwrite configuration
4. Contact support with detailed error information
