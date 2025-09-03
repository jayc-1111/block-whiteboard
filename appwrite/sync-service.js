// === APPWRITE SYNC SERVICE ===
// This file replaces Firebase sync-service.js and handles board data synchronization
// with Appwrite databases, including event-based saves, debouncing, and save status indicators.
//
// Uses global Appwrite services (loaded via CDN)

// Wait for Appwrite services to be available
function waitForAppwriteServices() {
    return new Promise((resolve) => {
        const checkServices = () => {
            if (window.authService && window.dbService) {
                resolve({ authService: window.authService, dbService: window.dbService });
            } else {
                setTimeout(checkServices, 100);
            }
        };
        checkServices();
    });
}

// Get services when needed
let syncAuthService, syncDbService;
waitForAppwriteServices().then(services => {
    syncAuthService = services.authService;
    syncDbService = services.dbService;
});

// Sync configuration
const SYNC_CONFIG = {
    SAVE_DEBOUNCE_DELAY: 300, // ms - delay before saving after user action
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // ms
    SAVE_STATUS_TIMEOUT: 3000 // ms - how long to show save status
};

// Sync state management
let saveTimeout = null;
let isSaveInProgress = false;
let saveQueue = [];
let lastKnownGoodState = null;
let isManualSave = false;
let saveStatusElement = null;

// Debug utilities
window.Debug = window.Debug || {};
window.Debug.sync = {
    info: (msg, data) => console.log(`🔄 SYNC: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ SYNC ERROR: ${msg}`, error),
    step: (msg) => console.log(`👉 SYNC: ${msg}`),
    detail: (msg, data) => console.log(`📋 SYNC: ${msg}`, data || ''),
    start: () => console.log(`🚀 SYNC: Starting operation`),
    done: (msg) => console.log(`✅ SYNC: ${msg || 'Operation completed'}`)
};

