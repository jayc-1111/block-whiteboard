// Grid clearing utility functions

// Clear all content from the grid while preserving canvas
function clearGrid() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        // Clear only the canvas content, not the canvas itself
        canvas.innerHTML = '';
        console.log('🧹 Canvas content cleared');
        return true;
    } else {
        console.error('❌ Canvas element not found!');
        return false;
    }
}

// Clear grid and reset AppState categories
function clearGridAndState() {
    clearGrid();
    
    // Reset categories in AppState
    AppState.set('categories', []);
    
    // Clear any selected items
    AppState.set('selectedItems', []);
    
    console.log('🧹 Grid and state cleared');
}

// Check if canvas has content
function gridHasContent() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return false;
    
    const categories = canvas.querySelectorAll('.category');
    const headers = canvas.querySelectorAll('.canvas-header');
    const drawingAreas = canvas.querySelectorAll('.drawing-area');
    
    return categories.length > 0 || headers.length > 0 || drawingAreas.length > 0;
}

// Make functions globally available
window.clearGrid = clearGrid;
window.clearGridAndState = clearGridAndState;
window.gridHasContent = gridHasContent;
