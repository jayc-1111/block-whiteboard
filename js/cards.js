// Card management
function createCardSlot() {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragleave', handleDragLeave);
    
    return slot;
}

function addCard() {
    const categories = AppState.get('categories');
    if (categories.length === 0) {
        createCategory();
    }
    addCardToCategory(0);
}

function addCardToCategory(categoryOrIndex, title = 'New Card', content = null, bookmarks = null) {
    let category;
    
    // Support both category element and index
    if (typeof categoryOrIndex === 'number') {
        const categories = AppState.get('categories');
        if (categoryOrIndex < 0 || categoryOrIndex >= categories.length) {
            console.error('Invalid category index:', categoryOrIndex);
            return null;
        }
        category = categories[categoryOrIndex];
    } else {
        // Find category in AppState by element
        const categories = AppState.get('categories');
        category = categories.find(cat => cat.element === categoryOrIndex);
    }
    
    if (!category || !category.element) {
        console.error('Category not found:', categoryOrIndex);
        return null;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    
    // Generate unique ID for the card
    const cardId = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    card.id = cardId;
    card.dataset.cardId = cardId;

    const cardTitle = document.createElement('div');
    cardTitle.className = 'card-title';
    cardTitle.contentEditable = true;
    cardTitle.textContent = title;
    cardTitle.dataset.placeholder = title;

    cardTitle.addEventListener('focus', function(e) {
        e.stopPropagation();
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    
    // Handle paste to strip formatting
    cardTitle.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
    cardTitle.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
        // Save after editing card title
        if (window.syncService) {
            window.syncService.saveAfterAction('card title edited');
        }
    });

    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';

    // Create container for Editor.js (will be initialized when expanded)
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';
    editorContainer.id = `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    cardContent.appendChild(editorContainer);
    
    // Store initial content on the card for later use
    card.initialContent = content;
    card.bookmarks = bookmarks || []; // Store bookmarks on card
    
    // Debug bookmark restoration
    if (bookmarks && bookmarks.length > 0) {
        console.log(`📚 CARD: Restored card "${title}" with ${bookmarks.length} bookmarks:`);
        bookmarks.forEach((b, i) => console.log(`  📌 Bookmark ${i}: ${b.title}`));
    }
    
    // Store category reference for when card is expanded
    if (category.element.id) {
        card.dataset.categoryId = category.element.id;
    } else {
        // Generate ID if category doesn't have one
        category.element.id = `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        card.dataset.categoryId = category.element.id;
    }

    card.appendChild(cardTitle);
    card.appendChild(cardContent);

    const hoverOverlay = document.createElement('div');
    hoverOverlay.className = 'card-hover-overlay';
    hoverOverlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    `;
    hoverOverlay.onclick = (e) => {
        e.stopPropagation();
        expandCard(card);
    };
    card.appendChild(hoverOverlay);

    // Store reference to editor container
    card.editorContainer = editorContainer;

    cardTitle.addEventListener('mousedown', (e) => {
        if (e.target === cardTitle) e.stopPropagation();
    });
    
    editorContainer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    const grid = category.element.querySelector('.cards-grid');
    if (!grid) {
        console.error('Cards grid not found in category');
        return;
    }
    const slots = grid.querySelectorAll('.card-slot');
    
    console.log(`Adding card "${title}" to category "${category.element.querySelector('.category-title')?.textContent}"`);
    console.log(`Cards grid found:`, grid);
    console.log(`Available slots:`, slots.length);
    
    let cardPlaced = false;
    for (let slot of slots) {
        if (!slot.hasChildNodes()) {
            slot.appendChild(card);
            cardPlaced = true;
            console.log('Card placed in existing slot');
            break;
        }
    }

    if (!cardPlaced) {
        const newSlot = createCardSlot();
        grid.appendChild(newSlot);
        newSlot.appendChild(card);
        console.log('Card placed in new slot');
    }
    
    // Verify card placement
    const cardsInCategory = category.element.querySelectorAll('.card');
    console.log(`Total cards now in category DOM: ${cardsInCategory.length}`);
    cardsInCategory.forEach((c, i) => {
        const cTitle = c.querySelector('.card-title')?.textContent;
        console.log(`  Card ${i}: "${cTitle}"`);
    });

    // Track the card in the category with its ID
    category.cards.push(card);
    
    // Store card reference in AppState for bookmark persistence
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards.find(b => b.id === currentBoardId);
    if (board && board.categories) {
        const categoryIndex = AppState.get('categories').indexOf(category);
        if (categoryIndex !== -1 && board.categories[categoryIndex]) {
            const cardIndex = board.categories[categoryIndex].cards.length - 1;
            if (cardIndex >= 0 && board.categories[categoryIndex].cards[cardIndex]) {
                board.categories[categoryIndex].cards[cardIndex].id = cardId;
    if (!board.categories[categoryIndex].cards[cardIndex].bookmarks) {
        board.categories[categoryIndex].cards[cardIndex].bookmarks = [];
    }
            }
        }
    }
    
    // Save after adding card
    if (window.syncService) {
        window.syncService.saveAfterAction('card added');
    }
    
    // Show toggle button and collapse when 5+ cards
    const toggleBtn = category.element.querySelector('.toggle-btn');
    if (category.cards.length >= CONSTANTS.CARDS_BEFORE_COLLAPSE) {
        toggleBtn.style.display = 'inline-block';
        
        // Auto-collapse on 5th card
        if (category.cards.length === CONSTANTS.CARDS_BEFORE_COLLAPSE) {
            toggleCategory(category.element);
        }
    }
    
    // Return the created card
    return card;
}

function deleteCard(card) {
    if (!card) return;
    
    const slot = card.parentElement;
    const categoryElement = card.closest('.category');
    
    if (categoryElement) {
        const categories = AppState.get('categories');
        const categoryIndex = parseInt(categoryElement.dataset.categoryId);
        const category = categories[categoryIndex];
        
        if (category) {
            // Remove card from category's cards array
            const cardIndex = category.cards.indexOf(card);
            if (cardIndex > -1) {
                category.cards.splice(cardIndex, 1);
            }
            
            // Check if toggle button should be hidden
            const toggleBtn = categoryElement.querySelector('.toggle-btn');
            if (category.cards.length < CONSTANTS.CARDS_BEFORE_COLLAPSE) {
                toggleBtn.style.display = 'none';
            }
            
            // Save after deleting card
            if (window.syncService) {
                window.syncService.saveAfterAction('card deleted');
            }
        }
    }
    
    card.remove();
    
    const category = slot?.closest('.category');
    if (category) {
        updateCategoryToggle(category);
    }
}

function expandCard(card) {
    if (!card) {
        console.error('❌ EXPAND: No card provided to expandCard');
        return;
    }
    
    console.log('💚 EXPAND: expandCard called');
    console.log('💚 EXPAND: Card element:', card);
    console.log('💚 EXPAND: Card parent:', card.parentElement);
    console.log('💚 EXPAND: Card classes:', card.className);
    console.log('💚 EXPAND: Card has required elements:', {
        title: !!card.querySelector('.card-title'),
        content: !!card.querySelector('.card-content'),
        editorContainer: !!(card.querySelector('.editor-container') || card.editorContainer)
    });
    
    // Ensure card is in DOM
    if (!card.parentElement) {
        console.error('❌ EXPAND: Card has no parent element, cannot expand');
        return;
    }
    console.log('💚 EXPAND: Card is in DOM, proceeding...');
    
    // Find card's location in AppState
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards.find(b => b.id === currentBoardId);
    let cardLocation = null;
    
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
                        cardLocation = { categoryIndex: catIndex, cardIndex: cardIndex };
                        // Restore bookmarks from AppState if missing on DOM
                        if (!card.bookmarks && savedCard.bookmarks) {
                            card.bookmarks = savedCard.bookmarks;
                            console.log(`💚 EXPAND: Restored ${savedCard.bookmarks.length} bookmarks from AppState`);
                        }
                        break;
                    }
                }
                if (cardLocation) break;
            }
        }
    }
    
    // Store location for later updates
    card.appStateLocation = cardLocation;
    console.log('💚 EXPAND: Card location in AppState:', cardLocation);
    
    // Remove any existing overlays first to prevent stacking
    const existingOverlays = document.querySelectorAll('.expanded-card-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    const expandedCard = AppState.get('expandedCard');
    if (expandedCard && expandedCard !== card) {
        collapseCard(expandedCard);
        AppState.set('expandedCard', null);
    }
    
    // Create overlay with 75% transparency
    const overlay = document.createElement('div');
    overlay.className = 'expanded-card-overlay';
    overlay.onclick = () => {
        // Save before closing
        if (window.syncService) {
            window.syncService.manualSave();
        }
        collapseCard(card);
        AppState.set('expandedCard', null);
    };
    document.body.appendChild(overlay);
    card.overlayElement = overlay;
    
    // Store original position BEFORE moving card
    card.originalParent = card.parentElement;
    card.originalNextSibling = card.nextSibling;
    card.originalSlotIndex = Array.from(card.originalParent.parentElement.children).indexOf(card.originalParent);
    console.log(`💚 EXPAND: Card original slot index: ${card.originalSlotIndex}`);
    
    // Ensure card has all required child elements
    if (!card.querySelector('.card-title')) {
        console.error('Card missing title element');
        return;
    }
    if (!card.querySelector('.card-content')) {
        console.error('Card missing content element');
        return;
    }
    if (!card.editorContainer && !card.querySelector('.editor-container')) {
        console.error('Card missing editor container');
        return;
    }
    
    // Clear ALL inline styles that might interfere
    console.log('💚 EXPAND: Clearing inline styles');
    card.style.cssText = '';
    
    // Move to body BEFORE adding expanded class to ensure CSS applies correctly
    console.log('💚 EXPAND: Moving card to document.body');
    document.body.appendChild(card);
    console.log('💚 EXPAND: Card moved, new parent:', card.parentElement);
    
    // Force browser to recalculate styles before adding expanded class
    card.offsetHeight; // Force reflow
    console.log('💚 EXPAND: Forced reflow complete');
    
    // Use requestAnimationFrame to ensure DOM is ready before applying styles and building content
    console.log('💚 EXPAND: Calling requestAnimationFrame...');
    requestAnimationFrame(() => {
        console.log('💚 EXPAND: Inside requestAnimationFrame callback');
        console.log('💚 EXPAND: Adding expanded class');
        card.classList.add('expanded');
        if (card.darkModeEnabled) card.classList.add('dark-mode');
        card.draggable = false;
        AppState.set('expandedCard', card);
        console.log('💚 EXPAND: Card classes after expansion:', card.className);
        
        console.log('💚 EXPAND: Initializing Editor.js...');
        // Initialize Editor.js in expanded mode
        initializeEditorJS(card);
        
        // Remove any existing expanded content first
        const existingWrapper = card.querySelector('.expanded-card-content');
        if (existingWrapper) {
            console.log('💚 EXPAND: Removing existing wrapper');
            existingWrapper.remove();
        }
        
        console.log('💚 EXPAND: Creating new wrapper');
        const wrapper = document.createElement('div');
        wrapper.className = 'expanded-card-content';
        if (card.darkModeEnabled) wrapper.classList.add('dark-mode');
        
        console.log('💚 EXPAND: Building button row...');
        // Create button row at top
    const buttonRow = document.createElement('div');
    buttonRow.className = 'expanded-card-buttons';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'header-buttons';
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-card-btn';
    saveBtn.textContent = 'Save';
    saveBtn.style.display = 'block';
    saveBtn.onclick = async (e) => {
        e.stopPropagation();
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Saving...
        `;
        
        // Save Quill content to card's initialContent
        if (card.quillEditor) {
            card.initialContent = {
                content: card.quillEditor.root.innerHTML
            };
        }
        
        if (window.syncService) {
            window.syncService.isManualSave = true;
            await window.syncService.manualSave();
        }
        
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save
            `;
        }, 1000);
    };
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-card-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.display = 'block';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove Card',
            `Are you sure you want to remove "${card.querySelector('.card-title').textContent}"?`,
            () => {
                collapseCard(card);
                deleteCard(card);
            }
        );
    };
    
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(deleteBtn);
    buttonRow.appendChild(buttonContainer);
    
    // Create header section with title
    const header = document.createElement('div');
    header.className = 'expanded-card-header';
    if (card.darkModeEnabled) header.classList.add('dark-mode');
    
    // Move title to header
    const cardTitle = card.querySelector('.card-title');
    if (cardTitle) {
        header.appendChild(cardTitle);
    }
    
    // Add empty spacer div (25% width)
    const spacer = document.createElement('div');
    spacer.className = 'header-spacer';
    header.appendChild(spacer);
    
    // Create main content area with flex layout
    const mainContent = document.createElement('div');
    mainContent.className = 'expanded-card-main';
    if (card.darkModeEnabled) mainContent.classList.add('dark-mode');
    
    // Editor section (left)
    const editorSection = document.createElement('div');
    editorSection.className = 'editor-section';
    editorSection.appendChild(card.editorContainer);
    
    // Bookmarks section (right)
    const bookmarksSection = document.createElement('div');
    bookmarksSection.className = 'bookmarks-section';
    
    // Display real bookmarks if card has them, otherwise show placeholder
    if (card.bookmarks && card.bookmarks.length > 0) {
        console.log('💚 EXPAND: Loading', card.bookmarks.length, 'bookmarks');
            card.bookmarks.forEach((bookmark, index) => {
                const bookmarkCard = createBookmarkCard(
                    bookmark.title,
                    bookmark.description || bookmark.url,
                    bookmark.url,
                    bookmark.timestamp || new Date(),
                    bookmark.screenshot || bookmark.image,
                    index,
                    card
                );
                bookmarksSection.appendChild(bookmarkCard);
            });
        } else {
            // Create sample bookmark card
            const bookmarkCard = createBookmarkCard('Example Bookmark', 'This is a sample bookmark description that shows how bookmarks will appear.', 'https://example.com', new Date(), null, 0, card);
            bookmarksSection.appendChild(bookmarkCard);
        }
    
    mainContent.appendChild(editorSection);
    mainContent.appendChild(bookmarksSection);
    
    console.log('💚 EXPAND: Assembling wrapper components...');
    wrapper.appendChild(buttonRow);
    wrapper.appendChild(header);
    wrapper.appendChild(mainContent);
    console.log('💚 EXPAND: Appending wrapper to card');
    card.appendChild(wrapper);
    console.log('💚 EXPAND: ✅ Card expansion complete!');
    console.log('💚 EXPAND: Final card structure:', {
        hasWrapper: !!card.querySelector('.expanded-card-content'),
        hasButtons: !!card.querySelector('.expanded-card-buttons'),
        hasHeader: !!card.querySelector('.expanded-card-header'),
        hasMain: !!card.querySelector('.expanded-card-main'),
        cardClasses: card.className,
        cardParent: card.parentElement?.tagName
    });
    });
}

// Create bookmark card element
function createBookmarkCard(title, description, url, date, imageData, bookmarkIndex, expandedCard) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    card.dataset.bookmarkIndex = bookmarkIndex;
    
    // Create controls row at the top
    const controlsRow = document.createElement('div');
    controlsRow.className = 'bookmark-controls';
    controlsRow.style.cssText = 'display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 4px;';
    
    // Move up button
    const moveUpBtn = document.createElement('button');
    moveUpBtn.className = 'bookmark-move-btn';
    moveUpBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>`;
    moveUpBtn.title = 'Move up';
    moveUpBtn.style.cssText = 'padding: 2px 4px; background: #374151; border: 1px solid #4b5563; border-radius: 4px; cursor: pointer; color: #9ca3af; transition: all 0.2s; height: 22px; display: flex; align-items: center;';
    moveUpBtn.disabled = bookmarkIndex === 0;
    if (bookmarkIndex === 0) moveUpBtn.style.opacity = '0.3';
    
    moveUpBtn.onclick = () => {
        reorderBookmark(expandedCard, bookmarkIndex, bookmarkIndex - 1);
    };
    
    // Move down button
    const moveDownBtn = document.createElement('button');
    moveDownBtn.className = 'bookmark-move-btn';
    moveDownBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`;
    moveDownBtn.title = 'Move down';
    moveDownBtn.style.cssText = 'padding: 2px 4px; background: #374151; border: 1px solid #4b5563; border-radius: 4px; cursor: pointer; color: #9ca3af; transition: all 0.2s; height: 22px; display: flex; align-items: center;';
    const totalBookmarks = expandedCard?.bookmarks?.length || 1;
    moveDownBtn.disabled = bookmarkIndex >= totalBookmarks - 1;
    if (bookmarkIndex >= totalBookmarks - 1) moveDownBtn.style.opacity = '0.3';
    
    moveDownBtn.onclick = () => {
        reorderBookmark(expandedCard, bookmarkIndex, bookmarkIndex + 1);
    };
    
    // Add hover effects
    [moveUpBtn, moveDownBtn].forEach(btn => {
        if (!btn.disabled) {
            btn.onmouseenter = () => {
                btn.style.background = '#4b5563';
                btn.style.color = '#fff';
            };
            btn.onmouseleave = () => {
                btn.style.background = '#374151';
                btn.style.color = '#9ca3af';
            };
        }
    });
    
    controlsRow.appendChild(moveUpBtn);
    controlsRow.appendChild(moveDownBtn);
    card.appendChild(controlsRow);
    
    // Image or placeholder
    if (imageData) {
        const img = document.createElement('img');
        img.className = 'bookmark-image';
        img.src = imageData;
        img.style.cssText = 'width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 12px;';
        card.appendChild(img);
    } else {
        const imagePlaceholder = document.createElement('div');
        imagePlaceholder.className = 'bookmark-image-placeholder';
        card.appendChild(imagePlaceholder);
    }    
    const cardTitle = document.createElement('h3');
    cardTitle.className = 'bookmark-title';
    cardTitle.textContent = title;
    
    const cardDesc = document.createElement('p');
    cardDesc.className = 'bookmark-description';
    cardDesc.textContent = description;
    
    const cardUrl = document.createElement('a');
    cardUrl.className = 'bookmark-url';
    cardUrl.href = url;
    cardUrl.target = '_blank';
    cardUrl.textContent = url;
    
    const cardDate = document.createElement('span');
    cardDate.className = 'bookmark-date';
    cardDate.textContent = date.toLocaleDateString ? date.toLocaleDateString() : date;
    
    card.appendChild(cardTitle);
    card.appendChild(cardDesc);
    card.appendChild(cardUrl);
    card.appendChild(cardDate);
    
    return card;
}

// Function to reorder bookmarks
function reorderBookmark(expandedCard, fromIndex, toIndex) {
    if (!expandedCard || !expandedCard.bookmarks) return;
    
    const bookmarks = expandedCard.bookmarks;
    if (toIndex < 0 || toIndex >= bookmarks.length) return;
    
    // Reorder the bookmarks array
    const [movedBookmark] = bookmarks.splice(fromIndex, 1);
    bookmarks.splice(toIndex, 0, movedBookmark);
    
    // Update AppState immediately
    if (expandedCard.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = expandedCard.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                board.categories[categoryIndex].cards[cardIndex].bookmarks = [...expandedCard.bookmarks];
                AppState.set('boards', boards);
                console.log('🔖 BOOKMARK: Updated AppState with reordered bookmarks');
            }
        }
    }
    
    // Refresh the bookmarks display
    const bookmarksSection = expandedCard.querySelector('.bookmarks-section');
    if (bookmarksSection) {
        bookmarksSection.innerHTML = '';
        
        // Re-create all bookmark cards with updated indices
        bookmarks.forEach((bookmark, index) => {
            const bookmarkCard = createBookmarkCard(
                bookmark.title,
                bookmark.description || bookmark.url,
                bookmark.url,
                bookmark.timestamp || new Date(),
                bookmark.screenshot || bookmark.image,
                index,
                expandedCard
            );
            bookmarksSection.appendChild(bookmarkCard);
        });
    }
    
    // Save the reordered bookmarks
    if (window.syncService) {
        window.syncService.saveAfterAction('bookmarks reordered');
    }
}

function collapseCard(card) {
    if (!card || !card.classList.contains('expanded')) return;
    
    // Wait for any pending saves
    if (window.syncService && window.syncService.isSaving) {
        setTimeout(() => collapseCard(card), 100);
        return;
    }
    
    // Remove overlay
    if (card.overlayElement) {
        card.overlayElement.remove();
        card.overlayElement = null;
    }
    
    // Remove any orphaned overlays
    const overlays = document.querySelectorAll('.expanded-card-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    card.classList.remove('expanded');
    card.draggable = true;
    card.style.position = '';
    card.style.width = '';
    card.style.height = '';
    card.style.left = '';
    card.style.top = '';
    card.style.transform = '';
    card.style.zIndex = '';
    
    // Destroy Quill instance when collapsing
    if (card.quillEditor) {
        card.quillEditor = null;
    }
    
    // Restore original card structure
    const expandedWrapper = card.querySelector('.expanded-card-content');
    if (expandedWrapper) {
        // Get the title from header and restore it to card
        const titleInHeader = expandedWrapper.querySelector('.expanded-card-header .card-title');
        if (titleInHeader) {
            // Find where to insert title (before card-content)
            const cardContent = card.querySelector('.card-content');
            if (cardContent) {
                card.insertBefore(titleInHeader, cardContent);
            } else {
                card.appendChild(titleInHeader);
            }
        }
        
        // Remove the entire expanded wrapper and its contents
        expandedWrapper.remove();
    }
    
    // Don't set maxWidth inline - let CSS handle it
    // card.style.maxWidth = CONSTANTS.CARD_MAX_WIDTH;
    
    // Ensure original parent still exists and is in the DOM
    if (card.originalParent && card.originalParent.isConnected) {
        try {
            if (card.originalNextSibling && card.originalNextSibling.parentElement === card.originalParent) {
                card.originalParent.insertBefore(card, card.originalNextSibling);
            } else {
                card.originalParent.appendChild(card);
            }
        } catch (error) {
            console.error('Error restoring card position:', error);
            // Find a safe place for the card
            const categories = document.querySelectorAll('.category');
            if (categories.length > 0) {
                const firstCategoryGrid = categories[0].querySelector('.cards-grid');
                const emptySlot = firstCategoryGrid.querySelector('.card-slot:empty');
                if (emptySlot) {
                    emptySlot.appendChild(card);
                } else {
                    const newSlot = createCardSlot();
                    firstCategoryGrid.appendChild(newSlot);
                    newSlot.appendChild(card);
                }
            }
        }
    } else {
        // Card has no valid original parent - find first empty slot
        const emptySlot = document.querySelector('.card-slot:empty');
        if (emptySlot) {
            emptySlot.appendChild(card);
        } else {
            // Create new slot in first category
            const firstCategory = document.querySelector('.category');
            if (firstCategory) {
                const grid = firstCategory.querySelector('.cards-grid');
                const newSlot = createCardSlot();
                grid.appendChild(newSlot);
                newSlot.appendChild(card);
            } else {
                // No categories exist - remove card from DOM
                card.remove();
            }
        }
    }
    
    // Clear original parent references
    card.originalParent = null;
    card.originalNextSibling = null;
}

function createBulletItem(list, text = '', indent = 0) {
    const li = document.createElement('li');
    li.className = `bullet-item indent-${Math.min(indent, CONSTANTS.MAX_INDENT_LEVEL)}`;
    
    const content = document.createElement('div');
    content.className = 'bullet-content';
    content.contentEditable = true;
    content.textContent = text;
    
    if (text) {
        content.dataset.placeholder = text;
        content.dataset.isPlaceholder = 'true';
    }
    
    content.addEventListener('focus', function() {
        if (this.dataset.isPlaceholder === 'true' && this.textContent === this.dataset.placeholder) {
            this.textContent = '';
            this.dataset.isPlaceholder = 'false';
        }
    });
    
    content.addEventListener('blur', function() {
        if (this.textContent.trim() === '' && this.dataset.placeholder) {
            this.textContent = this.dataset.placeholder;
            this.dataset.isPlaceholder = 'true';
        }
    });
    
    li.appendChild(content);
    list.appendChild(li);
    
    return li;
}

function handleBulletKeydown(e) {
    const content = e.target;
    if (!content.classList.contains('bullet-content')) return;

    const li = content.parentElement;
    const list = li.parentElement;

    if (e.key === 'Enter') {
        e.preventDefault();
        const newLi = createBulletItem(list, '', getCurrentIndent(li));
        li.after(newLi);
        newLi.querySelector('.bullet-content').focus();
    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            const currentIndent = getCurrentIndent(li);
            if (currentIndent > 0) {
                li.className = `bullet-item indent-${currentIndent - 1}`;
            }
        } else {
            const currentIndent = getCurrentIndent(li);
            if (currentIndent < CONSTANTS.MAX_INDENT_LEVEL) {
                li.className = `bullet-item indent-${currentIndent + 1}`;
            }
        }
    } else if (e.key === 'Backspace' && content.textContent === '') {
        e.preventDefault();
        const prevLi = li.previousElementSibling;
        if (prevLi) {
            li.remove();
            prevLi.querySelector('.bullet-content').focus();
        }
    }
}

function getCurrentIndent(li) {
    const match = li.className.match(/indent-(\d)/);
    return match ? parseInt(match[1]) : 0;
}

// Handle bookmark data from Firefox extension
window.handleBookmarkData = function(data) {
    console.log('🔖 BOOKMARK: Received bookmark data from extension:', data);
    
    // Get the currently expanded card
    const expandedCard = AppState.get('expandedCard');
    if (!expandedCard) {
        console.error('❌ BOOKMARK: No expanded card to add bookmark to');
        // Show destination selector instead
        if (window.showBookmarkDestination) {
            window.showBookmarkDestination(data);
        } else {
            // Could show a notification to user
            if (window.simpleNotifications) {
                window.simpleNotifications.showNotification('Please open a card first to add bookmarks', 'error');
            }
        }
        return;
    }
    
    // Initialize bookmarks array if doesn't exist
    if (!expandedCard.bookmarks) {
        expandedCard.bookmarks = [];
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
    
    expandedCard.bookmarks.push(bookmark);
    console.log('🔖 BOOKMARK: Added bookmark to card:', bookmark.title);
    
    // Update AppState immediately
    if (expandedCard.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = expandedCard.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                board.categories[categoryIndex].cards[cardIndex].bookmarks = [...expandedCard.bookmarks];
                AppState.set('boards', boards);
                console.log('🔖 BOOKMARK: Updated AppState with new bookmark');
            }
        }
    }
    
    // Update the bookmarks section if card is expanded
    const bookmarksSection = expandedCard.querySelector('.bookmarks-section');
    if (bookmarksSection) {
        // Remove placeholder if it exists
        const placeholders = bookmarksSection.querySelectorAll('.bookmark-card');
        placeholders.forEach(p => {
            if (p.textContent.includes('Example Bookmark')) {
                p.remove();
            }
        });
        
        // Add the new bookmark card with proper index
        const bookmarkCard = createBookmarkCard(
            bookmark.title,
            bookmark.description,
            bookmark.url,
            bookmark.timestamp,
            bookmark.screenshot,
            expandedCard.bookmarks.length - 1,  // New bookmark is at the end
            expandedCard
        );
        bookmarksSection.appendChild(bookmarkCard);
        console.log('🔖 BOOKMARK: Updated UI with new bookmark');
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

// Expose functions globally for file tree integration
window.expandCard = expandCard;
window.addCardToCategory = addCardToCategory;
// window.createCategory is exposed in categories.js

// Debug injection for extension
window.extensionDebug = true;
console.log('🔌 EXTENSION: Block Whiteboard ready for bookmarks');
console.log('🔌 EXTENSION: processBookmarkOnce available:', typeof window.processBookmarkOnce);
console.log('🔌 EXTENSION: handleBookmarkData available:', typeof window.handleBookmarkData);

// Initialize Quill Editor in expanded card
async function initializeEditorJS(card) {
    if (!card.editorContainer) {
        console.error('No editor container found on card');
        return;
    }
    
    console.log('Initializing Quill in container:', card.editorContainer.id);
    
    // Wait for Quill to be available
    let attempts = 0;
    while (!window.Quill && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.Quill) {
        console.error('Quill not loaded');
        card.editorContainer.innerHTML = '<div class="editor-error">Editor not available. Please refresh the page.</div>';
        return;
    }
    
    // Clear the container first
    card.editorContainer.innerHTML = '';
    
    // Create editor div inside the container
    const editorDiv = document.createElement('div');
    editorDiv.id = `quill-${Date.now()}`;
    editorDiv.style.height = '100%';
    card.editorContainer.appendChild(editorDiv);
    
    // Initialize Quill according to documentation
    const quill = new Quill(editorDiv, {
        theme: 'snow',
        placeholder: 'Type here...',
        modules: {
            syntax: true,  // Enable syntax highlighting
            clipboard: {
                matchVisual: false  // Strip formatting on paste
            },
            toolbar: {
                container: [
                    // Media and formulas
                    ['link', 'image', 'video', 'formula'],
                    
                    // Headers and blocks
                    [{ 'header': 1 }, { 'header': 2 }, 'blockquote', 'code-block'],
                    
                    // Text formatting
                    ['bold', 'italic', 'underline', 'strike'],
                    
                    // Script
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    
                    // Lists
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    
                    // Alignment
                    [{ 'align': [] }],
                    
                    // Dark mode toggle
                    ['dark-mode']
                ],
                handlers: {
                    'dark-mode': function() {
                        const container = card.querySelector('.editor-container');
                        const toolbar = card.querySelector('.ql-toolbar');
                        const editor = card.querySelector('.ql-editor');
                        const button = toolbar.querySelector('.ql-dark-mode');
                        const expandedContent = card.querySelector('.expanded-card-content');
                        const expandedHeader = card.querySelector('.expanded-card-header');
                        const expandedMain = card.querySelector('.expanded-card-main');
                        
                        if (container.classList.contains('dark-mode')) {
                            container.classList.remove('dark-mode');
                            toolbar.classList.remove('dark-mode');
                            editor.classList.remove('dark-mode');
                            button.classList.remove('active');
                            card.classList.remove('dark-mode');
                            if (expandedContent) expandedContent.classList.remove('dark-mode');
                            if (expandedHeader) expandedHeader.classList.remove('dark-mode');
                            if (expandedMain) expandedMain.classList.remove('dark-mode');
                            card.darkModeEnabled = false;
                        } else {
                            container.classList.add('dark-mode');
                            toolbar.classList.add('dark-mode');
                            editor.classList.add('dark-mode');
                            button.classList.add('active');
                            card.classList.add('dark-mode');
                            if (expandedContent) expandedContent.classList.add('dark-mode');
                            if (expandedHeader) expandedHeader.classList.add('dark-mode');
                            if (expandedMain) expandedMain.classList.add('dark-mode');
                            card.darkModeEnabled = true;
                        }
                    }
                }
            }
        }
    });
    
    // Add moon icon to dark mode button
    setTimeout(() => {
        const darkModeBtn = card.querySelector('.ql-dark-mode');
        if (darkModeBtn) {
            darkModeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
            
            // Restore dark mode state if it was previously enabled
            if (card.darkModeEnabled) {
                const container = card.querySelector('.editor-container');
                const toolbar = card.querySelector('.ql-toolbar');
                const editor = card.querySelector('.ql-editor');
                const expandedContent = card.querySelector('.expanded-card-content');
                const expandedHeader = card.querySelector('.expanded-card-header');
                const expandedMain = card.querySelector('.expanded-card-main');
                
                container.classList.add('dark-mode');
                toolbar.classList.add('dark-mode');
                editor.classList.add('dark-mode');
                darkModeBtn.classList.add('active');
                card.classList.add('dark-mode');
                if (expandedContent) expandedContent.classList.add('dark-mode');
                if (expandedHeader) expandedHeader.classList.add('dark-mode');
                if (expandedMain) expandedMain.classList.add('dark-mode');
            }
        }
    }, 100);
    
    // Set initial content
    if (card.initialContent?.content) {
        quill.root.innerHTML = card.initialContent.content;
    }
    
    // Store reference
    card.quillEditor = quill;
    
    // Save content on changes
    quill.on('text-change', () => {
        card.initialContent = {
            content: quill.root.innerHTML
        };
    });
    
    console.log('Quill initialized successfully');
}
