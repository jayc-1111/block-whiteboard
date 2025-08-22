// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const yourFilesItem = document.getElementById('yourFilesItem');
    const settingsItem = document.getElementById('settingsItem');
    
    // File tree dropdown now handled by pure CSS hover
    if (yourFilesItem) {
        // Just populate the file tree content once
        populateFileTreeContent();
    }
    
    // Your Bookmarks click handler is now managed by bookmarks-modal.js
    // Removed duplicate handler to avoid conflicts
    
    // Settings menu now handled by pure CSS hover
});

// Simplified - no hover handling needed (CSS handles it)
function populateFileTreeContent() {
    const fileList = document.querySelector('.file-structure-list');
    if (!fileList) return;
    
    // This would normally populate from actual file structure
    // For now just add placeholder content
    fileList.innerHTML = `
        <li>Project Files</li>
        <li>Documents</li>
        <li>Images</li>
    `;
}