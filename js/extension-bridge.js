/**
 * Extension Bridge - Handles communication between Firefox extension and app via localStorage
 * This replaces the unreliable script injection method
 */

(function() {
    const STORAGE_KEY_PREFIX = 'zenban_bookmark_';
    const PENDING_KEY = 'zenban_bookmark_pending';
    const HANDSHAKE_KEY = 'zenban_extension_handshake';
    const MAX_BOOKMARKS_IN_STORAGE = 5; // Keep only last 5 bookmarks
    
    console.log('🌉 Extension Bridge: Initializing localStorage listener');
    
    // Clean up old bookmarks on initialization
    cleanupOldBookmarks();
    
    // Listen for storage events from the extension
    window.addEventListener('storage', function(event) {
        console.log('🌉 Extension Bridge: Storage event detected', event.key);
        
        // Check if this is a bookmark from our extension
        if (event.key && event.key.startsWith(STORAGE_KEY_PREFIX)) {
            console.log('🌉 Extension Bridge: Bookmark data detected!');
            
            try {
                const bookmarkData = JSON.parse(event.newValue);
                console.log('🌉 Extension Bridge: Parsed bookmark data:', bookmarkData);
                
                // Process the bookmark
                processExtensionBookmark(bookmarkData);
                
                // Clean up the storage key
                localStorage.removeItem(event.key);
                console.log('🌉 Extension Bridge: Cleaned up storage key');
                
                // Clean up old bookmarks after processing new one
                cleanupOldBookmarks();
                
                // Log success
                console.log('🌉 Extension Bridge: Bookmark processed successfully');
                
            } catch (error) {
                console.error('🌉 Extension Bridge: Error processing bookmark:', error);
            }
        }
        
        // Handle handshake from extension to confirm connection
        if (event.key === HANDSHAKE_KEY && event.newValue === 'ping') {
            console.log('🌉 Extension Bridge: Handshake received from extension');
            localStorage.setItem(HANDSHAKE_KEY, 'pong');
            setTimeout(() => localStorage.removeItem(HANDSHAKE_KEY), 1000);
        }
    });
    
    // Also check for existing pending bookmarks on page load
    window.addEventListener('load', function() {
        console.log('🌉 Extension Bridge: Checking for pending bookmarks on load');
        
        // Clean up old bookmarks first
        cleanupOldBookmarks();
        
        // Look for the most recent pending bookmark
        const bookmarkKeys = getBookmarkKeys();
        if (bookmarkKeys.length > 0) {
            // Process only the most recent one
            const mostRecentKey = bookmarkKeys[bookmarkKeys.length - 1];
            console.log('🌉 Extension Bridge: Found pending bookmark:', mostRecentKey);
            
            try {
                const bookmarkData = JSON.parse(localStorage.getItem(mostRecentKey));
                processExtensionBookmark(bookmarkData);
                localStorage.removeItem(mostRecentKey);
            } catch (error) {
                console.error('🌉 Extension Bridge: Error processing pending bookmark:', error);
                localStorage.removeItem(mostRecentKey); // Clean up invalid data
            }
        }
    });
    
    // Process bookmark data from extension
    function processExtensionBookmark(data) {
        console.log('🌉 Extension Bridge: Processing bookmark:', data.title || 'Untitled');
        
        // Check if handleBookmarkData exists (from cards.js)
        if (typeof window.handleBookmarkData === 'function') {
            console.log('🌉 Extension Bridge: Calling handleBookmarkData');
            window.handleBookmarkData(data);
        } else {
            console.error('🌉 Extension Bridge: handleBookmarkData not found! Is cards.js loaded?');
            // Store for later if the function isn't ready yet
            window._pendingBookmark = data;
        }
    }
    
    // Expose a way to manually trigger bookmark processing (for testing)
    window.testExtensionBridge = function() {
        const testData = {
            title: 'Test Bookmark - ' + new Date().toLocaleTimeString(),
            url: 'https://example.com',
            description: 'This is a test bookmark',
            screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            timestamp: new Date().toISOString()
        };
        
        const key = STORAGE_KEY_PREFIX + Date.now();
        localStorage.setItem(key, JSON.stringify(testData));
        console.log('🌉 Extension Bridge: Test bookmark set with key:', key);
        
        // Trigger storage event manually for same-tab testing
        processExtensionBookmark(testData);
        localStorage.removeItem(key);
    };
    
    // Check if cards.js loaded its functions properly
    setTimeout(() => {
        if (window._pendingBookmark && typeof window.handleBookmarkData === 'function') {
            console.log('🌉 Extension Bridge: Processing delayed bookmark');
            window.handleBookmarkData(window._pendingBookmark);
            delete window._pendingBookmark;
        }
    }, 2000);
    
    // Get all bookmark keys sorted by timestamp
    function getBookmarkKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
                keys.push(key);
            }
        }
        // Sort by timestamp in key (zenban_bookmark_TIMESTAMP)
        return keys.sort((a, b) => {
            const timeA = parseInt(a.replace(STORAGE_KEY_PREFIX, ''));
            const timeB = parseInt(b.replace(STORAGE_KEY_PREFIX, ''));
            return timeA - timeB;
        });
    }
    
    // Clean up old bookmarks, keeping only the most recent ones
    function cleanupOldBookmarks() {
        const bookmarkKeys = getBookmarkKeys();
        
        if (bookmarkKeys.length > MAX_BOOKMARKS_IN_STORAGE) {
            const keysToRemove = bookmarkKeys.slice(0, bookmarkKeys.length - MAX_BOOKMARKS_IN_STORAGE);
            console.log(`🌉 Extension Bridge: Cleaning up ${keysToRemove.length} old bookmarks`);
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🌉 Extension Bridge: Removed old bookmark: ${key}`);
            });
        }
    }
    
    console.log('🌉 Extension Bridge: Ready for bookmarks via localStorage');
    console.log(`🌉 Extension Bridge: Max bookmarks in storage: ${MAX_BOOKMARKS_IN_STORAGE}`);
})();
