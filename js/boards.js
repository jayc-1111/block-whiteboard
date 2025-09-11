// Load user boards from database on sign-in
async function loadBoardsOnSignIn() {
    try {
        console.log('📚 Loading user boards from database...');

        // Load settings from cloud first
        if (window.CloudState && typeof window.CloudState.initializeSettings === 'function') {
            await window.CloudState.initializeSettings();
        }

        // Require appwriteUtils to be loaded
        if (!window.appwriteUtils || !window.APPWRITE_CONFIG?.databases?.main) {
            console.warn('⚠️ appwriteUtils or config not available, skipping board loading');
            return false;
        }

        // Query user's boards from main database
        const result = await window.appwriteUtils.listDocuments(
            window.APPWRITE_CONFIG.databases.main,
            'boards'
        );

        console.log(`📊 Found ${result.documents.length} boards for user`);

        if (result.documents.length > 0) {
            // Map database boards to local AppState format
            const loadedBoards = result.documents.map((dbBoard, index) => ({
                stateId: index, // Keep local sequential IDs for compatibility
                dbId: dbBoard.$id, // Store database document ID
                name: dbBoard.board_name || `Board ${index + 1}`,
                folders: [], // Will be loaded on-demand
                canvasHeaders: [], // Will be loaded on-demand
                drawingPaths: [], // Will be loaded on-demand
            }));

            // Replace default board with loaded boards
            AppState.set('boards', loadedBoards);

            // Load content for the first board
            await loadBoardContent(0);

            console.log('✅ Successfully loaded user boards:', loadedBoards.map(b => b.name));
            return true;

        } else {
            console.log('📝 No boards found for this user');
            // ONBOARDING DEPRECATED - No longer clearing boards for onboarding
            // AppState.set('boards', []);
            return false;
        }

    } catch (error) {
        console.error('❌ Failed to load boards from database:', error);
        console.log('🔄 Falling back to default board setup');
        return false;
    }
}

// Load individual board content (folders, files, etc.)
async function loadBoardContent(boardId) {
    try {
        console.log('📥 LOAD BOARD CONTENT: Starting loadBoardContent for boardId:', boardId);
        const boards = AppState.get('boards');
        console.log('📋 BOARD STATE:', {
            totalBoards: boards.length,
            boardId,
            allBoards: boards.map(b => ({ stateId: b.stateId, dbId: b.dbId, name: b.name, foldersCount: b.folders?.length || 0 }))
        });

        const board = boards.find(b => b.stateId === boardId);
        console.log('🎯 TARGET BOARD:', board);

        if (!board || !board.dbId) {
            console.warn('⚠️ Board or database ID not found, skipping content loading', {board, boardId});
            return;
        }

        console.log('✅ BOARD VALIDATED - Proceeding with content load for board:', {
            name: board.name,
            dbId: board.dbId,
            currentFoldersCount: board.folders?.length || 0
        });

        console.log(`⏳ Loading content for board "${board.name}"...`);

        // Load folders and their content
        if (window.appwriteUtils && window.appwriteUtils.getFoldersByBoard_id) {
            try {
                const folders = await window.appwriteUtils.getFoldersByBoard_id(board.dbId);
                board.folders = folders.map(folder => ({
                    title: folder.title,
                    position: folder.position,
                    files: [] // Files will be loaded separately if needed
                }));
                console.log(`✅ Loaded ${folders.length} folders for board "${board.name}"`);
            } catch (folderError) {
                console.warn('⚠️ Failed to load folders:', folderError);
            }
        }

        // Load canvas headers
        if (window.appwriteUtils && window.appwriteUtils.getCanvasHeadersByBoard_id) {
            try {
                const headers = await window.appwriteUtils.getCanvasHeadersByBoard_id(board.dbId);
                board.canvasHeaders = headers.map(header => ({
                    id: header.$id,
                    text: header.title || header.text,
                    position: header.position
                }));
                console.log(`✅ Loaded ${headers.length} canvas headers for board "${board.name}"`);
            } catch (headerError) {
                console.warn('⚠️ Failed to load canvas headers:', headerError);
            }
        }

        // Load drawing paths
        if (window.appwriteUtils && window.appwriteUtils.getDrawingPathsByBoard_id) {
            try {
                const paths = await window.appwriteUtils.getDrawingPathsByBoard_id(board.dbId);
                board.drawingPaths = paths.map(path => ({
                    color: path.color,
                    points: path.drawing_paths || path.points
                }));
                console.log(`✅ Loaded ${paths.length} drawing paths for board "${board.name}"`);
            } catch (pathError) {
                console.warn('⚠️ Failed to load drawing paths:', pathError);
            }
        }

        // Update the board in AppState
        console.log('✅ BOARD CONTENT LOADED:', {
            boardId: boardId,
            name: board.name,
            dbId: board.dbId,
            foldersLoaded: board.folders.length,
            filesInFolders: board.folders.reduce((total, folder) => total + (folder.files?.length || 0), 0),
            headersLoaded: board.canvasHeaders.length,
            pathsLoaded: board.drawingPaths?.length || 0
        });

        AppState.set('boards', boards);

        console.log('📋 FINAL BOARD LOADED:', AppState.get('boards').map(b => ({
            id: b.id,
            name: b.name,
            dbId: b.dbId,
            folders: b.folders?.length || 0
        })));

    } catch (error) {
        console.error('❌ Failed to load board content:', error);
        // Continue with whatever content we have - don't let this fail the whole loading process
    }
}

