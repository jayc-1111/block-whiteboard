// Canvas header management with AppState integration
function addCanvasHeader(x = null, y = null) {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    // Create canvas header element
    const canvasHeader = document.createElement('div');
    canvasHeader.className = 'canvas-header';
    canvasHeader.textContent = 'New Header';
    
    // Generate unique ID
    const headerId = Date.now() + Math.random();
    canvasHeader.dataset.headerId = headerId;
    
    // Position the canvas header
    const defaultX = Math.random() * 400 + 50;
    const defaultY = Math.random() * 400 + 50;
    canvasHeader.style.left = (x !== null ? x : defaultX) + 'px';
    canvasHeader.style.top = (y !== null ? y : defaultY) + 'px';
    canvasHeader.style.zIndex = AppState.getNextZIndex();
    
    // Setup event handlers
    setupCanvasHeaderEventHandlers(canvasHeader);
    
    // Add to canvas
    canvas.appendChild(canvasHeader);
    
    // Update board state
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(b => b.id === currentBoardId);
    
    if (currentBoard) {
        if (!currentBoard.canvasHeaders) {
            currentBoard.canvasHeaders = [];
        }
        currentBoard.canvasHeaders.push({
            id: headerId,
            text: canvasHeader.textContent,
            position: {
                left: canvasHeader.style.left,
                top: canvasHeader.style.top
            }
        });
        AppState.set('boards', boards);
        
        // Save after creating header
        if (window.syncService) {
        // Call saveCurrentBoard first to capture DOM state
            if (typeof saveCurrentBoard === 'function') {
            saveCurrentBoard();
        }
        window.syncService.saveAfterAction('header created');
    }
    }
}

function setupCanvasHeaderEventHandlers(canvasHeader) {
    let clickCount = 0;
    let clickTimer = null;
    
    // Handle click/double-click with proper timing
    canvasHeader.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        
        // If already editing, don't start drag
        if (canvasHeader.contentEditable === 'true') {
            return;
        }
        
        clickCount++;
        
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                // Single click - start drag
                clickCount = 0;
                startCanvasHeaderDrag(e, canvasHeader);
            }, 300);
        } else if (clickCount === 2) {
            // Double click - start editing
            clearTimeout(clickTimer);
            clickCount = 0;
            e.stopPropagation();
            e.preventDefault();
            startCanvasHeaderEdit(canvasHeader);
        }
    });
    
    // Update state when text changes
    canvasHeader.addEventListener('blur', () => {
        canvasHeader.contentEditable = false;
        updateCanvasHeaderInState(canvasHeader);
    });
    
    // Enter key to finish editing
    canvasHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            canvasHeader.blur();
        }
        // Prevent other keyboard shortcuts while editing
        if (canvasHeader.contentEditable === 'true') {
            e.stopPropagation();
        }
    });
    
    // Right-click context menu
    canvasHeader.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, canvasHeader, 'element');
    });
}

function startCanvasHeaderEdit(canvasHeader) {
    canvasHeader.contentEditable = true;
    canvasHeader.focus();
    selectAllText(canvasHeader);
}

