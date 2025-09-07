// === APPWRITE SYNC SERVICE ===
// This file replaces Firebase sync-service.js and handles board data synchronization
// with Appwrite databases, including event-based saves, debouncing, and save status indicators.
//
// Uses global Appwrite services (loaded via CDN)

// Permission and Role already declared in appwrite-config.js - avoid redeclaration
// const { Permission, Role } = window.Appwrite; // ← REMOVED to fix const redeclaration error

// Wait for Appwrite services to be available
function waitForAppwriteServices() {
    return new Promise((resolve) => {
        const checkServices = () => {
            if (window.authService && window.dbService && window.Appwrite) {
                resolve({ authService: window.authService, dbService: window.dbService, Appwrite: window.Appwrite });
            } else {
                setTimeout(checkServices, 100);
            }
        };
        checkServices();
    });
}

// Get services when needed
let syncAuthService, syncDbService, syncRealtimeClient;
waitForAppwriteServices().then(services => {
    syncAuthService = services.authService;
    syncDbService = services.dbService;

    // Initialize realtime client when services are ready (DISABLED - constructor not available in current SDK version)
    if (services.Appwrite && window.APPWRITE_CONFIG) {
        // TODO: Fix realtime client construction for Appwrite v17+
        // syncRealtimeClient = new services.Appwrite.RealtimeClient()
        //     .setEndpoint(window.APPWRITE_CONFIG.endpoint)
        //     .setProject(window.APPWRITE_CONFIG.projectId);

        console.warn('⚠️ Realtime functionality temporarily disabled - RealtimeClient constructor not available');
        // window.Debug.sync.info('Realtime client initialized');
        // syncService.setupRealtimeSubscriptions();
    }
});

// Function to check and get current auth service
function getAuthService() {
    return window.authService || syncAuthService;
}

// Sync configuration
const SYNC_CONFIG = {
    SAVE_DEBOUNCE_DELAY: 300, // ms - delay before saving after user action
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // ms
    RETRY_MAX_DELAY: 5000, // ms - maximum retry delay
    SAVE_STATUS_TIMEOUT: 3000, // ms - how long to show save status
    AUTH_CHECK_INTERVAL: 30000 // ms - interval to verify authentication
};

// Sync state management
let saveTimeout = null;
let isSaveInProgress = false;
let saveQueue = [];
let lastKnownGoodState = null;
let isManualSave = false;
let saveStatusElement = null;
let authCheckTimer = null;
let retryAttempts = 0;
let lastSaveError = null;
let lastSaveTimestamp = null;

// Debug utilities
window.Debug = window.Debug || {};
window.Debug.sync = {
    info: (msg, data) => console.log(`🔄 SYNC: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ SYNC ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ SYNC: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 SYNC: ${msg}`),
    detail: (msg, data) => console.log(`📋 SYNC: ${msg}`, data || ''),
    start: () => console.log(`🚀 SYNC: Starting operation`),
    done: (msg) => console.log(`✅ SYNC: ${msg || 'Operation completed'}`)
};

