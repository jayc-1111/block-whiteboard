// Initialize the whiteboard application
function setupZoomAndPan() {
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) {
        Debug.init.error('Whiteboard element not found');
        return;
    }
    whiteboard.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const scale = e.deltaY < 0 ? 1.1 : 0.9;
            const currentZoom = whiteboard.style.zoom || 1;
            whiteboard.style.zoom = Math.max(0.1, Math.min(3, currentZoom * scale));
        }
    });
}

function setupKeyboardShortcuts() {
    // Arrow key visual feedback mapping
    const arrowKeyMap = {
        'ArrowUp': '.arrow-key.up',
        'ArrowDown': '.arrow-key.down',
        'ArrowLeft': '.arrow-key.left',
        'ArrowRight': '.arrow-key.right'
    };
    
    document.addEventListener('keydown', (e) => {
        // Check if user is typing in an input field
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true' ||
            activeElement.classList.contains('ql-editor')
        );
        
        // Handle arrow key visual feedback and functionality
        if (arrowKeyMap[e.key]) {
            const arrowElement = document.querySelector(arrowKeyMap[e.key]);
            if (arrowElement) {
                arrowElement.classList.add('pressed');
            }
            
            // Only trigger toolbar functions if no input is focused and Shift is held
            if (!isInputFocused && e.shiftKey) {
                e.preventDefault(); // Prevent default arrow key behavior
                
                switch(e.key) {
                    case 'ArrowLeft':
                        // First button: Add Whiteboard
                        addWhiteboardWithPaymentCheck();
                        break;
                    case 'ArrowUp':
                        // Second button: Add Canvas Header
                        addCanvasHeader();
                        break;
                    case 'ArrowDown':
                        // Third button: Add Category
                        createCategory();
                        break;
                    case 'ArrowRight':
                        // Fourth button: Manual Save
                        if (typeof manualSaveWhiteboard === 'function') {
                            manualSaveWhiteboard();
                        }
                        break;
                }
            }
        }
        
        // Handle delete key for selected items
        const selectedItems = AppState.get('selectedItems');
        if (e.key === 'Delete' && selectedItems.length > 0) {
            selectedItems.forEach(item => {
                if (item.classList.contains('category')) {
                    deleteCategory(item);
                } else if (item.classList.contains('canvas-header')) {
                    item.remove();
                }
            });
            clearSelection();
        }
        
        // Handle Ctrl+S for manual save
        if (e.ctrlKey && e.key === 's' && !isInputFocused) {
            e.preventDefault();
            if (typeof manualSaveWhiteboard === 'function') {
                manualSaveWhiteboard();
            }
        }
    });
    
    // Remove arrow key visual feedback on key release
    document.addEventListener('keyup', (e) => {
        if (arrowKeyMap[e.key]) {
            const arrowElement = document.querySelector(arrowKeyMap[e.key]);
            if (arrowElement) {
                arrowElement.classList.remove('pressed');
            }
        }
    });
}

function setupBoardNameEditing() {
    const boardNameEl = document.getElementById('boardName');
    if (boardNameEl) {
        boardNameEl.addEventListener('blur', () => {
            const boards = AppState.get('boards');
            const currentBoardId = AppState.get('currentBoardId');
            const board = boards.find(b => b.id === currentBoardId);
            if (board) {
                board.name = boardNameEl.textContent.trim() || `${CONSTANTS.DEFAULT_BOARD_NAME} ${currentBoardId + 1}`;
                boardNameEl.textContent = board.name;
                AppState.set('boards', boards);
                const selectorText = document.querySelector('.board-selector-text');
                if (selectorText) selectorText.textContent = board.name;
            }
        });
        
        boardNameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                boardNameEl.blur();
            }
        });
    }
}

