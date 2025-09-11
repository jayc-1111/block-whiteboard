/**
 * UI Service for Board Operations
 * 
 * This service provides UI-related functions that are used by boards.js
 * but may not be properly exposed globally by other modules.
 */

// Debug utilities
const uiDebug = {
    info: (msg, data) => console.log(`🎨 UI_SERVICE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ UI_SERVICE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ UI_SERVICE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 UI_SERVICE: ${msg}`),
    detail: (msg, data) => console.log(`📋 UI_SERVICE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 UI_SERVICE: ${msg}`),
    done: (msg) => console.log(`✅ UI_SERVICE: ${msg || 'Operation completed'}`)
}

/**
 * Show confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message  
 * @param {Function} onConfirm - Callback function for confirmation
 */
function showConfirmDialog(title, message, onConfirm) {
    // Remove any existing dialogs first to prevent stacking
    const existingDialogs = document.querySelectorAll('.dialog-overlay, .confirm-dialog');
    existingDialogs.forEach(dialog => dialog.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-buttons">
            <button class="confirm-btn confirm-yes">Yes</button>
            <button class="confirm-btn">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    const removeDialog = () => {
        overlay.remove();
        dialog.remove();
    };
    
    dialog.querySelector('.confirm-yes').onclick = () => {
        try {
            onConfirm();
        } catch (error) {
            console.error('Error in confirm dialog callback:', error);
        } finally {
            removeDialog();
        }
    };
    
    dialog.querySelector('.confirm-btn:not(.confirm-yes)').onclick = removeDialog;
    overlay.onclick = removeDialog;
    
    // Prevent dialog from closing when clicking inside it
    dialog.onclick = (e) => {
        e.stopPropagation();
    };
}

/**
 * Update board dropdown UI
 */
function updateBoardDropdown() {
    uiDebug.start('Updating board dropdown');
    
    const dropdownList = document.getElementById('boardDropdownList');
    if (!dropdownList) {
        uiDebug.warn('Board dropdown list not found');
        return;
    }
    
    dropdownList.innerHTML = '';
    
    const boards = AppState.get('boards');
    if (!boards || boards.length === 0) {
        uiDebug.info('No boards to display in dropdown');
        return;
    }
    
    boards.forEach(board => {
        const li = document.createElement('li');
        li.className = 'board-dropdown-item';
        li.dataset.boardId = board.id;
        
        // Get board name with fallbacks
        const boardName = board.name || board.board_name || `Board ${board.id}`;
        
        li.innerHTML = `
            <div class="board-name">${boardName}</div>
            ${board.dbId ? `<div class="board-id">ID: ${board.dbId.substring(0, 8)}...</div>` : ''}
        `;
        
        li.addEventListener('click', () => {
            if (typeof window.loadBoard === 'function') {
                window.loadBoard(board.id);
            } else {
                uiDebug.error('loadBoard function not available');
            }
        });
        
        dropdownList.appendChild(li);
    });
    
    uiDebug.done(`Updated dropdown with ${boards.length} boards`);
}

/**
 * ONBOARDING DEPRECATED - This function is kept for compatibility but will be removed
 */
function showOnboardingIfEmpty() {
    uiDebug.start('Checking for onboarding display');
    
    const boards = AppState.get('boards');
    if (!boards || boards.length === 0) {
        uiDebug.info('No boards available');
        return;
    }
    
    const currentBoard_stateId = AppState.get('currentBoard_stateId');
    const currentBoard = boards.find(board => board.stateId === currentBoard_stateId);
    
    if (!currentBoard) {
        uiDebug.warn('Current board not found');
        return;
    }
    
    // Check if board has content
    const hasFolders = currentBoard.folders && currentBoard.folders.length > 0;
    const hasHeaders = currentBoard.canvasHeaders && currentBoard.canvasHeaders.length > 0;
    const hasPaths = currentBoard.drawingPaths && currentBoard.drawingPaths.length > 0;
    const hasFiles = currentBoard.files && currentBoard.files.length > 0;
    
    const isEmpty = !hasFolders && !hasHeaders && !hasPaths && !hasFiles;
    
    if (isEmpty) {
        uiDebug.info('Board is empty - onboarding is deprecated, showing empty board');
        // No longer showing onboarding modal since it's deprecated
    } else {
        uiDebug.info('Board has content');
    }
}

/**
 * Create a new folder
 * @param {string} title - Folder title
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {number} Folder index or -1 on error
 */
function createFolder(title = 'New Folder', x = null, y = null) {
    uiDebug.start(`Creating folder: ${title}`);
    
    try {
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            uiDebug.error('Canvas element not found');
            return -1;
        }
        
        const folders = AppState.get('folders') || [];
        const folder = document.createElement('div');
        folder.className = 'folder';
        folder.dataset.folderId = folders.length;
        folder.style.left = (x || Math.random() * 600 + 100) + 'px';
        folder.style.top = (y || Math.random() * 400 + 100) + 'px';
        folder.style.zIndex = AppState.getNextZIndex();

        // Create folder header
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';

        const folderTitle = document.createElement('div');
        folderTitle.className = 'folder-title';
        folderTitle.contentEditable = true;
        folderTitle.textContent = title;
        folderTitle.dataset.placeholder = title;
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
                        uiDebug.info('Folder title edit saved via board save');
                    } catch (error) {
                        uiDebug.warn('Folder title save via board failed:', error);
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
        
        // Add initial file slots
        for (let i = 0; i < 9; i++) {
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

        canvas.appendChild(folder);

        // Update AppState
        const updatedFolders = [...folders, {
            element: folder,
            files: []
        }];
        AppState.set('folders', updatedFolders);
        
        // Also update the current board
        const boards = AppState.get('boards');
        const currentBoard = boards.find(board => board.stateId === AppState.get('currentBoard_stateId'));
        if (currentBoard) {
            currentBoard.folders = [...(currentBoard.folders || []), {
                title: title,
                position: {
                    left: folder.style.left,
                    top: folder.style.top
                },
                files: []
            }];
            AppState.set('boards', boards);
        }
        
        // Save after creating folder
        setTimeout(() => {
            if (window.saveCurrentBoard) {
                try {
                    window.saveCurrentBoard();
                    uiDebug.info('Folder creation saved via board save');
                } catch (error) {
                    uiDebug.warn('Folder save via board failed:', error);
                }
            }
        }, 100);

        uiDebug.done(`Folder created successfully: ${title}`);
        return updatedFolders.length - 1;
        
    } catch (error) {
        uiDebug.error('Error creating folder', error);
        return -1;
    }
}

/**
 * Create a file slot element
 * @returns {HTMLElement} The created file slot element
 */
function createFileSlot() {
    uiDebug.start('Creating file slot');
    
    try {
        const slot = document.createElement('div');
        slot.className = 'file-slot';
        slot.innerHTML = `
            <div class="slot-content">
                <svg class="slot-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="slot-text">Add File</span>
            </div>
        `;
        
        // Add click event to handle file creation
        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof window.handleFileSlotClick === 'function') {
                window.handleFileSlotClick(slot);
            } else {
                uiDebug.warn('handleFileSlotClick function not available');
            }
        });
        
        uiDebug.done('File slot created successfully');
        return slot;
        
    } catch (error) {
        uiDebug.error('Error creating file slot', error);
        return document.createElement('div'); // Return empty div on error
    }
}

