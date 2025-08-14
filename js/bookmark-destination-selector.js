// Bookmark Destination Selector Modal
(function() {
    let pendingBookmarkData = null;
    let selectedCard = null;
    let selectedSectionId = null;
    
    // Initialize modal when DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('bookmarkDestinationModal');
        const cancelBtn = modal.querySelector('.bookmark-destination-cancel');
        const addBtn = modal.querySelector('.bookmark-destination-add');
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            closeModal();
        });
        
        // Add button
        addBtn.addEventListener('click', async () => {
            if (selectedCard && pendingBookmarkData) {
                await addBookmarkToCard(selectedCard, pendingBookmarkData);
                closeModal();
            }
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    });
    
    function closeModal() {
        console.log('🎯 BOOKMARK DEST: Closing modal');
        const modal = document.getElementById('bookmarkDestinationModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Clean up localStorage bookmark keys on cancel
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('zenban_bookmark_')) {
                console.log('🎯 BOOKMARK DEST: Removing canceled bookmark from localStorage:', key);
                localStorage.removeItem(key);
            }
        }
        
        pendingBookmarkData = null;
        selectedCard = null;
        
        // Reset any state that might block next bookmark
        const addBtn = document.querySelector('.bookmark-destination-add');
        if (addBtn) {
            addBtn.disabled = false;
        }
        console.log('🎯 BOOKMARK DEST: Modal closed and state reset');
    }
    
    function showBookmarkDestination(bookmarkData) {
        console.log('🎯 BOOKMARK DEST: Showing destination selector', bookmarkData);
        
        pendingBookmarkData = bookmarkData;
        selectedCard = null;
        
        const modal = document.getElementById('bookmarkDestinationModal');
        const preview = modal.querySelector('.bookmark-preview');
        const tree = modal.querySelector('.bookmark-destination-tree');
        const addBtn = modal.querySelector('.bookmark-destination-add');
        
        // Update preview
        preview.querySelector('.bookmark-preview-title').textContent = bookmarkData.title || 'Untitled';
        preview.querySelector('.bookmark-preview-url').textContent = bookmarkData.url || '';
        
        // Build tree
        buildCardTree(tree);
        
        // Disable add button until selection
        addBtn.disabled = true;
        
        // Show modal
        modal.classList.add('active');
    }
    
    function buildCardTree(container) {
        const canvas = document.getElementById('canvas');
        const categories = canvas ? Array.from(canvas.querySelectorAll('.category')) : [];
        
        let html = '<div class="file-tree"><ul>';
        
        // Add "Create New Card" option at the top
        html += `<li class="create-new-option">
            <button class="create-new-card-btn" style="width: 100%; text-align: left; padding: 8px; background: #5353ff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Create New Card
            </button>
        </li>`;
        
        if (categories.length === 0) {
            html += '<li style="color: #666; padding: 10px;">No categories yet. A new category will be created.</li>';
        } else {
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
                
                if (cards.length === 0) {
                    // No cards in category - can't select
                    html += `<li>
                        <details>
                            <summary style="opacity: 0.5;">
                                <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                                </svg>
                                <span>${title}</span>
                                <span class="item-count">No cards</span>
                            </summary>
                        </details>
                    </li>`;
                } else {
                    html += `<li>
                        <details open>
                            <summary>
                                <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                                </svg>
                                <span>${title}</span>
                                <span class="item-count">${cards.length} cards</span>
                            </summary>
                            <ul>`;
                    
                    cards.forEach(card => {
                        const cardTitle = card.querySelector('.card-title');
                        const cardName = cardTitle ? cardTitle.textContent.trim() || 'Untitled Card' : 'Untitled Card';
                        const cardId = card.id || `card-${Date.now()}-${Math.random()}`;
                        
                        // Ensure card has ID
                        if (!card.id) card.id = cardId;
                        
                        // Count existing bookmarks
                        const bookmarkCount = card.bookmarks ? card.bookmarks.length : 0;
                        
                        html += `<li class="card-item" data-card-id="${cardId}">
                            <svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            ${cardName}
                            ${bookmarkCount > 0 ? `<span class="item-count">${bookmarkCount} bookmarks</span>` : ''}
                        </li>`;
                        
                        // If card has sections, add them as nested items
                        if (card.sections && card.sections.length > 0) {
                            html += `<li class="section-container" style="margin-left: 20px;">
                                <details open>
                                    <summary style="padding-left: 10px;">
                                        <svg class="folder-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                                        </svg>
                                        <span>Sections</span>
                                        <span class="item-count">${card.sections.length} sections</span>
                                    </summary>
                                    <ul>`;
                            
                            card.sections.forEach(section => {
                                const sectionTitle = section.title || 'Untitled Section';
                                const sectionId = section.id;
                                
                                html += `<li class="section-item" data-card-id="${cardId}" data-section-id="${sectionId}">
                                    <svg class="file-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
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
                }
            });
            
            html += '</ul></details></li>';
        }
        
        html += '</ul></div>';
        container.innerHTML = html;
        
        // Add click handlers for existing cards
        container.querySelectorAll('.card-item').forEach(item => {
            item.addEventListener('click', function() {
                // Remove previous selection
                container.querySelectorAll('.card-item, .section-item').forEach(i => i.classList.remove('selected'));
                
                // Select this card
                this.classList.add('selected');
                const cardId = this.dataset.cardId;
                selectedCard = document.getElementById(cardId);
                
                // Enable add button
                const addBtn = document.querySelector('.bookmark-destination-add');
                addBtn.disabled = false;
                
                console.log('🎯 BOOKMARK DEST: Selected card:', selectedCard);
            });
        });
        
        // Add click handlers for sections
        container.querySelectorAll('.section-item').forEach(item => {
            item.addEventListener('click', function() {
                // Remove previous selection
                container.querySelectorAll('.card-item, .section-item').forEach(i => i.classList.remove('selected'));
                
                // Select this section
                this.classList.add('selected');
                const cardId = this.dataset.cardId;
                const sectionId = this.dataset.sectionId;
                const card = document.getElementById(cardId);
                
                // Store selection
                selectedCard = card;
                selectedSectionId = sectionId;
                
                // Enable add button
                const addBtn = document.querySelector('.bookmark-destination-add');
                addBtn.disabled = false;
                
                console.log('🎯 BOOKMARK DEST: Selected section:', sectionId, 'in card:', card);
            });
        });
        
        // Add handler for "Create New Card" button
        const createNewBtn = container.querySelector('.create-new-card-btn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', function() {
                console.log('🎯 BOOKMARK DEST: Creating new card for bookmark');
                
                // Get or create a category
                let targetCategory = null;
                const canvas = document.getElementById('canvas');
                const categories = canvas ? Array.from(canvas.querySelectorAll('.category')) : [];
                
                if (categories.length === 0) {
                    // Create a new category
                    console.log('🎯 BOOKMARK DEST: Creating new category');
                    if (window.addCategory) {
                        targetCategory = window.addCategory(200, 200, 'Bookmarks');
                    }
                } else {
                    // Use the first category
                    targetCategory = categories[0];
                }
                
                if (targetCategory) {
                    // Create a new card
                    console.log('🎯 BOOKMARK DEST: Adding new card to category');
                    if (window.addCardToCategory) {
                        const newCard = window.addCardToCategory(targetCategory, 'New Bookmark Card');
                        if (newCard) {
                            // Select the new card
                            selectedCard = newCard;
                            
                            // Add the bookmark and close modal
                            if (pendingBookmarkData) {
                                addBookmarkToCard(selectedCard, pendingBookmarkData);
                                closeModal();
                                
                                // Optionally expand the card to show the bookmark
                                if (window.expandCard) {
                                    setTimeout(() => {
                                        window.expandCard(selectedCard);
                                    }, 100);
                                }
                            }
                        }
                    }
                } else {
                    console.error('🎯 BOOKMARK DEST: Failed to create or find category');
                }
            });
        }
    }
    
    async function addBookmarkToCard(card, bookmarkData) {
        console.log('🎯 BOOKMARK DEST: Adding bookmark to card', card, bookmarkData);
        
        // Add the bookmark
        const bookmark = {
            title: bookmarkData.title || 'Untitled',
            url: bookmarkData.url || '',
            description: bookmarkData.description || bookmarkData.url || '',
            screenshot: bookmarkData.screenshot || bookmarkData.image || null,
            timestamp: bookmarkData.timestamp || new Date().toISOString(),
            id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        // If a section is selected, add to that section
        if (selectedSectionId && card.sections) {
            const section = card.sections.find(s => s.id === selectedSectionId);
            if (section) {
                // Initialize bookmarks array if doesn't exist
                if (!section.bookmarks) {
                    section.bookmarks = [];
                }
                
                // Add the bookmark to the section
                section.bookmarks.push(bookmark);
                console.log('🎯 BOOKMARK DEST: Bookmark added to section, total now:', section.bookmarks.length);
                
                // Update the bookmarks section in the UI if this section is visible
                if (card.classList.contains('expanded')) {
                    const sectionElement = section.element;
                    if (sectionElement) {
                        const bookmarksSection = sectionElement.querySelector('.bookmarks-section');
                        if (bookmarksSection) {
                            // Remove placeholder
                            const placeholders = bookmarksSection.querySelectorAll('.bookmark-card');
                            placeholders.forEach(p => {
                                if (p.textContent.includes('Example Bookmark')) {
                                    p.remove();
                                }
                            });
                            
                            // Add the new bookmark card
                            if (window.createBookmarkCard) {
                                const bookmarkCard = window.createBookmarkCard(
                                    bookmark.title,
                                    bookmark.description,
                                    bookmark.url,
                                    bookmark.timestamp,
                                    bookmark.screenshot,
                                    section.bookmarks.length - 1,
                                    card
                                );
                                bookmarksSection.appendChild(bookmarkCard);
                            }
                        }
                    }
                }
            }
        } else {
            // Initialize bookmarks array if doesn't exist
            if (!card.bookmarks) {
                card.bookmarks = [];
            }
            
            // Add the bookmark to the card
            card.bookmarks.push(bookmark);
            console.log('🎯 BOOKMARK DEST: Bookmark added to card, total now:', card.bookmarks.length);
        }
        
        // Update AppState immediately to ensure persistence
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            // Find this card in the board structure
            const cardTitle = card.querySelector('.card-title')?.textContent;
            const cardId = card.dataset.cardId || card.id;
            
            for (let catIndex = 0; catIndex < board.categories.length; catIndex++) {
                const category = board.categories[catIndex];
                if (category.cards) {
                    for (let cardIndex = 0; cardIndex < category.cards.length; cardIndex++) {
                        const savedCard = category.cards[cardIndex];
                        // Match by ID first, then by title as fallback
                        if ((savedCard.id && savedCard.id === cardId) || savedCard.title === cardTitle) {
                            // Update bookmarks in AppState
                            if (selectedSectionId && savedCard.sections) {
                                // Find the section and update its bookmarks
                                const section = savedCard.sections.find(s => s.id === selectedSectionId);
                                if (section) {
                                    const sectionIndex = savedCard.sections.findIndex(s => s.id === selectedSectionId);
                                    // Create a new section object with updated bookmarks
                                    const updatedSection = {
                                        ...section,
                                        bookmarks: section.bookmarks ? [...section.bookmarks] : []
                                    };
                                    // Update the section in the card
                                    savedCard.sections[sectionIndex] = updatedSection;
                                }
                            } else {
                                // Update card-level bookmarks
                                board.categories[catIndex].cards[cardIndex].bookmarks = [...card.bookmarks];
                            }
                            
                            AppState.set('boards', boards);
                            console.log('🎯 BOOKMARK DEST: Updated AppState with new bookmark');
                            break;
                        }
                    }
                }
            }
        }
        
        // If card is currently expanded, update its display
        const expandedCard = AppState.get('expandedCard');
        if (expandedCard === card) {
            const bookmarksSection = card.querySelector('.bookmarks-section');
            if (bookmarksSection) {
                // Remove placeholder
                const placeholders = bookmarksSection.querySelectorAll('.bookmark-card');
                placeholders.forEach(p => {
                    if (p.textContent.includes('Example Bookmark')) {
                        p.remove();
                    }
                });
                
                // Refresh all bookmarks to update indices
                bookmarksSection.innerHTML = '';
                card.bookmarks.forEach((bm, index) => {
                    if (window.createBookmarkCard) {
                        const bookmarkCard = window.createBookmarkCard(
                            bm.title,
                            bm.description,
                            bm.url,
                            bm.timestamp,
                            bm.screenshot,
                            index,
                            card
                        );
                        bookmarksSection.appendChild(bookmarkCard);
                    }
                });
            }
        }
        
        // Wait for DOM update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force save board state to capture bookmark
        if (typeof saveCurrentBoard === 'function') {
            console.log('🔖 BOOKMARK: Calling saveCurrentBoard for regular card');
            await saveCurrentBoard();
        }
        
        // Save to Firebase with notification
        if (window.syncService && window.syncService.saveAfterAction) {
            console.log('🔖 BOOKMARK: Triggering sync for regular card');
            window.syncService.saveAfterAction('bookmark added to card');
            
            // Show Firebase save notification
            if (window.simpleNotifications) {
                window.simpleNotifications.showSaveNotification('saving');
                setTimeout(() => {
                    window.simpleNotifications.showSaveNotification('saved');
                }, 1000);
            }
        } else {
            console.error('🔖 BOOKMARK: Sync service not available');
        }
        
        // Show notification
        try {
            if (window.showNotification) {
                const cardTitle = card.querySelector('.card-title')?.textContent || 'card';
                window.showNotification(`Bookmark added to "${cardTitle}"`, 'success');
            } else {
                console.log('🎯 BOOKMARK DEST: Notification system not available');
            }
        } catch (e) {
            console.log('🎯 BOOKMARK DEST: Could not show notification:', e);
        }
    }
    
    // Create and add the expanded card choice modal
    function createExpandedCardModal() {
        const modalHTML = `
            <div id="expandedCardChoiceModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000001; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; margin: auto; margin-top: 100px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); position: relative; z-index: 10000002;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px;">Where would you like to add this bookmark?</h3>
                    <p style="color: #666; margin-bottom: 20px; font-size: 14px;">You currently have a card open.</p>
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <button id="addToOpenCard" style="flex: 1; padding: 10px 16px; background: #5353ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Add to Open Card</button>
                        <button id="addElsewhere" style="flex: 1; padding: 10px 16px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Choose Another Card</button>
                    </div>
                    <button id="cancelExpandedModal" style="width: 100%; padding: 10px 16px; background: #f0f0f0; color: #666; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Cancel</button>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('expandedCardChoiceModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    // Initialize the expanded card modal on DOM ready
    document.addEventListener('DOMContentLoaded', createExpandedCardModal);
    
    // Show expanded card choice modal
    function showExpandedCardChoice(bookmarkData, expandedCard) {
        const modal = document.getElementById('expandedCardChoiceModal');
        if (!modal) {
            createExpandedCardModal();
            setTimeout(() => showExpandedCardChoice(bookmarkData, expandedCard), 100);
            return;
        }
        
        modal.style.display = 'flex';
        
        // Prevent any clicks on modal content from bubbling
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.onclick = (e) => e.stopPropagation();
        }
        
        const addToOpenBtn = document.getElementById('addToOpenCard');
        const addElsewhereBtn = document.getElementById('addElsewhere');
        const cancelBtn = document.getElementById('cancelExpandedModal');
        
        // Function to close modal and clean up
        const closeExpandedModal = () => {
            modal.style.display = 'none';
            // Clean up localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('zenban_bookmark_')) {
                    console.log('🔖 Expanded modal: Removing canceled bookmark from localStorage:', key);
                    localStorage.removeItem(key);
                }
            }
        };
        
        // Clean up old listeners
        const newAddToOpen = addToOpenBtn.cloneNode(true);
        const newAddElsewhere = addElsewhereBtn.cloneNode(true);
        const newCancelBtn = cancelBtn ? cancelBtn.cloneNode(true) : null;
        addToOpenBtn.replaceWith(newAddToOpen);
        addElsewhereBtn.replaceWith(newAddElsewhere);
        if (cancelBtn && newCancelBtn) {
            cancelBtn.replaceWith(newCancelBtn);
        }
        
        // Add to open card
        newAddToOpen.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent click from reaching overlay
            modal.style.display = 'none';
            // Use the original handler logic for expanded cards
            if (expandedCard && bookmarkData) {
                // Get the actual DOM element, not just the AppState reference
                const expandedCardDOM = document.querySelector('.card.expanded') || expandedCard;
                
                // Initialize bookmarks array if doesn't exist
                if (!expandedCardDOM.bookmarks) {
                    expandedCardDOM.bookmarks = [];
                }
                
                // Add the new bookmark
                const bookmark = {
                    title: bookmarkData.title || 'Untitled',
                    url: bookmarkData.url || '',
                    description: bookmarkData.description || bookmarkData.url || '',
                    screenshot: bookmarkData.screenshot || bookmarkData.image || null,
                    timestamp: bookmarkData.timestamp || new Date().toISOString(),
                    id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                expandedCardDOM.bookmarks.push(bookmark);
                console.log('🔖 BOOKMARK MODAL: Added bookmark to DOM element, total now:', expandedCardDOM.bookmarks.length);
                
                // Update AppState immediately to ensure persistence
                if (expandedCardDOM.appStateLocation) {
                    const boards = AppState.get('boards');
                    const currentBoardId = AppState.get('currentBoardId');
                    const board = boards.find(b => b.id === currentBoardId);
                    
                    if (board && board.categories) {
                        const { categoryIndex, cardIndex } = expandedCardDOM.appStateLocation;
                        if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                            board.categories[categoryIndex].cards[cardIndex].bookmarks = [...expandedCardDOM.bookmarks];
                            AppState.set('boards', boards);
                            console.log('🔖 BOOKMARK MODAL: Updated AppState with new bookmark');
                        }
                    }
                } else {
                    // Fallback: find card location if appStateLocation missing
                    const boards = AppState.get('boards');
                    const currentBoardId = AppState.get('currentBoardId');
                    const board = boards.find(b => b.id === currentBoardId);
                    
                    if (board && board.categories) {
                        const cardTitle = expandedCardDOM.querySelector('.card-title')?.textContent;
                        const cardId = expandedCardDOM.dataset.cardId || expandedCardDOM.id;
                        
                        for (let catIndex = 0; catIndex < board.categories.length; catIndex++) {
                            const category = board.categories[catIndex];
                            if (category.cards) {
                                for (let cardIndex = 0; cardIndex < category.cards.length; cardIndex++) {
                                    const savedCard = category.cards[cardIndex];
                                    if ((savedCard.id && savedCard.id === cardId) || savedCard.title === cardTitle) {
                                        board.categories[catIndex].cards[cardIndex].bookmarks = [...expandedCardDOM.bookmarks];
                                        AppState.set('boards', boards);
                                        console.log('🔖 BOOKMARK MODAL: Updated AppState with new bookmark (fallback)');
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Update the bookmarks section without collapsing
                const bookmarksSection = expandedCardDOM.querySelector('.bookmarks-section');
                if (bookmarksSection) {
                    // Remove placeholder if it exists
                    const placeholders = bookmarksSection.querySelectorAll('.bookmark-card');
                    placeholders.forEach(p => {
                        if (p.textContent.includes('Example Bookmark')) {
                            p.remove();
                        }
                    });
                    
                    // Add the new bookmark card
                    if (window.createBookmarkCard) {
                        const bookmarkCard = window.createBookmarkCard(
                            bookmark.title,
                            bookmark.description,
                            bookmark.url,
                            bookmark.timestamp,
                            bookmark.screenshot,
                            expandedCardDOM.bookmarks.length - 1,
                            expandedCardDOM
                        );
                        bookmarksSection.appendChild(bookmarkCard);
                    }
                }
                
                // Wait a moment to ensure DOM is updated
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Force save of the board to capture the bookmark
                if (typeof saveCurrentBoard === 'function') {
                    console.log('🔖 BOOKMARK: Calling saveCurrentBoard after adding bookmark');
                    await saveCurrentBoard();
                }
                
                // Trigger Firebase sync with notification
                if (window.syncService && window.syncService.saveAfterAction) {
                    console.log('🔖 BOOKMARK: Triggering sync service save');
                    window.syncService.saveAfterAction('bookmark added to expanded card');
                    
                    // Show Firebase save notification
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showSaveNotification('saving');
                        setTimeout(() => {
                            window.simpleNotifications.showSaveNotification('saved');
                        }, 1000);
                    }
                } else {
                    console.error('🔖 BOOKMARK: Sync service not available or missing saveAfterAction');
                }
                
                // Show notification
                if (window.simpleNotifications) {
                    window.simpleNotifications.showSaveNotification('saved');
                }
            } else {
                console.error('Expanded card or bookmark data not available');
            }
        });
        
        // Choose elsewhere
        newAddElsewhere.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from reaching overlay
            modal.style.display = 'none';
            // Don't clean up localStorage here - we're passing bookmark to destination selector
            showBookmarkDestination(bookmarkData);
        });
        
        // Cancel button
        if (newCancelBtn) {
            newCancelBtn.addEventListener('click', closeExpandedModal);
        }
        
        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.stopPropagation(); // Prevent click from reaching overlay
                closeExpandedModal();
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeExpandedModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Override the global handleBookmarkData to show selector
    const originalHandler = window.handleBookmarkData;
    window.originalHandleBookmarkData = originalHandler; // Store for later use
    window.handleBookmarkData = function(data) {
        console.log('🔖 BOOKMARK: Intercepted bookmark data', data);
        
        // Check if there's an expanded card
        const expandedCard = AppState.get('expandedCard');
        if (expandedCard) {
            // Show choice modal
            showExpandedCardChoice(data, expandedCard);
        } else {
            // Show destination selector
            showBookmarkDestination(data);
        }
    };
    
    // Update the section selection in the expanded card
    function selectSectionInExpandedCard(sectionElement) {
        // Remove active class from all sections
        const allSections = document.querySelectorAll('.card-section');
        allSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Add active class to selected section
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
    }
    
    // Make selectSectionInExpandedCard available globally
    window.selectSectionInExpandedCard = selectSectionInExpandedCard;
    
    // Expose for testing
    window.showBookmarkDestination = showBookmarkDestination;
})();
