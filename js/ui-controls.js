// UI controls and interactions
function toggleGridSnap() {
    const currentState = AppState.get('isGridSnapEnabled');
    AppState.set('isGridSnapEnabled', !currentState);
    isGridSnapEnabled = !currentState;
    
    // Update the settings menu indicator
    const gridSnapOption = document.getElementById('gridSnapOption');
    if (gridSnapOption) {
        const indicator = gridSnapOption.querySelector('.toggle-indicator');
        if (indicator) {
            indicator.textContent = !currentState ? 'ON' : 'OFF';
            indicator.style.color = !currentState ? '#4a7c4a' : '#ddd';
        }
    }
}

function toggleDevMode() {
    isDevMode = !isDevMode;
    AppState.set('isDevMode', isDevMode);
    
    const devModeOption = document.getElementById('devModeOption');
    if (devModeOption) {
        devModeOption.classList.toggle('dev-mode-active');
    }
    
    // Toggle the dev overlay
    if (window.toggleDevOverlay) {
        window.toggleDevOverlay(isDevMode);
    }
    
    // Dev mode only controls whether Add Whiteboard button is functional
    // Nothing should be hidden/shown
}

function updateFileStructure() {
    // Create or get the file structure dropdown
    let dropdown = document.querySelector('.file-structure-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'file-structure-dropdown';
        
        const list = document.createElement('ul');
        list.className = 'file-structure-list';
        dropdown.appendChild(list);
        
        const container = document.querySelector('.file-structure-container');
        if (container) {
            container.appendChild(dropdown);
        }
    }
    
    const list = dropdown.querySelector('.file-structure-list');
    if (!list) return;
    
    // Clear existing content
    list.innerHTML = '';
    
    // Get current board's categories
    const categories = AppState.get('categories') || [];
    
    if (categories.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No categories yet';
        emptyItem.style.color = '#666';
        emptyItem.style.fontStyle = 'italic';
        list.appendChild(emptyItem);
        return;
    }
    
    // Add categories and their cards (skip board level)
    categories.forEach((category, categoryIndex) => {
        if (!category.element) return;
        
        // Add category item
        const categoryItem = document.createElement('li');
        categoryItem.className = 'category-item';
        const categoryTitle = category.element.querySelector('.category-title');
        categoryItem.textContent = categoryTitle ? categoryTitle.textContent : `Category ${categoryIndex + 1}`;
        
        // Make category clickable to focus on it
        categoryItem.addEventListener('click', () => {
            if (category.element) {
                category.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add temporary highlight
                category.element.style.outline = '2px solid #5353ff';
                setTimeout(() => {
                    category.element.style.outline = '';
                }, 2000);
            }
        });
        
        list.appendChild(categoryItem);
        
        // Add cards under this category
        const cards = category.cards || [];
        cards.forEach((card, cardIndex) => {
            const cardItem = document.createElement('li');
            cardItem.className = 'card-item';
            const cardTitle = card.querySelector('.card-title');
            cardItem.textContent = cardTitle ? cardTitle.textContent : `Card ${cardIndex + 1}`;
            
            // Make card clickable to expand it
            cardItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                expandCard(card);
            });
            
            list.appendChild(cardItem);
        });
    });
}

// Expand Space Button Functionality
function initializeExpandSpaceButtons() {
    const expandRightBtn = document.getElementById('expandRight');
    const expandBottomBtn = document.getElementById('expandBottom');
    
    if (expandRightBtn) {
        expandRightBtn.addEventListener('click', handleExpandRight);
    }
    
    if (expandBottomBtn) {
        expandBottomBtn.addEventListener('click', handleExpandBottom);
    }
}

function handleExpandRight() {
    expandGridSpace('right');
    moveViewport('right');
}

function handleExpandBottom() {
    expandGridSpace('bottom');
    moveViewport('bottom');
}

function expandGridSpace(direction) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    const expansionAmount = 1000; // Add 1000px of space
    
    if (direction === 'right') {
        const currentWidth = parseInt(grid.style.width) || 2000;
        grid.style.width = (currentWidth + expansionAmount) + 'px';
    } else if (direction === 'bottom') {
        const currentHeight = parseInt(grid.style.height) || 2000;
        grid.style.height = (currentHeight + expansionAmount) + 'px';
    }
}

function moveViewport(direction) {
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) return;
    
    const viewportWidth = whiteboard.clientWidth;
    const viewportHeight = whiteboard.clientHeight;
    
    // Move by half the viewport size
    const moveAmount = {
        right: viewportWidth * 0.5,
        bottom: viewportHeight * 0.5
    };
    
    if (direction === 'right') {
        whiteboard.scrollBy({
            left: moveAmount.right,
            behavior: 'smooth'
        });
    } else if (direction === 'bottom') {
        whiteboard.scrollBy({
            top: moveAmount.bottom,
            behavior: 'smooth'
        });
    }
}

// Initialize expand space buttons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeExpandSpaceButtons();
    
    // Clear board option in settings menu
    const clearBoardOption = document.getElementById('clearBoardOption');
    if (clearBoardOption) {
        clearBoardOption.addEventListener('click', () => {
            showConfirmDialog(
                'Clear Board',
                'Are you sure you want to clear the entire board? This will remove all categories, cards, headers, and drawings.',
                () => {
                    clearBoard();
                }
            );
        });
    }
});
