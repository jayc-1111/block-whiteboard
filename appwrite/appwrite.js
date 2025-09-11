/**
 * Appwrite Integration
 *
 * This file handles Appwrite database operations with enhanced error handling,
 * retry logic, and offline support for boards, folders, canvas headers, and drawing paths.
 */

// ====================
// CONFIGURATION
// ====================

const APPWRITE_CONFIG = {
    // Appwrite configuration
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: 'zenban',
    databaseId: 'zenban',
    collectionId: 'boards',
    bucketId: 'buckets',
    userId: null,
    user: null,
    
    // Collection mappings
    collections: {
        boards: 'boards',
        folders: 'folders',
        canvasHeaders: 'canvasHeaders',
        drawingPaths: 'drawingPaths',
        files: 'files',
        bookmarks: 'bookmarks'
    },
    
    // Retry configuration
    retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
    },

    // Database configuration
    databases: {
        main: 'zenban'
    },

    // Sync configuration
    sync: {
        autoSyncInterval: 30000,
        maxSyncAttempts: 3,
        offlineMode: true,
        conflictResolution: 'server_wins'
    }
};

// ====================
// DEBUG UTILITIES
// ====================

const debugAppwrite = {
    info: (msg, data) => console.log(`🔵 APPWRITE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE: ${msg || 'Operation completed'}`),
    debug: (msg, data) => console.log(`🔍 APPWRITE: ${msg}`, data || '')
};

// ====================
// APPWRITE SERVICE CLASS
// ====================

class AppwriteService {
    constructor(config = APPWRITE_CONFIG) {
        this.config = { ...APPWRITE_CONFIG, ...config };
        this.client = null;
        this.account = null;
        this.databases = {};
        this.storage = null;
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.retryCount = 0;
        this.maxRetries = this.config.retry.maxAttempts;
        this.currentBoard_id = null;
        this.currentBoardName = null;
        this.boardVersion = 0;
        this.pendingOperations = [];
        this.offlineQueue = [];
        this.syncInterval = null;
        this.dev_mode = false;
        this.onboardingShown = false;
        this.hasUnsavedChanges = false;
        this.saveTimeout = null;
        this.realtimeService = null;
        this.syncService = null;
        
        this.setupEventListeners();
    }

    // ====================
    // INITIALIZATION
    // ====================

    async initialize() {
        debugAppwrite.start('Initializing Appwrite service');
        try {
            // Initialize Appwrite client
            await this.initializeClient();
            
            // Initialize services
            await this.initializeServices();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load user session
            await this.loadUserSession();
            
            // Start auto-sync
            this.startAutoSync();
            
            this.isInitialized = true;
            debugAppwrite.done('Appwrite service initialized successfully');
            
        } catch (error) {
            debugAppwrite.error('Failed to initialize Appwrite service', error);
            throw error;
        }
    }

    async initializeClient() {
        debugAppwrite.start('Initializing Appwrite client');
        
        try {
            // Initialize Appwrite client
            this.client = new Appwrite.Client();
            this.account = new Appwrite.Account(this.client);
            this.databases = {};
            this.storage = new Appwrite.Storage(this.client);
            
            // Configure client
            this.client
                .setEndpoint(this.config.endpoint)
                .setProject(this.config.projectId);
                
            debugAppwrite.done('Appwrite client initialized');
            
        } catch (error) {
            debugAppwrite.error('Failed to initialize Appwrite client', error);
            throw error;
        }
    }

