/**
 * Board Service for Board Operations
 * 
 * This service provides board-specific functions that are used by boards.js
 * but need to be accessible from other parts of the application.
 */

// Debug utilities
const boardDebug = {
    info: (msg, data) => console.log(`📋 BOARD_SERVICE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ BOARD_SERVICE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ BOARD_SERVICE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 BOARD_SERVICE: ${msg}`),
    detail: (msg, data) => console.log(`📋 BOARD_SERVICE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 BOARD_SERVICE: ${msg}`),
    done: (msg) => console.log(`✅ BOARD_SERVICE: ${msg || 'Operation completed'}`)
}

/**
 * Load board content (folders, files, etc.)
 * @param {number} boardId - The ID of the board to load
 */
async function loadBoard(boardId) {
    boardDebug.start(`Loading board ${boardId}`);
    
    try {
        const boards = AppState.get('boards');
        const board = boards.find(b => b.dbId === boardId);
        
        if (!board) {
            throw new Error(`Board with ID ${boardId} not found`);
        }
        
        boardDebug.detail('Found board to load', {
            stateId: board.stateId,
            name: board.name || board.board_name,
            dbId: board.dbId,
            foldersCount: board.folders?.length || 0,
            headersCount: board.canvasHeaders?.length || 0,
            pathsCount: board.drawingPaths?.length || 0
        });
        
        // Set as current board
        AppState.set('currentBoard_stateId', board.stateId);
        
        // Load folders if available
        if (board.folders && board.folders.length > 0) {
            boardDebug.step('Loading folders...');
            board.folders.forEach(folderData => {
                if (typeof window.createFolderFromData === 'function') {
                    window.createFolderFromData(folderData);
                } else {
                    boardDebug.warn('createFolderFromData function not available');
                }
            });
        }
        
        // Load canvas headers if available
        if (board.canvasHeaders && board.canvasHeaders.length > 0) {
            boardDebug.step('Loading canvas headers...');
            board.canvasHeaders.forEach(headerData => {
                if (typeof window.createCanvasHeaderFromData === 'function') {
                    window.createCanvasHeaderFromData(headerData);
                } else {
                    boardDebug.warn('createCanvasHeaderFromData function not available');
                }
            });
        }
        
        // Load drawing paths if available
        if (board.drawingPaths && board.drawingPaths.length > 0) {
            boardDebug.step('Loading drawing paths...');
            board.drawingPaths.forEach(pathData => {
                if (typeof window.createDrawingPathFromData === 'function') {
                    window.createDrawingPathFromData(pathData);
                } else {
                    boardDebug.warn('createDrawingPathFromData function not available');
                }
            });
        }
        
        // Update UI after loading
        if (typeof window.updateBoardDropdown === 'function') {
            window.updateBoardDropdown();
        }
        
        // ONBOARDING DEPRECATED - No longer showing onboarding
        // if (typeof window.showOnboardingIfEmpty === 'function') {
        //     window.showOnboardingIfEmpty();
        // }
        
        // Setup selection event listeners
        if (typeof window.setupSelectionListeners === 'function') {
            window.setupSelectionListeners();
        }
        
        boardDebug.done(`Board ${boardId} loaded successfully`);
        
    } catch (error) {
        boardDebug.error(`Failed to load board ${boardId}`, error);
        throw new Error(`Failed to load board: ${error.message}`);
    }
}

/**
 * Setup selection event listeners
 * This function should be called after the canvas is created
 */
function setupSelectionListeners() {
    boardDebug.start('Setting up selection listeners');
    
    try {
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            boardDebug.warn('Canvas element not found');
            return;
        }
        
        // Clear existing listeners if any
        canvas.removeEventListener('mousedown', handleCanvasMouseDown);
        canvas.removeEventListener('click', handleCanvasClick);
        
        // Add selection event listeners
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('click', handleCanvasClick);
        
        boardDebug.detail('Selection listeners added');
        boardDebug.done('Selection listeners setup complete');
        
    } catch (error) {
        boardDebug.error('Failed to setup selection listeners', error);
    }
}

/**
 * Handle canvas mouse down for selection
 * @param {MouseEvent} e - Mouse event
 */
function handleCanvasMouseDown(e) {
    if (e.shiftKey) {
        // Multi-select with shift key
        const target = e.target;
        if (target.classList.contains('folder') || target.classList.contains('canvas-header')) {
            toggleItemSelection(target);
        }
    } else {
        // Single selection
        clearSelection();
        const target = e.target;
        if (target.classList.contains('folder') || target.classList.contains('canvas-header')) {
            selectItem(target);
        }
    }
}

/**
 * Handle canvas click for selection
 * @param {MouseEvent} e - Mouse event
 */
function handleCanvasClick(e) {
    // Handle any additional click logic here
    e.stopPropagation();
}

/**
 * Toggle item selection
 * @param {HTMLElement} item - The item to toggle selection for
 */
function toggleItemSelection(item) {
    item.classList.toggle('selected');
    updateSelectedItemsList();
}

/**
 * Select item
 * @param {HTMLElement} item - The item to select
 */
function selectItem(item) {
    item.classList.add('selected');
    updateSelectedItemsList();
}

/**
 * Clear all selections
 */
function clearSelection() {
    const selectedItems = document.querySelectorAll('.selected');
    selectedItems.forEach(item => item.classList.remove('selected'));
    updateSelectedItemsList();
}

/**
 * Update the selected items list in AppState
 */
function updateSelectedItemsList() {
    const selectedItems = document.querySelectorAll('.selected');
    const selectedItemsArray = Array.from(selectedItems).map(item => ({
        element: item,
        id: item.dataset.itemId || item.dataset.folderId,
        type: item.classList.contains('folder') ? 'folder' : 'header'
    }));
    
    AppState.set('selectedItems', selectedItemsArray);
}

