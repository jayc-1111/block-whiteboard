// Toggle category collapse/expand
function toggleCategory(category) {
    category.classList.toggle('collapsed');
    
    // Save state after toggling
    if (window.syncService) {
        window.syncService.saveAfterAction('category toggled');
    }
}

// Category management
function createCategory(title = 'New Folder', x = null, y = null) {
    // Expose globally for file tree
    window.createCategory = createCategory;
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return -1;
    }
    
    const category = document.createElement('div');
    category.className = 'category';
    const categories = AppState.get('categories');
    category.dataset.categoryId = categories.length;
    category.style.left = (x || Math.random() * 600 + 100) + 'px';
    category.style.top = (y || Math.random() * 400 + 100) + 'px';
    category.style.zIndex = AppState.getNextZIndex();

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';

    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'category-title';
    categoryTitle.contentEditable = true;
    categoryTitle.textContent = title;
    categoryTitle.dataset.placeholder = title;
    categoryTitle.autocomplete = 'off';
    categoryTitle.autocorrect = 'off';
    categoryTitle.autocapitalize = 'off';
    categoryTitle.spellcheck = false;

    categoryTitle.addEventListener('focus', function() {
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    categoryTitle.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
        // Save after editing category title
        if (window.syncService) {
            window.syncService.saveAfterAction('category title edited');
        }
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4-4-4 4"/>
    </svg>`;
    toggleBtn.style.display = 'inline-block';
    toggleBtn.addEventListener('click', () => toggleCategory(category));

    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'add-card-btn';
    addCardBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5"/>
    </svg>`;
    addCardBtn.style.display = 'inline-block';
    const categoryIndex = categories.length;
    addCardBtn.addEventListener('click', () => addCardToCategory(categoryIndex));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = `<svg
        aria-hidden="true"
        stroke="currentColor"
        stroke-width="3"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>`;
    deleteBtn.style.display = 'inline-block';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove Category',
            `Are you sure you want to remove "${categoryTitle.textContent}"?`,
            () => deleteCategory(category)
        );
    });

    const headerButtons = document.createElement('div');
    headerButtons.className = 'header-buttons';
    // Toggle button removed from header - it's in the bottom section
    headerButtons.appendChild(addCardBtn);
    headerButtons.appendChild(deleteBtn);
    
    categoryHeader.appendChild(categoryTitle);
    categoryHeader.appendChild(headerButtons);

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'cards-grid';
    
    for (let i = 0; i < CONSTANTS.INITIAL_CARD_SLOTS; i++) {
        const slot = createCardSlot();
        cardsGrid.appendChild(slot);
    }

    const expandSpaceBtn = document.createElement('button');
    expandSpaceBtn.className = 'expand-space-btn';
    expandSpaceBtn.textContent = 'Expand Space';
    expandSpaceBtn.style.display = 'none';
    expandSpaceBtn.addEventListener('click', () => {
        for (let i = 0; i < CONSTANTS.INITIAL_CARD_SLOTS; i++) {
            const slot = createCardSlot();
            cardsGrid.appendChild(slot);
        }
    });

    // Create bottom section for toggle button
    const bottomSection = document.createElement('div');
    bottomSection.className = 'category-bottom';
    bottomSection.appendChild(toggleBtn);

    category.appendChild(categoryHeader);
    category.appendChild(cardsGrid);
    category.appendChild(bottomSection);
    // Note: expandSpaceBtn is kept but hidden - may be used in future

    categoryHeader.addEventListener('mousedown', startCategoryDrag);
    
    category.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        category.style.zIndex = AppState.getNextZIndex();
    });

    canvas.appendChild(category);

    const updatedCategories = [...categories, {
        element: category,
        cards: []
    }];
    AppState.set('categories', updatedCategories);
    
    // Save after creating category
    if (window.syncService) {
        window.syncService.saveAfterAction('category created');
    }

    return updatedCategories.length - 1;
}

function deleteCategory(category) {
    const categories = AppState.get('categories');
    const categoryIndex = parseInt(category.dataset.categoryId);
    
    if (categoryIndex >= 0 && categoryIndex < categories.length) {
        categories.splice(categoryIndex, 1);
        
        categories.forEach((cat, index) => {
            cat.element.dataset.categoryId = index;
        });
        
        AppState.set('categories', categories);
        
        // Save after deleting category
        if (window.syncService) {
            window.syncService.saveAfterAction('category deleted');
        }
    }
    
    category.remove();
}

