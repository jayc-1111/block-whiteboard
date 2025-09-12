// Board Switcher Functions

async function loadBoard(dbId) {
    Debug.board.start(`Loading board with dbId ${dbId}`);
    
    // Save current board state before switching
    try {
        saveCurrentBoard();
        if (window.syncService && typeof window.syncService.saveCurrentBoard === 'function') {
            await window.syncService.saveCurrentBoard();
        }
    } catch (error) {
        Debug.board.error('Failed to save current board before switching', error);
    }
    
    // Ensure canvas exists before clearing
    let canvas = document.getElementById('canvas');
    if (!canvas) {
        // Create canvas if it doesn't exist
        const grid = document.getElementById('grid');
        if (grid) {
            canvas = document.createElement('div');
            canvas.id = 'canvas';
            canvas.style.position = 'relative';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            grid.appendChild(canvas);
        } else {
            Debug.board.error('Grid element not found');
            return;
        }
    }
    // Clear canvas content
    canvas.innerHTML = '';
    AppState.set('folders', []);
    
    // Find and load the target board by dbId
    const boards = AppState.get('boards');
    let board = boards.find(b => b.dbId === dbId);
    if (!board) {
        Debug.board.error(`Board with dbId ${dbId} not found`);
        return;
    }

    AppState.set('currentBoard_dbId', dbId);
    
    if (window.syncService && typeof window.syncService.loadBoardOnDemand === 'function') {
        Debug.board.step('Loading board from cloud...');
        await window.syncService.loadBoardOnDemand(dbId);
        board = AppState.get('boards').find(b => b.dbId === dbId);
    }
    
    // Load folders
    if (board.folders && board.folders.length > 0) {
        board.folders.forEach(catData => {
            const catIndex = createFolder(
                catData.title, 
                parseInt(catData.position.left) || 0, 
                parseInt(catData.position.top) || 0
            );
            
            const folders = AppState.get('folders');
            const folder = folders[catIndex];
            if (folder && folder.element) {
                const grid = folder.element.querySelector('.files-grid');
                if (grid) {
                    grid.innerHTML = '';
                    
                    // Create file slots
                    for (let i = 0; i < 4; i++) {
                        if (typeof createFileSlot === 'function') {
                            const slot = createFileSlot();
                            grid.appendChild(slot);
                        }
                    }
                    
                    // Load files with bookmarks and sections
                    if (catData.files) {
                        catData.files.forEach(fileData => {
                            // Pass bookmarks as fourth parameter and sections as fifth (if needed)
                            const file = addFileToFolder(catIndex, fileData.title, fileData.content, fileData.bookmarks);
                            // Restore file ID if it exists
                            if (file && fileData.id) {
                                file.id = fileData.id;
                                file.dataset.fileId = fileData.id;
                            }
                            
                            // Restore sections if they exist
                            if (file && fileData.sections && Array.isArray(fileData.sections)) {
                                // Store sections data on the file element for later use
                                file.sections = fileData.sections;
                            }
                        });
                    }
                }
            }
        });
    }
    
    // Load canvas headers
    if (board.canvasHeaders && typeof loadCanvasHeaders === 'function') {
        loadCanvasHeaders(board.canvasHeaders);
    }
    
    // Load drawing paths
    if (board.drawingPaths && board.drawingPaths.length > 0) {
        if (window.setDrawingPaths && typeof window.setDrawingPaths === 'function') {
            window.setDrawingPaths(board.drawingPaths);
            Debug.board.step(`Loaded ${board.drawingPaths.length} drawing paths`);
        }
    }
    
    // Update UI elements
    const boardNameEl = document.getElementById('boardName');
    if (boardNameEl) {
        boardNameEl.textContent = board.name;
    }
    
    const selectorText = document.querySelector('.board-selector-text');
    if (selectorText) {
        selectorText.textContent = board.name;
    }
    
    Debug.board.done(`Board "${board.name}" loaded successfully`);
}



async function deleteBoard(board_id) {
    const boards = AppState.get('boards');
    if (boards.length <= 1) {
        alert('Cannot delete the last board');
        return;
    }
    
    const boardIndex = boards.findIndex(b => b.stateId === board_id);
    if (boardIndex === -1) return;
    
    // CRITICAL FIX: Get board data BEFORE array modification!
    const boardToDelete = boards[boardIndex]; // ✅ Get board BEFORE splice
    const boardName = boardToDelete.name; // ✅ Get name from captured board
    const boardDbId = boardToDelete.dbId; // ✅ Get dbId from captured board

    Debug.board.detail(`Preparing to delete board "${boardName}" with dbId: ${boardDbId}`);

    // Remove board from array
    boards.splice(boardIndex, 1);

    // Reassign IDs to maintain sequential numbering
    boards.forEach((board, index) => {
        board.stateId = index;
    });

    AppState.set('boards', boards);

    // Handle current board switching
    const currentBoard_stateId = AppState.get('currentBoard_stateId');
    if (currentBoard_stateId === board_id) {
        loadBoard(0);
    } else if (currentBoard_stateId > board_id) {
        AppState.set('currentBoard_stateId', currentBoard_stateId - 1);
    }

    updateBoardDropdown();

    Debug.board.info(`Board "${boardName}" deleted locally`);

    // Appwrite board deletion - delete from cloud database
    Debug.board.detail(`Deleting board "${boardName}" from Appwrite with database ID: ${boardDbId}`);
    if (boardDbId) {
        if (window.dbService && window.dbService.deleteBoard) {
            try {
                console.log(`🔥 ATTEMPTING DELETE: Board "${boardName}", dbId: ${boardDbId}`);
                const result = await window.dbService.deleteBoard(boardDbId);
                Debug.board.info(`✅ Board "${boardName}" deleted from Appwrite database`);
                console.log(`🎉 SUCCESS: Board "${boardName}" deleted from backend`);
            } catch (error) {
                Debug.board.error(`❌ Failed to delete board "${boardName}" from database:`, error);
                console.error(`💥 DELETE ERROR: Board "${boardName}", dbId: ${boardDbId}`, error);
                // Continue with local deletion at least
            }
        } else {
            Debug.board.warn('dbService.deleteBoard not available, board deleted locally only');
            console.warn(`⚠️ NO DELETE SERVICE: dbService.deleteBoard not available for "${boardName}"`);
        }
    } else {
        Debug.board.warn(`Board "${boardName}" has no database ID, skipped database deletion`);
        console.warn(`⚠️ NO DB ID: Board "${boardName}" missing dbId property`);
    }
}