// Enhanced whiteboard management with proper Firebase integration
function initializeBoard() {
    console.log('🏁 INITIALIZE BOARD: Starting initialization process');
    const boards = AppState.get('boards');
    console.log('📋 INITIALIZE BOARD: Boards in state:', boards.map(b => ({ id: b.id, name: b.name, dbId: b.dbId, folders: b.folders?.length || 0 })));

    if (!boards || boards.length === 0) {
        Debug.board.warn('No boards available from AppState');
        // ONBOARDING DEPRECATED - No longer showing onboarding
        // showOnboardingIfEmpty();
        return;
    }

    // Create canvas element inside grid if it doesn't exist
    const grid = document.getElementById('grid');
    let canvas = document.getElementById('canvas');
    if (!canvas && grid) {
        canvas = document.createElement('div');
        canvas.id = 'canvas';
        canvas.style.position = 'relative';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        grid.appendChild(canvas);
    }

    // Check if board already has content from cloud or is waiting for sync
    const currentBoard = boards[0];

    // Debug auth status but don't block board processing
    const user = window.authService?.getCurrentUser?.();
    if (user && (!user.labels || !user.labels.includes('anonymous'))) {
        window.Debug?.appwrite?.info('User authenticated - board data will sync automatically');
    }

    if (currentBoard.folders && currentBoard.folders.length > 0) {
        Debug.board.detail('Board has existing content - initializing folders');
        // Initialize folders from board data
        initializeFoldersFromBoardData(currentBoard.folders);
        return;
    }

    // Reset the first board
    boards[0].folders = [];
    boards[0].canvasHeaders = [];
    AppState.set('boards', boards);

    // Start with empty board - let users add their own content

    // Setup selection event listeners
    setupSelectionListeners();
}

