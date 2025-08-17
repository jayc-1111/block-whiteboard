// Helper function to get card title text
function getCardTitleText(card) {
    const cardTitle = card.querySelector('.card-title');
    if (!cardTitle) return '';
    
    // If we have a titleTextElement (our span), use its textContent
    if (cardTitle.titleTextElement) {
        return cardTitle.titleTextElement.textContent;
    }
    
    // Fallback to the card title's text content
    return cardTitle.textContent;
}

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

    // Create container for SVG and title
    const titleContainer = document.createElement('div');
    titleContainer.className = 'card-title-container';
    
    // Create file icon SVG
    const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fileIcon.className = 'card-title-icon';
    fileIcon.setAttribute('width', '16');
    fileIcon.setAttribute('height', '16');
    fileIcon.setAttribute('viewBox', '0 0 24 24');
    fileIcon.setAttribute('fill', 'currentColor');
    fileIcon.innerHTML = '<path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z" clip-rule="evenodd"/>';
    
    const cardTitle = document.createElement('div');
    cardTitle.className = 'card-title';
    cardTitle.contentEditable = true;
    
    // Create text span
    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleText.dataset.placeholder = title;
    
    // Add icon and text to container
    titleContainer.appendChild(fileIcon);
    cardTitle.appendChild(titleText);
    titleContainer.appendChild(cardTitle);
    
    // Store reference to text element for later use
    cardTitle.titleTextElement = titleText;

    cardTitle.addEventListener('focus', function(e) {
        e.stopPropagation();
        if (this.titleTextElement && this.titleTextElement.textContent === this.titleTextElement.dataset.placeholder) {
            this.titleTextElement.textContent = '';
        } else if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    
    // Handle paste to strip formatting
    cardTitle.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (this.titleTextElement) {
            this.titleTextElement.textContent = text;
        } else {
            document.execCommand('insertText', false, text);
        }
    });
    cardTitle.addEventListener('blur', function() {
        if (this.titleTextElement && this.titleTextElement.textContent.trim() === '') {
            this.titleTextElement.textContent = this.titleTextElement.dataset.placeholder;
        } else if (this.textContent.trim() === '') {
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
    card.sections = []; // Store sections on card
    
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

    card.appendChild(titleContainer);
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
        
        console.log('🔍 DEBUG: Looking for card in AppState', { cardId, cardTitle });
        
        for (let catIndex = 0; catIndex < board.categories.length; catIndex++) {
            const category = board.categories[catIndex];
            if (category.cards) {
                for (let cardIndex = 0; cardIndex < category.cards.length; cardIndex++) {
                    const savedCard = category.cards[cardIndex];
                    // Match by ID first, then by title as fallback
                    if ((savedCard.id && savedCard.id === cardId) || savedCard.title === cardTitle) {
                        cardLocation = { categoryIndex: catIndex, cardIndex: cardIndex };
                        console.log('🔍 DEBUG: Found card in AppState', { cardLocation });
                        
                        // Restore bookmarks from AppState if missing on DOM
                        if (!card.bookmarks && savedCard.bookmarks) {
                            card.bookmarks = savedCard.bookmarks;
                            console.log(`💚 EXPAND: Restored ${savedCard.bookmarks.length} bookmarks from AppState`);
                        }
                        // Restore sections from AppState if available
                        if (savedCard.sections) {
                            card.sections = savedCard.sections;
                            console.log(`💚 EXPAND: Restored ${savedCard.sections.length} sections from AppState`, {
                                sectionIds: savedCard.sections.map(s => s.id)
                            });
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
    
    // Dark mode toggle button (moon icon)
    const darkModeBtn = document.createElement('button');
    darkModeBtn.className = 'dark-mode-toggle';
    darkModeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    darkModeBtn.title = 'Toggle dark mode';
    darkModeBtn.style.cssText = 'padding: 5px 10px; background: #2d2d2d; border: 1px solid #444; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; margin-left: 5px;';
    
    darkModeBtn.onclick = (e) => {
        e.stopPropagation();
        const container = card.querySelector('.editor-container');
        const expandedContent = card.querySelector('.expanded-card-content');
        const expandedHeader = card.querySelector('.expanded-card-header');
        const expandedMain = card.querySelector('.expanded-card-main');
        
        if (card.darkModeEnabled) {
            // Disable dark mode
            container.classList.remove('dark-mode');
            card.classList.remove('dark-mode');
            if (expandedContent) expandedContent.classList.remove('dark-mode');
            if (expandedHeader) expandedHeader.classList.remove('dark-mode');
            if (expandedMain) expandedMain.classList.remove('dark-mode');
            card.darkModeEnabled = false;
            darkModeBtn.classList.remove('active');
        } else {
            // Enable dark mode
            container.classList.add('dark-mode');
            card.classList.add('dark-mode');
            if (expandedContent) expandedContent.classList.add('dark-mode');
            if (expandedHeader) expandedHeader.classList.add('dark-mode');
            if (expandedMain) expandedMain.classList.add('dark-mode');
            card.darkModeEnabled = true;
            darkModeBtn.classList.add('active');
        }
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
            `Are you sure you want to remove "${getCardTitleText(card)}"?`,
            () => {
                collapseCard(card);
                deleteCard(card);
            }
        );
    };
    
    buttonContainer.appendChild(darkModeBtn);
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
    
    console.log('🔍 DEBUG: Checking for existing sections in DOM', { 
        existingSectionsCount: card.querySelectorAll('.card-section').length 
    });
    
    // Check if sections already exist in the DOM to prevent duplicates
    const existingSections = card.querySelectorAll('.card-section');
    if (existingSections.length > 0) {
        console.log('🔍 DEBUG: Found existing sections in DOM, moving them to main content');
        // Sections already exist in DOM, move them to main content
        existingSections.forEach(section => {
            mainContent.appendChild(section);
        });
    } else {
        console.log('🔍 DEBUG: No existing sections in DOM, creating from card data', {
            cardSectionsCount: card.sections ? card.sections.length : 0
        });
        // Create sections from card data, but first check if sections already exist in DOM
        // to prevent duplication from Firebase sync
        if (card.sections && card.sections.length > 0) {
            console.log('🔍 DEBUG: Creating sections from saved data', {
                savedSectionsCount: card.sections.length,
                sectionIds: card.sections.map(s => s.id)
            });
        // Create sections from saved data
        card.sections.forEach((sectionData, index) => {
            console.log('🔍 DEBUG: Processing saved section data', { 
                index, 
                sectionId: sectionData.id,
                sectionTitle: sectionData.title,
                bookmarksCount: sectionData.bookmarks?.length || 0
            });
            
            // Check if a section with this ID already exists in DOM
            const existingSection = Array.from(mainContent.querySelectorAll('.card-section')).find(section => {
                return section.sectionData && section.sectionData.id === sectionData.id;
            });
            
            if (!existingSection) {
                // Check if this section already exists in the card's sections array with an element
                const sectionInCardArray = card.sections.find(s => s.id === sectionData.id && s.element);
                if (sectionInCardArray) {
                    console.log('🔍 DEBUG: Section already exists in card array with element, adding to DOM', { sectionId: sectionData.id });
                    mainContent.appendChild(sectionInCardArray.element);
                } else {
                    console.log('🔍 DEBUG: Creating new section from saved data', { sectionId: sectionData.id });
                    // Pass the existing section ID to createSection to prevent duplication
                    const section = createSection(card, sectionData.bookmarks, sectionData.id);
                    // Update section title
                    const sectionTitle = section.querySelector('.section-title');
                    if (sectionTitle) {
                        sectionTitle.textContent = sectionData.title;
                    }
                    // Update section content if it exists
                    if (sectionData.content && sectionData.content.content) {
                        // Initialize editor first
                        setTimeout(() => {
                            if (section.sectionData && section.sectionData.element) {
                                const editorContainer = section.sectionData.element.querySelector('.editor-container');
                                if (editorContainer && section.sectionData.element.quillEditor) {
                                    section.sectionData.element.quillEditor.root.innerHTML = sectionData.content.content;
                                }
                            }
                        }, 0);
                    }
                    mainContent.appendChild(section);
                }
            } else {
                console.log('🔍 DEBUG: Section already exists in DOM, skipping creation', { sectionId: sectionData.id });
                mainContent.appendChild(existingSection);
            }
        });
        } else {
            console.log('🔍 DEBUG: Creating first section with editor and bookmarks', {
                bookmarksCount: card.bookmarks?.length || 0
            });
            // Check if first section already exists
            const firstSectionExists = mainContent.querySelector('.card-section') || 
                                     (card.sections && card.sections.length > 0 && card.sections[0].element);
            if (!firstSectionExists) {
                // Create first section with editor and bookmarks
                const firstSection = createSection(card, card.bookmarks);
                mainContent.appendChild(firstSection);
            } else {
                console.log('🔍 DEBUG: First section already exists, skipping creation');
            }
        }
    }
    
    // Create add section button container
    const addSectionContainer = document.createElement('div');
    addSectionContainer.className = 'add-section-container';
    
    // Create add section button
    const addSectionBtn = document.createElement('button');
    addSectionBtn.className = 'add-section-btn';
    addSectionBtn.textContent = 'Add Section';
    
    // Add click handler to create new section
    addSectionBtn.onclick = () => {
        console.log('🔍 DEBUG: Add section button clicked');
        const newSection = createSection(card, []);
        mainContent.insertBefore(newSection, addSectionContainer);
        console.log('🔍 DEBUG: New section added to DOM', { 
            sectionId: newSection.sectionData?.id,
            sectionsInCard: card.sections?.length
        });
        
        // Save to Firebase
        if (window.syncService) {
            window.syncService.saveAfterAction('section added');
        }
    };
    
    // Add the button to container and container to main content
    addSectionContainer.appendChild(addSectionBtn);
    mainContent.appendChild(addSectionContainer);
    
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
    
    // Add margin-top to first bookmark only
    if (bookmarkIndex === 0) {
        card.style.marginTop = '68px';
    }
    
    // Create controls container for top right buttons
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'bookmark-controls-container';
    controlsContainer.style.cssText = 'display: flex; position: absolute; top: 8px; right: 8px; z-index: 10; gap: 4px;';
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'bookmark-remove-btn';
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18"></path>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
    </svg>`;
    removeBtn.title = 'Remove bookmark';
    removeBtn.style.cssText = 'padding: 2px 4px; background: #dc2626; border: 1px solid #ef4444; border-radius: 12px; cursor: pointer; transition: all 0.2s; height: 22px; display: flex; align-items: center;';
    
    removeBtn.onclick = () => {
        removeBookmark(expandedCard, bookmarkIndex);
    };
    
    // Add hover effect for remove button
    removeBtn.onmouseenter = () => {
        removeBtn.style.background = '#ef4444';
        removeBtn.style.transform = 'scale(1.05)';
    };
    removeBtn.onmouseleave = () => {
        removeBtn.style.background = '#dc2626';
        removeBtn.style.transform = 'scale(1)';
    };
    
    controlsContainer.appendChild(removeBtn);
    card.appendChild(controlsContainer);
    
    // Image or placeholder
    if (imageData) {
        const img = document.createElement('img');
        img.className = 'bookmark-image';
        img.src = imageData;
        img.style.cssText = 'width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 12px;';
        card.appendChild(img);
    } else {
        const imagePlaceholder = document.createElement('div');
        imagePlaceholder.className = 'bookmark-image-placeholder';
        card.appendChild(imagePlaceholder);
    }    
    const cardTitle = document.createElement('h3');
    cardTitle.className = 'bookmark-title';
    
    // Create title as a link using the bookmark URL
    const titleLink = document.createElement('a');
    titleLink.href = url;
    titleLink.target = '_blank';
    titleLink.textContent = title;
    cardTitle.appendChild(titleLink);
    
    const cardDesc = document.createElement('p');
    cardDesc.className = 'bookmark-description';
    cardDesc.textContent = description;
    
    const cardDate = document.createElement('div');
    cardDate.className = 'bookmark-date';
    cardDate.style.cssText = 'text-align: right; font-size: 12px; color: #666; margin-top: 8px;';
    cardDate.textContent = date.toLocaleDateString ? date.toLocaleDateString() : date;
    
    card.appendChild(cardTitle);
    card.appendChild(cardDesc);
    card.appendChild(cardDate);
    
    // Create controls row at the bottom
    const controlsRow = document.createElement('div');
    controlsRow.className = 'bookmark-controls';
    controlsRow.style.cssText = 'display: flex; justify-content: flex-start; gap: 6px; margin-top: 8px;';
    
    // Move up button
    const moveUpBtn = document.createElement('button');
    moveUpBtn.className = 'bookmark-move-btn';
    moveUpBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>`;
    moveUpBtn.title = 'Move up';
    moveUpBtn.style.cssText = 'padding: 2px 4px; background: #374151; border: 1px solid #4b5563; border-radius: 12px; cursor: pointer; transition: all 0.2s; height: 22px; display: flex; align-items: center;';
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
    moveDownBtn.style.cssText = 'padding: 2px 4px; background: #374151; border: 1px solid #4b5563; border-radius: 12px; cursor: pointer; transition: all 0.2s; height: 22px; display: flex; align-items: center;';
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
    
    return card;
}

// Function to remove a bookmark
function removeBookmark(expandedCard, bookmarkIndex) {
    if (!expandedCard || !expandedCard.bookmarks) return;
    
    const bookmarks = expandedCard.bookmarks;
    if (bookmarkIndex < 0 || bookmarkIndex >= bookmarks.length) return;
    
    // Get the bookmark being removed for potential confirmation
    const removedBookmark = bookmarks[bookmarkIndex];
    
    // Show confirmation dialog
    showConfirmDialog(
        'Remove Bookmark',
        `Are you sure you want to remove "${removedBookmark.title}"?`,
        () => {
            // Remove the bookmark from the array
            bookmarks.splice(bookmarkIndex, 1);
            
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
                        console.log('🗑️ BOOKMARK: Updated AppState after removing bookmark');
                    }
                }
            }
            
            // Remove any existing dialogs first to prevent stacking
            const existingDialogs = document.querySelectorAll('.dialog-overlay, .confirm-dialog');
            existingDialogs.forEach(dialog => dialog.remove());
            
            // Refresh the bookmarks display
            const bookmarksSection = expandedCard.querySelector('.bookmarks-section');
            if (bookmarksSection) {
                bookmarksSection.innerHTML = '';
                
                // Re-create all bookmark cards with updated indices
                if (bookmarks.length > 0) {
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
                } else {
                    // Show placeholder when no bookmarks remain
                    const bookmarkCard = createBookmarkCard('Example Bookmark', 'This is a sample bookmark description that shows how bookmarks will appear.', 'https://example.com', new Date(), null, 0, expandedCard);
                    bookmarksSection.appendChild(bookmarkCard);
                }
            }
            
            // Save the updated bookmarks
            if (window.syncService) {
                const expandedBeforeSync = AppState.get('expandedCard');
                console.log('🔧 SYNC DEBUG: Before sync - expandedCard:', expandedBeforeSync);
                window.syncService.saveAfterAction('bookmark removed').then(() => {
                    console.log('🔧 SYNC DEBUG: Sync complete - restoring expandedCard:', expandedBeforeSync);
                    AppState.set('expandedCard', expandedBeforeSync);
                }).catch(err => {
                    console.error('🔧 SYNC DEBUG: Sync failed:', err);
                });
            }
            
            // Show success notification
            if (window.simpleNotifications) {
                window.simpleNotifications.showNotification(`Bookmark removed: ${removedBookmark.title}`);
            }
        }
    );
}

// Function to reorder bookmarks
function reorderBookmark(expandedCard, fromIndex, toIndex) {
    if (!expandedCard || !expandedCard.bookmarks) return;
    
    const bookmarks = expandedCard.bookmarks;
    if (toIndex < 0 || toIndex >= bookmarks.length) return;

    const wasExpanded = expandedCard.classList.contains('expanded');
    let cardContentToRestore = null;

    if (wasExpanded && expandedCard.quillEditor) {
        cardContentToRestore = {
            content: expandedCard.quillEditor.root.innerHTML
        };
        console.log('🔖 BOOKMARK: Storing Quill content before reorder.');
    }

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
        console.log('🔧 SYNC DEBUG: Initiating saveAfterAction for bookmarks reordered.');
        window.syncService.saveAfterAction('bookmarks reordered').then(() => {
            console.log('🔧 SYNC DEBUG: Sync complete.');
            
            // Only attempt to restore expanded state if it was expanded before
            if (wasExpanded) {
                console.log('🔖 BOOKMARK: Card was expanded before sync, ensuring it remains expanded.');
                
                // Use requestAnimationFrame to ensure DOM is stable before re-expanding
                requestAnimationFrame(() => {
                    // Check if card is still in DOM and needs re-expansion
                    if (document.body.contains(expandedCard) && !expandedCard.classList.contains('expanded')) {
                        console.log('🔖 BOOKMARK: Re-expanding card after sync to maintain state.');
                        expandCard(expandedCard);
                        
                        // Restore editor content after re-expansion
                        if (cardContentToRestore && expandedCard.quillEditor) {
                            console.log('🔖 BOOKMARK: Restoring Quill content after re-expansion.');
                            expandedCard.quillEditor.root.innerHTML = cardContentToRestore.content;
                            expandedCard.initialContent = cardContentToRestore;
                        }
                    }
                });
            }
        }).catch(err => {
            console.error('🔧 SYNC DEBUG: Sync failed:', err);
        });
    }
}

function collapseCard(card) {
    if (!card || !card.classList.contains('expanded')) return;
    
    console.log('🔍 DEBUG: collapseCard called', { cardId: card.id });
    
    // Save sections data before collapsing
    if (card.sections && card.appStateLocation) {
        console.log('🔍 DEBUG: Saving sections data before collapse', { 
            sectionsCount: card.sections.length,
            sectionIds: card.sections.map(s => s.id)
        });
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = card.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                // Initialize sections array if it doesn't exist
                if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                    board.categories[categoryIndex].cards[cardIndex].sections = [];
                    console.log('🔍 DEBUG: Initialized sections array in AppState');
                }
                
                console.log('🔍 DEBUG: Before updating board sections', {
                    boardSectionsCount: board.categories[categoryIndex].cards[cardIndex].sections.length,
                    sectionIds: board.categories[categoryIndex].cards[cardIndex].sections.map(s => s.id)
                });
                
                // Update sections in board data
                card.sections.forEach(sectionData => {
                    console.log('🔍 DEBUG: Processing section for board save', { sectionId: sectionData.id });
                    // Find existing section or add new one
                    const sectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === sectionData.id);
                    if (sectionIndex !== -1) {
                        // Update existing section
                        board.categories[categoryIndex].cards[cardIndex].sections[sectionIndex] = {
                            id: sectionData.id,
                            title: sectionData.title,
                            content: sectionData.content,
                            bookmarks: sectionData.bookmarks
                        };
                        console.log('🔍 DEBUG: Updated existing section in board data', { sectionId: sectionData.id });
                    } else {
                        // Add new section
                        board.categories[categoryIndex].cards[cardIndex].sections.push({
                            id: sectionData.id,
                            title: sectionData.title,
                            content: sectionData.content,
                            bookmarks: sectionData.bookmarks
                        });
                        console.log('🔍 DEBUG: Added new section to board data', { sectionId: sectionData.id });
                    }
                });
                
                console.log('🔍 DEBUG: After updating board sections', {
                    boardSectionsCount: board.categories[categoryIndex].cards[cardIndex].sections.length,
                    sectionIds: board.categories[categoryIndex].cards[cardIndex].sections.map(s => s.id)
                });
                
                AppState.set('boards', boards);
                console.log('🔖 SECTION: Saved sections to AppState before collapse', {
                    totalBoardSections: board.categories[categoryIndex].cards[cardIndex].sections.length
                });
            }
        }
    }
    
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
            // Find or recreate the title container to maintain flex column layout
            let titleContainer = card.querySelector('.card-title-container');
            
            if (!titleContainer) {
                // Recreate the title container if it's missing
                titleContainer = document.createElement('div');
                titleContainer.className = 'card-title-container';
                
                // Recreate the file icon SVG
                const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                fileIcon.className = 'card-title-icon';
                fileIcon.setAttribute('width', '16');
                fileIcon.setAttribute('height', '16');
                fileIcon.setAttribute('viewBox', '0 0 24 24');
                fileIcon.setAttribute('fill', 'currentColor');
                fileIcon.innerHTML = '<path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z" clip-rule="evenodd"/>';
                
                titleContainer.appendChild(fileIcon);
                
                // Find where to insert the container (before card-content and hover-overlay)
                const cardContent = card.querySelector('.card-content');
                const hoverOverlay = card.querySelector('.card-hover-overlay');
                
                if (hoverOverlay) {
                    card.insertBefore(titleContainer, hoverOverlay);
                } else if (cardContent) {
                    card.insertBefore(titleContainer, cardContent);
                } else {
                    card.appendChild(titleContainer);
                }
            }
            
            // Add the title back to the container (after the icon)
            titleContainer.appendChild(titleInHeader);
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
    
    // NOTE: This function is now overridden in bookmark-destination-selector.js
    // to show the modal with section selection. This is kept as a fallback.
    
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
    
    // Get the first section by default (modal should override this)
    const activeSection = expandedCard.querySelector('.card-section:first-child');
    
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
    if (expandedCard.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = expandedCard.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                // Find the section in the board data
                if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                    board.categories[categoryIndex].cards[cardIndex].sections = [];
                }
                
                const sectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === sectionData.id);
                if (sectionIndex !== -1) {
                    board.categories[categoryIndex].cards[cardIndex].sections[sectionIndex].bookmarks = [...sectionData.bookmarks];
                } else {
                    board.categories[categoryIndex].cards[cardIndex].sections.push({
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
    
    // Update the bookmarks section if card is expanded
    const bookmarksSection = activeSection.querySelector('.section-bookmarks');
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
            sectionData.bookmarks.length - 1,  // New bookmark is at the end
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

// Create a section with editor and bookmarks
function createSection(card, bookmarks = [], existingSectionId = null) {
    console.log('🔍 DEBUG: createSection called', { 
        cardId: card.id, 
        bookmarksCount: bookmarks.length,
        existingSectionsCount: card.sections ? card.sections.length : 0,
        existingSectionId: existingSectionId
    });
    
    // Create section container
    const section = document.createElement('div');
    section.className = 'card-section';
    
    // Create section title
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.contentEditable = true;
    sectionTitle.textContent = 'New Section';
    sectionTitle.dataset.placeholder = 'New Section';
    
    sectionTitle.addEventListener('focus', function() {
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    
    sectionTitle.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
    });
    
    // Create content container for editor and bookmarks
    const contentContainer = document.createElement('div');
    contentContainer.className = 'section-content';
    
    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container section-editor';
    
    // Create bookmarks container
    const bookmarksSection = document.createElement('div');
    bookmarksSection.className = 'bookmarks-section section-bookmarks';
    
    // Add title to section
    section.appendChild(sectionTitle);
    
    // Add editor to content container
    contentContainer.appendChild(editorContainer);
    
    // Add bookmarks to content container
    contentContainer.appendChild(bookmarksSection);
    
    // Add content container to section
    section.appendChild(contentContainer);
    
    // Create section data object - use existing ID if provided, otherwise generate new one
    const sectionData = {
        id: existingSectionId || `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: sectionTitle.textContent,
        content: null,
        bookmarks: bookmarks || []
    };
    
    console.log('🔍 DEBUG: Created section data', { sectionId: sectionData.id });
    
    // Store section data on the section element
    section.sectionData = sectionData;
    
    // Add section to card's sections array ONLY if it doesn't already exist
    if (!card.sections) {
        card.sections = [];
    }
    
    // Check if section with this ID already exists in card.sections
    const existingSectionIndex = card.sections.findIndex(s => s.id === sectionData.id);
    console.log('🔍 DEBUG: Checking for existing section in card.sections', { 
        existingSectionIndex, 
        totalCardSections: card.sections.length 
    });
    
    if (existingSectionIndex === -1) {
        card.sections.push(sectionData);
        console.log('🔍 DEBUG: Added new section to card.sections', { 
            sectionId: sectionData.id,
            totalCardSections: card.sections.length 
        });
    } else {
        // Update existing section data
        card.sections[existingSectionIndex] = sectionData;
        console.log('🔍 DEBUG: Updated existing section in card.sections', { 
            sectionId: sectionData.id,
            index: existingSectionIndex 
        });
    }
    
    // Store a reference to the section element on the section data
    sectionData.element = section;
    
    // Save to AppState
    if (card.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.categories) {
            const { categoryIndex, cardIndex } = card.appStateLocation;
            if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                // Initialize sections array if it doesn't exist
                if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                    board.categories[categoryIndex].cards[cardIndex].sections = [];
                }
                
                console.log('🔍 DEBUG: Board sections before processing', { 
                    boardSectionsCount: board.categories[categoryIndex].cards[cardIndex].sections.length,
                    sectionIds: board.categories[categoryIndex].cards[cardIndex].sections.map(s => s.id)
                });
                
                // Check if section with this ID already exists in board data
                const boardSectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === sectionData.id);
                console.log('🔍 DEBUG: Checking for existing section in board data', { boardSectionIndex });
                
                if (boardSectionIndex === -1) {
                    // Add the new section to the board data
                    board.categories[categoryIndex].cards[cardIndex].sections.push({
                        id: sectionData.id,
                        title: sectionData.title,
                        content: null,
                        bookmarks: sectionData.bookmarks || []
                    });
                    console.log('🔍 DEBUG: Added new section to board data', { sectionId: sectionData.id });
                } else {
                    // Update existing section in board data
                    board.categories[categoryIndex].cards[cardIndex].sections[boardSectionIndex] = {
                        id: sectionData.id,
                        title: sectionData.title,
                        content: null,
                        bookmarks: sectionData.bookmarks || []
                    };
                    console.log('🔍 DEBUG: Updated existing section in board data', { 
                        sectionId: sectionData.id,
                        index: boardSectionIndex 
                    });
                }
                
                AppState.set('boards', boards);
                console.log('🔖 SECTION: Updated AppState with section', {
                    totalBoardSections: board.categories[categoryIndex].cards[cardIndex].sections.length
                });
            }
        }
    }
    
    // Initialize editor in this section
    console.log('🔍 DEBUG: Initializing editor for section', { sectionId: sectionData.id });
    initializeEditorJS(card, editorContainer);
    
    // Add bookmarks to section
    if (bookmarks && bookmarks.length > 0) {
        console.log('🔍 DEBUG: Adding bookmarks to section', { 
            sectionId: sectionData.id, 
            bookmarksCount: bookmarks.length 
        });
        bookmarks.forEach((bookmark, index) => {
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
        console.log('🔍 DEBUG: Adding sample bookmark to section', { sectionId: sectionData.id });
        // Create sample bookmark card
        const bookmarkCard = createBookmarkCard('Example Bookmark', 'This is a sample bookmark description that shows how bookmarks will appear.', 'https://example.com', new Date(), null, 0, card);
        bookmarksSection.appendChild(bookmarkCard);
    }
    
    // Update section title listener to save changes
    sectionTitle.addEventListener('blur', function() {
        if (card.appStateLocation) {
            const boards = AppState.get('boards');
            const currentBoardId = AppState.get('currentBoardId');
            const board = boards.find(b => b.id === currentBoardId);
            
            if (board && board.categories) {
                const { categoryIndex, cardIndex } = card.appStateLocation;
                if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                    // Find and update this section in the board data
                    if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                        board.categories[categoryIndex].cards[cardIndex].sections = [];
                    }
                    
                    // Update or add section
                    const sectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === sectionData.id);
                    if (sectionIndex !== -1) {
                        board.categories[categoryIndex].cards[cardIndex].sections[sectionIndex].title = this.textContent;
                        console.log('🔍 DEBUG: Updated section title in board data', { 
                            sectionId: sectionData.id, 
                            newTitle: this.textContent 
                        });
                    } else {
                        board.categories[categoryIndex].cards[cardIndex].sections.push({
                            id: sectionData.id,
                            title: this.textContent,
                            content: null,
                            bookmarks: sectionData.bookmarks || []
                        });
                        console.log('🔍 DEBUG: Added new section with title to board data', { 
                            sectionId: sectionData.id, 
                            title: this.textContent 
                        });
                    }
                    
                    AppState.set('boards', boards);
                    console.log('🔖 SECTION: Updated AppState with section title');
                    
                    // Save to Firebase
                    if (window.syncService) {
                        window.syncService.saveAfterAction('section title edited');
                    }
                }
            }
        }
    });
    
    console.log('🔍 DEBUG: createSection completed', { sectionId: sectionData.id });
    return section;
}

// Initialize Quill Editor in expanded card
async function initializeEditorJS(card, container = null) {
    // Use provided container or default to card's editorContainer
    const editorContainer = container || card.editorContainer;
    
    if (!editorContainer) {
        console.error('No editor container found on card');
        return;
    }
    
    console.log('Initializing Quill in container:', editorContainer.id || 'dynamic');
    
    // Wait for Quill to be available
    let attempts = 0;
    while (!window.Quill && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.Quill) {
        console.error('Quill not loaded');
        editorContainer.innerHTML = '<div class="editor-error">Editor not available. Please refresh the page.</div>';
        return;
    }
    
    // Clear the container first
    editorContainer.innerHTML = '';
    
    // Create editor div inside the container
    const editorDiv = document.createElement('div');
    editorDiv.id = `quill-${Date.now()}`;
    editorDiv.style.height = '100%';
    editorDiv.style.minHeight = '200px';
    editorContainer.appendChild(editorDiv);
    
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
    
    // Create dark mode toggle button
    setTimeout(() => {
        const toolbar = card.querySelector('.ql-toolbar');
        if (toolbar) {
            // Remove existing dark mode button from toolbar if present
            const existingDarkModeBtn = toolbar.querySelector('.ql-dark-mode');
            if (existingDarkModeBtn) {
                existingDarkModeBtn.remove();
            }
            
            // Create new dark mode toggle button
            const darkModeToggle = document.createElement('button');
            darkModeToggle.className = 'dark-mode-toggle';
            darkModeToggle.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
            darkModeToggle.title = 'Toggle dark mode';
            darkModeToggle.style.cssText = 'padding: 5px 10px; background: #2d2d2d; border: 1px solid #444; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; margin-left: 5px;';
            
            // Add click handler
            darkModeToggle.onclick = function() {
                const container = card.querySelector('.editor-container');
                const editor = card.querySelector('.ql-editor');
                const expandedContent = card.querySelector('.expanded-card-content');
                const expandedHeader = card.querySelector('.expanded-card-header');
                const expandedMain = card.querySelector('.expanded-card-main');
                
                if (container.classList.contains('dark-mode')) {
                    container.classList.remove('dark-mode');
                    toolbar.classList.remove('dark-mode');
                    editor.classList.remove('dark-mode');
                    darkModeToggle.classList.remove('active');
                    card.classList.remove('dark-mode');
                    if (expandedContent) expandedContent.classList.remove('dark-mode');
                    if (expandedHeader) expandedHeader.classList.remove('dark-mode');
                    if (expandedMain) expandedMain.classList.remove('dark-mode');
                    card.darkModeEnabled = false;
                } else {
                    container.classList.add('dark-mode');
                    toolbar.classList.add('dark-mode');
                    editor.classList.add('dark-mode');
                    darkModeToggle.classList.add('active');
                    card.classList.add('dark-mode');
                    if (expandedContent) expandedContent.classList.add('dark-mode');
                    if (expandedHeader) expandedHeader.classList.add('dark-mode');
                    if (expandedMain) expandedMain.classList.add('dark-mode');
                    card.darkModeEnabled = true;
                }
            };
            
            // Add to toolbar
            toolbar.appendChild(darkModeToggle);
            
            // Restore dark mode state if it was previously enabled
            if (card.darkModeEnabled) {
                const container = card.querySelector('.editor-container');
                const editor = card.querySelector('.ql-editor');
                const expandedContent = card.querySelector('.expanded-card-content');
                const expandedHeader = card.querySelector('.expanded-card-header');
                const expandedMain = card.querySelector('.expanded-card-main');
                
                container.classList.add('dark-mode');
                toolbar.classList.add('dark-mode');
                editor.classList.add('dark-mode');
                darkModeToggle.classList.add('active');
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
        // Check if this editor is in a section
        const section = editorContainer.closest('.card-section');
        
        if (section && section.sectionData) {
            // Update the section data
            section.sectionData.content = {
                content: quill.root.innerHTML
            };
            
            // Save to AppState
            if (card.appStateLocation) {
                const boards = AppState.get('boards');
                const currentBoardId = AppState.get('currentBoardId');
                const board = boards.find(b => b.id === currentBoardId);
                
                if (board && board.categories) {
                    const { categoryIndex, cardIndex } = card.appStateLocation;
                    if (board.categories[categoryIndex] && board.categories[categoryIndex].cards[cardIndex]) {
                        if (!board.categories[categoryIndex].cards[cardIndex].sections) {
                            board.categories[categoryIndex].cards[cardIndex].sections = [];
                        }
                        
                        const sectionIndex = board.categories[categoryIndex].cards[cardIndex].sections.findIndex(s => s.id === section.sectionData.id);
                        if (sectionIndex !== -1) {
                            board.categories[categoryIndex].cards[cardIndex].sections[sectionIndex].content = {
                                content: quill.root.innerHTML
                            };
                        } else {
                            board.categories[categoryIndex].cards[cardIndex].sections.push({
                                id: section.sectionData.id,
                                title: section.sectionData.title,
                                content: {
                                    content: quill.root.innerHTML
                                },
                                bookmarks: section.sectionData.bookmarks || []
                            });
                        }
                        
                        AppState.set('boards', boards);
                        console.log('🔖 SECTION: Updated AppState with editor content');
                    }
                }
            }
            
            // Save to Firebase
            if (window.syncService) {
                window.syncService.saveAfterAction('section content edited');
            }
        } else {
            // This is the main card editor
            card.initialContent = {
                content: quill.root.innerHTML
            };
        }
    });
    
    console.log('Quill initialized successfully');
}
