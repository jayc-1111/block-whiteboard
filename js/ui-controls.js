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

/**
 * Deprecated: updateFileStructure has been removed.
 * Use updateFileTree() in sidebar-menu.js instead as the canonical implementation.
 */

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
                'Are you sure you want to clear the entire board? This will remove all categories, files, headers, and drawings.',
                () => {
                    clearBoard();
                }
            );
        });
    }
});