function toggleCategory(category) {
    const toggleBtn = category.querySelector('.toggle-btn');
    
    if (category.classList.contains('collapsed')) {
        // Expand
        category.classList.remove('collapsed');
        toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4-4-4 4"/>
        </svg>`;
    } else {
        // Collapse
        category.classList.add('collapsed');
        toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 10 4 4 4-4"/>
        </svg>`;
    }
    
    // Save state after toggling
    if (window.syncService) {
        window.syncService.saveAfterAction('category toggled');
    }
}

function startCategoryDrag(e) {
    const category = e.target.closest('.category');
    if (!category || e.target.classList.contains('delete-btn') || 
        e.target.classList.contains('add-card-btn') || 
        e.target.classList.contains('toggle-btn') ||
        e.target.classList.contains('category-title')) {
        return;
    }
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
    
    const isDraggingMultiple = AppState.get('isDraggingMultiple');
    const selectedItems = AppState.get('selectedItems');
    if (isDraggingMultiple || (selectedItems.length > 1 && selectedItems.includes(category))) {
        startMultipleDrag(e);
        return;
    }
    
    const offset = {
        x: e.clientX - category.getBoundingClientRect().left,
        y: e.clientY - category.getBoundingClientRect().top
    };
    AppState.set('currentCategory', category);
    AppState.set('offset', offset);
    
    document.addEventListener('mousemove', dragCategory);
    document.addEventListener('mouseup', stopDragCategory);
}

function dragCategory(e) {
    const currentCategory = AppState.get('currentCategory');
    const offset = AppState.get('offset');
    if (!currentCategory) return;
    
    const whiteboard = document.getElementById('whiteboard');
    const rect = whiteboard.getBoundingClientRect();
    
    let x = e.clientX - rect.left - offset.x;
    let y = e.clientY - rect.top - offset.y;
    
    if (isGridSnapEnabled) {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }
    
    currentCategory.style.left = x + 'px';
    currentCategory.style.top = y + 'px';
    
    updateCanvasSize(x, y, 350, currentCategory.offsetHeight);
}

function stopDragCategory() {
    AppState.set('currentCategory', null);
    document.removeEventListener('mousemove', dragCategory);
    document.removeEventListener('mouseup', stopDragCategory);
    
    // Unset dragging flag and save after drag completes
    if (window.syncService) {
        window.syncService.isDragging = false;
        window.syncService.saveAfterAction('category drag');
    }
}

function addSuperHeader(x = null, y = null) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    const superHeader = document.createElement('div');
    superHeader.className = 'super-header';
    superHeader.contentEditable = true;
    superHeader.textContent = 'SUPER HEADER';
    superHeader.dataset.placeholder = 'SUPER HEADER';
    superHeader.autocomplete = 'off';
    superHeader.autocorrect = 'off';
    superHeader.autocapitalize = 'off';
    superHeader.spellcheck = false;
    
    superHeader.style.left = (x || Math.random() * CONSTANTS.RANDOM_POSITION_RANGE + CONSTANTS.POSITION_OFFSET) + 'px';
    superHeader.style.top = (y || Math.random() * CONSTANTS.RANDOM_POSITION_RANGE + CONSTANTS.POSITION_OFFSET) + 'px';
    
    superHeader.addEventListener('focus', function() {
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    superHeader.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
        // Save after editing header text
        if (window.syncService) {
            window.syncService.saveAfterAction('header text edited');
        }
    });
    
    superHeader.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        startSuperHeaderDrag(e);
    });
    
    grid.appendChild(superHeader);
}

function createCategoryFromData(catData) {
    const catIndex = createCategory(catData.title, 
        parseInt(catData.position.left), 
        parseInt(catData.position.top)
    );
    
    const categories = AppState.get('categories');
    const category = categories[catIndex];
    const grid = category.element.querySelector('.cards-grid');
    grid.innerHTML = '';
    for (let i = 0; i < CONSTANTS.INITIAL_CARD_SLOTS; i++) {
        const slot = createCardSlot();
        grid.appendChild(slot);
    }
    
    if (catData.cards) {
        catData.cards.forEach(cardData => {
            addCardToCategory(catIndex, cardData.title, cardData.content);
        });
    }
}

function createSuperHeaderFromData(headerData) {
    addSuperHeader(parseInt(headerData.position.left), 
        parseInt(headerData.position.top));
    const headers = document.querySelectorAll('.super-header');
    const lastHeader = headers[headers.length - 1];
    if (lastHeader) {
        lastHeader.textContent = headerData.text;
    }
}
