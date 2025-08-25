// Extension Bridge - handles communication between Zenban app and browser extension
console.log('Extension bridge loaded');

// Maximum storage management
const MAX_BOOKMARKS = 1; // Only keep 1 bookmark
const MAX_IMAGE_SIZE_KB = 500; // 500KB max

// Get localStorage usage
function getStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length + key.length;
        }
    }
    return totalSize;
}

// Clear ALL bookmark data
function clearAllBookmarks() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('zenban_bookmark_') || key.startsWith('zenban_saved_bookmark_'))) {
            keys.push(key);
        }
    }
    keys.forEach(key => localStorage.removeItem(key));
    return keys.length;
}

// Test if we can store data
function canStore(data) {
    const testKey = 'test_' + Date.now();
    try {
        localStorage.setItem(testKey, data);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

// Compress image aggressively
function compressImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Start with more aggressive dimensions
            let width = Math.min(img.width, 800);
            let height = Math.min(img.height, 600);
            
            if (img.width > img.height) {
                height = (width / img.width) * img.height;
            } else {
                width = (height / img.height) * img.width;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try 70% quality first (more aggressive)
            let result = canvas.toDataURL('image/jpeg', 0.70);
            let sizeKB = (result.length * 0.75) / 1024;
            
            // If still too big, reduce further with 50% quality
            if (sizeKB > MAX_IMAGE_SIZE_KB) {
                width = Math.floor(width * 0.7);
                height = Math.floor(height * 0.7);
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                result = canvas.toDataURL('image/jpeg', 0.50);
                sizeKB = (result.length * 0.75) / 1024;
            }
            
            // If still too big, go even more aggressive with 30% quality and smaller dimensions
            if (sizeKB > MAX_IMAGE_SIZE_KB) {
                width = Math.floor(width * 0.6);
                height = Math.floor(height * 0.6);
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                result = canvas.toDataURL('image/jpeg', 0.30);
                sizeKB = (result.length * 0.75) / 1024;
            }
            
            console.log(`Compressed to ${Math.round(sizeKB)}KB (${width}x${height})`);
            resolve(result);
        };
        img.src = dataUrl;
    });
}

// Listen for storage events from extension
window.addEventListener('storage', function(event) {
    if (event.key && event.key.startsWith('zenban_bookmark_')) {
        console.log('🎯 EXTENSION BRIDGE: Storage event detected:', event.key);
        try {
            // For synthetic storage events (same page), get data from localStorage
            const bookmarkData = event.newValue ? JSON.parse(event.newValue) : JSON.parse(localStorage.getItem(event.key));
            
            if (!bookmarkData) {
                console.log('🎯 EXTENSION BRIDGE: No bookmark data found');
                return;
            }
            
            console.log('🎯 EXTENSION BRIDGE: Parsed bookmark data:', bookmarkData);
            
            // Trigger the modal
            if (window.handleBookmarkData) {
                console.log('🎯 EXTENSION BRIDGE: Calling handleBookmarkData');
                window.handleBookmarkData(bookmarkData);
            } else {
                console.log('🎯 EXTENSION BRIDGE: handleBookmarkData not found');
            }
            
            // Clean up localStorage after processing
            setTimeout(() => {
                localStorage.removeItem(event.key);
            }, 1000);
        } catch (e) {
            console.error('🎯 EXTENSION BRIDGE: Error processing bookmark:', e);
        }
    }
});

// Listen for messages from extension
window.addEventListener('message', async function(event) {
    if (event.data.type === 'BOOKMARK_SAVED_FROM_EXTENSION') {
        console.log('🎯 EXTENSION: Bookmark received');
        
        try {
            const bookmarkData = event.data.data;
            
            // Check current storage size
            const currentSize = getStorageSize();
            console.log(`Current localStorage usage: ${Math.round(currentSize/1024)}KB`);
            
            // Clear all bookmarks first
            const cleared = clearAllBookmarks();
            console.log(`Cleared ${cleared} old bookmarks`);
            
            // Compress screenshot
            if (bookmarkData.screenshot) {
                const originalSize = Math.round((bookmarkData.screenshot.length * 0.75) / 1024);
                console.log(`Original screenshot: ${originalSize}KB`);
                bookmarkData.screenshot = await compressImage(bookmarkData.screenshot);
                bookmarkData.image = bookmarkData.screenshot;
            }
            
            const dataString = JSON.stringify(bookmarkData);
            const dataSize = Math.round(dataString.length / 1024);
            console.log(`Bookmark data size: ${dataSize}KB`);
            
            // Test if we can store
            if (!canStore(dataString)) {
                console.log('Cannot store, clearing all localStorage bookmarks');
                clearAllBookmarks();
                
                // Try smaller image
                if (bookmarkData.screenshot) {
                    delete bookmarkData.screenshot;
                    delete bookmarkData.image;
                    console.log('Removed image to save space');
                }
            }
            
            // Save with timestamp key
            const timestamp = Date.now();
            const savedKey = `zenban_saved_bookmark_${timestamp}`;
            
            try {
                localStorage.setItem(savedKey, JSON.stringify(bookmarkData));
                console.log('✅ Bookmark saved');
                
                // Dispatch event for UI update
                window.dispatchEvent(new StorageEvent('storage', {
                    key: `zenban_bookmark_${timestamp}`,
                    newValue: JSON.stringify(bookmarkData),
                    url: window.location.href
                }));
                
            } catch (e) {
                console.error('Still failed:', e);
                // Save without image as last resort
                delete bookmarkData.screenshot;
                delete bookmarkData.image;
                localStorage.setItem(savedKey, JSON.stringify(bookmarkData));
                console.log('✅ Saved without image');
            }
            
        } catch (error) {
            console.error('Failed to save bookmark:', error);
        }
    }
});

// Initial cleanup on load
clearAllBookmarks();
console.log('Extension bridge ready');
