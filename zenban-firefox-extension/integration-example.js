// Integration between Block Whiteboard and Zenban Extension

// In your app, when bookmark button is clicked:
function captureBookmark() {
    const url = prompt('Enter URL to bookmark:');
    if (!url) return;
    
    // Open URL in new tab
    const newTab = window.open(url, '_blank');
    
    // Extension will detect the tab and show element picker
    // Screenshot will be sent back via message
}

// The app already listens for the response in bookmarks.js:
// window.addEventListener('message', function(event) {
//     if (event.data.type === 'BOOKMARK_SCREENSHOT_READY') {
//         handleBookmarkData(event.data.payload);
//     }
// });

// To test the integration:
// 1. Click bookmark button in app
// 2. Enter URL
// 3. New tab opens
// 4. Click extension icon
// 5. Select element
// 6. Screenshot sent back to app