// Initialize folders from board data
function initializeFoldersFromBoardData(foldersData) {
    console.log('🏗️ INITIALIZE FOLDERS: Starting folder restoration from loaded data');
    console.log('📦 FOLDERS DATA RECEIVED:', {
        count: foldersData.length,
        folders: foldersData.map(f => ({
            title: f.title,
            position: f.position,
            filesCount: f.files?.length || 0
        }))
    });

    foldersData.forEach(folderData => {
        console.log('📝 CREATING FOLDER:', {
            title: folderData.title,
            position: {
                x: parseInt(folderData.position.left) || 0,
                y: parseInt(folderData.position.top) || 0
            },
            files: folderData.files?.length || 0
        });
        // Create folder with position
        const folderIndex = createFolder(
            folderData.title,
            parseInt(folderData.position.left) || 0,
            parseInt(folderData.position.top) || 0
        );
        
        // Get the folder element
        const folders = AppState.get('folders');
        const folder = folders[folderIndex];
        if (folder && folder.element) {
            const grid = folder.element.querySelector('.files-grid');
            if (grid) {
                // Clear existing slots
                grid.innerHTML = '';
                
                // Create file slots
                for (let i = 0; i < CONSTANTS.INITIAL_FILE_SLOTS; i++) {
                    if (typeof createFileSlot === 'function') {
                        const slot = createFileSlot();
                        grid.appendChild(slot);
                    }
                }
                
                // Load files if they exist
                if (folderData.files && Array.isArray(folderData.files)) {
                    folderData.files.forEach(fileData => {
                        // Add file to folder with content and bookmarks
                        addFileToFolder(folderIndex, fileData.title, fileData.content, fileData.bookmarks);
                    });
                }
            }
        }
    });
}

