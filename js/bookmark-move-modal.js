// Bookmark Move Modal
(function() {
    let bookmarkToMove = null;
    let sourceCard = null;
    let sourceSectionId = null;
    let fileTree = null;
    
    // Initialize modal when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('bookmarkMoveModal');
        if (!modal) {
            createMoveModal();
        }
        
        // Add event listeners
        const cancelBtn = document.getElementById('bookmarkMoveCancel');
        const moveBtn = document.getElementById('bookmarkMoveBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        if (moveBtn) {
            moveBtn.addEventListener('click', moveBookmark);
        }
        
        // Close on overlay click
        const moveModal = document.getElementById('bookmarkMoveModal');
        if (moveModal) {
            moveModal.addEventListener('click', (e) => {
                if (e.target === moveModal) {
                    closeModal();
                }
            });
        }
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && moveModal && moveModal.classList.contains('active')) {
                closeModal();
            }
        });
    });
    
    // Create the move modal HTML
    function createMoveModal() {
        const modalHTML = `
            <div id="bookmarkMoveModal" class="bookmark-move-modal">
                <div class="bookmark-move-content">
                    <div class="bookmark-move-header">
                        <h3>Move Bookmark</h3>
                    </div>
                    <div class="bookmark-move-preview">
                        <div class="bookmark-move-preview-title">Loading...</div>
                        <div class="bookmark-move-preview-url"></div>
                    </div>
                    <div class="bookmark-move-tree">
                        <!-- Tree will be populated here -->
                    </div>
                    <div class="bookmark-move-footer">
                        <button id="bookmarkMoveCancel">Cancel</button>
                        <button id="bookmarkMoveBtn" disabled>Move Bookmark</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('bookmarkMoveModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    // Show move modal
    function showMoveModal(bookmark, card, sectionId = null) {
        bookmarkToMove = bookmark;
        sourceCard = card;
        sourceSectionId = sectionId;
        
        const modal = document.getElementById('bookmarkMoveModal');
        if (!modal) {
            createMoveModal();
        }
        
        const preview = modal.querySelector('.bookmark-move-preview');
        const treeContainer = modal.querySelector('.bookmark-move-tree');
        const moveBtn = document.getElementById('bookmarkMoveBtn');
        
        // Update preview
        if (preview) {
            preview.querySelector('.bookmark-move-preview-title').textContent = bookmark.title || 'Untitled';
            preview.querySelector('.bookmark-move-preview-url').textContent = bookmark.url || '';
        }
        
        // Initialize file tree
        fileTree = new window.FileTree({
            showSections: true,
            showCreateNew: true,
            onSelect: (card) => {
                // Enable move button when a card is selected
                if (moveBtn) {
                    moveBtn.disabled = false;
                }
            },
            onSectionSelect: (card, sectionId) => {
                // Enable move button when a section is selected
                if (moveBtn) {
                    moveBtn.disabled = false;
                }
            },
            onCreateNew: () => {
                createNewCardForBookmark();
            }
        });
        
        // Generate tree
        if (treeContainer) {
            fileTree.generateTree(treeContainer);
        }
        
        // Disable move button until selection
        if (moveBtn) {
            moveBtn.disabled = true;
        }
        
        // Show modal
        modal.classList.add('active');
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('bookmarkMoveModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Clear selections
        if (fileTree) {
            fileTree.clearSelection();
        }
        
        bookmarkToMove = null;
        sourceCard = null;
        sourceSectionId = null;
    }
    
    // Move bookmark to selected destination
    function moveBookmark() {
        if (!bookmarkToMove || !fileTree) return;
        
        const targetCard = fileTree.getSelectedCard();
        const targetSectionId = fileTree.getSelectedSectionId();
        
        if (!targetCard) {
            console.error('No target card selected');
            return;
        }
        
        // Remove bookmark from source
        removeBookmarkFromSource();
        
        // Add bookmark to target
        addBookmarkToTarget(targetCard, targetSectionId);
        
        // Close modal
        closeModal();
        
        // Show success notification
        if (window.simpleNotifications) {
            window.simpleNotifications.showNotification('Bookmark moved successfully');
        }
    }
    
    // Remove bookmark from source
    function removeBookmarkFromSource() {
        // If there's no source card, this bookmark is from the bookmarks modal
        // In this case, we just need to remove it from localStorage
        if (!sourceCard || !bookmarkToMove) {
            // Remove from localStorage if it exists there
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('zenban_saved_bookmark_')) {
                    try {
                        const bookmark = JSON.parse(localStorage.getItem(key));
                        if (bookmark.id === bookmarkToMove.id || bookmark.url === bookmarkToMove.url) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        console.error('Error parsing bookmark from localStorage:', e);
                    }
                }
            }
            return;
        }
        
        // Find source section
        let sourceSection = null;
        if (sourceSectionId && sourceCard.sections) {
            sourceSection = sourceCard.sections.find(s => s.id === sourceSectionId);
        }
        
        // Remove from source section or card
        if (sourceSection) {
            // Remove from section
            const index = sourceSection.bookmarks.findIndex(b => b.id === bookmarkToMove.id);
            if (index !== -1) {
                sourceSection.bookmarks.splice(index, 1);
            }
        } else {
            // Remove from card
            const index = sourceCard.bookmarks.findIndex(b => b.id === bookmarkToMove.id);
            if (index !== -1) {
                sourceCard.bookmarks.splice(index, 1);
            }
        }
        
        // Update UI in source card if it's expanded
        if (sourceCard.classList && sourceCard.classList.contains('expanded')) {
            updateSourceCardUI();
        }
        
        // Update AppState
        updateAppState(sourceCard, sourceSection, false);
    }
    
    // Add bookmark to target
    function addBookmarkToTarget(targetCard, targetSectionId) {
        if (!targetCard || !bookmarkToMove) return;
        
        // Find target section
        let targetSection = null;
        if (targetSectionId && targetCard.sections) {
            targetSection = targetCard.sections.find(s => s.id === targetSectionId);
        }
        
        // Add to target section or card
        if (targetSection) {
            // Add to section
            if (!targetSection.bookmarks) {
                targetSection.bookmarks = [];
            }
            targetSection.bookmarks.push(bookmarkToMove);
        } else {
            // Add to card
            if (!targetCard.bookmarks) {
                targetCard.bookmarks = [];
            }
            targetCard.bookmarks.push(bookmarkToMove);
        }
        
        // Update UI in target card if it's expanded
        if (targetCard.classList && targetCard.classList.contains('expanded')) {
            updateTargetCardUI(targetCard, targetSection, targetSectionId);
        }
        
        // Update AppState
        updateAppState(targetCard, targetSection, true);
    }
    
    // Update source card UI
    function updateSourceCardUI() {
        // Find the section element in the source card
        let sectionElement = null;
        if (sourceSectionId) {
            const sections = sourceCard.querySelectorAll('.card-section');
            for (const section of sections) {
                if (section.sectionData && section.sectionData.id === sourceSectionId) {
                    sectionElement = section;
                    break;
                }
            }
        }
        
        // Update bookmarks section UI
        const bookmarksContainer = sectionElement ? 
            sectionElement.querySelector('.section-bookmarks') : 
            sourceCard.querySelector('.bookmarks-section');
        
        if (bookmarksContainer) {
            // Refresh all bookmarks to update indices
            refreshBookmarksUI(bookmarksContainer, sectionElement || sourceCard);
        }
    }
    
    // Update target card UI
    function updateTargetCardUI(targetCard, targetSection, targetSectionId) {
        // Find the section element in the target card
        let sectionElement = null;
        if (targetSection && targetSectionId) {
            const sections = targetCard.querySelectorAll('.card-section');
            for (const section of sections) {
                if (section.sectionData && section.sectionData.id === targetSectionId) {
                    sectionElement = section;
                    break;
                }
            }
        }
        
        // Update bookmarks section UI
        const bookmarksContainer = sectionElement ? 
            sectionElement.querySelector('.section-bookmarks') : 
            targetCard.querySelector('.bookmarks-section');
        
        if (bookmarksContainer) {
            // Add the moved bookmark to the UI
            const bookmarkCard = window.createBookmarkCard(
                bookmarkToMove.title,
                bookmarkToMove.description || bookmarkToMove.url,
                bookmarkToMove.url,
                bookmarkToMove.timestamp || new Date(),
                bookmarkToMove.screenshot || bookmarkToMove.image,
                targetSection ? targetSection.bookmarks.length - 1 : targetCard.bookmarks.length - 1,
                targetCard,
                sectionElement
            );
            bookmarksContainer.appendChild(bookmarkCard);
        }
    }
    
    // Refresh bookmarks UI
    function refreshBookmarksUI(container, cardOrSection) {
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get bookmarks from card or section
        let bookmarks = [];
        if (cardOrSection.sectionData) {
            // Section
            bookmarks = cardOrSection.sectionData.bookmarks || [];
        } else {
            // Card
            bookmarks = cardOrSection.bookmarks || [];
        }
        
        // Re-create all bookmark cards
        if (bookmarks.length > 0) {
            bookmarks.forEach((bookmark, index) => {
                const bookmarkCard = window.createBookmarkCard(
                    bookmark.title,
                    bookmark.description || bookmark.url,
                    bookmark.url,
                    bookmark.timestamp || new Date(),
                    bookmark.screenshot || bookmark.image,
                    index,
                    cardOrSection,
                    cardOrSection.sectionData ? cardOrSection : null
                );
                container.appendChild(bookmarkCard);
            });
        } else {
            // Show placeholder when no bookmarks remain
            const bookmarkCard = window.createBookmarkCard(
                'Example Bookmark', 
                'This is a sample bookmark description that shows how bookmarks will appear.', 
                'https://example.com', 
                new Date(), 
                null, 
                0, 
                cardOrSection,
                cardOrSection.sectionData ? cardOrSection : null
            );
            container.appendChild(bookmarkCard);
        }
    }
    
    // Update AppState
    function updateAppState(card, section, isAdding) {
        if (!card.appStateLocation) return;
        
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = card.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                if (section) {
                    // Update section bookmarks
                    if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                        board.categories[categoryIndex].cards[cardIndex].sections = [];
                    }
                    
                    const sectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === section.id);
                    if (sectionIndex !== -1) {
                        board.categories[categoryIndex].cards[cardIndex].sections[sectionIndex].bookmarks = 
                            isAdding ? [...section.bookmarks] : section.bookmarks.filter(b => b.id !== bookmarkToMove.id);
                    } else if (section.id) {
                        // Add new section if it doesn't exist
                        board.categories[categoryIndex].cards[cardIndex].sections.push({
                            id: section.id,
                            title: section.title || 'New Section',
                            content: section.content || null,
                            bookmarks: isAdding ? [...section.bookmarks] : section.bookmarks.filter(b => b.id !== bookmarkToMove.id)
                        });
                    }
                } else {
                    // Update card bookmarks
                    board.categories[categoryIndex].cards[cardIndex].bookmarks = 
                        isAdding ? [...card.bookmarks] : card.bookmarks.filter(b => b.id !== bookmarkToMove.id);
                }
                
                AppState.set('boards', boards);
                
                // Save to Firebase
                if (window.syncService) {
                    window.syncService.saveAfterAction(isAdding ? 'bookmark moved to card' : 'bookmark removed from card');
                }
            }
        }
    }
    
    // Create new card for bookmark with category selection
    function createNewCardForBookmark() {
        // Get all categories
        const canvas = document.getElementById('canvas');
        const categories = canvas ? Array.from(canvas.querySelectorAll('.category')) : [];
        
        // If no categories exist, create a new one
        if (categories.length === 0) {
            if (window.createCategory) {
                const newCategory = window.createCategory('Bookmarks', 200, 200);
                if (newCategory >= 0) {
                    const categories = AppState.get('categories');
                    const category = categories[newCategory];
                    if (category && window.addCardToCategory) {
                        const newCard = window.addCardToCategory(newCategory, 'New Bookmark Card');
                        if (newCard) {
                            // Select the new card in the file tree
                            if (fileTree) {
                                // Simulate selection of the new card
                                fileTree.selectedCard = newCard;
                                
                                // Move the bookmark
                                moveBookmark();
                            }
                        }
                    }
                }
            }
            return;
        }
        
        // Show category selection dialog
        showCategorySelectionDialog(categories);
    }
    
    // Show category selection dialog
    function showCategorySelectionDialog(categories) {
        // Create dialog HTML
        let dialogHTML = `
            <div id="categorySelectionDialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; width: 400px; max-width: 90%;">
                    <h3 style="margin: 0 0 16px 0; color: #fff;">Select Category</h3>
                    <p style="color: #999; margin-bottom: 20px;">Choose where to create the new card:</p>
                    
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
        `;
        
        // Add existing categories
        categories.forEach((category, index) => {
            const titleElement = category.querySelector('.category-title');
            const title = titleElement ? titleElement.textContent : `Category ${index + 1}`;
            dialogHTML += `
                <div style="padding: 10px; margin: 5px 0; background: #2d2d2d; border-radius: 6px; cursor: pointer; transition: background 0.2s;" 
                     data-category-index="${index}">
                    <div style="font-weight: 500; color: #fff;">${title}</div>
                    <div style="font-size: 12px; color: #999;">${category.querySelectorAll('.card').length} cards</div>
                </div>
            `;
        });
        
        dialogHTML += `
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="createNewCategoryBtn" style="flex: 1; padding: 10px; background: #5353ff; color: white; border: none; border-radius: 6px; cursor: pointer;">Create New Category</button>
                        <button id="cancelCategoryDialog" style="flex: 1; padding: 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add dialog to body
        const dialog = document.createElement('div');
        dialog.innerHTML = dialogHTML;
        document.body.appendChild(dialog);
        
        // Add event listeners
        categories.forEach((category, index) => {
            const categoryElement = dialog.querySelector(`[data-category-index="${index}"]`);
            if (categoryElement) {
                categoryElement.addEventListener('click', () => {
                    // Remove dialog
                    dialog.remove();
                    
                    // Create new card in selected category
                    if (window.addCardToCategory) {
                        const newCard = window.addCardToCategory(index, 'New Bookmark Card');
                        if (newCard) {
                            // Select the new card in the file tree
                            if (fileTree) {
                                // Simulate selection of the new card
                                fileTree.selectedCard = newCard;
                                
                                // Move the bookmark
                                moveBookmark();
                            }
                        }
                    }
                });
            }
        });
        
        const createNewCategoryBtn = dialog.querySelector('#createNewCategoryBtn');
        if (createNewCategoryBtn) {
            createNewCategoryBtn.addEventListener('click', () => {
                // Remove dialog
                dialog.remove();
                
                // Ask for category name
                const categoryName = prompt('Enter a name for the new category:', 'New Category');
                if (categoryName !== null) {
                    // Create new category
                    if (window.createCategory) {
                        const newCategoryIndex = window.createCategory(categoryName, 200, 200);
                        if (newCategoryIndex >= 0) {
                            // Create new card in the new category
                            if (window.addCardToCategory) {
                                const newCard = window.addCardToCategory(newCategoryIndex, 'New Bookmark Card');
                                if (newCard) {
                                    // Select the new card in the file tree
                                    if (fileTree) {
                                        // Simulate selection of the new card
                                        fileTree.selectedCard = newCard;
                                        
                                        // Move the bookmark
                                        moveBookmark();
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
        
        const cancelBtn = dialog.querySelector('#cancelCategoryDialog');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Remove dialog
                dialog.remove();
            });
        }
        
        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }
    
    // Expose function globally
    window.showBookmarkMoveModal = showMoveModal;
})();
