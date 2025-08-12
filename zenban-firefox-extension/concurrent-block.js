// Shared flag to prevent duplicate processing
window._bookmarkProcessing = false;

// Wrapper to prevent duplicate bookmark processing
window.processBookmarkOnce = function(data) {
    if (window._bookmarkProcessing) {
        console.log('Bookmark already being processed, skipping duplicate');
        return;
    }
    
    window._bookmarkProcessing = true;
    
    // Process the bookmark
    if (typeof window.handleBookmarkData === 'function') {
        window.handleBookmarkData(data);
    }
    
    // Reset flag after short delay
    setTimeout(() => {
        window._bookmarkProcessing = false;
    }, 100);
};