// DEPRECATED: Manual REST API save function - migrating to Realtime WebSocket sync
async function saveCurrentBoard() {
    // NOTE: This function is being replaced by Realtime WebSocket synchronization
    // All manual save operations will be automatically handled via Realtime events
    const boards = AppState.get('boards');
    if (!boards || !Array.isArray(boards)) {
        Debug.board.error('Boards array not initialized');
        return;
    }

    const currentBoard_stateId = AppState.get('currentBoard_stateId');
    let board = boards.find(b => b.stateId === currentBoard_stateId);
    if (!board) {
        Debug.board.error('Current board not found', {
            board_id: currentBoard_stateId,
            availableBoards: boards.map(b => ({ stateId: b.stateId, name: b.name })),
            boardsLength: boards.length
        });
        return;
    }

    try {
        // Reset board data for fresh save
        board.folders = [];
        board.canvasHeaders = [];
        board.drawingPaths = [];

    // Save folders from DOM
    const canvas = document.getElementById('canvas');
    Debug.board.start('Saving board to cloud');
    Debug.board.detail(`Canvas element: ${canvas ? 'found' : 'NOT FOUND'}`);

    if (canvas) {
        const folderElements = canvas.querySelectorAll('.folder');
        Debug.board.step(`Folders found: ${folderElements.length}`);
        Debug.board.detail('📂 FOLDER ELEMENTS FOUND IN SAVE:', {
            count: folderElements.length,
            elements: Array.from(folderElements).map(folder => ({
                id: folder.id,
                folderId: folder.dataset.folderId,
                appwriteId: folder.dataset.appwriteId,
                currentLeft: folder.style.left,
                currentTop: folder.style.top
            }))
        });

        // 🎯 EXTENSIVE DOM DEBUGGING - Tell us exactly what's on the canvas
        Debug.board.detail('=== CANVAS DOM ANALYSIS ===');
        Debug.board.detail(`Canvas children count: ${canvas.children.length}`);
        const childElements = Array.from(canvas.children).map(child => ({
            tagName: child.tagName,
            className: child.className,
            id: child.id,
            innerHTML: child.innerHTML.substring(0, 100) + '...'
        }));
        Debug.board.detail('Canvas children details:', childElements);

        // Check for specific classes - FIXED SVG SVGAnimatedString compatibility
        const allElements = canvas.querySelectorAll('*');
        const classesFound = Array.from(allElements).reduce((acc, el) => {
            // Handle SVG elements (className is SVGAnimatedString) and HTML elements
            const className = el.className?.baseVal || el.className || '';
            const classString = typeof className === 'string' ? className : String(className);
            if (classString) {
                const classes = classString.split(' ').filter(cls => cls.trim());
                classes.forEach(cls => acc.add(cls));
            }
            return acc;
        }, new Set());
        Debug.board.detail('All classes found:', Array.from(classesFound));

        // Specific element searches with detailed logging
        const folderQuery = canvas.querySelectorAll('.folder');
        const fileQuery = canvas.querySelectorAll('.file');
        const headerQuery = canvas.querySelectorAll('.canvas-header');
        const fileSlotQuery = canvas.querySelectorAll('.file-slot');

        Debug.board.detail(`DOM Element Counts:`, {
            '.folder': folderQuery.length,
            '.file': fileQuery.length,
            '.canvas-header': headerQuery.length,
            '.file-slot': fileSlotQuery.length
        });

        // Log actual folder elements if any found
        if (folderElements.length > 0) {
            folderElements.forEach((folder, index) => {
                Debug.board.detail(`Folder ${index} details:`, {
                    tagName: folder.tagName,
                    className: folder.className,
                    id: folder.id,
                    childrenCount: folder.children.length,
                    innerHTMLPreview: folder.innerHTML.substring(0, 200) + '...'
                });
            });
        } else {
            Debug.board.warn('NO FOLDER ELEMENTS FOUND - board will be saved empty!');
            Debug.board.detail('Canvas innerHTML sample:', canvas.innerHTML.substring(0, 500) + '...');
        }

            for (const cat of folderElements) {
                const folderTitle = cat.querySelector('.folder-title');
                if (!folderTitle) continue;

                Debug.board.detail(`Processing folder: "${folderTitle.textContent}"`);

                const folderData = {
                    title: folderTitle.textContent,
                    position: {
                        left: cat.style.left,
                        top: cat.style.top
                    },
                    files: []
                };

                // Get all file slots in order to preserve position
                const fileSlots = cat.querySelectorAll('.file-slot');
                let allFiles = [];

                // Process slots in order to maintain file positions
                const expandedFile = document.querySelector('.file.expanded');

                fileSlots.forEach((slot, slotIndex) => {
                    const fileInSlot = slot.querySelector('.file');
                    if (fileInSlot) {
                        allFiles.push(fileInSlot);
                    } else if (expandedFile &&
                              expandedFile.dataset.folderId === cat.id &&
                              expandedFile.originalSlotIndex === slotIndex) {
                        // This slot's file is currently expanded
                        allFiles.push(expandedFile);
                    }
                });

                Debug.board.detail(`Files found in slots: ${allFiles.length}`);
                Debug.board.detail(`Expanded file found: ${document.querySelector('.file.expanded') ? 'yes' : 'no'}`);
                allFiles.forEach((file, index) => {
                    const fileTitle = file.querySelector('.file-title');
                    Debug.board.detail(`  File ${index}: "${fileTitle ? fileTitle.textContent : 'NO TITLE'}"`);
                });

                const filePromises = allFiles.map(async (file) => {
                    const fileTitle = file.querySelector('.file-title');

                    // Always save the file, even if title is missing or empty
                    const title = getFileTitleText(file) || 'Untitled File';

                    let content = '';

                    // If file has Quill editor instance (expanded), save from it
                    if (file.quillEditor) {
                        try {
                            content = {
                                content: file.quillEditor.root.innerHTML
                            };
                        } catch (error) {
                            console.error('Error saving Quill content:', error);
                        }
                    } else if (file.initialContent) {
                        // Use stored content if file wasn't expanded
                        content = file.initialContent;
                    }

                    // Ensure we never lose bookmarks by checking both the file element and AppState
                    let bookmarks = file.bookmarks || [];

                    // Additional safety check - if bookmarks appear empty but we had them before
                    if (bookmarks.length === 0 && window.syncService?.lastKnownGoodState) {
                        try {
                            const lastGood = JSON.parse(window.syncService.lastKnownGoodState);
                            const lastBoard = lastGood.find(b => b.stateId === currentBoard_stateId);
                            if (lastBoard?.folders) {
                                // Try to find this file's bookmarks from last known good state
                                for (const lastCat of lastBoard.folders) {
                                    const lastFile = lastCat.files?.find(c => c.title === title);
                                    if (lastFile?.bookmarks?.length > 0) {
                                        console.warn(`📦 SAVE: Recovering ${lastFile.bookmarks.length} bookmarks for file "${title}" from last known good state`);
                                        bookmarks = lastFile.bookmarks;
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error checking last known good state:', e);
                        }
                    }

                    // Save sections data if it exists
                    let sections = [];
                    if (file.sections && Array.isArray(file.sections)) {
                        sections = file.sections.map(section => ({
                            id: section.id,
                            title: section.title,
                            content: section.content,
                            bookmarks: section.bookmarks || []
                        }));
                        console.log(`💾 SAVE DEBUG: File "${title}" has ${sections.length} sections to save`);
                    } else {
                        console.log(`💾 SAVE DEBUG: File "${title}" has no sections (file.sections: ${typeof file.sections})`);
                    }

                    const fileData = {
                        id: file.dataset.fileId || file.id || null,
                        title: title,
                        content: content, // Now storing Quill HTML format
                        bookmarks: bookmarks, // Save bookmarks with protection
                        sections: sections // Save sections data
                    };

                    if (sections.length > 0) {
                        console.log(`💾 SAVE DEBUG: Saving ${sections.length} sections for file "${title}"`);
                        sections.forEach((s, i) => console.log(`  Section ${i}: ${s.title} (${s.bookmarks?.length || 0} bookmarks)`));
                    }

                    if (file.bookmarks && file.bookmarks.length > 0) {
                        console.log(`📦 SAVE: Saving file "${title}" with ${file.bookmarks.length} bookmarks`);
                        file.bookmarks.forEach((b, i) => console.log(`  🔖 ${i}: ${b.title} - ${b.url}`));
                    }

                    return fileData;
                });

                // Wait for all files to be processed
                const fileResults = await Promise.all(filePromises);
                folderData.files = fileResults.filter(file => file !== null);

                Debug.board.detail(`Files saved for folder "${folderData.title}": ${folderData.files.length}`);
                folderData.files.forEach((file, index) => {
                    Debug.board.detail(`  Saved file ${index}: "${file.title}"`);
                });

                board.folders.push(folderData);
                Debug.board.detail(`📂 SAVED FOLDER IN BOARD ARRAY:`, {
                    folderTitle: folderData.title,
                    position: folderData.position,
                    totalFiles: folderData.files.length,
                    boardFoldersCount: board.folders.length
                });
            }

            // Save canvas headers from DOM
            const headerElements = canvas.querySelectorAll('.canvas-header');
            Debug.board.step(`Headers found: ${headerElements.length}`);

            // 🎯 HEADER DEBUGGING
            if (headerElements.length > 0) {
                Debug.board.detail(`Header elements found: ${headerElements.length}`);
                headerElements.forEach((header, index) => {
                    Debug.board.detail(`Header ${index} details:`, {
                        tagName: header.tagName,
                        className: header.className,
                        id: header.id,
                        contentText: header.textContent.substring(0, 50) + '...',
                        dataset: header.dataset,
                        style: {
                            left: header.style.left,
                            top: header.style.top,
                            position: header.style.position
                        }
                    });
                });
            } else {
                Debug.board.warn('NO CANVAS HEADER ELEMENTS FOUND!');
                Debug.board.detail('Searching all page for canvas headers...');
                const pageHeaders = document.querySelectorAll('.canvas-header');
                Debug.board.detail(`Page-wide canvas headers: ${pageHeaders.length}`);
            }

            headerElements.forEach(header => {
                const headerData = {
                    id: header.dataset.headerId || Date.now() + Math.random(),
                    text: header.textContent,
                    position: {
                        left: header.style.left,
                        top: header.style.top
                    }
                };
                board.canvasHeaders.push(headerData);
                Debug.board.detail(`Saved header: "${headerData.text}" at (${headerData.position.left}, ${headerData.position.top})`);
            });

            // Save drawing paths
            Debug.board.step('Checking drawing paths...');
            if (window.getDrawingPaths && typeof window.getDrawingPaths === 'function') {
                board.drawingPaths = window.getDrawingPaths();
                Debug.board.step(`Saved ${board.drawingPaths.length} drawing paths`);

                // 🎯 DRAWING PATHS DEBUGGING
                if (board.drawingPaths && board.drawingPaths.length > 0) {
                    Debug.board.detail(`Drawing paths captured: ${board.drawingPaths.length}`);
                    board.drawingPaths.forEach((path, index) => {
                        Debug.board.detail(`Path ${index} details:`, {
                            color: path.color,
                            points: path.points ? path.points.length : 'undefined',
                            pointsPreview: path.points ? path.points.substring(0, 50) + '...' : 'null'
                        });
                    });
                } else {
                    Debug.board.warn('NO DRAWING PATHS FOUND!');
                    Debug.board.detail('getDrawingPaths called but returned empty array');
                }
            } else {
                Debug.board.error('getDrawingPaths function not available on window!');
                Debug.board.detail('Checking if canvas-drawing.js is loaded...');
                Debug.board.detail(`window.getDrawingPaths: ${typeof window.getDrawingPaths}`);
                Debug.board.detail(`window.setDrawingPaths: ${typeof window.setDrawingPaths}`);
            }
        }

        // ✅ REMOVED: Empty board validation - boards can now be empty as intended
        Debug.board.info('Board save proceeding - empty boards are allowed');

        // Save directly to Appwrite using dbService (like the working test)
        Debug.board.step('Saving board directly to Appwrite cloud...');

        // Format board data to match test-save.js structure
        const boardToSave = {
            id: board.id,
            name: board.name,
            folders: board.folders,
            canvasHeaders: board.canvasHeaders,
            drawingPaths: board.drawingPaths || [],
            dev_mode: board.dev_mode || false
        };

        Debug.board.detail('Board data to save', {
            id: boardToSave.id,
            name: boardToSave.name,
            foldersCount: boardToSave.folders.length,
            headersCount: boardToSave.canvasHeaders.length
        });

        if (window.dbService && window.dbService.saveBoard) {
            const result = await window.dbService.saveBoard(boardToSave);

            // Ensure result is always an object with success property
            if (result && typeof result === 'object' && result.success) {
                // 🔥 CRITICAL FIX: Update board with database ID after successful save
                if (result.id || result.$id) {
                    const newBoardId = result.id || result.$id;
                    console.log(`🔧 BOARD SAVE: Updating board with new database ID: ${newBoardId}`);

                    // Update the board object with the new database ID
                    board.$id = newBoardId;
                    board.dbId = newBoardId;

                    // Persist the updated board back to AppState
                    const boards = AppState.get('boards');
                    const updatedBoards = boards.map(b => b.id === board.id ? board : b);
                    AppState.set('boards', updatedBoards);

                    console.log(`✅ BOARD UPDATED: Board "${board.name}" now has dbId: ${newBoardId}`);
                    Debug.board.info(`Board database ID synchronized: ${newBoardId}`);
                } else {
                    console.warn(`⚠️ BOARD SAVE WARNING: Save succeeded but no board ID returned`);
                    console.log('Board save result:', result);
                }

                Debug.board.done(`Board "${board.name}" saved to cloud successfully`);
                return result;
            } else {
                const errorMsg = result?.error || result?.details?.message || 'Unknown save error';
                Debug.board.error('Cloud save failed', result);
                throw new Error(`Cloud save failed: ${errorMsg}`);
            }
        } else {
            Debug.board.error('dbService.saveBoard not available');
            throw new Error('dbService.saveBoard function not available');
        }

    } catch (error) {
        Debug.board.error('Cloud save failed completely', error);
        throw error;
    }
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
                deleteBoard(currentBoard.stateId);
            }
        }
        });
        dropdownList.appendChild(deleteBoardLi);
    }
    
    Debug.ui.info(`Board dropdown updated with ${boards.length} boards`);
}