// Appwrite Sync Service - Replaces Firebase syncService
const syncService = {
    
    // Initialize sync service
    init() {
        window.Debug.sync.start();
        window.Debug.sync.step('Initializing Appwrite sync service');
        
        // Listen for auth state changes
        syncAuthService.onAuthStateChange((user) => {
            if (user) {
                window.Debug.sync.info('User authenticated - enabling sync', { userId: user.$id });
                this.loadInitialBoards();
            } else {
                window.Debug.sync.info('User signed out - clearing local data');
                this.clearLocalData();
            }
        });
        
        // Set up automatic save on app state changes
        this.setupAutoSave();
        
        window.Debug.sync.done('Sync service initialized');
    },

    // Set up automatic saving when AppState changes
    setupAutoSave() {
        // Listen for AppState changes
        if (window.AppState && window.AppState.addListener) {
            window.AppState.addListener('boards', () => {
                if (!isManualSave) {
                    this.saveAfterAction('boards updated');
                }
                isManualSave = false; // Reset flag
            });
        }
    },

    // Save after user action with debouncing
    saveAfterAction(actionName) {
        if (!authService.getCurrentUser()) {
            window.Debug.sync.detail('No user - skipping save');
            return;
        }

        window.Debug.sync.detail(`Action: ${actionName} - queuing save`);
        
        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        // Update save status
        this.updateSaveStatus('saving');
        
        // Debounce the save
        saveTimeout = setTimeout(() => {
            this.saveCurrentBoard();
        }, SYNC_CONFIG.SAVE_DEBOUNCE_DELAY);
    },

    // Save current board to Appwrite
    async saveCurrentBoard() {
        const user = authService.getCurrentUser();
        if (!user) {
            window.Debug.sync.error('Cannot save - no user authenticated');
            return { success: false, error: 'Not authenticated' };
        }

        if (isSaveInProgress) {
            window.Debug.sync.detail('Save already in progress - adding to queue');
            return new Promise((resolve) => {
                saveQueue.push(resolve);
            });
        }

        isSaveInProgress = true;
        
        try {
            window.Debug.sync.start();
            window.Debug.sync.step('Saving current board to Appwrite');
            
            // Get current board data from AppState
            const boards = window.AppState?.get('boards') || [];
            const currentBoardId = window.AppState?.get('currentBoardId') || 0;
            const currentBoard = boards.find(b => b.id === currentBoardId);
            
            if (!currentBoard) {
                window.Debug.sync.error('Current board not found');
                this.updateSaveStatus('error');
                return { success: false, error: 'Current board not found' };
            }

            // Serialize board data for cloud storage
            const serializedBoard = this.serializeBoardForAppwrite(currentBoard);
            
            // Save to Appwrite
            const result = await dbService.saveBoard(serializedBoard);
            
            if (result.success) {
                if (result.skipped) {
                    window.Debug.sync.detail('Save skipped - board is empty');
                    this.updateSaveStatus('saved');
                } else {
                    window.Debug.sync.done('Board saved to Appwrite successfully');
                    this.updateSaveStatus('saved');
                    // Store last known good state
                    lastKnownGoodState = JSON.stringify(boards);
                }
            } else {
                window.Debug.sync.error('Failed to save board', result.error);
                this.updateSaveStatus('error');
            }
            
            // Process save queue
            this.processSaveQueue(result);
            
            return result;

        } catch (error) {
            window.Debug.sync.error('Save operation failed', error);
            this.updateSaveStatus('error');
            this.processSaveQueue({ success: false, error: error.message });
            return { success: false, error: error.message };
        } finally {
            isSaveInProgress = false;
        }
    },

    // Process queued save requests
    processSaveQueue(result) {
        if (saveQueue.length > 0) {
            window.Debug.sync.detail(`Processing ${saveQueue.length} queued saves`);
            saveQueue.forEach(resolve => resolve(result));
            saveQueue = [];
        }
    },

    // Manual save (triggered by save button)
    async manualSave() {
        window.Debug.sync.info('Manual save triggered');
        isManualSave = true;
        
        // Clear any pending debounced save
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        return await this.saveCurrentBoard();
    },

    // Load initial boards after authentication
    async loadInitialBoards() {
        try {
            window.Debug.sync.step('Loading boards from Appwrite');
            
            const result = await dbService.loadBoards();
            
            if (result.success && result.boards.length > 0) {
                // Deserialize and merge with local state
                const deserializedBoards = result.boards.map(board => 
                    this.deserializeBoardFromAppwrite(board)
                );
                
                // Update AppState with loaded boards
                if (window.AppState) {
                    window.AppState.set('boards', deserializedBoards);
                    window.Debug.sync.done(`Loaded ${deserializedBoards.length} boards from cloud`);
                    
                    // Load the first board if no current board is set
                    const currentBoardId = window.AppState.get('currentBoardId');
                    if (currentBoardId === undefined || currentBoardId === null) {
                        if (window.loadBoard && typeof window.loadBoard === 'function') {
                            window.loadBoard(0);
                        }
                    }
                }
            } else if (result.success && result.boards.length === 0) {
                window.Debug.sync.info('No boards found in cloud - using local boards');
            } else {
                window.Debug.sync.error('Failed to load boards from cloud', result.error);
            }
            
        } catch (error) {
            window.Debug.sync.error('Error loading initial boards', error);
        }
    },

    // Load specific board on demand (compatibility with Firebase version)
    async loadBoardOnDemand(boardId) {
        try {
            window.Debug.sync.step(`Loading board ${boardId} from Appwrite`);
            
            const result = await dbService.loadBoard(boardId);
            
            if (result.success) {
                const deserializedBoard = this.deserializeBoardFromAppwrite(result.board);
                
                // Update the specific board in AppState
                const boards = window.AppState?.get('boards') || [];
                const boardIndex = boards.findIndex(b => b.id === boardId);
                
                if (boardIndex !== -1) {
                    boards[boardIndex] = { ...boards[boardIndex], ...deserializedBoard };
                    window.AppState.set('boards', boards);
                    window.Debug.sync.done(`Board ${boardId} loaded from cloud`);
                }
            }
            
            return result;
            
        } catch (error) {
            window.Debug.sync.error(`Failed to load board ${boardId}`, error);
            return { success: false, error: error.message };
        }
    },

    // Save all boards (batch operation)
    async saveAllBoards() {
        const user = authService.getCurrentUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
            const boards = window.AppState?.get('boards') || [];
            const savePromises = boards.map(board => 
                dbService.saveBoard(this.serializeBoardForAppwrite(board))
            );
            
            const results = await Promise.all(savePromises);
            const successful = results.filter(r => r.success).length;
            
            window.Debug.sync.done(`Saved ${successful}/${boards.length} boards`);
            return { success: true, savedCount: successful };
            
        } catch (error) {
            window.Debug.sync.error('Failed to save all boards', error);
            return { success: false, error: error.message };
        }
    },

    // Delete board from cloud
    async deleteBoard(boardId) {
        try {
            const result = await dbService.deleteBoard(boardId);
            if (result.success) {
                window.Debug.sync.info(`Board ${boardId} deleted from cloud`);
            }
            return result;
        } catch (error) {
            window.Debug.sync.error(`Failed to delete board ${boardId}`, error);
            return { success: false, error: error.message };
        }
    },

    // Clear local data (on sign out)
    clearLocalData() {
        if (window.AppState) {
            // Reset to default empty board
            const defaultBoard = {
                id: 0,
                name: 'My Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: []
            };
            
            window.AppState.set('boards', [defaultBoard]);
            window.AppState.set('currentBoardId', 0);
        }
        
        // Clear canvas
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.innerHTML = '';
        }
        
        lastKnownGoodState = null;
        window.Debug.sync.info('Local data cleared');
    },

    // Mark pending changes (compatibility)
    markPendingChanges() {
        this.saveAfterAction('pending changes marked');
    },

    // Serialize board data for Appwrite storage
    serializeBoardForAppwrite(board) {
        // Convert any DOM references to plain data
        return {
            id: board.id,
            name: board.name,
            folders: board.folders || [],
            canvasHeaders: board.canvasHeaders || [],
            drawingPaths: board.drawingPaths || [],
            isDevMode: board.isDevMode || false,
            onboardingShown: board.onboardingShown || false
        };
    },

    // Deserialize board data from Appwrite
    deserializeBoardFromAppwrite(cloudBoard) {
        return {
            id: cloudBoard.id,
            name: cloudBoard.name,
            folders: cloudBoard.folders || [],
            canvasHeaders: cloudBoard.canvasHeaders || [],
            drawingPaths: cloudBoard.drawingPaths || [],
            isDevMode: cloudBoard.isDevMode || false,
            onboardingShown: cloudBoard.onboardingShown || false,
            lastModified: cloudBoard.lastModified
        };
    },

    // Update save status indicator
    updateSaveStatus(status) {
        if (!saveStatusElement) return;

        const statusTexts = {
            saving: { text: 'Saving to cloud...', color: '#f59e0b' },
            saved: { text: 'Saved to cloud', color: '#10b981' },
            error: { text: 'Save failed', color: '#ef4444' },
            offline: { text: 'Offline', color: '#6b7280' }
        };

        const config = statusTexts[status] || statusTexts.offline;
        
        saveStatusElement.textContent = config.text;
        saveStatusElement.style.color = config.color;
        saveStatusElement.style.display = 'inline';

        // Auto-hide status after delay (except for errors)
        if (status !== 'error') {
            setTimeout(() => {
                if (saveStatusElement) {
                    saveStatusElement.style.display = 'none';
                }
            }, SYNC_CONFIG.SAVE_STATUS_TIMEOUT);
        }
    },

    // Set reference to save status element
    setSaveStatusElement(element) {
        saveStatusElement = element;
    },

    // Get sync statistics
    getSyncStats() {
        return {
            isInProgress: isSaveInProgress,
            queueLength: saveQueue.length,
            hasLastGoodState: !!lastKnownGoodState,
            currentUser: authService.getCurrentUser()?.email || 'Anonymous'
        };
    },

    // Compatibility properties (for existing code)
    isManualSave: false,
    lastKnownGoodState: null
};

