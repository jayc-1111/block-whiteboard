// Firefox extension integration for bookmarks (restored from old-filesjs-reference.bak)

// Handle bookmark data from Firefox extension
window.handleBookmarkData = function(data) {
    console.log('🔖 BOOKMARK: Received bookmark data from extension:', data);
    
    // NOTE: This function is now overridden in bookmark-destination-selector.js
    // to show the modal with section selection. This is kept as a fallback.
    
    // Get the currently expanded file
    const expandedFile = AppState.get('expandedFile');
    if (!expandedFile) {
        console.error('❌ BOOKMARK: No expanded file to add bookmark to');
        // Show destination selector instead
        if (window.showBookmarkDestination) {
            window.showBookmarkDestination(data);
        } else {
            // Could show a notification to user
            if (window.simpleNotifications) {
                window.simpleNotifications.showNotification('Please open a file first to add bookmarks', 'error');
            }
        }
        return;
    }
    
    // Get the first section by default (modal should override this)
    const activeSection = expandedFile.querySelector('.file-section:first-child');
    
    if (!activeSection) {
        console.error('❌ BOOKMARK: No section found');
        return;
    }
    
    // Get the section data
    const sectionData = activeSection.sectionData;
    if (!sectionData) {
        console.error('❌ BOOKMARK: No section data found');
        return;
    }
    
    // Initialize bookmarks array for this section if it doesn't exist
    if (!sectionData.bookmarks) {
        sectionData.bookmarks = [];
    }
    
    // Add the new bookmark
    const bookmark = {
        title: data.title || 'Untitled',
        url: data.url || '',
        description: data.description || data.url || '',
        screenshot: data.screenshot || data.image || null,
        timestamp: data.timestamp || new Date().toISOString(),
        id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    sectionData.bookmarks.push(bookmark);
    console.log('🔖 BOOKMARK: Added bookmark to section:', bookmark.title);
    
    // Update AppState immediately
    if (expandedFile.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const board = boards.find(b => b.id === currentBoard_id);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = expandedFile.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                // Find the section in the board data
                if (!board.folders[folderIndex].files[fileIndex].sections) {
                    board.folders[folderIndex].files[fileIndex].sections = [];
                }
                
                const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                if (sectionIndex !== -1) {
                    board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...sectionData.bookmarks];
                } else {
                    board.folders[folderIndex].files[fileIndex].sections.push({
                        id: sectionData.id,
                        title: sectionData.title,
                        content: sectionData.content,
                        bookmarks: [...sectionData.bookmarks]
                    });
                }
                
                AppState.set('boards', boards);
                console.log('🔖 BOOKMARK: Updated AppState with new bookmark');
            }
        }
    }
    
    // Update the bookmarks section if file is expanded
    const bookmarksSection = activeSection.querySelector('.section-bookmarks');
    if (bookmarksSection) {
        // Remove placeholder if it exists
        const placeholders = bookmarksSection.querySelectorAll('.bookmark-file');
        placeholders.forEach(p => {
            if (p.textContent.includes('Example Bookmark')) {
                p.remove();
            }
        });
        
        // Add the new bookmark file with proper index
        const bookmarkFile = createBookmarkFile(
            bookmark.title,
            bookmark.description,
            bookmark.url,
            bookmark.timestamp,
            bookmark.screenshot,
            sectionData.bookmarks.length - 1,  // New bookmark is at the end
            expandedFile,
            activeSection  // Pass the section element
        );
        bookmarksSection.appendChild(bookmarkFile);
        console.log('🔖 BOOKMARK: Updated UI with new bookmark');
        
        // Reinitialize modal Lenis to account for new content
        reinitializeModalLenis(expandedFile);
    }
    
// Save to Firebase
    if (window.syncService) {
        window.syncService.saveAfterAction('bookmark added');
    }
    
    // Show success notification
    if (window.simpleNotifications) {
        window.simpleNotifications.showNotification(`Bookmark added: ${bookmark.title}`);
    }
};

// Ensure processBookmarkOnce exists
window.processBookmarkOnce = function(data) {
    console.log('🔌 EXTENSION: processBookmarkOnce called with:', data);
    if (window.handleBookmarkData) {
        window.handleBookmarkData(data);
    } else {
        console.error('🔌 EXTENSION: handleBookmarkData not found!');
    }
};

// Listen for direct postMessage as backup
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'BOOKMARK_SCREENSHOT_READY') {
        console.log('🔌 EXTENSION: Received bookmark via postMessage:', event.data.payload);
        if (window.handleBookmarkData) {
            window.handleBookmarkData(event.data.payload);
        }
    }
});

// Debug injection for extension
window.extensionDebug = true;
console.log('🔌 EXTENSION: Block Whiteboard ready for bookmarks');
console.log('🔌 EXTENSION: processBookmarkOnce available:', typeof window.processBookmarkOnce);
console.log('🔌 EXTENSION: handleBookmarkData available:', typeof window.handleBookmarkData);

// Export functions for use in other modules
window.handleBookmarkData = window.handleBookmarkData;
window.processBookmarkOnce = window.processBookmarkOnce;