// Appwrite Sync Service - Replaces Firebase syncService
// 🎯 PERMISSIONS-BASED USER ISOLATION (removes userId indexing need!)
const syncService = {

    // Initialize sync service
    init() {
        window.Debug.sync.start();
        window.Debug.sync.step('Initializing Appwrite sync service');
        
        // Listen for auth state changes
        if (syncAuthService && syncAuthService.onAuthStateChange) {
            syncAuthService.onAuthStateChange((user) => {
                if (user) {
                    window.Debug.sync.info('User authenticated - enabling sync', { 
                        userId: user.$id,
                        isAnonymous: user.labels?.includes('anonymous') || false,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Start periodic auth check
                    this.startAuthCheck();
                    
                    this.loadInitialBoards();
                } else {
                    window.Debug.sync.info('User signed out - clearing local data');
                    this.clearLocalData();
                    
                    // Stop auth check timer when signed out
                    this.stopAuthCheck();
                }
            });
        } else {
            window.Debug.sync.warn('authService not available - using fallback user check');
            
            // Try to initialize with currently logged in user
            this.checkAndInitCurrentUser();
        }
        
        // Set up automatic save on app state changes
        this.setupAutoSave();
        
        // Initialize the save status indicator
        this.initSaveStatus();
        
        window.Debug.sync.done('Sync service initialized');
    },
    
    // Start periodic auth check to ensure session remains valid
    startAuthCheck() {
        this.stopAuthCheck(); // Clear any existing timer
        
        authCheckTimer = setInterval(() => {
            this.verifyAuthentication(true);
        }, SYNC_CONFIG.AUTH_CHECK_INTERVAL);
        
        window.Debug.sync.detail('Started periodic auth verification', { 
            interval: SYNC_CONFIG.AUTH_CHECK_INTERVAL
        });
    },
    
    // Stop periodic auth check
    stopAuthCheck() {
        if (authCheckTimer) {
            clearInterval(authCheckTimer);
            authCheckTimer = null;
        }
    },
    
    // Check if there's a currently logged in user
    async checkAndInitCurrentUser() {
        try {
            const authService = getAuthService();
            if (authService) {
                const user = authService.getCurrentUser();
                if (user) {
                    window.Debug.sync.info('Found existing user session', { 
                        userId: user.$id,
                        isAnonymous: user.labels?.includes('anonymous') || false
                    });
                    
                    // Start periodic auth check
                    this.startAuthCheck();
                    
                    // Load user data
                    this.loadInitialBoards();
                } else {
                    window.Debug.sync.step('No active user session found');
                }
            }
        } catch (error) {
            window.Debug.sync.error('Error checking current user', error);
        }
    },
    
    // Verify authentication state and refresh if needed
    async verifyAuthentication(silent = false) {
        try {
            const authService = getAuthService();
            if (!authService) return false;
            
            const user = authService.getCurrentUser();
            if (!user) {
                if (!silent) window.Debug.sync.warn('No active user session found during verification');
                return false;
            }
            
            // Successfully verified authentication
            if (!silent) window.Debug.sync.detail('Authentication verified', { userId: user.$id });
            return true;
        } catch (error) {
            window.Debug.sync.error('Auth verification failed', error);
            return false;
        }
    },
    
    // Initialize save status indicator
    initSaveStatus() {
        // Create save indicator in toolbar if it doesn't exist
        const topBar = document.getElementById('topBar');
        if (!topBar) {
            // Retry later if topBar not yet available
            setTimeout(() => this.initSaveStatus(), 500);
            return;
        }
        
        // Check if save indicator already exists
        if (document.getElementById('saveStatus')) {
            saveStatusElement = document.getElementById('saveStatus');
            return;
        }
        
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
        saveStatusElement = saveIndicator;
        
        window.Debug.sync.step('Save status indicator added to toolbar');
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
        let authService = window.authService;
        if (!authService || !authService.getCurrentUser()) {
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

    // Save current board to Appwrite with retry mechanism
    async saveCurrentBoard() {
        // Reset retry attempts counter if this is a new save operation
        if (!isSaveInProgress) {
            retryAttempts = 0;
        }
        
        // Verify authentication first
        const authService = getAuthService();
        if (!authService) {
            window.Debug.sync.error('Cannot save - authService not available');
            this.updateSaveStatus('error');
            return { success: false, error: 'AuthService not available' };
        }

        const user = authService.getCurrentUser();
        if (!user) {
            window.Debug.sync.error('Cannot save - no user authenticated', {
                authServiceState: !!authService,
                retryAttempt: retryAttempts
            });
            this.updateSaveStatus('error');
            return { success: false, error: 'Not authenticated' };
        }

        // Handle concurrent save requests
        if (isSaveInProgress) {
            window.Debug.sync.detail('Save already in progress - adding to queue');
            return new Promise((resolve) => {
                saveQueue.push(resolve);
            });
        }

        isSaveInProgress = true;
        lastSaveTimestamp = new Date().toISOString();
        
        try {
            window.Debug.sync.start();
            window.Debug.sync.step(`Saving current board to Appwrite (attempt ${retryAttempts + 1}/${SYNC_CONFIG.MAX_RETRY_ATTEMPTS + 1})`);
            
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
            const dbService = window.dbService || syncDbService;
            if (!dbService) {
                throw new Error('dbService not available');
            }
            
            // Log data sizes before saving
            const foldersSize = JSON.stringify(serializedBoard.folders || []).length;
            const headersSize = JSON.stringify(serializedBoard.canvasHeaders || []).length;
            const pathsSize = JSON.stringify(serializedBoard.drawingPaths || []).length;
            
            window.Debug.sync.detail('Data sizes before save', {
                foldersSize,
                headersSize,
                pathsSize,
                totalSize: foldersSize + headersSize + pathsSize
            });
            
            // Log the complete board object for debugging
            window.Debug.sync.detail('Board data being saved', {
                id: serializedBoard.id,
                boardId: serializedBoard.boardId,
                name: serializedBoard.name,
                folderCount: serializedBoard.folders ? (Array.isArray(serializedBoard.folders) ? serializedBoard.folders.length : 0) : 0,
                isDevMode: serializedBoard.isDevMode,
                updatedAt: serializedBoard.updatedAt
            });
            
            const result = await dbService.saveBoard(serializedBoard);
            
            if (result.success) {
                if (result.skipped) {
                    window.Debug.sync.detail('Save skipped - board is empty');
                    this.updateSaveStatus('saved');
                } else if (result.reduced) {
                    window.Debug.sync.warn('Board saved with reduced data due to size limits', result);
                    this.updateSaveStatus('warning');
                } else {
                    window.Debug.sync.done('Board saved to Appwrite successfully');
                    this.updateSaveStatus('saved');
                    // Store last known good state
                    lastKnownGoodState = JSON.stringify(boards);
                    // Reset retry attempts counter
                    retryAttempts = 0;
                    lastSaveError = null;
                }
            } else {
                window.Debug.sync.error('Failed to save board', result);
                this.updateSaveStatus('error');
                lastSaveError = result;
                
                // Retry logic for recoverable errors
                if (retryAttempts < SYNC_CONFIG.MAX_RETRY_ATTEMPTS && this.isRetryableError(result)) {
                    retryAttempts++;
                    const delay = Math.min(
                        SYNC_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryAttempts - 1),
                        SYNC_CONFIG.RETRY_MAX_DELAY
                    );
                    
                    window.Debug.sync.warn(`Retrying save in ${delay}ms (attempt ${retryAttempts}/${SYNC_CONFIG.MAX_RETRY_ATTEMPTS})`, {
                        error: result.error,
                        code: result.code,
                        delay
                    });
                    
                    // Update status to show retry
                    this.updateSaveStatus('retrying');
                    
                    // Process current queue
                    this.processSaveQueue({ success: false, retrying: true, attempt: retryAttempts });
                    
                    // Release lock for retry
                    isSaveInProgress = false;
                    
                    // Retry after delay
                    setTimeout(() => this.saveCurrentBoard(), delay);
                    return { success: false, retrying: true, attempt: retryAttempts };
                }
            }
            
            // Process save queue
            this.processSaveQueue(result);
            
            return result;

        } catch (error) {
            window.Debug.sync.error('Save operation failed', {
                error: error.message,
                stack: error.stack,
                retryAttempt: retryAttempts
            });
            this.updateSaveStatus('error');
            lastSaveError = { error: error.message, timestamp: new Date().toISOString() };
            
            // Retry logic for unexpected errors
            if (retryAttempts < SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
                retryAttempts++;
                const delay = Math.min(
                    SYNC_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryAttempts - 1),
                    SYNC_CONFIG.RETRY_MAX_DELAY
                );
                
                window.Debug.sync.warn(`Retrying save after error in ${delay}ms (attempt ${retryAttempts}/${SYNC_CONFIG.MAX_RETRY_ATTEMPTS})`);
                
                // Update status to show retry
                this.updateSaveStatus('retrying');
                
                // Process current queue
                this.processSaveQueue({ success: false, retrying: true, attempt: retryAttempts });
                
                // Release lock for retry
                isSaveInProgress = false;
                
                // Retry after delay
                setTimeout(() => this.saveCurrentBoard(), delay);
                return { success: false, retrying: true, attempt: retryAttempts };
            } else {
                this.processSaveQueue({ success: false, error: error.message });
                return { success: false, error: error.message };
            }
        } finally {
            // Only release the lock if we're not retrying
            if (retryAttempts >= SYNC_CONFIG.MAX_RETRY_ATTEMPTS || !this.isRetryableError(lastSaveError)) {
                isSaveInProgress = false;
                // Reset retry counter after all attempts
                if (retryAttempts >= SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
                    retryAttempts = 0;
                }
            }
        }
    },
    
    // Check if an error is retryable
    isRetryableError(error) {
        if (!error) return false;
        
        // Network-related errors are retryable
        if (error.code === 'NETWORK_ERROR' || 
            error.message?.includes('network') ||
            error.message?.includes('timeout') ||
            error.message?.includes('connection')) {
            return true;
        }
        
        // Authentication errors may be retryable
        if (error.code === 401 || error.code === '401' || 
            error.message?.includes('unauthorized') ||
            error.message?.includes('authentication')) {
            return true;
        }
        
        // Rate limiting or server overload
        if (error.code === 429 || error.code === '429' ||
            error.code === 503 || error.code === '503') {
            return true;
        }
        
        return false;
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

            let dbService = window.dbService;
            if (!dbService) {
                throw new Error('dbService not available');
            }

            // Try to load boards, but handle missing database gracefully
            let result;
            try {
                result = await dbService.loadBoards();

                if (result.success && result.boards.length > 0) {
                    // Deserialize and merge with local state
                    const deserializedBoards = result.boards.map(board =>
                        this.deserializeBoardFromAppwrite(board)
                    );

                    // Update AppState with loaded boards
                    if (window.AppState) {
                        window.AppState.set('boards', deserializedBoards);
                        window.Debug.sync.done(`Loaded ${deserializedBoards.length} boards from cloud`);

                        // Re-initialize board to visualize the loaded data
                        if (window.initializeBoard) {
                            window.Debug.sync.info('Visualizing loaded board data');
                            window.initializeBoard();
                        }
                    }
                } else if (result.success && result.boards.length === 0) {
                    window.Debug.sync.info('No boards found in cloud - using local boards');
                } else {
                    window.Debug.sync.error('Failed to load boards from cloud', result.error);
                }

            } catch (dbError) {
                console.warn('Error loading boards - guide user to setup:', dbError);

                if (dbError.message.includes('Attribute not found in schema') || dbError.message.includes('updatedAt')) {
                    console.log('⚠️ Missing timestamp attribute - user needs to run database setup');
                    this.showDatabaseSetupMessage();

                    // Continue without loading boards (graceful fallback)
                    window.Debug.sync.info('Database needs setup - auth guard should redirect now');
                    return;
                } else {
                    throw dbError; // Re-throw other errors
                }
            }

        } catch (error) {
            window.Debug.sync.error('Error loading initial boards', error);
        }
    },

    // Show message when database is not set up
    showDatabaseSetupMessage() {
        console.log('🔧 DATABASE SETUP REQUIRED:');
        console.log('Automatic database setup will be attempted.');
        console.log('If issues persist, please refresh the page.');

        // Optional: Create and display a simple inline message
        if (document.body) {
            const setupMsg = document.createElement('div');
            setupMsg.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 15px;
                    max-width: 350px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 14px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                ">
                    <strong>🛠️ Database Setup Required</strong><br>
                    Your database is missing required attributes.<br>
                    Automatic setup will be attempted. If issues persist, please refresh the page.
                    <button onclick="this.parentElement.style.display='none';" style="
                        float: right;
                        background: none;
                        border: none;
                        font-size: 20px;
                        line-height: 1;
                        cursor: pointer;
                    ">×</button>
                </div>
            `;
            document.body.appendChild(setupMsg);

            // Auto-hide after 10 seconds
            setTimeout(() => setupMsg.style.display = 'none', 10000);
        }
    },

    // Load specific board on demand (compatibility with Firebase version)
    async loadBoardOnDemand(boardId) {
        try {
            window.Debug.sync.step(`Loading board ${boardId} from Appwrite`);
            
            let dbService = window.dbService;
            if (!dbService) {
                throw new Error('dbService not available');
            }
            
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
        const authService = getAuthService();
        if (!authService || !authService.getCurrentUser()) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const boards = window.AppState?.get('boards') || [];
            const dbService = window.dbService || syncDbService;
            
            const savePromises = boards.map(board => {
                if (!dbService) {
                    return Promise.resolve({ success: false, error: 'dbService not available' });
                }
                return dbService.saveBoard(this.serializeBoardForAppwrite(board));
            });
            
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
            const dbService = window.dbService || syncDbService;
            if (!dbService) {
                throw new Error('dbService not available');
            }
            
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

    // Serialize board data for Appwrite storage with enhanced safety
    serializeBoardForAppwrite(board) {
        try {
            // Start with a base object
            const serializedBoard = {
                id: board.id,
                boardId: board.id.toString(), // Add explicit boardId as a string
                name: board.name || 'Untitled Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: !!board.isDevMode,
                onboardingShown: !!board.onboardingShown,
                updatedAt: new Date().toISOString()
            };
            
            // Safely process folders - ensure they're plain objects without DOM references
            if (board.folders && Array.isArray(board.folders)) {
                serializedBoard.folders = board.folders.map(folder => {
                    // Remove circular references and DOM elements
                    const safeFolder = { ...folder };
                    
                    // Ensure position is a plain object
                    if (typeof safeFolder.position === 'object') {
                        safeFolder.position = {
                            left: safeFolder.position.left || '0px',
                            top: safeFolder.position.top || '0px'
                        };
                    } else {
                        safeFolder.position = { left: '0px', top: '0px' };
                    }
                    
                    // Safely process files if they exist
                    if (safeFolder.files && Array.isArray(safeFolder.files)) {
                        safeFolder.files = safeFolder.files.map(file => {
                            const safeFile = { ...file };
                            
                            // Remove any DOM references or functions
                            delete safeFile.element;
                            delete safeFile.quillEditor;
                            
                            // Ensure bookmarks are valid
                            if (!Array.isArray(safeFile.bookmarks)) {
                                safeFile.bookmarks = [];
                            }
                            
                            return safeFile;
                        });
                    } else {
                        safeFolder.files = [];
                    }
                    
                    // Remove any DOM element references
                    delete safeFolder.element;
                    
                    return safeFolder;
                });
            }
            
            // Safely process canvas headers
            if (board.canvasHeaders && Array.isArray(board.canvasHeaders)) {
                serializedBoard.canvasHeaders = board.canvasHeaders.map(header => {
                    const safeHeader = { ...header };
                    
                    // Ensure position is a plain object
                    if (typeof safeHeader.position === 'object') {
                        safeHeader.position = {
                            left: safeHeader.position.left || '0px',
                            top: safeHeader.position.top || '0px'
                        };
                    } else {
                        safeHeader.position = { left: '0px', top: '0px' };
                    }
                    
                    // Remove any DOM element references
                    delete safeHeader.element;
                    
                    return safeHeader;
                });
            }
            
            // Safely process drawing paths
            if (board.drawingPaths && Array.isArray(board.drawingPaths)) {
                serializedBoard.drawingPaths = board.drawingPaths;
            }
            
            return serializedBoard;
        } catch (error) {
            window.Debug.sync.error('Error during board serialization', error);
            
            // Return a minimal valid board to prevent save failure
            return {
                id: board.id,
                name: board.name || 'Untitled Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: false,
                onboardingShown: false,
                updatedAt: new Date().toISOString()
            };
        }
    },

    // Deserialize board data from Appwrite with enhanced error handling
    deserializeBoardFromAppwrite(cloudBoard) {
        try {
            // Basic board properties
            const board = {
                id: cloudBoard.id,
                boardId: cloudBoard.boardId, // Include the boardId field explicitly
                name: cloudBoard.name || 'Unnamed Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: !!cloudBoard.isDevMode,
                onboardingShown: !!cloudBoard.onboardingShown,
                updatedAt: cloudBoard.$updatedAt || new Date().toISOString()
            };
            
            // Handle folders with error checking
            if (typeof cloudBoard.folders === 'string') {
                try {
                    board.folders = JSON.parse(cloudBoard.folders);
                    window.Debug.sync.detail(`Parsed ${board.folders.length} folders from JSON string`);
                } catch (folderError) {
                    window.Debug.sync.error('Failed to parse folders JSON', {
                        error: folderError.message,
                        rawData: cloudBoard.folders.substring(0, 100) + '...' // Log first 100 chars
                    });
                    board.folders = [];
                }
            } else if (Array.isArray(cloudBoard.folders)) {
                board.folders = cloudBoard.folders;
            }
            
            // Handle canvas headers with error checking
            if (typeof cloudBoard.canvasHeaders === 'string') {
                try {
                    board.canvasHeaders = JSON.parse(cloudBoard.canvasHeaders);
                } catch (headerError) {
                    window.Debug.sync.error('Failed to parse canvasHeaders JSON', headerError);
                    board.canvasHeaders = [];
                }
            } else if (Array.isArray(cloudBoard.canvasHeaders)) {
                board.canvasHeaders = cloudBoard.canvasHeaders;
            }
            
            // Handle drawing paths with error checking
            if (typeof cloudBoard.drawingPaths === 'string') {
                try {
                    board.drawingPaths = JSON.parse(cloudBoard.drawingPaths);
                } catch (pathsError) {
                    window.Debug.sync.error('Failed to parse drawingPaths JSON', pathsError);
                    board.drawingPaths = [];
                }
            } else if (Array.isArray(cloudBoard.drawingPaths)) {
                board.drawingPaths = cloudBoard.drawingPaths;
            }
            
            // Record successful load in debug
            window.Debug.sync.detail('Successfully deserialized board data', {
                id: board.id,
                name: board.name,
                folderCount: board.folders.length,
                headerCount: board.canvasHeaders.length,
                pathCount: board.drawingPaths.length
            });
            
            return board;
        } catch (error) {
            window.Debug.sync.error('Critical error deserializing board data', {
                error: error.message,
                stack: error.stack,
                boardId: cloudBoard.id || 'unknown'
            });
            
            // Return a minimal valid board to prevent app crashes
            return {
                id: cloudBoard.id || 0,
                name: 'Recovered Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: false,
                onboardingShown: false,
                updatedAt: new Date().toISOString()
            };
        }
    },

    // Update save status indicator with enhanced statuses
    updateSaveStatus(status) {
        if (!saveStatusElement) return;

        const statusTexts = {
            saving: { text: 'Saving to cloud...', color: '#f59e0b' },
            saved: { text: 'Saved to cloud', color: '#10b981' },
            error: { text: 'Save failed', color: '#ef4444' },
            offline: { text: 'Offline', color: '#6b7280' },
            retrying: { text: 'Retrying save...', color: '#8b5cf6' },
            warning: { text: 'Saved (with warnings)', color: '#eab308' },
            auth_error: { text: 'Authentication error', color: '#ef4444' },
            'realtime-active': { text: 'Realtime ready', color: '#06b6d4' },
            'realtime-error': { text: 'Realtime error', color: '#ef4444' }
        };

        const config = statusTexts[status] || statusTexts.offline;
        
        saveStatusElement.textContent = config.text;
        saveStatusElement.style.color = config.color;
        saveStatusElement.style.display = 'inline';
        
        // Add additional details for debugging
        if (status === 'error' && lastSaveError) {
            saveStatusElement.title = `Error: ${lastSaveError.error || 'Unknown error'}`;
            
            // Log error details to console
            window.Debug.sync.error('Save status error details', {
                error: lastSaveError.error,
                code: lastSaveError.code,
                timestamp: lastSaveError.timestamp
            });
        } else if (status === 'retrying') {
            saveStatusElement.title = `Retry attempt ${retryAttempts}/${SYNC_CONFIG.MAX_RETRY_ATTEMPTS}`;
        } else {
            saveStatusElement.title = ''; // Clear any previous title
        }

        // Auto-hide status after delay (except for errors and retries)
        if (status !== 'error' && status !== 'retrying' && status !== 'auth_error') {
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
        const authService = getAuthService();
        const user = authService?.getCurrentUser();
        return {
            isInProgress: isSaveInProgress,
            queueLength: saveQueue.length,
            hasLastGoodState: !!lastKnownGoodState,
            currentUser: user?.email || user?.$id || 'Anonymous',
            isGuest: user?.labels?.includes('anonymous') || false
        };
    },

    // REALTIME: Setup realtime subscriptions for live synchronization
    setupRealtimeSubscriptions() {
        if (!syncRealtimeClient) {
            window.Debug.sync.warn('Realtime client not available - skipping realtime setup');
            return;
        }

        window.Debug.sync.info('Setting up realtime subscriptions');

        try {
            // Subscribe to all board updates in the current database
            const subscription = syncRealtimeClient.subscribe(
                [
                    'databases.' + window.APPWRITE_CONFIG.databaseId + '.collections.' + window.APPWRITE_CONFIG.collections.boards + '.documents'
                ],
                (response) => {
                    window.Debug.sync.info('Realtime board update received', {
                        events: response.events,
                        documentId: response.payload?.$id,
                        timestamp: response.timestamp
                    });

                    // Handle different event types
                    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                        this.handleRealtimeBoardCreate(response.payload);
                    } else if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                        this.handleRealtimeBoardUpdate(response.payload);
                    } else if (response.events.includes('databases.*.collections.*.documents.*.delete')) {
                        this.handleRealtimeBoardDelete(response.payload);
                    }
                }
            );

            // Store subscription for cleanup
            this.currentSubscription = subscription;

            window.Debug.sync.done('Realtime subscriptions established');

            // Update status indicator to show realtime is active
            this.updateSaveStatus('realtime-active');

        } catch (error) {
            window.Debug.sync.error('Failed to set up realtime subscriptions', error);
            this.updateSaveStatus('realtime-error');
        }
    },

    // REALTIME: Handle incoming real-time board creation events
    handleRealtimeBoardCreate(boardData) {
        try {
            window.Debug.sync.info('Processing realtime board creation', { documentId: boardData.$id });

            // Deserialize the board data
            const deserializedBoard = this.deserializeBoardFromAppwrite(boardData);

            // Get current boards and add new board
            const currentBoards = window.AppState?.get('boards') || [];

            // Check if board already exists (avoid duplicates)
            const existingIndex = currentBoards.findIndex(b => b.id === deserializedBoard.id);
            if (existingIndex === -1) {
                currentBoards.push(deserializedBoard);
                window.AppState?.set('boards', currentBoards);

                window.Debug.sync.done(`Realtime board added: ${deserializedBoard.name}`);
            } else {
                window.Debug.sync.detail('Realtime board already exists, ignoring duplicate');
            }

        } catch (error) {
            window.Debug.sync.error('Failed to handle realtime board creation', error);
        }
    },

    // REALTIME: Handle incoming real-time board update events
    handleRealtimeBoardUpdate(boardData) {
        try {
            window.Debug.sync.info('Processing realtime board update', { documentId: boardData.$id });

            // Deserialize the updated board data
            const deserializedBoard = this.deserializeBoardFromAppwrite(boardData);

            // Get current boards and update the matching board
            const currentBoards = window.AppState?.get('boards') || [];
            const boardIndex = currentBoards.findIndex(b => b.id === deserializedBoard.id);

            if (boardIndex !== -1) {
                // Merge the updated data
                currentBoards[boardIndex] = {
                    ...currentBoards[boardIndex],
                    ...deserializedBoard,
                    updatedAt: deserializedBoard.updatedAt
                };

                window.AppState?.set('boards', currentBoards);

                // If this is the current board and we can refresh the view, do so
                const currentBoardId = window.AppState?.get('currentBoardId');
                if (currentBoardId === deserializedBoard.id && window.initializeBoard) {
                    window.Debug.sync.detail('Refreshing current board view after realtime update');
                    setTimeout(() => window.initializeBoard(), 100);
                }

                window.Debug.sync.done(`Realtime board updated: ${deserializedBoard.name}`);
            } else {
                window.Debug.sync.warn('Board not found for realtime update', { boardId: deserializedBoard.id });
            }

        } catch (error) {
            window.Debug.sync.error('Failed to handle realtime board update', error);
        }
    },

    // REALTIME: Handle incoming real-time board deletion events
    handleRealtimeBoardDelete(boardData) {
        try {
            window.Debug.sync.info('Processing realtime board deletion', { documentId: boardData.$id });

            // Get current boards and remove the deleted board
            const currentBoards = window.AppState?.get('boards') || [];

            // Remove board by ID (need to extract from document ID format)
            const boardIdMatch = boardData.$id.match(/board_([a-zA-Z0-9\-]+)_[a-zA-Z0-9]{10}/);
            const boardId = boardIdMatch ? parseInt(boardIdMatch[1]) : null;

            if (boardId !== null) {
                const boardIndex = currentBoards.findIndex(b => b.id === boardId);
                if (boardIndex !== -1) {
                    const deletedBoard = currentBoards.splice(boardIndex, 1)[0];
                    window.AppState?.set('boards', currentBoards);

                    window.Debug.sync.done(`Realtime board deleted: ${deletedBoard.name}`);
                }
            } else {
                window.Debug.sync.warn('Could not extract board ID from deleted document', { documentId: boardData.$id });
            }

        } catch (error) {
            window.Debug.sync.error('Failed to handle realtime board deletion', error);
        }
    },

    // REALTIME: Cleanup realtime subscriptions
    cleanupRealtimeSubscriptions() {
        if (this.currentSubscription) {
            try {
                this.currentSubscription();
                window.Debug.sync.info('Realtime subscriptions cleaned up');
            } catch (error) {
                window.Debug.sync.warn('Error cleaning up realtime subscriptions', error);
            }
            this.currentSubscription = null;
        }
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