/**
 * Initialize folders from board data
 * @param {Array} foldersData - Array of folder data objects
 */
function initializeFoldersFromBoardData(foldersData) {
    boardDebug.start('Initializing folders from board data');
    
    try {
        if (!foldersData || !Array.isArray(foldersData)) {
            boardDebug.warn('Invalid folders data provided');
            return;
        }
        
        boardDebug.detail('Initializing folders', { count: foldersData.length });
        
        // Clear existing folders
        const canvas = document.getElementById('canvas');
        if (canvas) {
            const existingFolders = canvas.querySelectorAll('.folder');
            existingFolders.forEach(folder => folder.remove());
        }
        
        // Reset folders in AppState
        AppState.set('folders', []);
        
        // Create folders from data
        foldersData.forEach((folderData, index) => {
            try {
                boardDebug.step(`Creating folder ${index + 1}/${foldersData.length}`);
                
                // Create folder element
                const folder = document.createElement('div');
                folder.className = 'folder';
                folder.dataset.folderId = index;
                folder.style.left = folderData.position?.left || '100px';
                folder.style.top = folderData.position?.top || '100px';
                folder.style.zIndex = AppState.getNextZIndex();

                // Create folder header
                const folderHeader = document.createElement('div');
                folderHeader.className = 'folder-header';

                const folderTitle = document.createElement('div');
                folderTitle.className = 'folder-title';
                folderTitle.contentEditable = true;
                folderTitle.textContent = folderData.title || `Folder ${index + 1}`;
                folderTitle.dataset.placeholder = folderData.title || `Folder ${index + 1}`;
                folderTitle.autocomplete = 'off';
                folderTitle.autocorrect = 'off';
                folderTitle.autocapitalize = 'off';
                folderTitle.spellcheck = false;

                folderTitle.addEventListener('focus', function() {
                    if (this.textContent === this.dataset.placeholder) {
                        this.textContent = '';
                    }
                });
                
                folderTitle.addEventListener('blur', function() {
                    if (this.textContent.trim() === '') {
                        this.textContent = this.dataset.placeholder;
                    }
                    // Save after editing folder title
                    setTimeout(() => {
                        if (window.saveCurrentBoard) {
                            try {
                                window.saveCurrentBoard();
                                boardDebug.info('Folder title edit saved via board save');
                            } catch (error) {
                                boardDebug.warn('Folder title save via board failed:', error);
                            }
                        }
                    }, 100);
                });

                const addFileBtn = document.createElement('button');
                addFileBtn.className = 'add-file-btn';
                addFileBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5"/>
                </svg>`;
                addFileBtn.style.display = 'inline-block';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = `<svg aria-hidden="true" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
                deleteBtn.style.display = 'inline-block';
                
                const headerButtons = document.createElement('div');
                headerButtons.className = 'header-buttons';
                headerButtons.appendChild(addFileBtn);
                headerButtons.appendChild(deleteBtn);
                
                folderHeader.appendChild(folderTitle);
                folderHeader.appendChild(headerButtons);

                const filesGrid = document.createElement('div');
                filesGrid.className = 'files-grid';
                
                // Add file slots based on folder data
                const fileSlots = folderData.files && folderData.files.length > 0 
                    ? folderData.files.length 
                    : 9; // Default to 9 slots if no file data
                
                for (let i = 0; i < fileSlots; i++) {
                    const slot = createFileSlot();
                    filesGrid.appendChild(slot);
                }

                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'toggle-btn';
                toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4-4-4 4"/></svg>`;
                toggleBtn.style.display = 'inline-block';
                
                const bottomSection = document.createElement('div');
                bottomSection.className = 'folder-bottom';
                bottomSection.appendChild(toggleBtn);

                folder.appendChild(folderHeader);
                folder.appendChild(filesGrid);
                folder.appendChild(bottomSection);

                // Add event listeners
                folderHeader.addEventListener('mousedown', startFolderDrag);
                folder.addEventListener('mousedown', (e) => {
                    if (!e.shiftKey) clearSelection();
                    folder.style.zIndex = AppState.getNextZIndex();
                });
                
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showConfirmDialog(
                        'Remove Folder',
                        `Are you sure you want to remove "${folderTitle.textContent}"?`,
                        () => deleteFolder(folder)
                    );
                });

                // Add to canvas if it exists
                if (canvas) {
                    canvas.appendChild(folder);
                }

                // Update AppState
                const currentFolders = AppState.get('folders') || [];
                currentFolders.push({
                    element: folder,
                    files: folderData.files || []
                });
                AppState.set('folders', currentFolders);
                
                boardDebug.detail(`Folder ${index + 1} created successfully`);
                
            } catch (error) {
                boardDebug.error(`Error creating folder ${index}`, error);
            }
        });
        
        boardDebug.done(`Initialized ${foldersData.length} folders from board data`);
        
    } catch (error) {
        boardDebug.error('Failed to initialize folders from board data', error);
    }
}

// Board Service object with all required functions
window.boardService = {
    loadBoard,
    setupSelectionListeners,
    initializeFoldersFromBoardData,
    
    // Utility functions
    clearSelection,
    selectItem,
    toggleItemSelection,
    
    // Configuration
    config: {
        initialized: false,
        debugEnabled: true
    }
};

// Auto-initialize when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.boardService.config.initialized = true;
        boardDebug.info('Board service initialized');
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        window.boardService.config.initialized = true;
        boardDebug.info('Board service initialized');
    }, 100);
}

boardDebug.info('Board service module loaded');
