
// File management functions
window.getFileTitleText = getFileTitleText;
window.getNewSectionNumber = getNewSectionNumber;
window.getNewFileName = getNewFileName;
window.createFileSlot = createFileSlot;
window.addFile = addFile;
window.addFileToFolder = addFileToFolder;
window.deleteFile = deleteFile;
window.collapseFile = collapseFile;
window.expandFile = expandFile;

// Bookmark functions
window.createBookmarkFile = createBookmarkFile;
window.removeBookmark = removeBookmark;
window.reorderBookmark = reorderBookmark;

// Section functions
window.createSection = createSection;
window.initializeEditorJS = initializeEditorJS;

// Extension functions
window.handleBookmarkData = handleBookmarkData;
window.processBookmarkOnce = processBookmarkOnce;

// Debug injection for extension
window.extensionDebug = true;
console.log('🔌 EXTENSION: Block Whiteboard ready for bookmarks');
console.log('🔌 EXTENSION: processBookmarkOnce available:', typeof window.processBookmarkOnce);
console.log('🔌 EXTENSION: handleBookmarkData available:', typeof window.handleBookmarkData);
