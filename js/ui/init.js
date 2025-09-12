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
                        if (typeof addWhiteboardWithPaymentCheck === 'function') {
                            addWhiteboardWithPaymentCheck();
                        } else if (typeof addWhiteboard === 'function') {
                            addWhiteboard();
                        } else {
                            console.error('❌ No addWhiteboard function found');
                        }
                        break;
                    case 'ArrowUp':
                        // Second button: Add Canvas Header
                        addCanvasHeader();
                        break;
                    case 'ArrowDown':
                        // Third button: Add Folder
                        createFolder();
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
                if (item.classList.contains('folder')) {
                    deleteFolder(item);
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
            const currentBoard_id = AppState.get('currentBoard_id');
            const board = boards.find(b => b.id === currentBoard_id);
            if (board) {
                board.name = boardNameEl.textContent.trim() || `${CONSTANTS.DEFAULT_BOARD_NAME} ${currentBoard_id + 1}`;
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
    const addButton = addDropdownContainer?.querySelector('.add-button');
    const addDropdownMenu = addDropdownContainer?.querySelector('.add-dropdown-menu');

    if (addButton && addDropdownMenu) {
        addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            addDropdownMenu.classList.toggle('show');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!addDropdownContainer.contains(e.target)) {
                addDropdownMenu.classList.remove('show');
            }
        });
    }
    
    // Toolbar buttons in dropdown
    const addWhiteboardBtn = document.getElementById('addWhiteboardBtn');
    const addSuperHeaderBtn = document.getElementById('addSuperHeaderBtn');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const saveWhiteboardBtn = document.getElementById('saveWhiteboardBtn');
    
    Debug.init.step('Binding toolbar buttons');
    Debug.init.detail('Add Whiteboard button', { found: !!addWhiteboardBtn });
    Debug.init.detail('Payment check function', { type: typeof addWhiteboardWithPaymentCheck });
    
    if (addWhiteboardBtn) {
        if (typeof addWhiteboardWithPaymentCheck === 'function') {
            addWhiteboardBtn.addEventListener('click', addWhiteboardWithPaymentCheck);
        } else if (typeof addWhiteboard === 'function') {
            addWhiteboardBtn.addEventListener('click', addWhiteboard);
        } else {
            addWhiteboardBtn.addEventListener('click', () => console.error('❌ Add Whiteboard function missing'));
        }
        Debug.init.step('Add Whiteboard listener attached');
    } else {
        Debug.init.stepError('Add Whiteboard button not found');
    }
    if (addSuperHeaderBtn) {
        addSuperHeaderBtn.addEventListener('click', () => addCanvasHeader());
    }
    if (addFolderBtn) {
        addFolderBtn.addEventListener('click', () => createFolder());
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

let appInitializationComplete = false;

// Check if board data has been loaded from database
function isBoardDataAvailable() {
    const boards = window.AppState?.get('boards') || [];

    // Check if we have at least one board with some content
    if (boards.length === 0) return false;

    // Check if the first board has been loaded (has dbId or folders data)
    const firstBoard = boards[0];
    if (firstBoard.dbId || (firstBoard.folders && firstBoard.folders.length > 0)) {
        console.log('✅ Board data available:', {
            boardCount: boards.length,
            firstBoardHasDbId: !!firstBoard.dbId,
            firstBoardFolders: firstBoard.folders?.length || 0
        });
        return true;
    }

    console.log('⏳ Board data not yet available');
    return false;
}

// Wait for board content to be fully loaded
function waitForBoardContentLoad() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10; // 10 seconds timeout

        const checkContent = () => {
            attempts++;
            if (isBoardDataAvailable()) {
                console.log('🎯 Board content load detected after authenticate');
                resolve();
                return;
            }

            if (attempts >= maxAttempts) {
                console.log('⏰ Timeout waiting for board content load');
                resolve(); // Resolve anyway to prevent hanging
                return;
            }

            setTimeout(checkContent, 1000);
        };

        checkContent();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded fired - Starting initialization sequence');
    try {
        Debug.init.start('App initialization');
        console.log('🔧 INIT SEQUENCE: Step 1 - Waiting for auth and board loading');

        // 🚨 CRITICAL FIX: Don't initialize board directly!
        // The auth guard (auth/guard.js) will call loadBoardsOnSignIn() which loads boards from database
        // Then we wait for the board content to be available before initializing UI

        // Wait for board data to be loaded (either from auth or fallback)
        let boardLoadAttempts = 0;
        const maxAttempts = 30; // 30 seconds max wait

        while (!isBoardDataAvailable() && boardLoadAttempts < maxAttempts) {
            console.log(`⏳ Waiting for board data (attempt ${boardLoadAttempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            boardLoadAttempts++;
        }

        console.log('✅ Board data is now available for initialization');

        // Now initialize the board with the loaded data
        Debug.init.step('Initializing board with loaded data');
        console.log('🏗️ INIT: Calling initializeBoard() with loaded board data');
        initializeBoard();

        console.log('✅ INIT: Board initialization completed');
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
    Debug.init.step('Initializing drag completion service');
    // Drag completion service is auto-initialized when loaded
    Debug.init.done('App initialization completed');
    console.log('🎉 INIT: Full application initialization completed successfully');
    } catch (error) {
        Debug.init.error('Failed to initialize application', error);
        console.error('💥 INIT FAILURE: Critical initialization error', error);
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
        const currentFolder = AppState.get('currentFolder');
        const currentSuperHeader = AppState.get('currentSuperHeader');
        const isDraggingMultiple = AppState.get('isDraggingMultiple');
        const isSelecting = AppState.get('isSelecting');
        if (currentFolder || currentSuperHeader || isDraggingMultiple || isSelecting) {
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
