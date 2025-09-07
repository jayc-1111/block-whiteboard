// Toggle folder collapse/expand
function toggleFolder(folder) {
    folder.classList.toggle('collapsed');
    
    // Save state after toggling
    if (window.syncService) {
        window.syncService.saveAfterAction('folder toggled');
    }
}

// Folder management
function createFolder(title = 'New Folder', x = null, y = null) {
    try {
        // Expose globally for file tree
        window.createFolder = createFolder;
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return -1;
        }
        
        const folder = document.createElement('div');
        folder.className = 'folder';
        const folders = AppState.get('folders');
        folder.dataset.folderId = folders.length;
        folder.style.left = (x || Math.random() * 600 + 100) + 'px';
        folder.style.top = (y || Math.random() * 400 + 100) + 'px';
        folder.style.zIndex = AppState.getNextZIndex();

        // 🔧 APPWRITE INTEGRATION: Save to Appwrite folders collection
        const saveToAppwrite = async () => {
            const currentUser = window.authService?.getCurrentUser?.();
            if (!currentUser || !window.appwriteDatabases || !window.getCurrentUserPermissions) {
                console.warn('🚨 Appwrite not ready - folder saved locally only');
                return;
            }

            try {
                // Get current board info
                const boards = AppState.get('boards');
                const currentBoardId = AppState.get('currentBoardId');
                const currentBoard = boards.find(b => b.id === currentBoardId);

                if (!currentBoard) {
                    console.warn('🚨 No current board found - cannot save folder to Appwrite');
                    return;
                }

                // Generate unique folder document ID
                const userShortId = currentUser.$id.substring(0, 4);
                const timestamp = Date.now();
                const folderDocId = `folder_${timestamp}_${userShortId}`;

                // Get board's system ID for board_id field
                const boardSystemId = currentBoard.systemId || currentBoard.$id || currentBoard.boardId;
                if (!boardSystemId) {
                    console.warn('🚨 Board has no system ID - folder cannot be linked to board');
                    return;
                }

                // Prepare folder data matching Appwrite schema
                const folderData = {
                    board_id: boardSystemId, // ✅ Required for board association
                    title: title,
                    position: JSON.stringify({
                        left: parseInt(folder.style.left) || 150,
                        top: parseInt(folder.style.top) || 150
                    }),
                    files: JSON.stringify([]), // Empty initially
                    z_index: parseInt(folder.style.zIndex) || AppState.get('highestZIndex') || 10
                };

                // Get permissions for this user
                const permissions = window.getCurrentUserPermissions();

                console.log('📂 SAVING FOLDER TO APPWRITE:', {
                    folderId: folderDocId,
                    boardId: boardSystemId,
                    title: folderData.title,
                    collection: window.APPWRITE_CONFIG?.collections?.folders || 'folders'
                });

                // Save to Appwrite folders collection
                const folderResult = await window.appwriteDatabases.createDocument(
                    window.APPWRITE_CONFIG.databaseId,
                    window.APPWRITE_CONFIG.collections.folders,
                    folderDocId,
                    folderData,
                    permissions
                );

                // Store the Appwrite document ID on the DOM element for future operations
                folder.dataset.appwriteId = folderDocId;

                console.log('✅ FOLDER SAVED TO APPWRITE SUCCESSFULLY:', {
                    localId: folders.length,
                    appwriteId: folderDocId,
                    resultId: folderResult.$id,
                    boardId: folderData.board_id
                });

            } catch (error) {
                console.error('❌ FAILED TO SAVE FOLDER TO APPWRITE:', {
                    error: error.message,
                    code: error.code,
                    title: title
                });
            }
        };

        // Save to Appwrite asynchronously (don't block folder creation)
        saveToAppwrite().catch(err => console.error('Appwrite save failed:', err));

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
        if (window.syncService) {
            window.syncService.saveAfterAction('folder title edited');
        }
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4-4-4 4"/>
    </svg>`;
    toggleBtn.style.display = 'inline-block';
    toggleBtn.addEventListener('click', () => toggleFolder(folder));

    const addFileBtn = document.createElement('button');
    addFileBtn.className = 'add-file-btn';
    addFileBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5"/>
    </svg>`;
    addFileBtn.style.display = 'inline-block';
    const folderIndex = folders.length;
    addFileBtn.addEventListener('click', () => addFileToFolder(folderIndex));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = `<svg
        aria-hidden="true"
        stroke="currentColor"
        stroke-width="3"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>`;
    deleteBtn.style.display = 'inline-block';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove Folder',
            `Are you sure you want to remove "${folderTitle.textContent}"?`,
            () => deleteFolder(folder)
        );
    });

    const headerButtons = document.createElement('div');
    headerButtons.className = 'header-buttons';
    // Toggle button removed from header - it's in the bottom section
    headerButtons.appendChild(addFileBtn);
    headerButtons.appendChild(deleteBtn);
    
    folderHeader.appendChild(folderTitle);
    folderHeader.appendChild(headerButtons);

    const filesGrid = document.createElement('div');
    filesGrid.className = 'files-grid';
    
    for (let i = 0; i < CONSTANTS.INITIAL_FILE_SLOTS; i++) {
        const slot = createFileSlot();
        filesGrid.appendChild(slot);
    }

    const expandSpaceBtn = document.createElement('button');
    expandSpaceBtn.className = 'expand-space-btn';
    expandSpaceBtn.textContent = 'Expand Space';
    expandSpaceBtn.style.display = 'none';
    expandSpaceBtn.addEventListener('click', () => {
        for (let i = 0; i < CONSTANTS.INITIAL_FILE_SLOTS; i++) {
            const slot = createFileSlot();
            filesGrid.appendChild(slot);
        }
    });

    // Create bottom section for toggle button
    const bottomSection = document.createElement('div');
    bottomSection.className = 'folder-bottom';
    bottomSection.appendChild(toggleBtn);

    folder.appendChild(folderHeader);
    folder.appendChild(filesGrid);
    folder.appendChild(bottomSection);
    // Note: expandSpaceBtn is kept but hidden - may be used in future

    folderHeader.addEventListener('mousedown', startFolderDrag);
    
    folder.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        folder.style.zIndex = AppState.getNextZIndex();
    });

    canvas.appendChild(folder);

    const updatedFolders = [...folders, {
        element: folder,
        files: []
    }];
    AppState.set('folders', updatedFolders);
    
    // Also update the folders array in the current board
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    if (currentBoard) {
        // Create a folder data object that matches what's expected for serialization
        const folderData = {
            title: title,
            position: {
                left: folder.style.left,
                top: folder.style.top
            },
            files: []
        };
        currentBoard.folders = [...(currentBoard.folders || []), folderData];
        AppState.set('boards', boards);
    }
    
    // Save after creating folder
    if (window.syncService) {
        window.syncService.saveAfterAction('folder created');
    }

    // ✅ DEBUG: Verify folder was saved properly
    console.log('📂 FOLDER CREATION COMPLETE:', {
        localFolderIndex: updatedFolders.length - 1,
        appwriteSavingEnabled: !!(window.appwriteDatabases && window.authService?.getCurrentUser()),
        totalFolders: updatedFolders.length
    });

    return updatedFolders.length - 1;
    } catch (error) {
        console.error('Error creating folder:', error);
        return -1;
    }
}

