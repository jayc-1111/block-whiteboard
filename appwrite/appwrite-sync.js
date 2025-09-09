/**
 * Appwrite Sync Service
 *
 * This service handles synchronization of boards, folders, canvas headers, and drawing paths
 * between the client and Appwrite database with enhanced error handling and retry logic.
 */

// ====================
// CONFIGURATION
// ====================
const SYNC_CONFIG = {
    // Retry configuration
    retry: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
    },

    // Sync configuration
    sync: {
        batchSize: 50,
        autoSyncInterval: 30000, // 30 seconds
        maxSyncAttempts: 3,
        offlineMode: true,
        conflictResolution: 'server_wins' // 'server_wins', 'client_wins', 'manual'
    },

    // Conflict resolution
    conflict: {
        autoResolve: true,
        resolutionStrategy: 'timestamp', // 'timestamp', 'manual', 'merge'
        mergeStrategy: 'preserve_client' // 'preserve_client', 'preserve_server', 'merge'
    },

    // Debug logging
    debug: {
        enabled: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        logSensors: true,
        logSyncOps: true,
        logPerformance: true
    }
};

// ====================
// DEBUG UTILITIES
// ====================

const debugSync = {
    info: (msg, data) => console.log(`🔄 APPWRITE_SYNC: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE_SYNC ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE_SYNC: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE_SYNC: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE_SYNC: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE_SYNC: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE_SYNC: ${msg || 'Operation completed'}`),
    debug: (msg, data) => console.log(`🔍 APPWRITE_SYNC: ${msg}`, data || '')
};

// ====================
// SYNC SERVICE CLASS
// ====================

class SyncService {
    constructor() {
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.isSyncing = false;
        this.lastSyncTime = 0;
        this.syncHistory = [];
        this.listeners = new Map();
        this.pendingOperations = new Map();
        this.offlineQueue = [];
        this.currentBoard_id = null;
        this.currentBoardName = null;
        this.boardVersion = 0;
        this.isDevMode = false;
        this.onboardingShown = false;
        this.lastSavedVersion = 0;
        this.hasUnsavedChanges = false;
        this.saveTimeout = null;
        this.syncInterval = null;
        this.config = SYNC_CONFIG;
    }

    // ====================
    // INITIALIZATION
    // ====================

