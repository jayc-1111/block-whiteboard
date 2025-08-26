// Unified File Tree Component
// This is the only file tree component to be reused throughout the application

(function() {
    // File Tree Component
    class FileTree {
        constructor(options = {}) {
            this.options = {
                showSections: options.showSections || false,
                showCreateNew: options.showCreateNew || false,
                onSelect: options.onSelect || (() => {}),
                onSectionSelect: options.onSectionSelect || (() => {}),
                onCreateNew: options.onCreateNew || (() => {}),
                ...options
            };
            this.selectedCard = null;
            this.selectedSectionId = null;
        }
        
        // Generate file tree HTML from AppState
        generateTree(container) {
            const boards = AppState.get('boards') || [];
            const currentBoardId = AppState.get('currentBoardId');
            
            let html = '<div class="file-tree"><ul>';
            
            // Add "Create New Card" option if enabled
            if (this.options.showCreateNew) {
                html += `<li class="create-new-option">
                    <button class="create-new-card-btn" style="width: 100%; text-align: left; padding: 8px; background: #5353ff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Create New Card
                    </button>
                </li>`;
            }
            
            if (boards.length === 0) {
                html += '<li style="color: #666; padding: 10px;">No boards yet.</li>';
            } else {
                boards.forEach(board => {
                    // Check board content
                    const categories = board.categories || [];
                    const cardCount = categories.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0);
                    
                    if (categories.length > 0) {
                        html += `<li>
                            <details ${board.id === currentBoardId ? 'open' : ''}>
                                <summary>
                                    <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>${board.name}</span>
                                    <span class="item-count">${cardCount} cards</span>
                                </summary>
                                <ul>`;
                        
                        categories.forEach(cat => {
                            if (cat.cards?.length > 0) {
                                html += `<li>
                                    <details>
                                        <summary>
                                            <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            <span>${cat.title}</span>
                                            <span class="item-count">${cat.cards.length} cards</span>
                                        </summary>
                                        <ul>`;
                                
                                cat.cards.forEach(card => {
                                    const cardId = card.id || `card-${Date.now()}-${Math.random()}`;
                                    const bookmarkCount = card.bookmarks ? card.bookmarks.length : 0;
                                    
                                    html += `<li class="card-item" data-card-id="${cardId}">
                                        <svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                            <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                                        </svg>
                                        ${card.title}
                                        ${bookmarkCount > 0 ? `<span class="item-count">${bookmarkCount} bookmarks</span>` : ''}
                                    </li>`;
                                    
                                    // If sections are enabled and card has sections, add them as nested items
                                    if (this.options.showSections && card.sections && card.sections.length > 0) {
                                        html += `<li class="section-container" style="margin-left: 20px;">
                                            <details open>
                                                <summary style="padding-left: 10px;">
                                                    <svg class="folder-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                    <span>Sections</span>
                                                    <span class="item-count">${card.sections.length} sections</span>
                                                </summary>
                                                <ul>`;
                                        
                                        card.sections.forEach(section => {
                                            const sectionTitle = section.title || 'Untitled Section';
                                            const sectionId = section.id;
                                            
                                            html += `<li class="section-item" data-card-id="${cardId}" data-section-id="${sectionId}">
                                                <svg class="file-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                                    <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                                                </svg>
                                                ${sectionTitle}
                                            </li>`;
                                        });
                                        
                                        html += `</ul>
                                            </details>
                                        </li>`;
                                    }
                                });
                                
                                html += '</ul></details></li>';
                            } else {
                                // No cards in category
                                html += `<li>
                                    <details>
                                        <summary style="opacity: 0.5;">
                                            <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                            </svg>
                                            <span>${cat.title}</span>
                                            <span class="item-count">No cards</span>
                                        </summary>
                                    </details>
                                </li>`;
                            }
                        });
                        
                        html += '</ul></details></li>';
                    }
                });
            }
            
            html += '</ul></div>';
            container.innerHTML = html;
            
            // Add event listeners
            this.addEventListeners(container);
        }
        
        // Add event listeners to the tree elements
        addEventListeners(container) {
            // Card selection
            container.querySelectorAll('.card-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Remove previous selection
                    container.querySelectorAll('.card-item, .section-item').forEach(i => {
                        i.classList.remove('selected');
                    });
                    
                    // Select this card
                    item.classList.add('selected');
                    const cardId = item.dataset.cardId;
                    this.selectedCard = document.getElementById(cardId) || cardId;
                    this.selectedSectionId = null;
                    
                    // Call onSelect callback
                    this.options.onSelect(this.selectedCard, null);
                });
            });
            
            // Section selection
            container.querySelectorAll('.section-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Remove previous selection
                    container.querySelectorAll('.card-item, .section-item').forEach(i => {
                        i.classList.remove('selected');
                    });
                    
                    // Select this section
                    item.classList.add('selected');
                    const cardId = item.dataset.cardId;
                    const sectionId = item.dataset.sectionId;
                    const card = document.getElementById(cardId) || cardId;
                    
                    this.selectedCard = card;
                    this.selectedSectionId = sectionId;
                    
                    // Call onSectionSelect callback
                    this.options.onSectionSelect(card, sectionId);
                });
            });
            
            // Create new card button
            if (this.options.showCreateNew) {
                const createNewBtn = container.querySelector('.create-new-card-btn');
                if (createNewBtn) {
                    createNewBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.options.onCreateNew();
                    });
                }
            }
        }
        
        // Get selected card
        getSelectedCard() {
            return this.selectedCard;
        }
        
        // Get selected section ID
        getSelectedSectionId() {
            return this.selectedSectionId;
        }
        
        // Clear selection
        clearSelection() {
            this.selectedCard = null;
            this.selectedSectionId = null;
        }
    }
    
    // Make FileTree available globally
    window.FileTree = FileTree;
    
    // Also expose the existing buildCardTree function for backward compatibility
    window.buildCardTree = function(container) {
        const fileTree = new FileTree({
            showSections: true,
            showCreateNew: true
        });
        fileTree.generateTree(container);
        return fileTree;
    };
})();