// Event binding setup
function setupEventBindings() {
    // Setup Add dropdown
    const addDropdownContainer = document.querySelector('.add-dropdown-container');
    
    // Toolbar buttons in dropdown
    const addWhiteboardBtn = document.getElementById('addWhiteboardBtn');
    const addSuperHeaderBtn = document.getElementById('addSuperHeaderBtn');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const saveWhiteboardBtn = document.getElementById('saveWhiteboardBtn');
    
    Debug.init.step('Binding toolbar buttons');
    Debug.init.detail('Add Whiteboard button', { found: !!addWhiteboardBtn });
    Debug.init.detail('Payment check function', { type: typeof addWhiteboardWithPaymentCheck });
    
    if (addWhiteboardBtn) {
        addWhiteboardBtn.addEventListener('click', addWhiteboardWithPaymentCheck);
        Debug.init.step('Add Whiteboard listener attached');
    } else {
        Debug.init.stepError('Add Whiteboard button not found');
    }
    if (addSuperHeaderBtn) {
        addSuperHeaderBtn.addEventListener('click', () => addCanvasHeader());
    }
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => createCategory());
    }
    if (saveWhiteboardBtn) {
        saveWhiteboardBtn.addEventListener('click', manualSaveWhiteboard);
        Debug.init.step('Save Whiteboard listener attached');
    }
    
    // Expand canvas buttons
    const expandRightBtn = document.querySelector('.expand-space-btn.expand-right');
    const expandBottomBtn = document.querySelector('.expand-space-btn.expand-bottom');
    
    if (expandRightBtn) expandRightBtn.addEventListener('click', expandGridRight);
    if (expandBottomBtn) expandBottomBtn.addEventListener('click', expandGridBottom);
    
    // Settings menu
    const devModeOption = document.getElementById('devModeOption');
    if (devModeOption) devModeOption.addEventListener('click', toggleDevMode);
    
    const gridSnapOption = document.getElementById('gridSnapOption');
    if (gridSnapOption) gridSnapOption.addEventListener('click', toggleGridSnap);
    
    const recoveryOption = document.getElementById('recoveryOption');
    if (recoveryOption) recoveryOption.addEventListener('click', () => {
        // REMOVED: backup-recovery-ui.js is being deleted
        // if (window.backupRecoveryUI) {
        //     window.backupRecoveryUI.showRecoveryDialog();
        // }
        // Use console recovery command instead
        console.log('To recover board data, type: recoverBoard() in the console');
        alert('To recover board data, open the console (F12) and type: recoverBoard()');
    });
    
    // Background options
    const bgOptions = document.querySelectorAll('.bg-option');
    bgOptions.forEach(option => {
        option.addEventListener('click', () => {
            const bgMap = {
                'Default': 'none',
                'Night Mode': 'night',
                'Light Mode': 'light',
                'Lollipop Mode': 'lollipop',
                'Frutiger Aero': 'frutiger',
                'Picnic Mode': 'picnic'
            };
            const theme = bgMap[option.textContent];
            if (theme) setBackground(theme);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        Debug.init.start('App initialization');
        Debug.init.step('Initializing board');
        initializeBoard();
        Debug.init.step('Setting up context menu');
        setupContextMenu();
        Debug.init.step('Setting up zoom and pan');
        setupZoomAndPan();
        Debug.init.step('Initializing smooth scroll');
        initSmoothScroll(); // From smooth-scroll.js
        Debug.init.step('Initializing pan controls');
        initPanControls(); // From pan.js
        Debug.init.step('Setting up keyboard shortcuts');
        setupKeyboardShortcuts();
        Debug.init.step('Setting up board name editing');
        setupBoardNameEditing();
        Debug.init.step('Updating board dropdown');
        updateBoardDropdown();
        Debug.init.step('Setting up event bindings');
        setupEventBindings();
        Debug.init.step('Setting up selection listeners');
        // Delay selection setup to avoid interfering with Firebase sync
        setTimeout(() => setupSelectionListeners(), 2000);
        Debug.init.done('App initialization completed');
    } catch (error) {
        Debug.init.error('Failed to initialize application', error);
        alert('Failed to initialize the whiteboard. Please refresh the page.');
        return;
    }
    
    // All elements are visible in both modes - no initialization needed
    
    // Set up file structure updates
    // Remove buggy hover-refresh of file structure (caused flashing/rebuild loops)
    // File tree is now updated only when menu opens via updateFileTree()
    // const fileContainer = document.querySelector('.file-structure-container');
    // if (fileContainer) {
    //     fileContainer.addEventListener('mouseenter', () => {
    //         updateFileStructure();
    //     });
    // }
    
    // Update board dropdown on hover
    const whiteboardSwitcher = document.getElementById('whiteboardSwitcher');
    if (whiteboardSwitcher) {
        whiteboardSwitcher.addEventListener('mouseenter', () => {
            updateBoardDropdown();
        });
    }
    
    // Prevent scrolling on middle mouse button
    document.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    });
    
    // Handle window click to close expanded files
    document.addEventListener('click', (e) => {
        const expandedFile = AppState.get('expandedFile');
        if (expandedFile && !e.target.closest('.file.expanded') && 
            !e.target.closest('.file-hover-overlay') &&
            !e.target.closest('.dialog-overlay') &&
            !e.target.closest('.confirm-dialog')) {
            collapseFile(expandedFile);
            AppState.set('expandedFile', null);
        }
    });
    
    // Prevent text selection while dragging
    document.addEventListener('selectstart', (e) => {
        const currentCategory = AppState.get('currentCategory');
        const currentSuperHeader = AppState.get('currentSuperHeader');
        const isDraggingMultiple = AppState.get('isDraggingMultiple');
        const isSelecting = AppState.get('isSelecting');
        if (currentCategory || currentSuperHeader || isDraggingMultiple || isSelecting) {
            e.preventDefault();
        }
    });
    
    // Drawing mode button
    const drawingModeBtn = document.getElementById('drawingModeBtn');
    if (drawingModeBtn) {
        drawingModeBtn.addEventListener('click', () => {
            if (window.toggleDrawingMode) {
                window.toggleDrawingMode();
            }
        });
    }
    
    // Eraser mode button
    const eraserModeBtn = document.getElementById('eraserModeBtn');
    if (eraserModeBtn) {
        eraserModeBtn.addEventListener('click', () => {
            if (window.toggleEraserMode) {
                window.toggleEraserMode();
            }
        });
    }
    
    // Test bookmark button
    const testBookmarkBtn = document.getElementById('testBookmarkBtn');
    if (testBookmarkBtn) {
        testBookmarkBtn.addEventListener('click', () => {
            if (window.addTestBookmark) {
                window.addTestBookmark();
            }
        });
    }
});