    async initializeServices() {
        debugAppwrite.start('Initializing Appwrite services');
        
        try {
            // Initialize databases
            for (const [key, databaseId] of Object.entries(this.config.databases)) {
                this.databases[key] = new Appwrite.Databases(this.client);
            }
            
            debugAppwrite.done('Appwrite services initialized');
            
        } catch (error) {
            debugAppwrite.error('Failed to initialize Appwrite services', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            debugAppwrite.info('Browser came online, triggering sync');
            this.isOnline = true;
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            debugAppwrite.info('Browser went offline');
            this.isOnline = false;
        });

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                debugAppwrite.info('Page hidden, saving current state');
                this.saveCurrentState();
            } else {
                debugAppwrite.info('Page visible, checking for updates');
                this.loadCurrentBoard();
            }
        });

        // Page unload
        window.addEventListener('beforeunload', () => {
            if (this.hasUnsavedChanges) {
                debugAppwrite.info('Page unloading with unsaved changes, saving state');
                this.saveCurrentState();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                debugAppwrite.info('Ctrl/Cmd+S pressed, saving current state');
                this.saveCurrentState();
            }
        });
    }

    async loadUserSession() {
        try {
            debugAppwrite.start('Loading user session');
            
            const user = await this.account.get();
            this.config.userId = user.$id;
            this.config.user = user;
            
            debugAppwrite.done('User session loaded', { userId: user.$id });
            
        } catch (error) {
            if (error.code === 401) {
                debugAppwrite.info('No active user session, proceeding as anonymous');
                this.config.userId = null;
                this.config.user = null;
            } else {
                debugAppwrite.error('Failed to load user session', error);
                throw error;
            }
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
            
            debugAppwrite.info(`Auto-sync started, interval: ${this.config.sync.autoSyncInterval}ms`);
        }
    }

    // ====================
    // BOARD OPERATIONS
    // ====================

    async loadBoards() {
        try {
            debugAppwrite.start('Loading boards');
            
            const databaseId = this.config.databases.main;
            const boardsCollectionId = this.config.collections.boards;
            
            const response = await this.databases[databaseId].listDocuments(
                boardsCollectionId,
                [
                    Appwrite.Query.orderDesc('$updatedAt'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            const boards = response.documents || [];
            
            // Add board_id field if missing
            boards.forEach(board => {
                if (!board.board_id) {
                    board.board_id = board.id;
                }
            });
            
            debugAppwrite.done(`Loaded ${boards.length} boards`);
            return boards;
            
        } catch (error) {
            debugAppwrite.error('Failed to load boards', error);
            throw error;
        }
    }

    async createBoard(boardData) {
        try {
            debugAppwrite.start('Creating board');
            
            const databaseId = this.config.databases.main;
            const boardsCollectionId = this.config.collections.boards;
            
            const documentId = Appwrite.ID.unique();
            
            const board = {
                id: documentId,
                board_id: documentId,
                name: boardData.name || 'New Board',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                dev_mode: false,
                onboardingShown: false,
                version: 1,
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
            
            const result = await this.databases[databaseId].createDocument(
                boardsCollectionId,
                documentId,
                board
            );
            
            debugAppwrite.done('Board created successfully', { board_id: board.board_id, name: board.name, documentId: result.$id });
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to create board', error);
            throw error;
        }
    }

    async loadBoard(board_id) {
        try {
            debugAppwrite.start(`Loading board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const boardsCollectionId = this.config.collections.boards;
            
            const result = await this.databases[databaseId].getDocument(
                boardsCollectionId,
                board_id
            );
            
            debugAppwrite.done('Board loaded successfully', { board_id: result.board_id, name: result.name });
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to load board', error);
            throw error;
        }
    }

    async updateBoard(board_id, updates) {
        try {
            debugAppwrite.start(`Updating board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const boardsCollectionId = this.config.collections.boards;
            
            const result = await this.databases[databaseId].updateDocument(
                boardsCollectionId,
                board_id,
                updates
            );
            
            debugAppwrite.done('Board updated successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to update board', error);
            throw error;
        }
    }

    async deleteBoard(board_id) {
        try {
            debugAppwrite.start(`Deleting board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const boardsCollectionId = this.config.collections.boards;
            
            const result = await this.databases[databaseId].deleteDocument(
                boardsCollectionId,
                board_id
            );
            
            debugAppwrite.done('Board deleted successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to delete board', error);
            throw error;
        }
    }

    async saveBoard(boardData) {
        try {
            debugAppwrite.start(`Saving board: ${boardData.board_id}`);
            
            // Get current board data first
            const currentBoard = await this.loadBoard(boardData.board_id);
            if (!currentBoard) {
                throw new Error(`Board not found: ${boardData.board_id}`);
            }
            
            // Prepare update data
            const updateData = {
                ...boardData,
                version: this.boardVersion + 1,
                $updatedAt: new Date().toISOString()
            };
            
            // Update board
            const result = await this.updateBoard(boardData.board_id, updateData);
            
            this.lastSavedVersion = this.boardVersion + 1;
            this.boardVersion++;
            this.hasUnsavedChanges = false;
            
            debugAppwrite.done('Board saved successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to save board', error);
            throw error;
        }
    }

    // ====================
    // FOLDER OPERATIONS
    // ====================

    async createFolder(board_id, folderData) {
        try {
            debugAppwrite.start(`Creating folder for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const foldersCollectionId = this.config.collections.folders;
            
            const folderId = Appwrite.ID.unique();
            
            const folder = {
                id: folderId,
                board_id: board_id,
                title: folderData.title || 'New Folder',
                position: folderData.position || 0,
                files: folderData.files || [],
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
            
            const result = await this.databases[databaseId].createDocument(
                foldersCollectionId,
                folderId,
                folder
            );
            
            debugAppwrite.done('Folder created successfully', { folderId: result.$id, title: result.title });
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to create folder', error);
            throw error;
        }
    }

    async getFoldersByBoard_id(board_id) {
        try {
            debugAppwrite.start(`Loading folders for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const foldersCollectionId = this.config.collections.folders;
            
            const response = await this.databases[databaseId].listDocuments(
                foldersCollectionId,
                [
                    Appwrite.Query.equal('board_id', board_id),
                    Appwrite.Query.orderAsc('position'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            const folders = response.documents || [];
            
            debugAppwrite.done(`Loaded ${folders.length} folders for board: ${board_id}`);
            return folders;
            
        } catch (error) {
            debugAppwrite.error('Failed to load folders', error);
            throw error;
        }
    }

    async updateFolder(folderId, updates) {
        try {
            debugAppwrite.start(`Updating folder: ${folderId}`);
            
            const databaseId = this.config.databases.main;
            const foldersCollectionId = this.config.collections.folders;
            
            const result = await this.databases[databaseId].updateDocument(
                foldersCollectionId,
                folderId,
                updates
            );
            
            debugAppwrite.done('Folder updated successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to update folder', error);
            throw error;
        }
    }

    async deleteFolder(folderId) {
        try {
            debugAppwrite.start(`Deleting folder: ${folderId}`);
            
            const databaseId = this.config.databases.main;
            const foldersCollectionId = this.config.collections.folders;
            
            const result = await this.databases[databaseId].deleteDocument(
                foldersCollectionId,
                folderId
            );
            
            debugAppwrite.done('Folder deleted successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to delete folder', error);
            throw error;
        }
    }

    // ====================
    // CANVAS HEADER OPERATIONS
    // ====================

    async createCanvasHeader(board_id, headerData) {
        try {
            debugAppwrite.start(`Creating canvas header for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const canvasHeadersCollectionId = this.config.collections.canvasHeaders;
            
            const headerId = Appwrite.ID.unique();
            
            const header = {
                id: headerId,
                board_id: board_id,
                content: headerData.content || '',
                position: headerData.position || { x: 0, y: 0 },
                size: headerData.size || { width: 200, height: 50 },
                style: headerData.style || { color: '#000000', fontSize: 16 },
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
            
            const result = await this.databases[databaseId].createDocument(
                canvasHeadersCollectionId,
                headerId,
                header
            );
            
            debugAppwrite.done('Canvas header created successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to create canvas header', error);
            throw error;
        }
    }

    async getCanvasHeadersByBoard_id(board_id) {
        try {
            debugAppwrite.start(`Loading canvas headers for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const canvasHeadersCollectionId = this.config.collections.canvasHeaders;
            
            const response = await this.databases[databaseId].listDocuments(
                canvasHeadersCollectionId,
                [
                    Appwrite.Query.equal('board_id', board_id),
                    Appwrite.Query.orderAsc('position.y'),
                    Appwrite.Query.orderAsc('position.x'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            const canvasHeaders = response.documents || [];
            
            debugAppwrite.done(`Loaded ${canvasHeaders.length} canvas headers for board: ${board_id}`);
            return canvasHeaders;
            
        } catch (error) {
            debugAppwrite.error('Failed to load canvas headers', error);
            throw error;
        }
    }

    async updateCanvasHeader(headerId, updates) {
        try {
            debugAppwrite.start(`Updating canvas header: ${headerId}`);
            
            const databaseId = this.config.databases.main;
            const canvasHeadersCollectionId = this.config.collections.canvasHeaders;
            
            const result = await this.databases[databaseId].updateDocument(
                canvasHeadersCollectionId,
                headerId,
                updates
            );
            
            debugAppwrite.done('Canvas header updated successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to update canvas header', error);
            throw error;
        }
    }

    async deleteCanvasHeader(headerId) {
        try {
            debugAppwrite.start(`Deleting canvas header: ${headerId}`);
            
            const databaseId = this.config.databases.main;
            const canvasHeadersCollectionId = this.config.collections.canvasHeaders;
            
            const result = await this.databases[databaseId].deleteDocument(
                canvasHeadersCollectionId,
                headerId
            );
            
            debugAppwrite.done('Canvas header deleted successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to delete canvas header', error);
            throw error;
        }
    }

    // ====================
    // DRAWING PATH OPERATIONS
    // ====================

    async createDrawingPath(board_id, pathData) {
        try {
            debugAppwrite.start(`Creating drawing path for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const drawingPathsCollectionId = this.config.collections.drawingPaths;
            
            const pathId = Appwrite.ID.unique();
            
            const path = {
                id: pathId,
                board_id: board_id,
                points: pathData.points || [],
                color: pathData.color || '#000000',
                width: pathData.width || 2,
                opacity: pathData.opacity || 1,
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
            
            const result = await this.databases[databaseId].createDocument(
                drawingPathsCollectionId,
                pathId,
                path
            );
            
            debugAppwrite.done('Drawing path created successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to create drawing path', error);
            throw error;
        }
    }

    async getDrawingPathsByBoard_id(board_id) {
        try {
            debugAppwrite.start(`Loading drawing paths for board: ${board_id}`);
            
            const databaseId = this.config.databases.main;
            const drawingPathsCollectionId = this.config.collections.drawingPaths;
            
            const response = await this.databases[databaseId].listDocuments(
                drawingPathsCollectionId,
                [
                    Appwrite.Query.equal('board_id', board_id),
                    Appwrite.Query.orderDesc('$createdAt'),
                    Appwrite.Query.limit(100)
                ]
            );
            
            const drawingPaths = response.documents || [];
            
            debugAppwrite.done(`Loaded ${drawingPaths.length} drawing paths for board: ${board_id}`);
            return drawingPaths;
            
        } catch (error) {
            debugAppwrite.error('Failed to load drawing paths', error);
            throw error;
        }
    }

    async updateDrawingPath(pathId, updates) {
        try {
            debugAppwrite.start(`Updating drawing path: ${pathId}`);
            
            const databaseId = this.config.databases.main;
            const drawingPathsCollectionId = this.config.collections.drawingPaths;
            
            const result = await this.databases[databaseId].updateDocument(
                drawingPathsCollectionId,
                pathId,
                updates
            );
            
            debugAppwrite.done('Drawing path updated successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to update drawing path', error);
            throw error;
        }
    }

    async deleteDrawingPath(pathId) {
        try {
            debugAppwrite.start(`Deleting drawing path: ${pathId}`);
            
            const databaseId = this.config.databases.main;
            const drawingPathsCollectionId = this.config.collections.drawingPaths;
            
            const result = await this.databases[databaseId].deleteDocument(
                drawingPathsCollectionId,
                pathId
            );
            
            debugAppwrite.done('Drawing path deleted successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to delete drawing path', error);
            throw error;
        }
    }

    // ====================
    // FILE OPERATIONS
    // ====================

    async uploadFile(file, folderId = null) {
        try {
            debugAppwrite.start('Uploading file');
            
            const result = await this.storage.createFile(
                this.config.bucketId,
                Appwrite.ID.unique(),
                file
            );
            
            debugAppwrite.done('File uploaded successfully', { fileId: result.$id });
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to upload file', error);
            throw error;
        }
    }

    async getFilePreview(fileId, width = 400, height = 400, quality = 80) {
        try {
            debugAppwrite.start(`Getting file preview: ${fileId}`);
            
            const result = await this.storage.getFilePreview(
                this.config.bucketId,
                fileId,
                width,
                height,
                quality,
                'center',
                'top',
                0,
                100
            );
            
            debugAppwrite.done('File preview generated');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to get file preview', error);
            throw error;
        }
    }

    async deleteFile(fileId) {
        try {
            debugAppwrite.start(`Deleting file: ${fileId}`);
            
            const result = await this.storage.deleteFile(
                this.config.bucketId,
                fileId
            );
            
            debugAppwrite.done('File deleted successfully');
            return result;
            
        } catch (error) {
            debugAppwrite.error('Failed to delete file', error);
            throw error;
        }
    }

    // ====================
    // BOARD MANAGEMENT
    // ====================

    async loadCurrentBoard() {
        try {
            if (!this.currentBoard_id) {
                debugAppwrite.warn('No current board ID, creating default board');
                const defaultBoard = await this.createDefaultBoard();
                this.currentBoard_id = defaultBoard.board_id;
                this.currentBoardName = defaultBoard.name;
            }
            
            // Load board data
            await this.loadBoardData();
            
            debugAppwrite.done('Current board loaded successfully');
            
        } catch (error) {
            debugAppwrite.error('Failed to load current board', error);
            throw error;
        }
    }

    async createDefaultBoard() {
        try {
            debugAppwrite.start('Creating default board');
            
            const boardData = {
                name: 'Board 1',
                folders: [],
                canvasHeaders: [],
                drawingPaths: [],
                dev_mode: false,
                onboardingShown: false,
                version: 1,
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            };
            
            const result = await this.createBoard(boardData);
            
            debugAppwrite.done('Default board created successfully', { board_id: result.board_id, name: result.name });
            return {
                ...boardData,
                board_id: result.board_id,
                id: result.$id,
                $createdAt: result.$createdAt,
                $updatedAt: result.$updatedAt
            };
            
        } catch (error) {
            debugAppwrite.error('Failed to create default board', error);
            throw error;
        }
    }

    async loadBoardData() {
        if (!this.currentBoard_id) {
            return;
        }

        try {
            debugAppwrite.start(`Loading board data for ${this.currentBoard_id}`);

            // Load folders
            const folders = await this.getFoldersByBoard_id(this.currentBoard_id);
            debugAppwrite.info(`Loaded ${folders.length} folders`);

            // Load canvas headers
            const canvasHeaders = await this.getCanvasHeadersByBoard_id(this.currentBoard_id);
            debugAppwrite.info(`Loaded ${canvasHeaders.length} canvas headers`);

            // Load drawing paths
            const drawingPaths = await this.getDrawingPathsByBoard_id(this.currentBoard_id);
            debugAppwrite.info(`Loaded ${drawingPaths.length} drawing paths`);

            // Update global state
            if (window.zenbanApp) {
                window.zenbanApp.setBoardData({
                    folders,
                    canvasHeaders,
                    drawingPaths
                });
            }

            debugAppwrite.done('Board data loaded successfully');
        } catch (error) {
            debugAppwrite.error('Failed to load board data', error);
            throw error;
        }
    }

    async setCurrentBoard(board_id, boardName = null) {
        debugAppwrite.step(`Setting current board to ${board_id}`);
        
        if (this.currentBoard_id === board_id) {
            return;
        }
        
        this.currentBoard_id = board_id;
        this.currentBoardName = boardName;
        
        // Load board data
        await this.loadBoardData();
        
        debugAppwrite.done(`Current board set to ${board_id}`);
    }

    // ====================
    // REALTIME INTEGRATION
    // ====================

    setRealtimeService(realtimeService) {
        this.realtimeService = realtimeService;
        debugAppwrite.info('Realtime service integrated');
    }

    setSyncService(syncService) {
        this.syncService = syncService;
        debugAppwrite.info('Sync service integrated');
    }

    // ====================
    // OFFLINE SUPPORT
    // ====================

    addToOfflineQueue(operation) {
        this.offlineQueue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            attempt: 0
        });
        
        debugAppwrite.info(`Operation added to offline queue: ${operation.type}`);
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0 || !this.isOnline) {
            return;
        }
        
        try {
            debugAppwrite.start(`Processing ${this.offlineQueue.length} offline operations`);
            
            for (const operation of this.offlineQueue) {
                await this.processOfflineOperation(operation);
            }
            
            this.offlineQueue = [];
            debugAppwrite.done('Offline queue processed successfully');
            
        } catch (error) {
            debugAppwrite.error('Failed to process offline queue', error);
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
                debugAppwrite.warn(`Unknown offline operation type: ${operation.type}`);
        }
    }

    // ====================
    // UTILITY METHODS
    // ====================

    triggerSync() {
        if (!this.isOnline) {
            return;
        }
        
        this.processOfflineQueue();
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

    async saveCurrentState() {
        if (!this.currentBoard_id || !this.hasUnsavedChanges) {
            return;
        }

        try {
            debugAppwrite.start('Saving current board state');

            const boardData = this.collectBoardData();

            // Get current board first
            const currentBoard = await this.loadBoard(this.currentBoard_id);
            if (!currentBoard) {
                throw new Error(`Board not found: ${this.currentBoard_id}`);
            }

            // Update board
            const updateData = {
                ...boardData,
                version: this.boardVersion + 1,
                $updatedAt: new Date().toISOString()
            };

            await this.updateBoard(this.currentBoard_id, updateData);

            this.lastSavedVersion = this.boardVersion + 1;
            this.hasUnsavedChanges = false;
            this.boardVersion++;

            debugAppwrite.done('Board state saved successfully');
        } catch (error) {
            debugAppwrite.error('Failed to save board state', error);
            
            if (!this.isOnline) {
                this.addToOfflineQueue({
                    type: 'saveBoard',
                    data: this.collectBoardData()
                });
            }
            
            throw error;
        }
    }

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
        
        this.offlineQueue = [];
        this.pendingOperations = [];
        
        debugAppwrite.info('Appwrite service destroyed');
    }
}

// ====================
// GLOBAL EXPORTS
// ====================

window.appwriteService = new AppwriteService();
window.appwriteUtils = {
    // Board operations
    loadBoards: () => window.appwriteService.loadBoards(),
    createBoard: (data) => window.appwriteService.createBoard(data),
    loadBoard: (board_id) => window.appwriteService.loadBoard(board_id),
    updateBoard: (board_id, data) => window.appwriteService.updateBoard(board_id, data),
    deleteBoard: (board_id) => window.appwriteService.deleteBoard(board_id),
    saveBoard: (data) => window.appwriteService.saveBoard(data),
    
    // Folder operations
    createFolder: (board_id, data) => window.appwriteService.createFolder(board_id, data),
    getFoldersByBoard_id: (board_id) => window.appwriteService.getFoldersByBoard_id(board_id),
    updateFolder: (folderId, data) => window.appwriteService.updateFolder(folderId, data),
    deleteFolder: (folderId) => window.appwriteService.deleteFolder(folderId),
    
    // Canvas header operations
    createCanvasHeader: (board_id, data) => window.appwriteService.createCanvasHeader(board_id, data),
    getCanvasHeadersByBoard_id: (board_id) => window.appwriteService.getCanvasHeadersByBoard_id(board_id),
    updateCanvasHeader: (headerId, data) => window.appwriteService.updateCanvasHeader(headerId, data),
    deleteCanvasHeader: (headerId) => window.appwriteService.deleteCanvasHeader(headerId),
    
    // Drawing path operations
    createDrawingPath: (board_id, data) => window.appwriteService.createDrawingPath(board_id, data),
    getDrawingPathsByBoard_id: (board_id) => window.appwriteService.getDrawingPathsByBoard_id(board_id),
    updateDrawingPath: (pathId, data) => window.appwriteService.updateDrawingPath(pathId, data),
    deleteDrawingPath: (pathId) => window.appwriteService.deleteDrawingPath(pathId),
    
    // File operations
    uploadFile: (file, folderId) => window.appwriteService.uploadFile(file, folderId),
    getFilePreview: (fileId, width, height, quality) => window.appwriteService.getFilePreview(fileId, width, height, quality),
    deleteFile: (fileId) => window.appwriteService.deleteFile(fileId),
    
    // Utility methods
    setCurrentBoard: (board_id, boardName) => window.appwriteService.setCurrentBoard(board_id, boardName),
    getBoardData: () => window.appwriteService.getBoardData(),
    getStatus: () => window.appwriteService.getStatus()
};

window.APPWRITE_CONFIG = APPWRITE_CONFIG;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppwriteService;
}

// ====================
// DEPENDENCY CHECK BEFORE INIT
// ====================

function waitForDependencies() {
    debugAppwrite.step('Waiting for dependencies before initializing Appwrite service...');

    return new Promise((resolve) => {
        const checkDeps = () => {
            const status = {
                appwrite: !!window.Appwrite,
                client: !!window.Appwrite?.Client,
                account: !!window.Appwrite?.Account,
                databases: !!window.Appwrite?.Databases,
                storage: !!window.Appwrite?.Storage
            };

            debugAppwrite.detail('Dependency status', status);

            // Check if all required dependencies are loaded
            if (window.Appwrite && window.Appwrite.Client && window.Appwrite.Account && window.Appwrite.Databases && window.Appwrite.Storage) {
                debugAppwrite.done('All dependencies loaded, proceeding with initialization');
                resolve();
            } else {
                debugAppwrite.step('Dependencies not ready, waiting...');
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
            await window.appwriteService.initialize();
            debugAppwrite.done('Appwrite service initialized successfully');
        } catch (error) {
            debugAppwrite.error('Failed to initialize Appwrite service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    });
} else {
    (async () => {
        try {
            await waitForDependencies();
            await window.appwriteService.initialize();
            debugAppwrite.done('Appwrite service initialized successfully');
        } catch (error) {
            debugAppwrite.error('Failed to initialize Appwrite service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    })();
}

debugAppwrite.info('Appwrite service module loaded');
