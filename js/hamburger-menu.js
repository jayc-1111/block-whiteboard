// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const yourBookmarksItem = document.getElementById('yourBookmarksItem');
    const settingsItem = document.getElementById('settingsItem');
    const whiteboard = document.getElementById('whiteboard');
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filterFileTree(searchTerm);
        });
    }
    
    // Toggle hamburger menu
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function() {
            hamburgerMenu.classList.toggle('open');
            
            // Add push effect to whiteboard
            if (hamburgerMenu.classList.contains('open')) {
                document.body.classList.add('sidebar-open');
            } else {
                document.body.classList.remove('sidebar-open');
            }
        });
    }
    
    // Update file tree when menu opens
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('transitionend', function() {
            if (hamburgerMenu.classList.contains('open')) {
                updateFileTree();
            }
        });
    }
    
    // Initial file tree population
    // Wait for DOM to be fully loaded
    setTimeout(function() {
        updateFileTree();
    }, 100);
    
    // Bookmarks click handler
    if (yourBookmarksItem) {
        yourBookmarksItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close hamburger menu
            hamburgerMenu.classList.remove('open');
            document.body.classList.remove('sidebar-open');
            
            // Open bookmarks modal
            const bookmarksModal = document.getElementById('bookmarksModal');
            if (bookmarksModal) {
                bookmarksModal.classList.add('active');
            }
        });
    }
    
    // Function to initialize settings modal
    function initializeSettingsModal() {
        let modal = document.getElementById('settingsModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'settingsModal';
            modal.className = 'settings-modal';
            modal.innerHTML = `
                <div class="settings-modal-content">
                    <div class="settings-modal-header">
                        <h2>Settings</h2>
                        <div class="settings-modal-controls">
                            <button class="settings-modal-close">&times;</button>
                        </div>
                    </div>
                    <div class="settings-modal-body">
                        <div class="settings-option" id="devModeOption">
                            <span>Dev Mode</span>
                        </div>
                        <div class="settings-option" id="gridSnapOption">
                            <div class="toggle-indicator">ON</div>
                            <span>Grid Snap</span>
                        </div>
                        <div class="settings-option" id="recoveryOption">
                            <div>🔄</div>
                            <span>Recover Board Data</span>
                        </div>
                        <div class="settings-option" id="clearBoardOption">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-trash-x">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M4 7h16" />
                                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                                    <path d="M10 12l4 4m0 -4l-4 4" />
                                </svg>
                            </div>
                            <span>Clear Board</span>
                        </div>
                        <div class="settings-option separator"></div>
                        <div class="settings-submenu-header">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-palette">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" />
                                <path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                                <path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                                <path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                            </svg>
                            <span>Customization</span>
                        </div>
                        <div class="settings-options-grid">
                            <div class="settings-option" data-theme="default">Default</div>
                            <div class="settings-option" data-theme="night">Night Mode</div>
                            <div class="settings-option" data-theme="light">Light Mode</div>
                            <div class="settings-option" data-theme="lollipop">Lollipop Mode</div>
                            <div class="settings-option" data-theme="frutiger">Frutiger Aero</div>
                            <div class="settings-option" data-theme="picnic">Picnic Mode</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        return modal;
    }
    
    // Initialize settings modal
    const settingsModal = initializeSettingsModal();
    
    // Settings modal functionality
    if (settingsItem && settingsModal) {
        settingsItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Close hamburger menu
            hamburgerMenu.classList.remove('open');
            document.body.classList.remove('sidebar-open');
            
            // Open settings modal
            settingsModal.classList.add('active');
            
            // Set active theme
            const currentTheme = Theme.getCurrentTheme();
            const themeOptions = settingsModal.querySelectorAll('.settings-option[data-theme]');
            themeOptions.forEach(option => {
                // Map 'none' back to 'default' for display purposes
                const displayTheme = currentTheme === 'none' ? 'default' : currentTheme;
                if (option.getAttribute('data-theme') === displayTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        });
    }
    
    // Close modal on close button click
    const closeBtn = settingsModal.querySelector('.settings-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            settingsModal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
            settingsModal.classList.remove('active');
        }
    });
    
    // Theme selection functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.settings-modal .settings-option[data-theme]')) {
            const option = e.target.closest('.settings-option[data-theme]');
            const theme = option.getAttribute('data-theme');
            if (theme) {
                // Remove active class from all theme options
                settingsModal.querySelectorAll('.settings-option[data-theme]').forEach(opt => {
                    opt.classList.remove('active');
                });
                // Add active class to clicked option
                option.classList.add('active');
                // Map 'default' to 'none' for the Theme module
                const mappedTheme = theme === 'default' ? 'none' : theme;
                // Apply theme
                if (typeof Theme !== 'undefined' && Theme.setTheme) {
                    Theme.setTheme(mappedTheme);
                }
            }
        }
    });
    
    // Initialize theme
    Theme.init();

// Settings menu now handled by pure CSS hover
});

// Update file tree with current board structure
function updateFileTree() {
    const fileList = document.querySelector('.file-structure-list');
    if (!fileList) return;

    const boards = AppState.get('boards') || [];
    const currentBoardId = AppState.get('currentBoardId');

    let html = '';

    boards.forEach(board => {
        // Check board content
        const categories = board.categories || [];
        const cardCount = categories.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0);

        if (categories.length > 0) {
            const isExpanded = board.id === currentBoardId;
            html += `<li class="tree-item">
                <div class="tree-toggle ${isExpanded ? 'expanded' : ''}">
                    <span class="toggle-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-caret-right">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M9 6c0 -.852 .986 -1.297 1.623 -.783l.084 .076l6 6a1 1 0 0 1 .083 1.32l-.083 .094l-6 6l-.094 .083l-.077 .054l-.096 .054l-.036 .017l-.067 .027l-.108 .032l-.053 .01l-.06 .01l-.057 .004l-.059 .002l-.059 -.002l-.058 -.005l-.06 -.009l-.052 -.01l-.108 -.032l-.067 -.027l-.132 -.07l-.09 -.065l-.081 -.073l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057l-.002 -12.059z" />
                        </svg>
                    </span>
                    <div class="item-name">
                        <svg class="item-icon folder" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>${board.name}</span>
                    </div>
                </div>
                <ul class="nested" style="display: ${isExpanded ? 'block' : 'none'};">`;

            categories.forEach(cat => {
                if (cat.cards?.length > 0) {
                    html += `<li class="tree-item">
                        <div class="tree-toggle">
                            <span class="toggle-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-caret-right">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M9 6c0 -.852 .986 -1.297 1.623 -.783l.084 .076l6 6a1 1 0 0 1 .083 1.32l-.083 .094l-6 6l-.094 .083l-.077 .054l-.096 .054l-.036 .017l-.067 .027l-.108 .032l-.053 .01l-.06 .01l-.057 .004l-.059 .002l-.059 -.002l-.058 -.005l-.06 -.009l-.052 -.01l-.108 -.032l-.067 -.027l-.132 -.07l-.09 -.065l-.081 -.073l-.083 -.094l-.054 -.077l-.054 -.096l-.017 -.036l-.027 -.067l-.032 -.108l-.01 -.053l-.01 -.06l-.004 -.057l-.002 -12.059z" />
                                </svg>
                            </span>
                            <div class="item-name">
                                <svg class="item-icon folder" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-folder-open">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>${cat.title}</span>
                            </div>
                        </div>
                        <ul class="nested">
                            `;

                    cat.cards.forEach(card => {
                        html += `<li class="tree-item">
                            <div class="tree-toggle" onclick="openCard(${board.id}, '${cat.title}', '${card.title.replace(/'/g, "\\'")}')">
                                <span class="toggle-icon"></span>
                                <div class="item-name">
                                    <svg class="item-icon file file-js" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                                    </svg>
                                    <span>${card.title}</span>
                                </div>
                            </div>
                        </li>`;
                    });

                    html += `</ul>
                        </li>`;
                }
            });

            html += '</ul></li>';
        }
    });

    fileList.innerHTML = html || '<li class="tree-item"><span>No cards yet</span></li>';

    // Add event listeners for tree toggling
    document.querySelectorAll('.file-structure-list .tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('expanded');
            const nested = this.nextElementSibling;
            if (nested) {
                if (this.classList.contains('expanded')) {
                    nested.style.display = 'block';
                } else {
                    nested.style.display = 'none';
                }
            }
        });
    });
}

// Filter file tree based on search term
function filterFileTree(searchTerm) {
    const treeItems = document.querySelectorAll('.file-structure-list .tree-item');
    const treeToggles = document.querySelectorAll('.file-structure-list .tree-toggle');

    // If search term is empty, show all items and reset the tree
    if (!searchTerm) {
        treeItems.forEach(item => {
            item.style.display = '';
        });
        return;
    }

    // Hide all items initially
    treeItems.forEach(item => {
        item.style.display = 'none';
    });

    // Show only items that match the search term
    treeItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = '';
            // Show parent elements
            let parent = item.parentElement;
            while (parent && parent !== document.querySelector('.file-structure-list')) {
                if (parent.classList.contains('tree-item')) {
                    parent.style.display = '';
                }
                parent = parent.parentElement;
            }
        }
    });
}

// Open specific card
window.openCard = function(boardId, categoryTitle, cardTitle) {
    // Switch board if needed
    if (boardId !== AppState.get('currentBoardId')) {
        loadBoard(boardId);
    }
    
    // Find and expand card
    setTimeout(() => {
        const categories = document.querySelectorAll('.category');
        for (const cat of categories) {
            const title = cat.querySelector('.category-title');
            if (title?.textContent === categoryTitle) {
                const cards = cat.querySelectorAll('.card');
                for (const card of cards) {
                    if (getCardTitleText(card) === cardTitle) {
                        const overlay = card.querySelector('.card-hover-overlay');
                        if (overlay) overlay.click();
                        break;
                    }
                }
                break;
            }
        }
    }, 500);
};