/**
 * Delete a folder
 * @param {HTMLElement} folder - Folder element to delete
 */
function deleteFolder(folder) {
    uiDebug.start('Deleting folder');
    
    try {
        const folders = AppState.get('folders');
        const folderIndex = parseInt(folder.dataset.folderId);
        
        if (folderIndex >= 0 && folderIndex < folders.length) {
            folders.splice(folderIndex, 1);
            
            // Update folder IDs
            folders.forEach((cat, index) => {
                cat.element.dataset.folderId = index;
            });
            
            AppState.set('folders', folders);
            
            // Also update the current board
            const boards = AppState.get('boards');
            const currentBoard = boards.find(board => board.stateId === AppState.get('currentBoard_stateId'));
            if (currentBoard) {
                currentBoard.folders.splice(folderIndex, 1);
                AppState.set('boards', boards);
            }
            
            // Save after deleting folder
            setTimeout(() => {
                if (window.saveCurrentBoard) {
                    try {
                        window.saveCurrentBoard();
                        uiDebug.info('Folder deletion saved via board save');
                    } catch (error) {
                        uiDebug.warn('Folder deletion save via board failed:', error);
                    }
                }
            }, 100);
        }
        
        folder.remove();
        uiDebug.done('Folder deleted successfully');
        
    } catch (error) {
        uiDebug.error('Error deleting folder', error);
    }
}

