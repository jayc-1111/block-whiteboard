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
        this.dev_mode = false;
        this.onboardingShown = false;
        this.lastSavedVersion = 0;
        this.hasUnsavedChanges = false;
        this.saveTimeout = null;
        this.syncInterval = null;
        this.config = SYNC_CONFIG;
        this.realtimeService = null;
    }

    // ====================
    // INITIALIZATION
    // ====================

    async initialize() {
        debugSync.start('Initializing sync service');
        try {
            // Initialize Realtime service if available
            if (window.appwriteRealtime) {
                this.realtimeService = window.appwriteRealtime;
                debugSync.step('Realtime service available');
            }
            
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
                this.dev_mode = latestBoard.dev_mode || false;
                this.onboardingShown = latestBoard.onboardingShown || false;

                debugSync.info(`Loaded board: ${this.currentBoard_id} (${this.currentBoardName})`);
            }

            // Set current board in Realtime service
            if (this.realtimeService) {
                this.realtimeService.setCurrentBoard(this.currentBoard_id);
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
                dev_mode: false,
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

            // Load folders from the collection instead of board state
            const folders = await this.loadFoldersFromCollection(this.currentBoard_id);
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

    async loadFoldersFromCollection(board_id) {
        try {
            debugSync.start(`Loading folders from collection for board ${board_id}`);
            
            const folders = await window.appwriteUtils.getFoldersByBoard_id(board_id);
            
            // Update AppState with fresh data from collection
            if (window.AppState) {
                window.AppState.set('folders', folders);
            }
            
            debugSync.done(`Loaded ${folders.length} folders from collection`);
            return folders || [];
        } catch (error) {
            debugSync.error('Failed to load folders from collection', error);
            return [];
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
            
            if (!this.isOnline) {
                debugSync.info('Adding board save to offline queue');
                this.addToOfflineQueue({
                    type: 'saveBoard',
                    data: this.collectBoardData()
                });
            }
            
            throw error;
        }
    }

    // ====================
    // FOLDER OPERATIONS
    // ====================

    async createFolder(board_id, folderData) {
        try {
            debugSync.start('Creating folder');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.createFolder(board_id, folderData);

            debugSync.done('Folder created successfully');
            
            // Update AppState immediately
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                window.AppState.set('folders', [...currentFolders, result]);
            }
            
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

    async updateFolder(folderId, updates) {
        try {
            debugSync.start('Updating folder');

            if (!window.APPWRITE_CONFIG?.databases?.main) {
                throw new Error('Database configuration not available');
            }

            const databaseId = window.APPWRITE_CONFIG.databases.main;
            const result = await window.appwriteUtils.updateDocument(
                databaseId,
                'folders',
                folderId,
                updates
            );

            debugSync.done('Folder updated successfully');
            
            // Update AppState immediately
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                const updatedFolders = currentFolders.map(folder => 
                    folder.$id === folderId ? result : folder
                );
                window.AppState.set('folders', updatedFolders);
            }
            
            return result;
        } catch (error) {
            debugSync.error('Failed to update folder', error);
            
            if (!this.isOnline) {
                debugSync.info('Adding folder update to offline queue');
                this.addToOfflineQueue({
                    type: 'updateFolder',
                    data: updates,
                    id: folderId
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
            
            // Update AppState immediately
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                const updatedFolders = currentFolders.filter(folder => folder.$id !== folderId);
                window.AppState.set('folders', updatedFolders);
            }
            
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
    // REALTIME EVENT HANDLERS
    // ====================

    handleFolderCreate(payload) {
        debugSync.step('Received folder create event from Realtime', payload);
        
        if (payload.board_id === this.currentBoard_id) {
            debugSync.info('Folder belongs to current board, updating local state');
            
            // Add to AppState
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                const newFolder = {
                    $id: payload.$id,
                    id: payload.$id,
                    board_id: payload.board_id,
                    title: payload.title,
                    position: payload.position,
                    files: payload.files || [],
                    createdAt: payload.$createdAt,
                    $updatedAt: payload.$updatedAt
                };
                window.AppState.set('folders', [...currentFolders, newFolder]);
            }
            
            // Update zenbanApp if available
            if (window.zenbanApp && window.zenbanApp.updateFolders) {
                const currentFolders = window.zenbanApp.getBoardData()?.folders || [];
                const newFolder = {
                    $id: payload.$id,
                    id: payload.$id,
                    board_id: payload.board_id,
                    title: payload.title,
                    position: payload.position,
                    files: payload.files || [],
                    createdAt: payload.$createdAt,
                    $updatedAt: payload.$updatedAt
                };
                window.zenbanApp.updateFolders([...currentFolders, newFolder]);
            }
        }
    }

    handleFolderUpdate(payload) {
        debugSync.step('Received folder update event from Realtime', payload);
        
        if (payload.board_id === this.currentBoard_id) {
            debugSync.info('Folder belongs to current board, updating local state');
            
            // Update AppState
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                const updatedFolders = currentFolders.map(folder => 
                    folder.$id === payload.$id ? payload : folder
                );
                window.AppState.set('folders', updatedFolders);
            }
            
            // Update zenbanApp if available
            if (window.zenbanApp && window.zenbanApp.updateFolders) {
                const currentFolders = window.zenbanApp.getBoardData()?.folders || [];
                const updatedFolders = currentFolders.map(folder => 
                    folder.$id === payload.$id ? payload : folder
                );
                window.zenbanApp.updateFolders(updatedFolders);
            }
        }
    }

    handleFolderDelete(payload) {
        debugSync.step('Received folder delete event from Realtime', payload);
        
        if (payload.board_id === this.currentBoard_id) {
            debugSync.info('Folder belongs to current board, updating local state');
            
            // Remove from AppState
            if (window.AppState) {
                const currentFolders = window.AppState.get('folders') || [];
                const updatedFolders = currentFolders.filter(folder => folder.$id !== payload.$id);
                window.AppState.set('folders', updatedFolders);
            }
            
            // Update zenbanApp if available
            if (window.zenbanApp && window.zenbanApp.updateFolders) {
                const currentFolders = window.zenbanApp.getBoardData()?.folders || [];
                const updatedFolders = currentFolders.filter(folder => folder.$id !== payload.$id);
                window.zenbanApp.updateFolders(updatedFolders);
            }
        }
    }

    handleBoardCreate(payload) {
        debugSync.step('Received board create event from Realtime', payload);
        // Handle board creation events if needed
    }

    handleBoardUpdate(payload) {
        debugSync.step('Received board update event from Realtime', payload);
        // Handle board update events if needed
    }

    handleBoardDelete(payload) {
        debugSync.step('Received board delete event from Realtime', payload);
        // Handle board deletion events if needed
    }

    handleCanvasHeaderCreate(payload) {
        debugSync.step('Received canvas header create event from Realtime', payload);
        // Handle canvas header creation events if needed
    }

    handleCanvasHeaderUpdate(payload) {
        debugSync.step('Received canvas header update event from Realtime', payload);
        // Handle canvas header update events if needed
    }

    handleCanvasHeaderDelete(payload) {
        debugSync.step('Received canvas header delete event from Realtime', payload);
        // Handle canvas header deletion events if needed
    }

    handleDrawingPathCreate(payload) {
        debugSync.step('Received drawing path create event from Realtime', payload);
        // Handle drawing path creation events if needed
    }

    handleDrawingPathUpdate(payload) {
        debugSync.step('Received drawing path update event from Realtime', payload);
        // Handle drawing path update events if needed
    }

    handleDrawingPathDelete(payload) {
        debugSync.step('Received drawing path delete event from Realtime', payload);
        // Handle drawing path deletion events if needed
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
                dev_mode: this.dev_mode,
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
            dev_mode: this.dev_mode,
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

    triggerSync() {
        if (this.isSyncing || !this.isOnline) {
            return;
        }
        
        this.processOfflineQueue();
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0 || !this.isOnline) {
            return;
        }
        
        this.isSyncing = true;
        
        try {
            debugSync.start(`Processing ${this.offlineQueue.length} offline operations`);
            
            for (const operation of this.offlineQueue) {
                await this.processOfflineOperation(operation);
            }
            
            this.offlineQueue = [];
            debugSync.done('Offline queue processed successfully');
            
        } catch (error) {
            debugSync.error('Failed to process offline queue', error);
        } finally {
            this.isSyncing = false;
        }
    }

    async processOfflineOperation(operation) {
        switch (operation.type) {
            case 'createFolder':
                await this.createFolder(operation.data.board_id, operation.data);
                break;
            case 'updateFolder':
                await this.updateFolder(operation.id, operation.data);
                break;
            case 'deleteFolder':
                await this.deleteFolder(operation.id);
                break;
            case 'saveBoard':
                await this.saveBoard(operation.data);
                break;
            default:
                debugSync.warn(`Unknown offline operation type: ${operation.type}`);
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
                dbService: !!window.dbService,
                realtime: !!window.appwriteRealtime
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
