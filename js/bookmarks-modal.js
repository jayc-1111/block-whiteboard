// Bookmarks Modal Handler
document.addEventListener('DOMContentLoaded', function() {
    const bookmarksTrigger = document.querySelector('.bookmarks-trigger');
    const bookmarksModal = document.getElementById('bookmarksModal');
    const bookmarksModalClose = document.getElementById('bookmarksModalClose');
    
    // Open modal on trigger click
    if (bookmarksTrigger) {
        bookmarksTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            bookmarksModal.classList.add('active');
        });
    }
    
    // Close modal on close button click
    if (bookmarksModalClose) {
        bookmarksModalClose.addEventListener('click', function() {
            bookmarksModal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    if (bookmarksModal) {
        bookmarksModal.addEventListener('click', function(e) {
            if (e.target === bookmarksModal) {
                bookmarksModal.classList.remove('active');
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && bookmarksModal.classList.contains('active')) {
            bookmarksModal.classList.remove('active');
        }
    });
    
    // Dark mode toggle
    const darkModeBtn = document.getElementById('bookmarksDarkModeBtn');
    
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', function() {
            const modal = document.getElementById('bookmarksModal');
            
            if (modal.classList.contains('dark-mode')) {
                modal.classList.remove('dark-mode');
                this.classList.remove('active');
            } else {
                modal.classList.add('dark-mode');
                this.classList.add('active');
            }
        });
    }
    
    // Tree expand/collapse functionality
    const treeFolders = document.querySelectorAll('.bookmarks-tree-folder');
    
    treeFolders.forEach(folder => {
        folder.addEventListener('click', function() {
            const children = this.nextElementSibling;
            
            if (children && children.classList.contains('bookmarks-tree-children')) {
                // Toggle expanded state
                this.classList.toggle('expanded');
                children.classList.toggle('expanded');
            }
            
            // Update active state
            treeFolders.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Leaf item clicks
    const treeLeaves = document.querySelectorAll('.bookmarks-tree-leaf');
    
    treeLeaves.forEach(leaf => {
        leaf.addEventListener('click', function() {
            // Remove active from folders
            treeFolders.forEach(f => f.classList.remove('active'));
            
            // Update content area
            const contentArea = document.querySelector('.bookmarks-content');
            if (contentArea) {
                contentArea.innerHTML = `
                    <h3 style="margin-top: 0; color: #111827;">${this.textContent}</h3>
                    <p style="color: #6b7280;">Bookmarks for "${this.textContent}" will appear here.</p>
                `;
            }
        });
    });
});