// Enhanced board name editing with proper state sync
function setupBoardNameEditing() {
    const boardNameEl = document.getElementById('boardName');
    if (!boardNameEl) return;
    
    boardNameEl.addEventListener('blur', async () => {
        const boards = AppState.get('boards');
        const currentBoard_stateId = AppState.get('currentBoard_stateId');
        const board = boards.find(b => b.stateId === currentBoard_stateId);

        if (board) {
            const newName = boardNameEl.textContent.trim() || `${CONSTANTS.DEFAULT_BOARD_NAME} ${currentBoard_stateId + 1}`;
            board.name = newName;
            boardNameEl.textContent = newName;

            // Save to cloud immediately when board name changes
            try {
                await saveCurrentBoard();
                Debug.board.info(`Board renamed and saved to cloud: "${newName}"`);
            } catch (error) {
                Debug.board.error('Failed to save board name change to cloud', error);
                // Still update the UI even if cloud save fails
            }

            // Update board selector
            const selectorText = document.querySelector('.board-selector-text');
            if (selectorText) selectorText.textContent = newName;
        }
    });
    
    boardNameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            boardNameEl.blur();
        }
    });
}

// DEPRECATED: Manual save whiteboard function - migrating to Realtime WebSocket sync
// This function will be removed after realtime implementation is complete
let boardSaveInProgress = false; // Prevent concurrent saves

