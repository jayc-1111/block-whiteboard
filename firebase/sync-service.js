// Simplified sync service with 30-second interval saves
import { dbService, authService } from './firebase-config.js';

export const syncService = {
    syncTimer: null,
    pendingChanges: false,
    isSaving: false,
    isSyncing: false, // Add flag to prevent duplicate syncs
    lastActivity: Date.now(),
    lastSyncTime: 0, // Track last sync to prevent rapid re-syncs
    isManualSave: false, // Track manual saves
    isAutoSave: false, // Track auto saves from drag operations
    isDragging: false, // Track drag operations
    isEditing: false, // Track editing state
    markPendingDebounce: null, // Debounce timer
    initialLoadComplete: false, // Track if initial load is done
    isLoadingFromFirebase: false, // Track when loading UI from Firebase
    isLoadingInitialBoard: false, // Track if initial board load is in progress
    saveDebounceTimer: null, // Debounce timer for saves
    pendingSaveAction: null, // Track pending save action
    saveQueue: [], // Queue for pending saves
    isProcessingQueue: false, // Track queue processing
    lastKnownGoodState: null, // Store last known good state for recovery
    
    init() {
        console.log('[SYNC DEBUG] Initializing sync service');
        Debug.sync.start();
        Debug.sync.step('Initializing sync service');
        
        // Make globally available
        window.syncService = this;
        
        // Listen for auth state changes
        authService.onAuthStateChange((user) => {
            console.log('[SYNC DEBUG] Auth state changed:', {
                hasUser: !!user,
                isGuest: user?.isAnonymous,
                userId: user?.uid?.slice(-6).toUpperCase(),
                email: user?.email,
                timestamp: new Date().toISOString()
            });
            
            if (user) {
                Debug.sync.step(`User authenticated (${user.isAnonymous ? 'guest' : user.email})`);
                // Load initial boards only once at startup
                if (!this.initialLoadComplete) {
                    this.initialLoadComplete = true;
                    setTimeout(() => this.loadInitialBoard(), 1500);
                }
            } else {
                Debug.sync.stopped('No user authenticated');
                this.initialLoadComplete = false;
                this.clearQueue(); // Clear any pending saves
            }
        });
        
        // Set up activity tracking for editing detection
        this.setupActivityTracking();
        
        // Set up simple auto-save
        this.startAutoSave();
        
        // Hook into board state changes
        this.setupStateChangeHooks();
        
        // Start queue processor
        this.startQueueProcessor();
    },
    
    // Process save queue to handle concurrent operations
    startQueueProcessor() {
        setInterval(() => {
            if (!this.isProcessingQueue && this.saveQueue.length > 0 && !this.isLoadingFromFirebase) {
                console.log('[SYNC DEBUG] Processing save queue:', {
                    queueLength: this.saveQueue.length,
                    timestamp: new Date().toISOString()
                });
                this.processQueue();
            }
        }, 500);
    },
    
    async processQueue() {
        if (this.isProcessingQueue || this.saveQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        console.log('[SYNC DEBUG] Starting queue processing:', {
            queueLength: this.saveQueue.length,
            timestamp: new Date().toISOString()
        });
        Debug.sync.step(`Processing save queue (${this.saveQueue.length} items)`);
        
        while (this.saveQueue.length > 0) {
            const saveTask = this.saveQueue.shift();
            try {
                console.log('[SYNC DEBUG] Processing save task from queue');
                await saveTask();
                // Wait between saves to avoid overwhelming Firebase
                console.log('[SYNC DEBUG] Save task completed, waiting 200ms');
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error('[SYNC ERROR] Queue processing error:', error);
                Debug.sync.stepError('Queue processing error', error);
                // If save fails, restore last known good state
                if (this.lastKnownGoodState) {
                    console.log('[SYNC DEBUG] Restoring last known good state');
                    AppState.set('boards', JSON.parse(this.lastKnownGoodState));
                }
            }
        }
        
        this.isProcessingQueue = false;
        console.log('[SYNC DEBUG] Queue processing completed');
    },
    
    clearQueue() {
        this.saveQueue = [];
        this.isProcessingQueue = false;
        Debug.sync.step('Save queue cleared');
    },
    
    // Alias for loadInitialBoard to match what guest auth expects
    async loadBoardsFromFirebase() {
        return this.loadInitialBoard();
    },
    
    setupActivityTracking() {
        // Track user editing activity (not just mouse movement)
        ['mousedown', 'keydown', 'input', 'change'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, { passive: true });
        });
    },
    
    isUserIdle() {
        // Don't consider idle if actively dragging or editing
        if (this.isDragging || this.isEditing) {
            return false;
        }
        // Consider user idle after 5 seconds of no editing activity (increased from 2)
        return Date.now() - this.lastActivity > 5000;
    },
    
    setupStateChangeHooks() {
        // Disabled - using event-based saving instead
        Debug.sync.step('DOM mutation observer disabled - using event-based saving');
    },
    
    // Compare two boards to determine which has more/newer data
    compareBoards(localBoard, firebaseBoard) {
        // Check timestamps first
        const localTime = localBoard.lastModified || 0;
        const firebaseTime = firebaseBoard.lastModified?.toMillis?.() || firebaseBoard.lastModified || 0;
        
        // Count content
        const localContent = {
            folders: localBoard.folders?.length || 0,
            files: localBoard.folders?.reduce((sum, cat) => sum + (cat.files?.length || 0), 0) || 0,
            headers: localBoard.canvasHeaders?.length || 0,
            drawingPaths: localBoard.drawingPaths?.length || 0
        };
        
        const firebaseContent = {
            folders: firebaseBoard.folders?.length || 0,
            files: firebaseBoard.folders?.reduce((sum, cat) => sum + (cat.files?.length || 0), 0) || 0,
            headers: firebaseBoard.canvasHeaders?.length || 0,
            drawingPaths: firebaseBoard.drawingPaths?.length || 0
        };
        
        const localTotal = localContent.folders + localContent.files + localContent.headers;
        const firebaseTotal = firebaseContent.folders + firebaseContent.files + firebaseContent.headers;
        
        Debug.sync.detail('Board comparison', {
            local: { time: new Date(localTime).toLocaleString(), content: localTotal },
            firebase: { time: new Date(firebaseTime).toLocaleString(), content: firebaseTotal }
        });
        
        // If Firebase is significantly newer (>5 min), use it
        if (firebaseTime > localTime + 300000) return 'firebase';
        
        // If local is newer, keep it
        if (localTime > firebaseTime) return 'local';
        
        // If times are similar, prefer the one with more content
        return localTotal >= firebaseTotal ? 'local' : 'firebase';
    },
    
    // Initial load at startup
    async loadInitialBoard() {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        // Check if already loading or loaded
        if (this.isLoadingInitialBoard) {
            console.log('[SYNC DEBUG] Initial board load already in progress - skipping duplicate');
            Debug.sync.step('Initial board load already in progress - skipping duplicate');
            return;
        }
        
        this.isLoadingInitialBoard = true;
        console.log('[SYNC DEBUG] Loading initial board from Firebase');
        Debug.sync.step('Loading initial board');
        
        // Store current state before loading (might be from localStorage)
        this.storeLastKnownGoodState();
        
        try {
            const result = await dbService.loadBoards();
            
            if (result.success && result.boards.length > 0) {
                // Update boards in AppState
                const boards = result.boards.map(board => {
                    Debug.sync.detail('Board from Firebase', {
                        id: board.id,
                        name: board.name,
                        foldersCount: board.folders?.length || 0,
                        canvasHeadersCount: board.canvasHeaders?.length || 0,
                        hasCanvasHeaders: !!board.canvasHeaders
                    });
                    return this.deserializeBoardFromFirebase(board);
                });
                AppState.set('boards', boards);
                AppState.set('currentBoardId', boards[0].id);
                
                // Apply the first board to UI
                Debug.sync.step('Applying board to UI');
                this.applyDataToUI(boards[0]);
                
                // Store as last known good state AFTER successful load
                this.storeLastKnownGoodState();
                
                Debug.sync.done('Initial boards loaded and rendered');
            }
        } catch (error) {
            Debug.sync.stepError('Error loading initial boards', error);
        } finally {
            this.isLoadingInitialBoard = false;
        }
    },
    
    // Apply loaded data to the UI
    applyDataToUI(board) {
        Debug.sync.step('Starting UI update');
        Debug.sync.detail('Board', { name: board.name });
        
        // Mark as loading from Firebase to prevent saves during UI update
        this.isLoadingFromFirebase = true;
        
        try {
            // Ensure canvas exists
            let canvas = document.getElementById('canvas');
            if (!canvas) {
                const grid = document.getElementById('grid');
                if (grid) {
                    canvas = document.createElement('div');
                    canvas.id = 'canvas';
                    canvas.style.position = 'relative';
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    grid.appendChild(canvas);
                }
            }
            
            // Store board data before clearing
            const boardFolders = board.folders || [];
            const boardHeaders = board.canvasHeaders || [];
            const boardDrawingPaths = board.drawingPaths || [];
            
            // Clear content and state
            if (window.clearGridAndState) {
                window.clearGridAndState();
            } else {
                // Fallback
                if (canvas) canvas.innerHTML = '';
                AppState.set('folders', []);
            }
            
            // Restore board data to AppState after clearing
            const boards = AppState.get('boards');
            const currentBoard = boards.find(b => b.id === board.id);
            if (currentBoard) {
                currentBoard.folders = boardFolders;
                currentBoard.canvasHeaders = boardHeaders;
                currentBoard.drawingPaths = boardDrawingPaths;
                AppState.set('boards', boards);
            }
            
            // Load canvas headers FIRST to ensure they're in AppState before folders trigger saves
            if (boardHeaders.length > 0) {
                Debug.sync.step(`Loading ${boardHeaders.length} canvas headers`);
                Debug.sync.detail('Header data', boardHeaders);
                
                // Add headers to board state immediately WITHOUT losing folders
                const boards = AppState.get('boards');
                const currentBoard = boards.find(b => b.id === board.id);
                if (currentBoard) {
                    // Preserve existing data and only update headers
                    currentBoard.canvasHeaders = boardHeaders;
                    // Make sure folders are preserved from the stored variable
                    currentBoard.folders = boardFolders;
                    currentBoard.drawingPaths = boardDrawingPaths;
                    AppState.set('boards', boards);
                }
                
                // Create headers synchronously if function is available
                if (typeof addCanvasHeader === 'function' || window.addCanvasHeader) {
                    boardHeaders.forEach(headerData => {
                        this.createCanvasHeaderFromData(headerData);
                    });
                } else {
                    // Wait for function if not available
                    const waitForFunction = (callback, maxAttempts = 50) => {
                        let attempts = 0;
                        const checkAndExecute = () => {
                            if (typeof addCanvasHeader === 'function' || window.addCanvasHeader) {
                                callback();
                            } else if (attempts < maxAttempts) {
                                attempts++;
                                setTimeout(checkAndExecute, 100);
                            } else {
                                Debug.sync.stepError('addCanvasHeader function not available after timeout');
                            }
                        };
                        checkAndExecute();
                    };
                    
                    waitForFunction(() => {
                        boardHeaders.forEach(headerData => {
                            this.createCanvasHeaderFromData(headerData);
                        });
                    });
                }
            } else {
                Debug.sync.step('No canvas headers to load');
            }
            
            // Load folders AFTER headers are in AppState
            if (boardFolders && boardFolders.length > 0) {
                Debug.sync.step(`Loading ${boardFolders.length} folders`);
                Debug.sync.detail('Folder data', boardFolders);
                
                // Add staggered delay when creating multiple folders
                boardFolders.forEach((catData, index) => {
                    setTimeout(() => {
                        this.createFolderFromData(catData, index);
                    }, index * 200); // 200ms delay between each folder
                });
            } else {
                Debug.sync.step('No folders to load');
                Debug.sync.detail('Board folders check', {
                    boardParam: boardFolders,
                    appStateBoard: AppState.get('boards').find(b => b.id === board.id)?.folders
                });
            }
            
            // Load drawing paths AFTER folders and headers
            if (boardDrawingPaths && boardDrawingPaths.length > 0) {
                Debug.sync.step(`Loading ${boardDrawingPaths.length} drawing paths`);
                Debug.sync.detail('Drawing paths data', boardDrawingPaths);
                
                // Set drawing paths if function is available
                if (window.setDrawingPaths && typeof window.setDrawingPaths === 'function') {
                    window.setDrawingPaths(boardDrawingPaths);
                } else {
                    Debug.sync.detail('setDrawingPaths function not available yet');
                }
            } else {
                Debug.sync.step('No drawing paths to load');
            }
            
            // Update UI elements
            this.updateUIElements(board);
            
            // Update dropdown - delay to prevent board reload issues
            setTimeout(() => {
                if (typeof updateBoardDropdown === 'function') {
                    // Save current board ID to prevent accidental reload
                    const currentId = AppState.get('currentBoardId');
                    updateBoardDropdown();
                    // Ensure board ID hasn't changed
                    AppState.set('currentBoardId', currentId);
                    Debug.sync.detail('Board dropdown updated');
                }
            }, 200);
            
            Debug.sync.done('UI update completed');
            
        } catch (error) {
            Debug.sync.stepError('Error applying data to UI', error);
        } finally {
            // Re-enable saves after UI update
            this.isLoadingFromFirebase = false;
        }
    },
    
    // Create folder from Firebase data
    createFolderFromData(catData, index) {
        try {
            let catIndex;
            
            if (typeof createFolder === 'function') {
                catIndex = createFolder(
                    catData.title,
                    parseInt(catData.position.left) || (100 + index * 220),
                    parseInt(catData.position.top) || 100
                );
                Debug.sync.detail(`Created folder: "${catData.title}"`);
            } else {
                catIndex = this.createFolderManually(catData, index);
            }
            
            // Add files to the folder with staggered delay
            if (catData.files && catData.files.length > 0) {
                catData.files.forEach((fileData, fileIndex) => {
                    setTimeout(() => {
                        this.addFileToFolder(catIndex, fileData);
                    }, (fileIndex + 1) * 150); // 150ms delay between files
                });
            }
            
        } catch (error) {
            Debug.sync.stepError(`Failed to create folder "${catData.title}"`, error);
        }
    },
    
    // Add file to folder
    addFileToFolder(catIndex, fileData) {
        try {
            if (typeof addFileToFolder === 'function') {
                // Pass bookmarks as 4th parameter and sections as 5th
                console.log('💾 LOAD DEBUG: Loading file with sections', {
                    title: fileData.title,
                    hasSections: !!fileData.sections,
                    sectionsCount: fileData.sections?.length || 0,
                    sectionIds: fileData.sections?.map(s => s.id) || []
                });
                
                const file = addFileToFolder(catIndex, fileData.title, fileData.content, fileData.bookmarks, fileData.sections);
                Debug.sync.detail(`Added file: "${fileData.title}" with ${fileData.bookmarks?.length || 0} bookmarks and ${fileData.sections?.length || 0} sections`);
                
                if (fileData.sections?.length > 0) {
                    console.log('💾 LOAD DEBUG: File loaded with sections:', {
                        fileTitle: fileData.title,
                        sectionsLoaded: fileData.sections.length
                    });
                }
            } else {
                Debug.sync.detail('addFileToFolder function not available');
            }
        } catch (error) {
            Debug.sync.stepError(`Failed to add file "${fileData.title}"`, error);
        }
    },
    
    // Manual folder creation (fallback)
    createFolderManually(catData, index) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return -1;
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.style.position = 'absolute';
        folderDiv.style.left = catData.position.left || (100 + index * 220) + 'px';
        folderDiv.style.top = catData.position.top || '100px';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'folder-title';
        titleDiv.textContent = catData.title;
        
        const filesGrid = document.createElement('div');
        filesGrid.className = 'files-grid';
        
        folderDiv.appendChild(titleDiv);
        folderDiv.appendChild(filesGrid);
        canvas.appendChild(folderDiv);
        
        Debug.sync.detail(`Manually created folder: "${catData.title}"`);
        return index;
    },
    
    // Create canvas header from data
    createCanvasHeaderFromData(headerData) {
        try {
            if (typeof addCanvasHeader === 'function') {
                // Parse position - remove 'px' and convert to number
                const left = parseInt(headerData.position.left);
                const top = parseInt(headerData.position.top);
                
                Debug.sync.detail(`Creating header at position`, { 
                    left: headerData.position.left + ' -> ' + left,
                    top: headerData.position.top + ' -> ' + top
                });
                
                addCanvasHeader(left || 100, top || 50);
                
                // Find the newly created header and update its text
                const canvas = document.getElementById('canvas');
                if (canvas) {
                    const headers = canvas.querySelectorAll('.canvas-header');
                    const lastHeader = headers[headers.length - 1];
                    if (lastHeader) {
                        lastHeader.textContent = headerData.text;
                        lastHeader.dataset.headerId = headerData.id;
                    }
                }
                Debug.sync.detail(`Created canvas header: "${headerData.text}"`);
            } else {
                Debug.sync.detail('addCanvasHeader function not available');
            }
        } catch (error) {
            Debug.sync.stepError('Failed to create canvas header', error);
        }
    },
    
    // Update UI elements
    updateUIElements(board) {
        const boardNameEl = document.getElementById('boardName');
        if (boardNameEl) {
            boardNameEl.textContent = board.name;
        }
        
        const selectorText = document.querySelector('.board-selector-text');
        if (selectorText) {
            selectorText.textContent = board.name;
        }
        
        Debug.sync.detail(`Updated UI elements for board: "${board.name}"`);
    },
    
    // Manual save function for expanded files
    async manualSave() {
        console.log('[SYNC DEBUG] Manual save triggered by user');
        Debug.sync.step('Manual save triggered');
        this.pendingChanges = true;
        this.isManualSave = true; // Set flag for manual save
        // Bypass idle check for manual saves
        const originalActivity = this.lastActivity;
        this.lastActivity = 0; // Force idle state
        await this.saveCurrentBoard();
        this.lastActivity = originalActivity;
    },
    
    // Save current board state to Firebase
    async saveCurrentBoard() {
        const user = authService.getCurrentUser();
        
        // Don't save if no user, already saving, or actively dragging/editing
        if (!user || this.isSaving || this.isDragging || this.isEditing) {
            console.log('[SYNC DEBUG] Skipping save:', { 
                reason: !user ? 'No user' : this.isSaving ? 'Already saving' : 
                        this.isDragging ? 'Currently dragging' : 'Currently editing',
                timestamp: new Date().toISOString()
            });
            Debug.sync.detail('Skipping save', { 
                reason: !user ? 'No user' : this.isSaving ? 'Already saving' : 
                        this.isDragging ? 'Currently dragging' : 'Currently editing'
            });
            return;
        }
        
        console.log('[SYNC DEBUG] Starting save process:', {
            userId: user.isAnonymous ? 'Guest: ' + user.uid.slice(-6).toUpperCase() : user.email,
            isManualSave: this.isManualSave,
            isAutoSave: this.isAutoSave,
            isDragging: this.isDragging,
            isEditing: this.isEditing,
            timestamp: new Date().toISOString()
        });
        
        Debug.sync.detail('User saving', { user: user.isAnonymous ? 'Guest: ' + user.uid.slice(-6).toUpperCase() : user.email });
        
        // Don't save if user is actively editing (skip check for manual/auto saves)
        if (!this.isManualSave && !this.isAutoSave && !this.isUserIdle()) {
            console.log('[SYNC DEBUG] User is actively editing, postponing save');
            Debug.sync.detail('User is actively editing, postponing save');
            return;
        }
        
        this.isSaving = true;
        console.log('[SYNC DEBUG] Save process started');
        Debug.sync.step('Saving current board to Firebase');
        
        try {
            // Make sure to capture current state
            if (typeof saveCurrentBoard === 'function') {
                await saveCurrentBoard();
            }
            
            const boards = AppState.get('boards');
            const currentBoardId = AppState.get('currentBoardId');
            let board = boards.find(b => b.id === currentBoardId);
            
            Debug.sync.detail('Board data before save', {
                boardId: board?.id,
                boardName: board?.name,
                foldersCount: board?.folders?.length || 0,
                canvasHeadersCount: board?.canvasHeaders?.length || 0
            });
            
            if (board) {
                // Check if board is empty to prevent data loss
                const hasFolders = board.folders && board.folders.length > 0;
                const hasHeaders = board.canvasHeaders && board.canvasHeaders.length > 0;
                const hasDrawings = board.drawingPaths && board.drawingPaths.length > 0;
                
                // Check if board has bookmarks even if folders appear empty
                let totalBookmarks = 0;
                if (board.folders) {
                    board.folders.forEach(cat => {
                        if (cat.files) {
                            cat.files.forEach(file => {
                                if (file.bookmarks && Array.isArray(file.bookmarks)) {
                                    totalBookmarks += file.bookmarks.length;
                                }
                            });
                        }
                    });
                }
                
                if (!hasFolders && !hasHeaders && !hasDrawings) {
                    console.log('[SYNC DEBUG] Skipping save - board is empty:', {
                        folders: board.folders?.length || 0,
                        headers: board.canvasHeaders?.length || 0,
                        drawings: board.drawingPaths?.length || 0,
                        bookmarks: totalBookmarks
                    });
                    Debug.sync.step('Skipping save - board is empty');
                    Debug.sync.detail('Empty board check', {
                        folders: board.folders?.length || 0,
                        headers: board.canvasHeaders?.length || 0,
                        drawings: board.drawingPaths?.length || 0,
                        bookmarks: totalBookmarks
                    });
                    
                    // If we had bookmarks in last known good state, restore it
                    if (this.lastKnownGoodState) {
                        const lastGood = JSON.parse(this.lastKnownGoodState);
                        const lastBoard = lastGood.find(b => b.id === currentBoardId);
                        if (lastBoard && this.countBookmarks(lastBoard) > 0) {
                            Debug.sync.stepError('Preventing loss of bookmarks - restoring last known good state');
                            AppState.set('boards', lastGood);
                            return;
                        }
                    }
                    
                    this.pendingChanges = false;
                    updateSaveStatus('saved'); // Still show as saved to avoid confusion
                    return;
                }
                
                updateSaveStatus('saving');
                
                // Add timestamp
                board.lastModified = Date.now();
                
                // Clean up bookmark data before serialization
                board = await this.cleanBookmarkData(board);
                
                // Check if board data is too large
                if (this.isBoardDataTooLarge(board)) {
                    console.error('[SYNC ERROR] Board data too large for Firestore - skipping save');
                    Debug.sync.stepError('Board data too large for Firestore - skipping save');
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showError('Board data too large - please remove some content');
                    }
                    updateSaveStatus('error');
                    return;
                }
                
                // Serialize board data for Firebase
                const serializedBoard = this.serializeBoardForFirebase(board);
                Debug.sync.detail('Serialized board preview', {
                    id: serializedBoard.id,
                    name: serializedBoard.name,
                    lastModified: new Date(serializedBoard.lastModified).toLocaleString()
                });
                
                const result = await dbService.saveBoard(serializedBoard);
                
                console.log('[SYNC DEBUG] Save result:', {
                    success: result.success,
                    skipped: result.skipped,
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
                
                if (result.success) {
                    if (result.skipped) {
                        console.log('[SYNC DEBUG] Save skipped - board is empty');
                        Debug.sync.step('Save skipped - board is empty');
                        updateSaveStatus('saved');
                    } else {
                        console.log('[SYNC DEBUG] Board saved successfully:', board.name);
                        Debug.sync.step(`Board "${board.name}" saved to Firebase`);
                        updateSaveStatus('saved');
                    }
                    this.pendingChanges = false;
                    
                    // Prevent immediate re-sync after successful save
                    this.lastSyncTime = Date.now();
                    
                    // Show notification for manual saves and auto saves
                    if (this.isManualSave || this.isAutoSave) {
                        if (window.simpleNotifications) {
                            window.simpleNotifications.showSaveNotification('saved');
                        }
                        this.isManualSave = false;
                        this.isAutoSave = false;
                    } else {
                        // Also show for event-based saves
                        if (window.simpleNotifications) {
                            window.simpleNotifications.showSaveNotification('saved');
                        }
                    }
                } else {
                    // Enhanced error logging with more details
                    console.error('[SYNC ERROR] Failed to save board:', {
                        error: result.error,
                        boardId: board.id,
                        boardName: board.name,
                        timestamp: new Date().toISOString(),
                        hasFolders: board.folders?.length > 0,
                        hasHeaders: board.canvasHeaders?.length > 0,
                        hasDrawings: board.drawingPaths?.length > 0,
                        totalBookmarks: this.countBookmarks(board)
                    });
                    
                    // Enhanced error logging with more details
                    Debug.sync.stepError('Failed to save board', {
                        error: result.error,
                        boardId: board.id,
                        boardName: board.name,
                        timestamp: new Date().toISOString(),
                        hasFolders: board.folders?.length > 0,
                        hasHeaders: board.canvasHeaders?.length > 0,
                        hasDrawings: board.drawingPaths?.length > 0,
                        totalBookmarks: this.countBookmarks(board)
                    });
                    
                    // Show user-friendly error message
                    if (window.simpleNotifications) {
                        let errorMessage = 'Failed to save to cloud';
                        if (result.error?.includes('permission-denied') || result.error?.includes('unauthenticated')) {
                            errorMessage = 'Authentication error - please sign in again';
                        } else if (result.error?.includes('network')) {
                            errorMessage = 'Network error - please check your connection';
                        } else if (result.error?.includes('invalid-argument') || result.error?.includes('failed-precondition')) {
                            errorMessage = 'Data validation error - some content may be too large';
                        }
                        console.log('[SYNC DEBUG] Showing error notification:', errorMessage);
                        window.simpleNotifications.showError(errorMessage);
                    }
                    
                    updateSaveStatus('error');
                }
            } else {
                Debug.sync.stepError('No board found to save');
            }
        } catch (error) {
            console.error('[SYNC ERROR] Exception during save:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            Debug.sync.stepError('Error saving board', error);
            updateSaveStatus('error');
        } finally {
            this.isSaving = false;
            console.log('[SYNC DEBUG] Save process completed');
        }
    },
    
    // Save all boards to Firebase
    async saveAllBoards() {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        Debug.sync.step('Saving all boards to Firebase');
        
        const boards = AppState.get('boards');
        for (const board of boards) {
            board.lastModified = Date.now();
            const serializedBoard = this.serializeBoardForFirebase(board);
            await dbService.saveBoard(serializedBoard);
        }
        Debug.sync.done('All boards saved to Firebase');
    },
    
    // Serialize board data for Firebase storage
    serializeBoardForFirebase(board) {
        const serialized = { ...board };
        
        // Add dev mode status
        serialized.isDevMode = AppState.get('isDevMode');
        
        // Serialize folders with their files
        if (serialized.folders) {
            serialized.folders = serialized.folders.map(folder => {
                const catCopy = { ...folder };
                // Serialize file content (Quill Delta objects)
                if (catCopy.files) {
                    catCopy.files = catCopy.files.map(file => {
                        const fileCopy = { ...file };
                        // Convert Delta object to JSON string
                        if (fileCopy.content && typeof fileCopy.content === 'object') {
                            try {
                                fileCopy.content = JSON.stringify(fileCopy.content);
                            } catch (e) {
                                Debug.sync.stepError('Error serializing file content', e);
                                fileCopy.content = '{}';
                            }
                        }
                        // Ensure bookmarks are preserved
                        if (!fileCopy.bookmarks) {
                            fileCopy.bookmarks = [];
                        }
                        
                        // Ensure sections are preserved
                        if (!fileCopy.sections) {
                            fileCopy.sections = [];
                        }
                        return fileCopy;
                    });
                }
                return catCopy;
            });
        }
        
        // Serialize drawingPaths to avoid nested arrays
        if (serialized.drawingPaths && Array.isArray(serialized.drawingPaths)) {
            // Convert nested arrays to an object with numbered keys
            serialized.drawingPaths = {
                paths: serialized.drawingPaths.map(path => {
                    // Each path is an array of points - stringify it
                    return JSON.stringify(path);
                })
            };
        }
        
        return serialized;
    },
    
    // Deserialize board data from Firebase
    deserializeBoardFromFirebase(board) {
        Debug.sync.detail('Deserializing board', {
            foldersBeforeDeser: board.folders?.length || 0,
            headersBeforeDeser: board.canvasHeaders?.length || 0
        });
        
        const deserialized = { ...board };
        
        // Restore dev mode if present
        if (deserialized.isDevMode !== undefined) {
            AppState.set('isDevMode', deserialized.isDevMode);
            // Update UI
            if (deserialized.isDevMode && window.toggleDevOverlay) {
                window.toggleDevOverlay(true);
            }
        }
        
        // Deserialize folders with their files
        if (deserialized.folders) {
            deserialized.folders = deserialized.folders.map(folder => {
                const catCopy = { ...folder };
                // Deserialize file content (Quill Delta objects)
                if (catCopy.files) {
                    catCopy.files = catCopy.files.map(file => {
                        const fileCopy = { ...file };
                        // Parse JSON string back to Delta object
                        if (fileCopy.content && typeof fileCopy.content === 'string') {
                            try {
                                fileCopy.content = JSON.parse(fileCopy.content);
                            } catch (e) {
                                Debug.sync.stepError('Error parsing file content', e);
                                fileCopy.content = { ops: [] };
                            }
                        }
                        return fileCopy;
                    });
                }
                return catCopy;
            });
        }
        
        // Deserialize drawingPaths if present
        if (deserialized.drawingPaths && typeof deserialized.drawingPaths === 'object' && deserialized.drawingPaths.paths) {
            // Convert back from object format to nested arrays
            deserialized.drawingPaths = deserialized.drawingPaths.paths.map(pathStr => {
                try {
                    return JSON.parse(pathStr);
                } catch (e) {
                    Debug.sync.stepError('Error parsing drawing path', e);
                    return [];
                }
            });
        }
        
        // MISSING: Deserialize canvasHeaders - just pass them through as-is
        // Headers don't need special deserialization like files do
        
        Debug.sync.detail('Deserialized board result', {
            foldersAfterDeser: deserialized.folders?.length || 0,
            headersAfterDeser: deserialized.canvasHeaders?.length || 0
        });
        
        return deserialized;
    },
    
    // Mark that there are pending changes
    markPendingChanges() {
        // Clear existing debounce
        if (this.markPendingDebounce) {
            clearTimeout(this.markPendingDebounce);
        }
        
        // Debounce changes for 1 second
        this.markPendingDebounce = setTimeout(() => {
            this.pendingChanges = true;
            updateSaveStatus('unsaved');
        }, 1000);
    },
    
    // Event-based save with debouncing for rapid actions
    async saveAfterAction(actionName = 'unknown') {
        console.log('[SYNC DEBUG] Event-based save triggered:', {
            action: actionName,
            timestamp: new Date().toISOString(),
            pendingChanges: this.pendingChanges,
            isSaving: this.isSaving,
            queueLength: this.saveQueue.length
        });
        
        Debug.sync.step(`Event-based save triggered after: ${actionName}`);
        
        // Store the action name
        this.pendingSaveAction = actionName;
        
        // Clear existing debounce timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Debounce saves by 300ms to batch rapid actions
        this.saveDebounceTimer = setTimeout(() => {
            console.log('[SYNC DEBUG] Executing debounced save:', {
                action: actionName,
                timestamp: new Date().toISOString()
            });
            
            // Queue the save instead of executing directly
            const saveTask = async () => {
                console.log('[SYNC DEBUG] Processing save from queue:', {
                    action: actionName,
                    timestamp: new Date().toISOString()
                });
                
                // Validate board state before saving
                if (!this.validateBoardState()) {
                    console.error('[SYNC ERROR] Board validation failed - skipping save');
                    Debug.sync.stepError('Board validation failed - skipping save');
                    return;
                }
                
                // Store current state as last known good before saving
                this.storeLastKnownGoodState();
                
                // Execute save
                await this.executeSave(this.pendingSaveAction);
            };
            
            // Add to queue
            this.saveQueue.push(saveTask);
            console.log(`[SYNC DEBUG] Save queued for: ${actionName} (${this.saveQueue.length} in queue)`);
            Debug.sync.detail(`Save queued for: ${actionName} (${this.saveQueue.length} in queue)`);
        }, 300);
    },
    
    // Validate board state before saving
    validateBoardState() {
        console.log('[SYNC DEBUG] Validating board state before save');
        
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards?.find(b => b.id === currentBoardId);
        
        if (!board) {
            console.error('[SYNC ERROR] No board found for validation');
            Debug.sync.stepError('No board found for validation');
            return false;
        }
        
        // Check if we're about to save empty data over existing content
        if (this.lastKnownGoodState) {
            const lastGood = JSON.parse(this.lastKnownGoodState);
            const lastBoard = lastGood.find(b => b.id === currentBoardId);
            
            if (lastBoard) {
                const lastBookmarkCount = this.countBookmarks(lastBoard);
                const currentBookmarkCount = this.countBookmarks(board);
                
                // Prevent saving if we're losing bookmarks
                if (lastBookmarkCount > 0 && currentBookmarkCount === 0) {
                    Debug.sync.stepError(`Preventing bookmark data loss: had ${lastBookmarkCount}, now ${currentBookmarkCount}`);
                    return false;
                }
            }
        }
        
        // Validate bookmark data structure
        if (board.folders) {
            for (const folder of board.folders) {
                if (folder.files) {
                    for (const file of folder.files) {
                        if (file.bookmarks && Array.isArray(file.bookmarks)) {
                            for (const bookmark of file.bookmarks) {
                                // Check for required bookmark fields
                                if (!bookmark.title || !bookmark.url) {
                                    console.error('[SYNC ERROR] Invalid bookmark structure - missing title or url:', bookmark);
                                    Debug.sync.stepError('Invalid bookmark structure - missing title or url', bookmark);
                                    return false;
                                }
                                
                                // Check for excessively large data
                                const bookmarkSize = JSON.stringify(bookmark).length;
                                if (bookmarkSize > 1000000) { // 1MB limit per bookmark
                                    console.error('[SYNC ERROR] Bookmark too large:', {
                                        title: bookmark.title,
                                        url: bookmark.url,
                                        size: bookmarkSize
                                    });
                                    Debug.sync.stepError(`Bookmark too large: ${bookmarkSize} bytes`, {
                                        title: bookmark.title,
                                        url: bookmark.url
                                    });
                                    // Try to compress the bookmark again as a last resort
                                    if (bookmark.screenshot) {
                                        console.log('[SYNC DEBUG] Attempting last-resort compression of large bookmark');
                                        // This will be handled by cleanBookmarkData before saving
                                    } else {
                                        return false;
                                    }
                                }
                                
                                // Check for valid URL format
                                try {
                                    new URL(bookmark.url);
                                } catch (e) {
                                    console.error('[SYNC ERROR] Invalid bookmark URL format:', {
                                        url: bookmark.url,
                                        error: e.message
                                    });
                                    Debug.sync.stepError('Invalid bookmark URL format', {
                                        url: bookmark.url,
                                        error: e.message
                                    });
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log('[SYNC DEBUG] Board validation passed');
        return true;
    },
    
    // Enhanced check if board data is too large for Firestore with detailed analysis
    isBoardDataTooLarge(board) {
        // Firestore has a 1MB limit per document
        const MAX_SIZE = 900000; // 900KB to be safe
        
        try {
            const serialized = JSON.stringify(board);
            const size = serialized.length;
            
            if (size > MAX_SIZE) {
                // Analyze what's causing the size issue
                const analysis = this.analyzeBoardSize(board);
                console.error('[SYNC ERROR] Board data too large for Firestore:', {
                    totalSize: size,
                    limit: MAX_SIZE,
                    excess: size - MAX_SIZE,
                    analysis: analysis,
                    timestamp: new Date().toISOString()
                });
                
                // Provide specific recommendations
                let recommendations = [];
                if (analysis.largestBookmarkSize > 100000) {
                    recommendations.push('Large bookmark images/screenshots detected');
                }
                if (analysis.totalBookmarks > 50) {
                    recommendations.push('Too many bookmarks - consider splitting into multiple files');
                }
                if (analysis.largeDescriptions > 10) {
                    recommendations.push('Long descriptions detected');
                }
                if (analysis.totalFiles > 20) {
                    recommendations.push('Too many files - consider splitting into multiple folders');
                }
                
                if (recommendations.length > 0) {
                    console.error('[SYNC ERROR] Recommendations:', recommendations);
                }
                
                Debug.sync.stepError(`Board data too large: ${size} bytes (limit: ${MAX_SIZE})`);
                return true;
            }
            
            Debug.sync.detail(`Board data size: ${size} bytes`);
            return false;
        } catch (error) {
            Debug.sync.stepError('Error checking board data size', error);
            return true; // Assume too large if we can't check
        }
    },
    
    // Analyze board size to identify what's causing bloat
    analyzeBoardSize(board) {
        const analysis = {
            totalBookmarks: 0,
            totalFiles: 0,
            totalFolders: 0,
            largestBookmarkSize: 0,
            largestBookmarkTitle: '',
            largeDescriptions: 0,
            largeImages: 0,
            sizeByFolder: {},
            bookmarkSizes: []
        };
        
        if (board.folders) {
            analysis.totalFolders = board.folders.length;
            
            board.folders.forEach(folder => {
                let folderSize = 0;
                
                if (folder.files) {
                    analysis.totalFiles += folder.files.length;
                    
                    folder.files.forEach(file => {
                        if (file.bookmarks && Array.isArray(file.bookmarks)) {
                            file.bookmarks.forEach(bookmark => {
                                analysis.totalBookmarks++;
                                
                                const bookmarkSize = JSON.stringify(bookmark).length;
                                analysis.bookmarkSizes.push(bookmarkSize);
                                folderSize += bookmarkSize;
                                
                                if (bookmarkSize > analysis.largestBookmarkSize) {
                                    analysis.largestBookmarkSize = bookmarkSize;
                                    analysis.largestBookmarkTitle = bookmark.title || 'Untitled';
                                }
                                
                                if (bookmark.description && bookmark.description.length > 1000) {
                                    analysis.largeDescriptions++;
                                }
                                
                                if ((bookmark.screenshot && bookmark.screenshot.length > 50000) || 
                                    (bookmark.image && bookmark.image.length > 50000)) {
                                    analysis.largeImages++;
                                }
                            });
                        }
                    });
                }
                
                analysis.sizeByFolder[folder.title || 'Untitled'] = folderSize;
            });
        }
        
        return analysis;
    },
    
    // Enhanced compression and cleanup for bookmark data before saving
    async cleanBookmarkData(board) {
        if (!board.folders) return board;
        
        let cleaned = false;
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;
        
        // Calculate initial size
        try {
            totalSizeBefore = JSON.stringify(board).length;
        } catch (e) {
            console.error('[SYNC ERROR] Could not calculate initial board size:', e);
        }
        
        for (const folder of board.folders) {
            if (folder.files) {
                for (const file of folder.files) {
                    if (file.bookmarks && Array.isArray(file.bookmarks)) {
                        // Filter out invalid bookmarks
                        const validBookmarks = file.bookmarks.filter(bookmark => {
                            // Check required fields
                            if (!bookmark.title || !bookmark.url) {
                                Debug.sync.detail('Filtering out invalid bookmark - missing title or url');
                                cleaned = true;
                                return false;
                            }
                            
                            return true;
                        });
                        
                        if (validBookmarks.length !== file.bookmarks.length) {
                            file.bookmarks = validBookmarks;
                            cleaned = true;
                        }
                        
                        // 6. Limit number of bookmarks per file to prevent bloat
                        if (file.bookmarks.length > 20) { // Max 20 bookmarks per file
                            Debug.sync.detail(`Limiting bookmarks per file from ${file.bookmarks.length} to 20`);
                            file.bookmarks = file.bookmarks.slice(0, 20);
                            cleaned = true;
                        }
                    }
                }
            }
        }
        
        // Process async compression for all bookmarks
        for (const folder of board.folders) {
            if (folder.files) {
                for (const file of folder.files) {
                    if (file.bookmarks && Array.isArray(file.bookmarks)) {
                        for (const bookmark of file.bookmarks) {
                            // 1. Compress screenshots - reduce to 100KB max
                            if (bookmark.screenshot && bookmark.screenshot.length > 100000) { // 100KB limit
                                Debug.sync.detail('Compressing screenshot data');
                                bookmark.screenshot = await this.compressImageData(bookmark.screenshot, 100);
                                cleaned = true;
                            }
                            
                            // 2. Compress images - reduce to 50KB max
                            if (bookmark.image && bookmark.image.length > 50000) { // 50KB limit
                                Debug.sync.detail('Compressing image data');
                                bookmark.image = await this.compressImageData(bookmark.image, 50);
                                cleaned = true;
                            }
                            
                            // 3. Compress description - reduce to 1KB max
                            if (bookmark.description && bookmark.description.length > 1000) { // 1K limit
                                Debug.sync.detail('Compressing description');
                                bookmark.description = this.compressText(bookmark.description, 1000);
                                cleaned = true;
                            }
                            
                            // 4. Compress title - reduce to 100 chars max
                            if (bookmark.title && bookmark.title.length > 100) { // 100 char limit
                                Debug.sync.detail('Compressing title');
                                bookmark.title = this.compressText(bookmark.title, 100);
                                cleaned = true;
                            }
                            
                            // 5. Clean up unnecessary fields
                            const unnecessaryFields = ['favicon', 'timestamp', 'domain', 'excerpt', 'author', 'tags'];
                            for (const field of unnecessaryFields) {
                                if (bookmark[field] !== undefined) {
                                    delete bookmark[field];
                                    cleaned = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Calculate final size
        try {
            totalSizeAfter = JSON.stringify(board).length;
            console.log('[SYNC DEBUG] Compression results:', {
                sizeBefore: totalSizeBefore,
                sizeAfter: totalSizeAfter,
                reduction: totalSizeBefore - totalSizeAfter,
                percentReduction: ((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(2) + '%'
            });
        } catch (e) {
            console.error('[SYNC ERROR] Could not calculate final board size:', e);
        }
        
        if (cleaned) {
            Debug.sync.step('Enhanced compression applied to bookmark data');
        }
        
        return board;
    },
    
    // Compress image data using CompressorJS
    async compressImageData(imageData, maxSizeKB = 50) {
        return new Promise((resolve) => {
            if (!imageData || !imageData.startsWith('data:image/')) {
                resolve(imageData);
                return;
            }
            
            const originalSize = Math.round(imageData.length / 1024); // KB
            const originalSizeBytes = imageData.length;
            
            // Convert data URL to Blob
            fetch(imageData)
                .then(res => res.blob())
                .then(blob => {
                    // Primary compression: 15% quality with 92% JPEG quality setting, max dimensions 800x600
                    new Compressor(blob, {
                        quality: 0.15, // 15% quality
                        maxWidth: 800,
                        maxHeight: 600,
                        mimeType: 'image/jpeg',
                        convertSize: 0, // Always convert to JPEG
                        success(result) {
                            // Convert compressed blob back to data URL
                            const reader = new FileReader();
                            reader.onload = async () => {
                                const compressedData = reader.result;
                                const compressedSize = Math.round(compressedData.length / 1024);
                                const compressedSizeBytes = compressedData.length;
                                const reduction = originalSize - compressedSize;
                                const percentReduction = ((reduction / originalSize) * 100).toFixed(1);
                                
                                console.log(`[COMPRESSION] Primary: ${originalSize}KB → ${compressedSize}KB (${percentReduction}% reduction)`);
                                
                                // Check if compressed image is under 1MB (1,048,576 bytes)
                                if (compressedSizeBytes <= 1048576) {
                                    console.log(`[COMPRESSION] Image under 1MB, using primary compression`);
                                    resolve(compressedData);
                                } else {
                                    console.log(`[COMPRESSION] Image still over 1MB (${compressedSizeBytes} bytes), applying aggressive fallback`);
                                    // Single aggressive fallback: 10% quality with 80% JPEG quality, max dimensions 600x450
                                    new Compressor(blob, {
                                        quality: 0.10, // 10% quality
                                        maxWidth: 600,
                                        maxHeight: 450,
                                        mimeType: 'image/jpeg',
                                        convertSize: 0, // Always convert to JPEG
                                        success(fallbackResult) {
                                            // Convert fallback compressed blob back to data URL
                                            const fallbackReader = new FileReader();
                                            fallbackReader.onload = () => {
                                                const fallbackData = fallbackReader.result;
                                                const fallbackSize = Math.round(fallbackData.length / 1024);
                                                const fallbackSizeBytes = fallbackData.length;
                                                const fallbackReduction = originalSize - fallbackSize;
                                                const fallbackPercentReduction = ((fallbackReduction / originalSize) * 100).toFixed(1);
                                                
                                                console.log(`[COMPRESSION] Fallback: ${originalSize}KB → ${fallbackSize}KB (${fallbackPercentReduction}% reduction)`);
                                                
                                                // Final check to ensure we're under 1MB
                                                if (fallbackSizeBytes <= 1048576) {
                                                    console.log(`[COMPRESSION] Fallback compression successful, final size: ${fallbackSizeBytes} bytes`);
                                                    resolve(fallbackData);
                                                } else {
                                                    console.warn(`[COMPRESSION] Even fallback compression failed, image still over 1MB (${fallbackSizeBytes} bytes)`);
                                                    // If still over 1MB, remove image entirely
                                                    resolve(null);
                                                }
                                            };
                                            fallbackReader.readAsDataURL(fallbackResult);
                                        },
                                        error(fallbackErr) {
                                            console.warn('[COMPRESSION] Fallback compression failed:', fallbackErr);
                                            // If fallback fails, remove image entirely
                                            resolve(null);
                                        },
                                    });
                                }
                            };
                            reader.readAsDataURL(result);
                        },
                        error(err) {
                            console.warn('[COMPRESSION] Primary compression failed:', err);
                            // If primary compression fails, try fallback
                            new Compressor(blob, {
                                quality: 0.10, // 10% quality
                                maxWidth: 600,
                                maxHeight: 450,
                                mimeType: 'image/jpeg',
                                convertSize: 0, // Always convert to JPEG
                                success(fallbackResult) {
                                    // Convert fallback compressed blob back to data URL
                                    const fallbackReader = new FileReader();
                                    fallbackReader.onload = () => {
                                        const fallbackData = fallbackReader.result;
                                        const fallbackSize = Math.round(fallbackData.length / 1024);
                                        const fallbackSizeBytes = fallbackData.length;
                                        const fallbackReduction = originalSize - fallbackSize;
                                        const fallbackPercentReduction = ((fallbackReduction / originalSize) * 100).toFixed(1);
                                        
                                        console.log(`[COMPRESSION] Fallback (primary failed): ${originalSize}KB → ${fallbackSize}KB (${fallbackPercentReduction}% reduction)`);
                                        
                                        // Final check to ensure we're under 1MB
                                        if (fallbackSizeBytes <= 1048576) {
                                            console.log(`[COMPRESSION] Fallback compression successful, final size: ${fallbackSizeBytes} bytes`);
                                            resolve(fallbackData);
                                        } else {
                                            console.warn(`[COMPRESSION] Even fallback compression failed, image still over 1MB (${fallbackSizeBytes} bytes)`);
                                            // If still over 1MB, remove image entirely
                                            resolve(null);
                                        }
                                    };
                                    fallbackReader.readAsDataURL(fallbackResult);
                                },
                                error(fallbackErr) {
                                    console.warn('[COMPRESSION] Both primary and fallback compression failed:', fallbackErr);
                                    // If both fail, remove image entirely
                                    resolve(null);
                                },
                            });
                        },
                    });
                })
                .catch(() => resolve(imageData)); // Fallback to original
        });
    },
    
    // Compress text by truncating and cleaning
    compressText(text, maxLength) {
        if (!text || typeof text !== 'string') return text;
        
        // Remove extra whitespace and normalize
        let compressed = text.trim().replace(/\s+/g, ' ');
        
        // Truncate if still too long
        if (compressed.length > maxLength) {
            compressed = compressed.substring(0, maxLength - 3) + '...';
        }
        
        return compressed;
    },
    
    // Count total bookmarks in a board
    countBookmarks(board) {
        let count = 0;
        if (board.folders) {
            board.folders.forEach(cat => {
                if (cat.files) {
                    cat.files.forEach(file => {
                        if (file.bookmarks && Array.isArray(file.bookmarks)) {
                            count += file.bookmarks.length;
                        }
                    });
                }
            });
        }
        return count;
    },
    
    // Store current state as last known good
    storeLastKnownGoodState() {
        const boards = AppState.get('boards');
        if (boards && boards.length > 0) {
            // Only store if state has content
            const hasContent = boards.some(board => 
                (board.folders && board.folders.length > 0) ||
                (board.canvasHeaders && board.canvasHeaders.length > 0)
            );
            
            if (hasContent) {
                this.lastKnownGoodState = JSON.stringify(boards);
                Debug.sync.detail('Stored last known good state');
            }
        }
    },
    
    // Execute the actual save
    async executeSave(actionName) {
        console.log('[SYNC DEBUG] Executing save:', {
            action: actionName,
            timestamp: new Date().toISOString(),
            isSaving: this.isSaving,
            isDragging: this.isDragging,
            isEditing: this.isEditing
        });
        
        // Queue the save instead of skipping if already saving
        if (this.isSaving) {
            console.log('[SYNC DEBUG] Save in progress - queueing for next save');
            Debug.sync.detail('Save in progress - queueing for next save');
            this.pendingChanges = true;
            // Retry after current save completes
            setTimeout(() => {
                if (this.pendingChanges && !this.isSaving) {
                    this.executeSave(actionName + ' (retry)');
                }
            }, 500);
            return;
        }
        
        // Don't save if dragging or editing
        if (this.isDragging || this.isEditing) {
            console.log('[SYNC DEBUG] Save postponed - action in progress');
            Debug.sync.detail('Save postponed - action in progress');
            return;
        }
        
        // Set flag to indicate this is a local change
        if (window.liveSyncService) {
            window.liveSyncService.lastLocalChangeTime = Date.now();
            window.liveSyncService.isLocalChange = true;
        }
        
        // Mark as auto save to show notification
        this.isAutoSave = true;
        this.pendingChanges = true;
        
        // Force immediate save by resetting last activity
        const originalActivity = this.lastActivity;
        this.lastActivity = 0; // Force idle state
        await this.saveCurrentBoard();
        this.lastActivity = originalActivity;
        
        // Clear local change flag after a delay
        if (window.liveSyncService) {
            setTimeout(() => {
                window.liveSyncService.isLocalChange = false;
            }, 2000);
        }
    },
    
    // Auto-save functionality - DISABLED for event-based saving
    startAutoSave() {
        // Disabled - using event-based saving instead
        Debug.sync.step('Auto-save disabled - using event-based saving');
    },
    
    // Load board on demand (when switching boards)
    async loadBoardOnDemand(boardId) {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        Debug.sync.step(`Loading board ${boardId} from Firebase`);
        
        try {
            const result = await dbService.loadBoard(boardId);
            
            if (result.success && result.board) {
                const board = this.deserializeBoardFromFirebase(result.board);
                
                // Update boards in AppState
                const boards = AppState.get('boards');
                const boardIndex = boards.findIndex(b => b.id === boardId);
                
                if (boardIndex !== -1) {
                    boards[boardIndex] = board;
                    AppState.set('boards', boards);
                }
                
                // DO NOT apply to UI - let the board switching handle that
                Debug.sync.done(`Board ${boardId} loaded from Firebase`);
            }
        } catch (error) {
            Debug.sync.stepError('Error loading board', error);
        }
    },
    
    stopAutoSave() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    },
    
    // Clear local data on sign out
    clearLocalData() {
        Debug.sync.step('Clearing local data');
        
        // Reset to initial state
        AppState.set('boards', [{
            id: 0,
            name: 'Board 1',
            folders: [],
            canvasHeaders: []
        }]);
        AppState.set('currentBoardId', 0);
        
        // Clear canvas content
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.innerHTML = '';
        }
        
        // Reload the UI
        setTimeout(() => {
            if (typeof initializeBoard === 'function') {
                initializeBoard();
            }
            if (typeof updateBoardDropdown === 'function') {
                updateBoardDropdown();
            }
        }, 100);
        
        this.pendingChanges = false;
    },
    
    // Delete board from Firebase
    async deleteBoard(boardId) {
        const user = authService.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };
        
        const result = await dbService.deleteBoard(boardId);
        if (result.success) {
            Debug.sync.step(`Board ${boardId} deleted from Firebase`);
        } else {
            Debug.sync.stepError('Failed to delete board', result.error);
        }
        return result;
    }
};

// Add save indicator to UI
export function addSaveIndicator() {
    Debug.sync.detail('addSaveIndicator called');
    // Guest ID is now handled by auth-ui.js authButton
}

// Update guest button display
function updateGuestButton(user) {
    const guestButton = document.getElementById('guestIdButton');
    if (!guestButton) {
        Debug.sync.stepError('Guest ID button not found');
        return;
    }
    
    if (user && user.isAnonymous) {
        const guestId = user.uid.slice(-6).toUpperCase();
        guestButton.textContent = `Guest: ${guestId}`;
        // Override the display style
        guestButton.style.display = 'inline-block';
        guestButton.style.background = 'rgba(255, 255, 255, 0.1)';
        guestButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        guestButton.style.color = '#ddd';
        guestButton.style.padding = '6px 16px';
        guestButton.style.borderRadius = '20px';
        guestButton.style.fontSize = '0.85em';
        guestButton.style.fontWeight = '500';
        guestButton.style.cursor = 'pointer';
        guestButton.style.fontStyle = 'italic';
        guestButton.title = 'Click to sign up or sign in';
        guestButton.onclick = () => {
            if (window.authUI) {
                window.authUI.show();
            }
        };
        Debug.sync.detail('Guest button updated', { guestId });
    } else if (user && !user.isAnonymous) {
        // For authenticated users, show email
        guestButton.textContent = user.email;
        guestButton.style.display = 'inline-block';
        guestButton.style.fontStyle = 'normal'; // Remove italic for real users
        guestButton.style.background = 'rgba(34, 197, 94, 0.1)'; // Green tint for authenticated
        guestButton.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        guestButton.title = 'Signed in';
        guestButton.onclick = null;
        Debug.sync.detail('Guest button updated', { email: user.email });
    } else {
        guestButton.style.display = 'none';
        Debug.sync.detail('Guest button hidden (no user)');
    }
}

// Update save indicator
export function updateSaveStatus(status) {
    // Look for save status in multiple places
    let saveStatus = document.getElementById('saveStatus');
    
    // If not found, try to find save button and update its text
    if (!saveStatus) {
        const saveBtn = document.getElementById('saveWhiteboardBtn');
        if (saveBtn) {
            // Update button text based on status
            switch(status) {
                case 'saving':
                    saveBtn.textContent = 'Saving...';
                    saveBtn.classList.add('saving');
                    break;
                case 'saved':
                    saveBtn.textContent = 'Saved';
                    saveBtn.classList.remove('saving');
                    setTimeout(() => {
                        saveBtn.textContent = 'Save';
                    }, 2000);
                    break;
                case 'unsaved':
                    saveBtn.textContent = 'Save';
                    break;
                case 'error':
                    saveBtn.textContent = 'Save Failed';
                    setTimeout(() => {
                        saveBtn.textContent = 'Save';
                    }, 3000);
                    break;
            }
        }
    } else {
        // Original save status implementation
        switch(status) {
            case 'saving':
                saveStatus.textContent = 'Saving to cloud...';
                saveStatus.className = 'save-status saving';
                saveStatus.style.display = 'inline-block';
                window.setDevInfo?.('saveStatus', 'Saving...');
                break;
            case 'saved':
                saveStatus.textContent = 'Saved to cloud';
                saveStatus.className = 'save-status saved';
                saveStatus.style.display = 'inline-block';
                window.setDevInfo?.('saveStatus', 'Saved');
                setTimeout(() => {
                    saveStatus.style.display = 'none';
                }, 3000);
                break;
            case 'unsaved':
                saveStatus.textContent = 'Unsaved changes';
                saveStatus.className = 'save-status unsaved';
                saveStatus.style.display = 'inline-block';
                window.setDevInfo?.('saveStatus', 'Unsaved');
                break;
            case 'error':
                saveStatus.textContent = 'Error saving';
                saveStatus.className = 'save-status error';
                saveStatus.style.display = 'inline-block';
                window.setDevInfo?.('saveStatus', 'Error');
                break;
        }
    }
}