function deleteFolder(folder) {
    const folders = AppState.get('folders');
    const folderIndex = parseInt(folder.dataset.folderId);
    
    if (folderIndex >= 0 && folderIndex < folders.length) {
        folders.splice(folderIndex, 1);
        
        folders.forEach((cat, index) => {
            cat.element.dataset.folderId = index;
        });
        
        AppState.set('folders', folders);
        
        // Also update the folders array in the current board
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const currentBoard = boards.find(board => board.id === currentBoardId);
        if (currentBoard) {
            currentBoard.folders.splice(folderIndex, 1);
            AppState.set('boards', boards);
        }
        
        // Save after deleting folder
        if (window.syncService) {
            window.syncService.saveAfterAction('folder deleted');
        }
    }
    
    folder.remove();
}

function toggleFolder(folder) {
    const toggleBtn = folder.querySelector('.toggle-btn');
    
    if (folder.classList.contains('collapsed')) {
        // Expand
        folder.classList.remove('collapsed');
        toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 14-4-4-4 4"/>
        </svg>`;
    } else {
        // Collapse
        folder.classList.add('collapsed');
        toggleBtn.innerHTML = `<svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m8 10 4 4 4-4"/>
        </svg>`;
    }
    
    // Save state after toggling
    if (window.syncService) {
        window.syncService.saveAfterAction('folder toggled');
    }
}

function startFolderDrag(e) {
    const folder = e.target.closest('.folder');
    if (!folder || e.target.classList.contains('delete-btn') || 
        e.target.classList.contains('add-file-btn') || 
        e.target.classList.contains('toggle-btn') ||
        e.target.classList.contains('folder-title')) {
        return;
    }
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
    
    const isDraggingMultiple = AppState.get('isDraggingMultiple');
    const selectedItems = AppState.get('selectedItems');
    if (isDraggingMultiple || (selectedItems.length > 1 && selectedItems.includes(folder))) {
        startMultipleDrag(e);
        return;
    }
    
    const offset = {
        x: e.clientX - folder.getBoundingClientRect().left,
        y: e.clientY - folder.getBoundingClientRect().top
    };
    AppState.set('currentFolder', folder);
    AppState.set('offset', offset);
    
    document.addEventListener('mousemove', dragFolder);
    document.addEventListener('mouseup', stopDragFolder);
}

function dragFolder(e) {
    const currentFolder = AppState.get('currentFolder');
    const offset = AppState.get('offset');
    if (!currentFolder) return;
    
    const whiteboard = document.getElementById('whiteboard');
    const rect = whiteboard.getBoundingClientRect();
    
    let x = e.clientX - rect.left - offset.x;
    let y = e.clientY - rect.top - offset.y;
    
    if (isGridSnapEnabled) {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }
    
    currentFolder.style.left = x + 'px';
    currentFolder.style.top = y + 'px';
    
    updateCanvasSize(x, y, 350, currentFolder.offsetHeight);
}

function stopDragFolder() {
    AppState.set('currentFolder', null);
    document.removeEventListener('mousemove', dragFolder);
    document.removeEventListener('mouseup', stopDragFolder);
    
    // Unset dragging flag and save after drag completes
    if (window.syncService) {
        window.syncService.isDragging = false;
        window.syncService.saveAfterAction('folder drag');
    }
}

function addSuperHeader(x = null, y = null) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    const superHeader = document.createElement('div');
    superHeader.className = 'super-header';
    superHeader.contentEditable = true;
    superHeader.textContent = 'SUPER HEADER';
    superHeader.dataset.placeholder = 'SUPER HEADER';
    superHeader.autocomplete = 'off';
    superHeader.autocorrect = 'off';
    superHeader.autocapitalize = 'off';
    superHeader.spellcheck = false;
    
    superHeader.style.left = (x || Math.random() * CONSTANTS.RANDOM_POSITION_RANGE + CONSTANTS.POSITION_OFFSET) + 'px';
    superHeader.style.top = (y || Math.random() * CONSTANTS.RANDOM_POSITION_RANGE + CONSTANTS.POSITION_OFFSET) + 'px';
    
    superHeader.addEventListener('focus', function() {
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    superHeader.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
        // Save after editing header text
        if (window.syncService) {
            window.syncService.saveAfterAction('header text edited');
        }
    });
    
    superHeader.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        startSuperHeaderDrag(e);
    });
    
    grid.appendChild(superHeader);
}

function createFolderFromData(catData) {
    const catIndex = createFolder(catData.title, 
        parseInt(catData.position.left), 
        parseInt(catData.position.top)
    );
    
    const folders = AppState.get('folders');
    const folder = folders[catIndex];
    const grid = folder.element.querySelector('.files-grid');
    grid.innerHTML = '';
    for (let i = 0; i < CONSTANTS.INITIAL_FILE_SLOTS; i++) {
        const slot = createFileSlot();
        grid.appendChild(slot);
    }
    
    if (catData.files) {
        catData.files.forEach(fileData => {
            addFileToFolder(catIndex, fileData.title, fileData.content);
        });
    }
}

function createSuperHeaderFromData(headerData) {
    addSuperHeader(parseInt(headerData.position.left), 
        parseInt(headerData.position.top));
    const headers = document.querySelectorAll('.super-header');
    const lastHeader = headers[headers.length - 1];
    if (lastHeader) {
        lastHeader.textContent = headerData.text;
    }
}