function addWhiteboardWithPaymentCheck() {
    Debug.ui.detail('addWhiteboardWithPaymentCheck called');
    
    // Check dev_mode from cloud
    const dev_mode = AppState.get('dev_mode');
    Debug.ui.detail('dev_mode', { dev_mode });
    
    if (!dev_mode) {
        Debug.ui.info('Showing payment modal (dev mode disabled)');
        showPaymentModal();
        return;
    }
    
    Debug.ui.info('Adding whiteboard (dev mode enabled)');
    addWhiteboard();
}


function showPaymentModal() {
    Debug.ui.detail('showPaymentModal called');
    const modal = document.getElementById('paymentModal');
    if (modal) {
        Debug.ui.info('Displaying payment modal');
        modal.style.display = 'flex';
    } else {
        Debug.ui.error('Payment modal element not found!');
    }
}

// Make closePaymentModal globally accessible for HTML onclick
window.closePaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


async function addWhiteboard() {
    const boards = AppState.get('boards');
    const newBoard = {
        stateId: boards.length,
        name: `${CONSTANTS.DEFAULT_BOARD_NAME} ${boards.length + 1}`,
        folders: [],
        canvasHeaders: []
    };

    // Add to local state first for immediate UI update
    boards.push(newBoard);
    AppState.set('boards', boards);

    Debug.board.info(`Created new board locally: "${newBoard.name}"`);

    // Save to Appwrite backend
    try {
        if (window.appwriteUtils && window.appwriteUtils.createBoard) {
            // Send minimal board data - createBoard() handles all field mappings
            const minimalBoardData = {
                name: newBoard.name  // createBoard() maps this to board_name
            };

            await window.appwriteUtils.createBoard(minimalBoardData);
            Debug.board.info(`Board "${newBoard.name}" created in backend successfully`);
        } else {
            Debug.board.warn(`Board "${newBoard.name}" created locally only - appwriteUtils.createBoard not available`);
        }
    } catch (error) {
        Debug.board.error(`Failed to create board in backend:`, error);
        // Continue with local creation at least
    }

    updateBoardDropdown();
    loadBoard(newBoard.stateId);
}



function updateBoardDropdown() {
    const dropdownList = document.getElementById('boardDropdownList');
    if (!dropdownList) {
        Debug.ui.error('Board dropdown list element not found');
        return;
    }
    
    dropdownList.innerHTML = '';
    
    const boards = AppState.get('boards');
    const currentBoard_stateId = AppState.get('currentBoard_stateId');
    
    // Add existing boards
    boards.forEach(board => {
        const li = document.createElement('li');
        li.className = 'element' + (board.stateId === currentBoard_stateId ? ' active' : '');
        li.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7e8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
            </svg>
            <p class="label">${board.name}</p>
        `;
        li.addEventListener('click', () => loadBoard(board.dbId));
        dropdownList.appendChild(li);
    });
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'separator';
    dropdownList.appendChild(separator);
    
    // Add "Add Board" option
    const addBoardLi = document.createElement('li');
    addBoardLi.className = 'element';
    addBoardLi.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7e8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>
        </svg>
        <p class="label">Add Board</p>
    `;
    addBoardLi.addEventListener('click', addWhiteboardWithPaymentCheck);
    dropdownList.appendChild(addBoardLi);
    
    // Add "Delete Board" option if more than one board exists
    if (boards.length > 1) {
        const deleteBoardLi = document.createElement('li');
        deleteBoardLi.className = 'element delete';
        deleteBoardLi.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7e8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <p class="label">Delete Current Board</p>
        `;
        deleteBoardLi.addEventListener('click', () => {
            const boards = AppState.get('boards');
        const currentBoard_stateId = AppState.get('currentBoard_stateId');
        const currentBoard = boards.find(b => b.stateId === currentBoard_stateId);
        
        if (currentBoard && typeof showConfirmDialog === 'function') {
            showConfirmDialog(
                'Delete Board',
                `Are you sure you want to delete "${currentBoard.name}"?`,
                () => deleteBoard(currentBoard.stateId)
            );
        } else {
            // Fallback confirmation
            if (confirm(`Are you sure you want to delete "${currentBoard ? currentBoard.name : 'this board'}"?`)) {
                deleteBoard(currentBoard_stateId);
            }
        }
        });
        dropdownList.appendChild(deleteBoardLi);
    }
    
    Debug.ui.info(`Board dropdown updated with ${boards.length} boards`);
}