async function manualSaveWhiteboard() {
    // DISABLED: Manual save temporarily disabled during realtime migration
    // Future: This will be replaced by automatic realtime synchronization
    console.log('⚡ SAVE DISABLED: Migrating to Realtime - manual saves disabled');
    return;

    /*
    // Original manual save logic (commented out during realtime migration)
    Debug.sync.start();

    // Prevent concurrent saves
    if (boardSaveInProgress) {
        Debug.sync.detail('Save already in progress, skipping');
        return;
    }

    boardSaveInProgress = true;
    const saveBtn = document.getElementById('saveWhiteboardBtn');

    // Update button to show saving state
    if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving to Cloud...';
        saveBtn.style.background = '#f59e0b';
        saveBtn.disabled = true;
        saveBtn.classList.add('saving');

        // Reset button after save
        const resetButton = () => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '#059669';
            saveBtn.disabled = false;
            saveBtn.classList.remove('saving', 'success', 'error');
            boardSaveInProgress = false; // Reset flag
        };

        try {
            // Save directly to cloud
            await saveCurrentBoard();
            Debug.sync.done('Cloud save completed');

            // Success state
            if (saveBtn) {
                saveBtn.classList.remove('saving');
                saveBtn.classList.add('success');
                saveBtn.textContent = 'Saved to Cloud!';
                saveBtn.style.background = '#10b981';
                setTimeout(resetButton, 2000);
            }

        } catch (error) {
            Debug.sync.error('Cloud save failed', error);

            // Error state
            if (saveBtn) {
                saveBtn.classList.remove('saving');
                saveBtn.classList.add('error');
                saveBtn.textContent = 'Save Failed!';
                saveBtn.style.background = '#ef4444';
                setTimeout(resetButton, 3000);
            }
            boardSaveInProgress = false;
        }
    } else {
        boardSaveInProgress = false;
    }
}
*/
}

// Make loadBoardsOnSignIn globally available for auth guard
window.loadBoardsOnSignIn = loadBoardsOnSignIn;

// Initialize board name editing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBoardNameEditing);
} else {
    setupBoardNameEditing();
}
