// Clear board functionality
function clearBoard() {
    console.log('Clearing board...');
    
    // Clear all categories
    const categories = AppState.get('categories') || [];
    categories.forEach(category => {
        if (category.element) {
            category.element.remove();
        }
    });
    AppState.set('categories', []);
    
    // Clear all canvas headers
    const canvasHeaders = document.querySelectorAll('.canvas-header');
    canvasHeaders.forEach(header => header.remove());
    
    // Clear all drawings
    if (window.clearAllDrawings) {
        window.clearAllDrawings();
    }
    
    // Update board state
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(b => b.id === currentBoardId);
    
    if (currentBoard) {
        currentBoard.categories = [];
        currentBoard.canvasHeaders = [];
        currentBoard.drawings = [];
        AppState.set('boards', boards);
    }
    
    // Save the cleared board
    if (window.syncService) {
        window.syncService.saveAfterAction('board cleared');
    }
    
    console.log('Board cleared successfully');
}

// Make function globally available
window.clearBoard = clearBoard;