/**
 * Start folder drag operation
 * @param {MouseEvent} e - Mouse event
 */
function startFolderDrag(e) {
    uiDebug.start('Starting folder drag');
    
    try {
        const folder = e.currentTarget.parentElement;
        if (!folder || !folder.classList.contains('folder')) {
            uiDebug.warn('Drag started on non-folder element');
            return;
        }
        
        const rect = folder.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        // Store drag state in AppState
        AppState.set('draggedFile', folder);
        AppState.set('offset', { x: offsetX, y: offsetY });
        
        // Move folder to top z-index
        folder.style.zIndex = AppState.getNextZIndex();
        
        // Add global mousemove and mouseup listeners
        document.addEventListener('mousemove', handleFolderDrag);
        document.addEventListener('mouseup', stopFolderDrag);
        
        uiDebug.detail('Drag started', { offsetX, offsetY });
        
    } catch (error) {
        uiDebug.error('Error starting folder drag', error);
    }
}

/**
 * Handle folder drag movement
 * @param {MouseEvent} e - Mouse event
 */
function handleFolderDrag(e) {
    try {
        const draggedFile = AppState.get('draggedFile');
        const offset = AppState.get('offset');
        
        if (!draggedFile) {
            uiDebug.warn('No folder being dragged');
            return;
        }
        
        // Calculate new position
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        let newX = e.clientX - canvasRect.left - offset.x;
        let newY = e.clientY - canvasRect.top - offset.y;
        
        // Apply grid snapping if enabled
        if (AppState.get('isGridSnapEnabled') && typeof CONSTANTS !== 'undefined' && CONSTANTS.GRID_SIZE) {
            const gridSize = CONSTANTS.GRID_SIZE;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }
        
        // Update folder position
        draggedFile.style.left = Math.max(0, newX) + 'px';
        draggedFile.style.top = Math.max(0, newY) + 'px';
        
    } catch (error) {
        uiDebug.error('Error during folder drag', error);
    }
}

/**
 * Stop folder drag operation
 * @param {MouseEvent} e - Mouse event
 */
function stopFolderDrag() {
    uiDebug.start('Stopping folder drag');
    
    try {
        const draggedFile = AppState.get('draggedFile');
        if (!draggedFile) {
            uiDebug.warn('No folder to stop dragging');
            return;
        }
        
        // Remove global listeners
        document.removeEventListener('mousemove', handleFolderDrag);
        document.removeEventListener('mouseup', stopFolderDrag);
        
        // Clear drag state
        AppState.set('draggedFile', null);
        AppState.set('offset', { x: 0, y: 0 });
        
        // Save board state after drag
        setTimeout(() => {
            if (window.saveCurrentBoard) {
                try {
                    window.saveCurrentBoard();
                    uiDebug.info('Folder position saved after drag');
                } catch (error) {
                    uiDebug.warn('Folder position save after drag failed:', error);
                }
            }
        }, 100);
        
        uiDebug.done('Folder drag stopped');
        
    } catch (error) {
        uiDebug.error('Error stopping folder drag', error);
    }
}

// UI Service object with all required functions
window.uiService = {
    // Initialize global functions
    initializeGlobalFunctions: () => {
        uiDebug.start('Initializing global UI functions');
        
        // Expose functions globally
        window.showConfirmDialog = showConfirmDialog;
        window.updateBoardDropdown = updateBoardDropdown;
        window.showOnboardingIfEmpty = showOnboardingIfEmpty;
        window.createFolder = createFolder;
        window.deleteFolder = deleteFolder;
        window.createFileSlot = createFileSlot;
        window.startFolderDrag = startFolderDrag;
        window.handleFolderDrag = handleFolderDrag;
        window.stopFolderDrag = stopFolderDrag;
        
        uiDebug.detail('UI functions exposed globally');
        uiDebug.done('Global UI functions initialized');
    },
    
    // Configuration
    config: {
        initialized: false,
        debugEnabled: true
    }
};

// Auto-initialize when module loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.uiService.initializeGlobalFunctions);
} else {
    // DOM already loaded
    setTimeout(window.uiService.initializeGlobalFunctions, 100);
}

uiDebug.info('UI service module loaded');