    async initialize() {
        debugSync.start('Initializing sync service');
        try {
            this.setupEventListeners();
            this.loadConfiguration();
            this.startAutoSync();
            
            this.isInitialized = true;
            debugSync.done('Sync service initialized successfully');
            
            // Trigger initial sync
            setTimeout(() => this.loadInitialBoards(), 1000);
            
        } catch (error) {
            debugSync.error('Failed to initialize sync service', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            debugSync.info('Browser came online, triggering sync');
            this.isOnline = true;
            this.triggerSync();
        });

        window.addEventListener('offline', () => {
            debugSync.info('Browser went offline');
            this.isOnline = false;
            this.saveCurrentState();
        });

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                debugSync.info('Page hidden, saving current state');
                this.saveCurrentState();
            } else {
                debugSync.info('Page visible, checking for updates');
                this.loadInitialBoards();
            }
        });

        // Page unload
        window.addEventListener('beforeunload', () => {
            if (this.hasUnsavedChanges) {
                debugSync.info('Page unloading with unsaved changes, saving state');
                this.saveCurrentState();
            }
        });

        // Keyboard shortcuts for sync
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                debugSync.info('Ctrl/Cmd+S pressed, saving current state');
                this.saveCurrentState();
            }
        });
    }

    loadConfiguration() {
        if (window.APPWRITE_CONFIG?.sync) {
            Object.assign(this.config, window.APPWRITE_CONFIG.sync);
        }
    }

    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        if (this.config.sync.autoSyncInterval > 0) {
            this.syncInterval = setInterval(() => {
                this.triggerSync();
            }, this.config.sync.autoSyncInterval);
            
            debugSync.info(`Auto-sync started, interval: ${this.config.sync.autoSyncInterval}ms`);
        }
    }

    // ====================
    // BOARD OPERATIONS
    // ====================

    async loadInitialBoards() {
        debugSync.start('Loading initial boards');
        try {
            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            // Use dbService.loadBoards to list boards
            const boards = await window.dbService.loadBoards();
            // Filter and sort manually since dbService.loadBoards() may not have query options
            const sortedBoards = boards
                .sort((a, b) => new Date(b.$updatedAt || 0) - new Date(a.$updatedAt || 0))
                .slice(0, 10);

            if (boards.length === 0) {
                // No boards exist, create a default board
                debugSync.info('No boards found, creating default board');
                const defaultBoard = await this.createDefaultBoard();
                this.currentBoard_id = defaultBoard.board_id;
                this.currentBoardName = defaultBoard.name;
            } else {
                // Load the most recently updated board
                const latestBoard = sortedBoards[0];
                this.currentBoard_id = latestBoard.id;
                this.currentBoardName = latestBoard.name;
                this.boardVersion = latestBoard.version || 0;
                this.isDevMode = latestBoard.isDevMode || false;
                this.onboardingShown = latestBoard.onboardingShown || false;

                debugSync.info(`Loaded board: ${this.currentBoard_id} (${this.currentBoardName})`);
            }

            // Load board data
            await this.loadBoardData();

            debugSync.done('Initial boards loaded successfully');
        } catch (error) {
            debugSync.error('Failed to load initial boards', error);
            throw error;
        }
    }

    async createDefaultBoard() {
        try {
            const documentId = Appwrite.ID.unique();

            const boardData = {
                id: documentId,        // 👈 ADD THIS - saveBoard() uses this as documentID
                board_id: documentId,   // Keep as internal reference (they can be the same)
                name: 'Board 1',     // ✅ Now matches frontend naming convention
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: false,
                onboardingShown: false,
                version: 1,
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };

            debugSync.info('Creating default board with dbService');

            // Use dbService.saveBoard instead - includes proper email field handling
            const result = await window.dbService.saveBoard(boardData);

            debugSync.info('Created default board', { board_id: boardData.board_id, name: boardData.name, documentId: result.id });
            return {
                ...boardData,
                $id: result.id,
                $createdAt: result.createdAt,
                $$updatedAt: result.$updatedAt
            };
        } catch (error) {
            debugSync.error('Failed to create default board', error);
            throw error;
        }
    }

    async loadBoardData() {
        if (!this.currentBoard_id) {
            return;
        }

        try {
            debugSync.start(`Loading board data for ${this.currentBoard_id}`);

            // Load folders
            const folders = await this.loadFolders(this.currentBoard_id);
            debugSync.info(`Loaded ${folders.length} folders`);

            // Load canvas headers
            const canvasHeaders = await this.loadCanvasHeaders(this.currentBoard_id);
            debugSync.info(`Loaded ${canvasHeaders.length} canvas headers`);

            // Load drawing paths
            const drawingPaths = await this.loadDrawingPaths(this.currentBoard_id);
            debugSync.info(`Loaded ${drawingPaths.length} drawing paths`);

            // Update global state
            if (window.zenbanApp) {
                window.zenbanApp.setBoardData({
                    folders,
                    canvasHeaders,
                    drawingPaths
                });
            }

            debugSync.done('Board data loaded successfully');
        } catch (error) {
            debugSync.error('Failed to load board data', error);
            throw error;
        }
    }

    async loadFolders(board_id) {
        try {
            const folders = await window.appwriteUtils.getFoldersByBoard_id(board_id);
            return folders || [];
        } catch (error) {
            debugSync.error('Failed to load folders', error);
            return [];
        }
    }

    async loadCanvasHeaders(board_id) {
        try {
            const canvasHeaders = await window.appwriteUtils.getCanvasHeadersByBoard_id(board_id);
            return canvasHeaders || [];
        } catch (error) {
            debugSync.error('Failed to load canvas headers', error);
            return [];
        }
    }

    async loadDrawingPaths(board_id) {
        try {
            const drawingPaths = await window.appwriteUtils.getDrawingPathsByBoard_id(board_id);
            return drawingPaths || [];
        } catch (error) {
            debugSync.error('Failed to load drawing paths', error);
            return [];
        }
    }

    // ====================
    // SAVE OPERATIONS
    // ====================

    async saveCurrentState() {
        if (!this.currentBoard_id || !this.hasUnsavedChanges) {
            return;
        }

        try {
            debugSync.start('Saving current board state');

            const boardData = this.collectBoardData();

            // Use dbService.loadBoard to get current board first
            const currentBoard = await window.dbService.loadBoard(this.currentBoard_id);
            if (!currentBoard) {
                throw new Error(`Board not found: ${this.currentBoard_id}`);
            }

            // Update board using dbService
            const $updatedAta = {
                id: currentBoard.id,
                board_id: this.currentBoard_id,
                name: currentBoard.name,
                ...boardData,
                version: this.boardVersion + 1,
                $updatedAt: new Date().toISOString()
            };

            await window.dbService.saveBoard($updatedAta);

            this.lastSavedVersion = this.boardVersion + 1;
            this.hasUnsavedChanges = false;
            this.boardVersion++;

            debugSync.done('Board state saved successfully');
        } catch (error) {
            debugSync.error('Failed to save board state', error);
            throw error;
        }
    }

    collectBoardData() {
        if (!window.zenbanApp) {
            return {};
        }

        return {
            folders: window.zenbanApp.boardData?.folders || [],
            canvasHeaders: window.zenbanApp.boardData?.canvasHeaders || [],
            drawingPaths: window.zenbanApp.boardData?.drawingPaths || []
        };
    }

    // ====================
    // SYNC OPERATIONS
    // ====================

    async triggerSync() {
        if (!this.isOnline || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;
            debugSync.start('Triggering sync operation');

            // Sync current board
            if (this.currentBoard_id) {
                await this.syncBoard(this.currentBoard_id);
            }

            // Process offline queue
            await this.processOfflineQueue();

            debugSync.done('Sync operation completed successfully');
        } catch (error) {
            debugSync.error('Sync operation failed', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    async syncBoard(board_id) {
        try {
            debugSync.start(`Syncing board ${board_id}`);

            // Get latest board data
            const board = await window.appwriteUtils.getBoardById(board_id);
            
            if (!board) {
                throw new Error(`Board ${board_id} not found`);
            }

            // Check for conflicts
            const hasConflict = this.checkForConflict(board);
            if (hasConflict) {
                debugSync.warn('Conflict detected during sync');
                await this.resolveConflict(board);
            }

            // Load updated board data
            this.currentBoard_id = board.board_id;
            this.currentBoardName = board.name;
            this.boardVersion = board.version || 0;
            this.isDevMode = board.isDevMode || false;
            this.onboardingShown = board.onboardingShown || false;

            await this.loadBoardData();

            debugSync.done(`Board ${board_id} synced successfully`);
        } catch (error) {
            debugSync.error(`Failed to sync board ${board_id}`, error);
            throw error;
        }
    }

    checkForConflict(serverBoard) {
        if (!window.zenbanApp || !window.zenbanApp.boardData) {
            return false;
        }

        const clientVersion = this.boardVersion;
        const serverVersion = serverBoard.version || 0;

        return clientVersion !== serverVersion;
    }

    async resolveConflict(serverBoard) {
        try {
            debugSync.start('Resolving conflict');

            const resolutionStrategy = this.config.conflict.resolutionStrategy;
            
            switch (resolutionStrategy) {
                case 'timestamp':
                    const serverTime = new Date(serverBoard.$updatedAt);
                    const clientTime = new Date();
                    
                    if (serverTime > clientTime) {
                        debugSync.info('Server data is newer, loading server version');
                        await this.loadBoardData();
                    } else {
                        debugSync.info('Client data is newer, keeping client version');
                    }
                    break;
                    
                case 'client_wins':
                    debugSync.info('Client wins, keeping current data');
                    break;
                    
                case 'server_wins':
                    debugSync.info('Server wins, loading server data');
                    await this.loadBoardData();
                    break;
                    
                case 'manual':
                    debugSync.info('Manual conflict resolution required');
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showNotification(
                            'Data conflict detected. Your changes will be merged.',
                            'warning'
                        );
                    }
                    await this.loadBoardData();
                    break;
                    
                default:
                    debugSync.warn('Unknown conflict resolution strategy, using client wins');
                    break;
            }

            debugSync.done('Conflict resolved');
        } catch (error) {
            debugSync.error('Failed to resolve conflict', error);
            throw error;
        }
    }

    async processOfflineQueue() {
        if (!this.offlineQueue.length) {
            return;
        }

        try {
            debugSync.start(`Processing ${this.offlineQueue.length} offline operations`);

            for (const operation of this.offlineQueue) {
                try {
                    await this.executeOperation(operation);
                } catch (error) {
                    debugSync.error('Failed to execute offline operation', error);
                }
            }

            this.offlineQueue = [];
            debugSync.done('Offline queue processed successfully');
        } catch (error) {
            debugSync.error('Failed to process offline queue', error);
            throw error;
        }
    }

    executeOperation(operation) {
        switch (operation.type) {
            case 'createFolder':
                return this.createFolder(operation.data);
            case 'updateFolder':
                return this.updateFolder(operation.data);
            case 'deleteFolder':
                return this.deleteFolder(operation.id);
            case 'createHeader':
                return this.createHeader(operation.data);
            case 'updateHeader':
                return this.updateHeader(operation.data);
            case 'deleteHeader':
                return this.deleteHeader(operation.id);
            case 'createPath':
                return this.createPath(operation.data);
            case 'updatePath':
                return this.updatePath(operation.data);
            case 'deletePath':
                return this.deletePath(operation.id);
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    // ====================
    // FOLDER OPERATIONS
    // ====================

    async createFolder(folderData) {
        try {
            debugSync.start('Creating folder');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.createFolder(
                this.currentBoard_id,
                folderData
            );

            debugSync.done('Folder created successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to create folder', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding folder creation to offline queue');
                this.addToOfflineQueue({
                    type: 'createFolder',
                    data: folderData
                });
            }
            
            throw error;
        }
    }

    async updateFolder(folderData) {
        try {
            debugSync.start('Updating folder');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.updateDocument(
                databaseId,
                'folders',
                folderData.$id,
                folderData
            );

            debugSync.done('Folder updated successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to update folder', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding folder update to offline queue');
                this.addToOfflineQueue({
                    type: 'updateFolder',
                    data: folderData
                });
            }
            
            throw error;
        }
    }

    async deleteFolder(folderId) {
        try {
            debugSync.start('Deleting folder');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.deleteDocument(
                databaseId,
                'folders',
                folderId
            );

            debugSync.done('Folder deleted successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to delete folder', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding folder deletion to offline queue');
                this.addToOfflineQueue({
                    type: 'deleteFolder',
                    id: folderId
                });
            }
            
            throw error;
        }
    }

    // ====================
    // CANVAS HEADER OPERATIONS
    // ====================

    async createHeader(headerData) {
        try {
            debugSync.start('Creating canvas header');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.createCanvasHeader(
                this.currentBoard_id,
                headerData
            );

            debugSync.done('Canvas header created successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to create canvas header', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding header creation to offline queue');
                this.addToOfflineQueue({
                    type: 'createHeader',
                    data: headerData
                });
            }
            
            throw error;
        }
    }

    async updateHeader(headerData) {
        try {
            debugSync.start('Updating canvas header');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.updateDocument(
                databaseId,
                'canvasHeaders',
                headerData.$id,
                headerData
            );

            debugSync.done('Canvas header updated successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to update canvas header', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding header update to offline queue');
                this.addToOfflineQueue({
                    type: 'updateHeader',
                    data: headerData
                });
            }
            
            throw error;
        }
    }

    async deleteHeader(headerId) {
        try {
            debugSync.start('Deleting canvas header');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.deleteDocument(
                databaseId,
                'canvasHeaders',
                headerId
            );

            debugSync.done('Canvas header deleted successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to delete canvas header', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding header deletion to offline queue');
                this.addToOfflineQueue({
                    type: 'deleteHeader',
                    id: headerId
                });
            }
            
            throw error;
        }
    }

    // ====================
    // DRAWING PATH OPERATIONS
    // ====================

    async createPath(pathData) {
        try {
            debugSync.start('Creating drawing path');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.createDrawingPath(
                this.currentBoard_id,
                pathData
            );

            debugSync.done('Drawing path created successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to create drawing path', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding path creation to offline queue');
                this.addToOfflineQueue({
                    type: 'createPath',
                    data: pathData
                });
            }
            
            throw error;
        }
    }

    async updatePath(pathData) {
        try {
            debugSync.start('Updating drawing path');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.updateDocument(
                databaseId,
                'drawingPaths',
                pathData.$id,
                pathData
            );

            debugSync.done('Drawing path updated successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to update drawing path', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding path update to offline queue');
                this.addToOfflineQueue({
                    type: 'updatePath',
                    data: pathData
                });
            }
            
            throw error;
        }
    }

    async deletePath(pathId) {
        try {
            debugSync.start('Deleting drawing path');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.deleteDocument(
                databaseId,
                'drawingPaths',
                pathId
            );

            debugSync.done('Drawing path deleted successfully');
            return result;
        } catch (error) {
            debugSync.error('Failed to delete drawing path', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding path deletion to offline queue');
                this.addToOfflineQueue({
                    type: 'deletePath',
                    id: pathId
                });
            }
            
            throw error;
        }
    }

    // ====================
    // UTILITY METHODS
    // ====================

    collectBoardData() {
        if (!window.zenbanApp) {
            return {
                board_id: this.currentBoard_id,
                name: this.currentBoardName,
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                isDevMode: this.isDevMode,
                onboardingShown: this.onboardingShown,
                version: this.boardVersion,
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
        }
        
        const boardData = window.zenbanApp.getBoardData();
        return {
            board_id: this.currentBoard_id,
            name: this.currentBoardName,
            folders: boardData?.folders || [],
            canvasHeaders: boardData?.canvasHeaders || [],
            drawingPaths: boardData?.drawingPaths || [],
            isDevMode: this.isDevMode,
            onboardingShown: this.onboardingShown,
            version: this.boardVersion,
            createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        };
    }

    addToOfflineQueue(operation) {
        this.offlineQueue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            attempt: 0
        });
        
        debugSync.info(`Operation added to offline queue: ${operation.type}`);
    }

    setHasUnsavedChanges(hasUnsavedChanges) {
        this.hasUnsavedChanges = hasUnsavedChanges;
        
        if (hasUnsavedChanges) {
            // Debounce save operation
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
            
            this.saveTimeout = setTimeout(() => {
                this.saveCurrentState();
            }, 2000);
        }
    }

    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncTime: this.lastSyncTime,
            currentBoard_id: this.currentBoard_id,
            currentBoardName: this.currentBoardName,
            boardVersion: this.boardVersion,
            hasUnsavedChanges: this.hasUnsavedChanges,
            offlineQueueLength: this.offlineQueue.length
        };
    }

    // ====================
    // CLEANUP
    // ====================

    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.listeners.clear();
        this.pendingOperations.clear();
        this.offlineQueue = [];
        
        debugSync.info('Sync service destroyed');
    }
}

