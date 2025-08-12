// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const yourFilesItem = document.getElementById('yourFilesItem');
    const yourBookmarksItem = document.getElementById('yourBookmarksItem');
    const settingsItem = document.getElementById('settingsItem');
    
    // File tree dropdown now handled by pure CSS hover
    if (yourFilesItem) {
        // Just populate the file tree content once
        populateFileTreeContent();
    }
    
    // Handle Your Bookmarks
    if (yourBookmarksItem) {
        yourBookmarksItem.addEventListener('click', function() {
            const bookmarksModal = document.getElementById('bookmarksModal');
            if (bookmarksModal) {
                bookmarksModal.style.display = 'flex';
            }
        });
    }
    
    // Settings menu now handled by pure CSS hover
});

// Simplified - no hover handling needed (CSS handles it)
function populateFileTreeContent() {
    const fileList = document.querySelector('.file-structure-list');
    if (!fileList) return;
    
    // Wait a bit for board to load, then populate
    setTimeout(() => {
        updateFileTree();
    }, 500);
    
    // Update on hover to get latest state
    const yourFilesItem = document.getElementById('yourFilesItem');
    yourFilesItem.addEventListener('mouseenter', () => {
        updateFileTree();
    });
    
    // Watch for canvas changes
    const canvas = document.getElementById('canvas');
    if (canvas) {
        const observer = new MutationObserver(() => updateFileTree());
        observer.observe(canvas, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });
    }
}

function updateFileTree() {
    const fileDropdown = document.querySelector('.file-structure-dropdown');
    if (!fileDropdown) return;
    
    const canvas = document.getElementById('canvas');
    const categories = canvas ? Array.from(canvas.querySelectorAll('.category')) : [];
    
    // Create tree structure
    let html = '<div class="file-tree"><ul>';
    
    if (categories.length === 0) {
        html += '<li class="file-tree-empty">No categories yet</li>';
    } else {
        // Create root board item
        const boardName = document.getElementById('boardName')?.textContent || 'Board 1';
        html += `<li>
            <details open>
                <summary>
                    <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                    </svg>
                    ${boardName}
                    <span class="item-count">${categories.length} categories</span>
                </summary>
                <ul>`;
        
        categories.forEach((category, categoryIndex) => {
            const categoryTitle = category.querySelector('.category-title');
            const title = categoryTitle ? categoryTitle.textContent.trim() || 'Untitled' : 'Untitled';
            const cards = Array.from(category.querySelectorAll('.card'));
            
            html += `<li>
                <details>
                    <summary>
                        <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                        </svg>
                        <span class="category-name">${title}</span>
                        <span class="item-count">${cards.length} cards</span>
                        <button class="find-btn" data-category-index="${categoryIndex}">find</button>
                    </summary>`;
            
            if (cards.length > 0) {
                html += '<ul>';
                cards.forEach(card => {
                    const cardTitle = card.querySelector('.card-title');
                    const cardName = cardTitle ? cardTitle.textContent.trim() || 'Untitled Card' : 'Untitled Card';
                    const cardId = card.id || `card-${Date.now()}-${Math.random()}`;
                    
                    // Ensure card has ID
                    if (!card.id) card.id = cardId;
                    
                    html += `<li class="file-item" data-card-id="${cardId}">
                        <svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        ${cardName}
                    </li>`;
                });
                html += '</ul>';
            } else {
                html += '<ul><li class="file-tree-empty">No cards yet</li></ul>';
            }
            
            html += '</details></li>';
        });
        
        html += '</ul></details></li>';
    }
    
    html += '</ul></div>';
    fileDropdown.innerHTML = html;
    
    // Add click handlers for cards
    fileDropdown.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', function(e) {
            console.log('🔵 HAMBURGER: Card clicked in file tree');
            e.preventDefault();
            e.stopPropagation();
            const cardId = this.dataset.cardId;
            const card = document.getElementById(cardId);
            console.log('🔵 HAMBURGER: Card found:', card);
            if (card) {
                // Close hamburger menu
                const hamburgerMenu = document.getElementById('hamburgerMenu');
                if (hamburgerMenu) {
                    hamburgerMenu.classList.remove('open');
                }
                
                // Use proper expandCard function if available
                if (window.expandCard) {
                    console.log('🔵 HAMBURGER: Calling window.expandCard');
                    window.expandCard(card);
                } else {
                    console.error('❌ HAMBURGER: window.expandCard not available, falling back to basic expand');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('expanded');
                    const content = card.querySelector('.card-content');
                    if (content) {
                        content.style.display = 'block';
                    }
                }
            }
        });
    });
    
    // Add click handlers for find buttons
    fileDropdown.querySelectorAll('.find-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering summary click
            const categoryIndex = this.dataset.categoryIndex;
            const categories = document.querySelectorAll('.category');
            const category = categories[categoryIndex];
            
            if (category) {
                // Scroll to center
                category.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add glow effect
                category.classList.add('glow-effect');
                setTimeout(() => {
                    category.classList.remove('glow-effect');
                }, 1000);
            }
        });
    });
}

// Setup settings menu handlers
function setupSettingsHandlers() {
    // Dev Mode toggle
    const devModeOption = document.getElementById('devModeOption');
    if (devModeOption) {
        devModeOption.addEventListener('click', function() {
            if (window.toggleDevMode) {
                window.toggleDevMode();
            }
        });
    }
    
    // Grid Snap toggle
    const gridSnapOption = document.getElementById('gridSnapOption');
    if (gridSnapOption) {
        gridSnapOption.addEventListener('click', function() {
            if (window.toggleGridSnap) {
                window.toggleGridSnap();
            }
        });
    }
    
    // Clear Board
    const clearBoardOption = document.getElementById('clearBoardOption');
    if (clearBoardOption) {
        clearBoardOption.addEventListener('click', function() {
            if (window.showConfirmDialog) {
                window.showConfirmDialog(
                    'Clear Board',
                    'Are you sure you want to clear all content from this board?',
                    () => {
                        if (window.clearGridAndState) {
                            window.clearGridAndState();
                        }
                    }
                );
            }
        });
    }
    
    // Recovery option
    const recoveryOption = document.getElementById('recoveryOption');
    if (recoveryOption) {
        recoveryOption.addEventListener('click', async function() {
            if (window.syncService && window.syncService.loadInitialBoard) {
                await window.syncService.loadInitialBoard();
                if (window.simpleNotifications) {
                    window.simpleNotifications.showNotification('Board data recovered from cloud');
                }
            }
        });
    }
    
    // Theme options
    const bgOptions = document.querySelectorAll('.bg-option');
    bgOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active from all
            bgOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            const themeName = this.textContent.trim();
            if (window.setTheme) {
                switch(themeName) {
                    case 'Default':
                        window.setTheme('default');
                        break;
                    case 'Night Mode':
                        window.setTheme('night');
                        break;
                    case 'Light Mode':
                        window.setTheme('light');
                        break;
                    case 'Lollipop Mode':
                        window.setTheme('lollipop');
                        break;
                    case 'Frutiger Aero':
                        window.setTheme('frutiger');
                        break;
                    case 'Picnic Mode':
                        window.setTheme('picnic');
                        break;
                }
            }
        });
    });
}