function startCanvasHeaderDrag(e, canvasHeader) {
    // Check if already in selected items for multi-drag
    const selectedItems = AppState.get('selectedItems');
    if (selectedItems.includes(canvasHeader) && selectedItems.length > 1) {
        startMultiDrag(e);
        return;
    }
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
    
    // Single drag
    AppState.set('currentCanvasHeader', canvasHeader);
    canvasHeader.classList.add('dragging');
    
    const whiteboard = document.getElementById('whiteboard');
    const canvas = document.getElementById('canvas') || document.getElementById('grid');
    if (!canvas) {
        console.error('Canvas/Grid element not found');
        return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    
    const offset = {
        x: e.clientX - canvasRect.left + whiteboard.scrollLeft - parseInt(canvasHeader.style.left),
        y: e.clientY - canvasRect.top + whiteboard.scrollTop - parseInt(canvasHeader.style.top)
    };
    AppState.set('offset', offset);
    
    document.addEventListener('mousemove', dragCanvasHeader);
    document.addEventListener('mouseup', stopCanvasHeaderDrag);
    
    e.preventDefault();
}

function updateCanvasHeaderInState(canvasHeader) {
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(b => b.id === currentBoardId);
    
    if (currentBoard && currentBoard.canvasHeaders) {
        const headerData = currentBoard.canvasHeaders.find(
            h => h.id == canvasHeader.dataset.headerId
        );
        
        if (headerData) {
            headerData.text = canvasHeader.textContent;
            headerData.position = {
                left: canvasHeader.style.left,
                top: canvasHeader.style.top
            };
            AppState.set('boards', boards);
            
            // Mark changes for sync
            if (window.syncService && window.syncService.markPendingChanges) {
                window.syncService.markPendingChanges();
            }
        }
    }
}

function selectAllText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// Load canvas headers for current board
function loadCanvasHeaders(canvasHeaders) {
    if (!canvasHeaders || !Array.isArray(canvasHeaders)) return;
    
    // Clear existing canvas headers first to prevent duplicates
    const existingHeaders = document.querySelectorAll('.canvas-header');
    existingHeaders.forEach(header => header.remove());
    
    canvasHeaders.forEach(headerData => {
        const canvas = document.getElementById('canvas') || document.getElementById('grid');
        if (!canvas) return;
        
        const canvasHeader = document.createElement('div');
        canvasHeader.className = 'canvas-header';
        canvasHeader.textContent = headerData.text;
        canvasHeader.dataset.headerId = headerData.id || Date.now() + Math.random();
        
        // Set position
        canvasHeader.style.left = headerData.position.left;
        canvasHeader.style.top = headerData.position.top;
        canvasHeader.style.zIndex = AppState.getNextZIndex();
        
        // Setup event handlers
        setupCanvasHeaderEventHandlers(canvasHeader);
        
        // Add to canvas
        canvas.appendChild(canvasHeader);
    });
}

// Delete canvas header
function deleteCanvasHeader(canvasHeader) {
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(b => b.id === currentBoardId);
    
    if (currentBoard && currentBoard.canvasHeaders) {
        const index = currentBoard.canvasHeaders.findIndex(
            h => h.id == canvasHeader.dataset.headerId
        );
        
        if (index !== -1) {
            currentBoard.canvasHeaders.splice(index, 1);
            AppState.set('boards', boards);
        }
    }
    
    // Remove from selection if selected
    const selectedItems = AppState.get('selectedItems');
    const selIndex = selectedItems.indexOf(canvasHeader);
    if (selIndex !== -1) {
        selectedItems.splice(selIndex, 1);
        AppState.set('selectedItems', selectedItems);
    }
    
    // Remove from DOM
    canvasHeader.remove();
    
    // Save the changes after header deletion
    if (typeof saveCurrentBoard === 'function') {
        saveCurrentBoard();
    }
    
    // Trigger Firebase save
    if (window.syncService) {
        window.syncService.saveAfterAction('header deleted');
    }
}

// Export for use in other modules
window.addCanvasHeader = addCanvasHeader;
window.loadCanvasHeaders = loadCanvasHeaders;
window.deleteCanvasHeader = deleteCanvasHeader;
window.updateCanvasHeaderInState = updateCanvasHeaderInState;

// Drag functions
function dragCanvasHeader(e) {
    const currentCanvasHeader = AppState.get('currentCanvasHeader');
    if (!currentCanvasHeader) return;
    
    const grid = document.getElementById('grid');
    const whiteboard = document.getElementById('whiteboard');
    if (!grid || !whiteboard) return;
    const gridRect = grid.getBoundingClientRect();
    
    const offset = AppState.get('offset');
    const isGridSnapEnabled = AppState.get('isGridSnapEnabled');
    
    let x = e.clientX - gridRect.left - offset.x + whiteboard.scrollLeft;
    let y = e.clientY - gridRect.top - offset.y + whiteboard.scrollTop;
    
    x = Math.max(0, x);
    y = Math.max(0, y);
    
    if (isGridSnapEnabled) {
        x = Math.round(x / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
        y = Math.round(y / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
    }
    
    // Use drag smoothing for smooth movement
    if (typeof DragSmoothing !== 'undefined') {
        DragSmoothing.start(currentCanvasHeader, x, y);
    } else {
        currentCanvasHeader.style.left = x + 'px';
        currentCanvasHeader.style.top = y + 'px';
    }
    
    updateCanvasHeaderInState(currentCanvasHeader);
}

function stopCanvasHeaderDrag() {
    const currentCanvasHeader = AppState.get('currentCanvasHeader');
    if (currentCanvasHeader) {
        currentCanvasHeader.classList.remove('dragging');
        AppState.set('currentCanvasHeader', null);
        
        // Stop drag smoothing
        if (typeof DragSmoothing !== 'undefined') {
            DragSmoothing.stop(currentCanvasHeader);
        }
    }
    
    document.removeEventListener('mousemove', dragCanvasHeader);
    document.removeEventListener('mouseup', stopCanvasHeaderDrag);
    
    // Save after drag completes
    if (window.syncService) {
        window.syncService.isDragging = false;
        // Call saveCurrentBoard first to capture DOM state
        if (typeof saveCurrentBoard === 'function') {
            saveCurrentBoard();
        }
        window.syncService.saveAfterAction('header drag');
    }
}

// Make functions globally available for sync service
window.addCanvasHeader = addCanvasHeader;