// ====================
// GLOBAL EXPORTS
// ====================

window.appwriteSync = new SyncService(); // ✅ CRITICAL: Export as appwriteSync to match service status check
window.syncService = new SyncService();  // ✅ Keep backward compatibility

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncService;
}

// ====================
// DEPENDENCY CHECK BEFORE INIT
// ====================

function waitForDependencies() {
    debugSync.step('Waiting for dependencies before initializing sync service...');

    return new Promise((resolve) => {
        const checkDeps = () => {
            const status = {
                config: !!window.APPWRITE_CONFIG,
                databases: !!window.appwriteDatabases,
                utils: !!window.appwriteUtils,
                dbService: !!window.dbService
            };

            debugSync.detail('Dependency status', status);

            // Check if all required dependencies are loaded
            if (window.APPWRITE_CONFIG && window.appwriteDatabases && window.appwriteUtils && window.dbService) {
                debugSync.done('All dependencies loaded, proceeding with initialization');
                resolve();
            } else {
                debugSync.step('Dependencies not ready, waiting...');
                setTimeout(checkDeps, 100);
            }
        };

        checkDeps();
    });
}

// Auto-initialize when DOM is ready AND ALL DEPENDENCIES ARE LOADED
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await waitForDependencies();
            await window.appwriteSync.initialize();
            debugSync.done('Sync service initialized successfully');
        } catch (error) {
            debugSync.error('Failed to initialize sync service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    });
} else {
    (async () => {
        try {
            await waitForDependencies();
            await window.appwriteSync.initialize();
            debugSync.done('Sync service initialized successfully');
        } catch (error) {
            debugSync.error('Failed to initialize sync service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    })();
}

debugSync.info('Appwrite sync service module loaded');
