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
        Debug.sync.start();
        Debug.sync.step('Initializing sync service');
        
        // Make globally available
        window.syncService = this;
        
        // Listen for auth state changes
        authService.onAuthStateChange((user) => {
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
                this.processQueue();
            }
        }, 500);
    },
    
    async processQueue() {
        if (this.isProcessingQueue || this.saveQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        Debug.sync.step(`Processing save queue (${this.saveQueue.length} items)`);
        
        while (this.saveQueue.length > 0) {
            const saveTask = this.saveQueue.shift();
            try {
                await saveTask();
                // Wait between saves to avoid overwhelming Firebase
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                Debug.sync.stepError('Queue processing error', error);
                // If save fails, restore last known good state
                if (this.lastKnownGoodState) {
                    AppState.set('boards', JSON.parse(this.lastKnownGoodState));
                }
            }
        }
        
        this.isProcessingQueue = false;
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
            categories: localBoard.categories?.length || 0,
            cards: localBoard.categories?.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0) || 0,
            headers: localBoard.canvasHeaders?.length || 0,
            drawingPaths: localBoard.drawingPaths?.length || 0
        };
        
        const firebaseContent = {
            categories: firebaseBoard.categories?.length || 0,
            cards: firebaseBoard.categories?.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0) || 0,
            headers: firebaseBoard.canvasHeaders?.length || 0,
            drawingPaths: firebaseBoard.drawingPaths?.length || 0
        };
        
        const localTotal = localContent.categories + localContent.cards + localContent.headers;
        const firebaseTotal = firebaseContent.categories + firebaseContent.cards + firebaseContent.headers;
        
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
            Debug.sync.step('Initial board load already in progress - skipping duplicate');
            return;
        }
        
        this.isLoadingInitialBoard = true;
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
                        categoriesCount: board.categories?.length || 0,
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
            const boardCategories = board.categories || [];
            const boardHeaders = board.canvasHeaders || [];
            const boardDrawingPaths = board.drawingPaths || [];
            
            // Clear content and state
            if (window.clearGridAndState) {
                window.clearGridAndState();
            } else {
                // Fallback
                if (canvas) canvas.innerHTML = '';
                AppState.set('categories', []);
            }
            
            // Restore board data to AppState after clearing
            const boards = AppState.get('boards');
            const currentBoard = boards.find(b => b.id === board.id);
            if (currentBoard) {
                currentBoard.categories = boardCategories;
                currentBoard.canvasHeaders = boardHeaders;
                currentBoard.drawingPaths = boardDrawingPaths;
                AppState.set('boards', boards);
            }
            
            // Load canvas headers FIRST to ensure they're in AppState before categories trigger saves
            if (boardHeaders.length > 0) {
                Debug.sync.step(`Loading ${boardHeaders.length} canvas headers`);
                Debug.sync.detail('Header data', boardHeaders);
                
                // Add headers to board state immediately WITHOUT losing categories
                const boards = AppState.get('boards');
                const currentBoard = boards.find(b => b.id === board.id);
                if (currentBoard) {
                    // Preserve existing data and only update headers
                    currentBoard.canvasHeaders = boardHeaders;
                    // Make sure categories are preserved from the stored variable
                    currentBoard.categories = boardCategories;
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
            
            // Load categories AFTER headers are in AppState
            if (boardCategories && boardCategories.length > 0) {
                Debug.sync.step(`Loading ${boardCategories.length} categories`);
                Debug.sync.detail('Category data', boardCategories);
                
                // Add staggered delay when creating multiple categories
                boardCategories.forEach((catData, index) => {
                    setTimeout(() => {
                        this.createCategoryFromData(catData, index);
                    }, index * 200); // 200ms delay between each category
                });
            } else {
                Debug.sync.step('No categories to load');
                Debug.sync.detail('Board categories check', {
                    boardParam: boardCategories,
                    appStateBoard: AppState.get('boards').find(b => b.id === board.id)?.categories
                });
            }
            
            // Load drawing paths AFTER categories and headers
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
    
    // Create category from Firebase data
    createCategoryFromData(catData, index) {
        try {
            let catIndex;
            
            if (typeof createCategory === 'function') {
                catIndex = createCategory(
                    catData.title,
                    parseInt(catData.position.left) || (100 + index * 220),
                    parseInt(catData.position.top) || 100
                );
                Debug.sync.detail(`Created category: "${catData.title}"`);
            } else {
                catIndex = this.createCategoryManually(catData, index);
            }
            
            // Add cards to the category with staggered delay
            if (catData.cards && catData.cards.length > 0) {
                catData.cards.forEach((cardData, cardIndex) => {
                    setTimeout(() => {
                        this.addCardToCategory(catIndex, cardData);
                    }, (cardIndex + 1) * 150); // 150ms delay between cards
                });
            }
            
        } catch (error) {
            Debug.sync.stepError(`Failed to create category "${catData.title}"`, error);
        }
    },
    
    // Add card to category
    addCardToCategory(catIndex, cardData) {
        try {
            if (typeof addCardToCategory === 'function') {
                // Pass bookmarks as 4th parameter
                const card = addCardToCategory(catIndex, cardData.title, cardData.content, cardData.bookmarks);
                Debug.sync.detail(`Added card: "${cardData.title}" with ${cardData.bookmarks?.length || 0} bookmarks`);
            } else {
                Debug.sync.detail('addCardToCategory function not available');
            }
        } catch (error) {
            Debug.sync.stepError(`Failed to add card "${cardData.title}"`, error);
        }
    },
    
    // Manual category creation (fallback)
    createCategoryManually(catData, index) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return -1;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.style.position = 'absolute';
        categoryDiv.style.left = catData.position.left || (100 + index * 220) + 'px';
        categoryDiv.style.top = catData.position.top || '100px';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'category-title';
        titleDiv.textContent = catData.title;
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';
        
        categoryDiv.appendChild(titleDiv);
        categoryDiv.appendChild(cardsGrid);
        canvas.appendChild(categoryDiv);
        
        Debug.sync.detail(`Manually created category: "${catData.title}"`);
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
    
    // Manual save function for expanded cards
    async manualSave() {
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
            Debug.sync.detail('Skipping save', { 
                reason: !user ? 'No user' : this.isSaving ? 'Already saving' : 
                        this.isDragging ? 'Currently dragging' : 'Currently editing'
            });
            return;
        }
        
        Debug.sync.detail('User saving', { user: user.isAnonymous ? 'Guest: ' + user.uid.slice(-6).toUpperCase() : user.email });
        
        // Don't save if user is actively editing (skip check for manual/auto saves)
        if (!this.isManualSave && !this.isAutoSave && !this.isUserIdle()) {
            Debug.sync.detail('User is actively editing, postponing save');
            return;
        }
        
        this.isSaving = true;
        Debug.sync.step('Saving current board to Firebase');
        
        try {
            // Make sure to capture current state
            if (typeof saveCurrentBoard === 'function') {
                await saveCurrentBoard();
            }
            
            const boards = AppState.get('boards');
            const currentBoardId = AppState.get('currentBoardId');
            const board = boards.find(b => b.id === currentBoardId);
            
            Debug.sync.detail('Board data before save', {
                boardId: board?.id,
                boardName: board?.name,
                categoriesCount: board?.categories?.length || 0,
                canvasHeadersCount: board?.canvasHeaders?.length || 0
            });
            
            if (board) {
                // Check if board is empty to prevent data loss
                const hasCategories = board.categories && board.categories.length > 0;
                const hasHeaders = board.canvasHeaders && board.canvasHeaders.length > 0;
                const hasDrawings = board.drawingPaths && board.drawingPaths.length > 0;
                
                // Check if board has bookmarks even if categories appear empty
                let totalBookmarks = 0;
                if (board.categories) {
                    board.categories.forEach(cat => {
                        if (cat.cards) {
                            cat.cards.forEach(card => {
                                if (card.bookmarks && Array.isArray(card.bookmarks)) {
                                    totalBookmarks += card.bookmarks.length;
                                }
                            });
                        }
                    });
                }
                
                if (!hasCategories && !hasHeaders && !hasDrawings) {
                    Debug.sync.step('Skipping save - board is empty');
                    Debug.sync.detail('Empty board check', {
                        categories: board.categories?.length || 0,
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
                
                // Serialize board data for Firebase
                const serializedBoard = this.serializeBoardForFirebase(board);
                Debug.sync.detail('Serialized board preview', {
                    id: serializedBoard.id,
                    name: serializedBoard.name,
                    lastModified: new Date(serializedBoard.lastModified).toLocaleString()
                });
                
                const result = await dbService.saveBoard(serializedBoard);
                
                if (result.success) {
                    if (result.skipped) {
                        Debug.sync.step('Save skipped - board is empty');
                        updateSaveStatus('saved');
                    } else {
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
                    Debug.sync.stepError('Failed to save board', result.error);
                    updateSaveStatus('error');
                }
            } else {
                Debug.sync.stepError('No board found to save');
            }
        } catch (error) {
            Debug.sync.stepError('Error saving board', error);
            updateSaveStatus('error');
        } finally {
            this.isSaving = false;
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
        
        // Serialize categories with their cards
        if (serialized.categories) {
            serialized.categories = serialized.categories.map(category => {
                const catCopy = { ...category };
                // Serialize card content (Quill Delta objects)
                if (catCopy.cards) {
                    catCopy.cards = catCopy.cards.map(card => {
                        const cardCopy = { ...card };
                        // Convert Delta object to JSON string
                        if (cardCopy.content && typeof cardCopy.content === 'object') {
                            try {
                                cardCopy.content = JSON.stringify(cardCopy.content);
                            } catch (e) {
                                Debug.sync.stepError('Error serializing card content', e);
                                cardCopy.content = '{}';
                            }
                        }
                        // Ensure bookmarks are preserved
                        if (!cardCopy.bookmarks) {
                            cardCopy.bookmarks = [];
                        }
                        return cardCopy;
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
            categoriesBeforeDeser: board.categories?.length || 0,
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
        
        // Deserialize categories with their cards
        if (deserialized.categories) {
            deserialized.categories = deserialized.categories.map(category => {
                const catCopy = { ...category };
                // Deserialize card content (Quill Delta objects)
                if (catCopy.cards) {
                    catCopy.cards = catCopy.cards.map(card => {
                        const cardCopy = { ...card };
                        // Parse JSON string back to Delta object
                        if (cardCopy.content && typeof cardCopy.content === 'string') {
                            try {
                                cardCopy.content = JSON.parse(cardCopy.content);
                            } catch (e) {
                                Debug.sync.stepError('Error parsing card content', e);
                                cardCopy.content = { ops: [] };
                            }
                        }
                        return cardCopy;
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
        // Headers don't need special deserialization like cards do
        
        Debug.sync.detail('Deserialized board result', {
            categoriesAfterDeser: deserialized.categories?.length || 0,
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
        Debug.sync.step(`Event-based save triggered after: ${actionName}`);
        
        // Store the action name
        this.pendingSaveAction = actionName;
        
        // Clear existing debounce timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        // Debounce saves by 300ms to batch rapid actions
        this.saveDebounceTimer = setTimeout(() => {
            // Queue the save instead of executing directly
            const saveTask = async () => {
                // Validate board state before saving
                if (!this.validateBoardState()) {
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
            Debug.sync.detail(`Save queued for: ${actionName} (${this.saveQueue.length} in queue)`);
        }, 300);
    },
    
    // Validate board state before saving
    validateBoardState() {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards?.find(b => b.id === currentBoardId);
        
        if (!board) {
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
        
        return true;
    },
    
    // Count total bookmarks in a board
    countBookmarks(board) {
        let count = 0;
        if (board.categories) {
            board.categories.forEach(cat => {
                if (cat.cards) {
                    cat.cards.forEach(card => {
                        if (card.bookmarks && Array.isArray(card.bookmarks)) {
                            count += card.bookmarks.length;
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
                (board.categories && board.categories.length > 0) ||
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
        // Queue the save instead of skipping if already saving
        if (this.isSaving) {
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
            categories: [],
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