// Create save indicator in toolbar
function addSaveIndicator() {
    const topBar = document.getElementById('topBar');
    if (!topBar) {
        setTimeout(addSaveIndicator, 500);
        return;
    }

    // Check if save indicator already exists
    if (document.getElementById('saveStatus')) return;

    const saveIndicator = document.createElement('div');
    saveIndicator.id = 'saveStatus';
    saveIndicator.className = 'save-status';
    saveIndicator.style.cssText = `
        display: none;
        color: #10b981;
        font-size: 12px;
        margin-left: 8px;
        font-weight: 500;
    `;
    saveIndicator.textContent = 'Saved to cloud';

    // Insert after auth button or at the end
    const authContainer = topBar.querySelector('.auth-button-container');
    if (authContainer) {
        authContainer.insertAdjacentElement('afterend', saveIndicator);
    } else {
        topBar.appendChild(saveIndicator);
    }

    // Set reference in sync service
    syncService.setSaveStatusElement(saveIndicator);

    window.Debug.sync.step('Save status indicator added to toolbar');
}

// Make sync service globally available (for compatibility)
window.syncService = syncService;
window.addSaveIndicator = addSaveIndicator;

// Expose sync functions globally (for existing code compatibility)
window.saveAfterAction = (actionName) => syncService.saveAfterAction(actionName);
window.markPendingChanges = () => syncService.markPendingChanges();
