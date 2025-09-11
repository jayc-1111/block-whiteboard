/**
 * Appwrite Realtime Service
 *
 * This service handles Realtime subscriptions for boards, folders, canvas headers, and drawing paths
 * to provide live synchronization across all users and devices.
 */

// ====================
// CONFIGURATION
// ====================
const REALTIME_CONFIG = {
    // Subscription configuration
    subscriptions: {
        boards: true,
        folders: true,
        canvasHeaders: true,
        drawingPaths: true,
        files: false,
        bookmarks: false
    },

    // Event handling
    events: {
        boards: ['create', 'update', 'delete'],
        folders: ['create', 'update', 'delete'],
        canvasHeaders: ['create', 'update', 'delete'],
        drawingPaths: ['create', 'update', 'delete']
    },

    // Realtime settings
    realtime: {
        reconnectAttempts: 5,
        reconnectDelay: 2000,
        debug: true,
        logEvents: true
    },

    // Conflict resolution for Realtime events
    conflict: {
        priority: 'server', // 'server', 'client', 'merge'
        mergeStrategy: 'preserve_client' // 'preserve_client', 'preserve_server', 'merge'
    }
};

// ====================
// DEBUG UTILITIES
// ====================

const debugRealtime = {
    info: (msg, data) => console.log(`📡 APPWRITE_REALTIME: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE_REALTIME ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE_REALTIME: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE_REALTIME: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE_REALTIME: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE_REALTIME: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE_REALTIME: ${msg || 'Operation completed'}`),
    event: (eventType, data) => console.log(`📡 REALTIME EVENT [${eventType}]:`, data)
};

// ====================
// REALTIME SERVICE CLASS
// ====================

class RealtimeService {
    constructor() {
        this.isInitialized = false;
        this.subscriptions = new Map();
        this.eventHandlers = new Map();
        this.pendingSubscriptions = [];
        this.currentBoard_id = null;
        this.boardDocumentId = null;
        this.config = REALTIME_CONFIG;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = REALTIME_CONFIG.realtime.reconnectAttempts;
        this.client = null;
        this.isConnected = false;
    }

    // ====================
    // INITIALIZATION
    // ====================

    async initialize() {
        debugRealtime.start('Initializing realtime service');
        
        try {
            // Wait for Appwrite client to be available
            await this.waitForClient();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Initialize subscriptions
            await this.initializeSubscriptions();
            
            this.isInitialized = true;
            this.isConnected = true;
            
            debugRealtime.done('Realtime service initialized successfully');
            
        } catch (error) {
            debugRealtime.error('Failed to initialize realtime service', error);
            throw error;
        }
    }

    async waitForClient() {
        debugRealtime.step('Waiting for Appwrite client...');
        
        return new Promise((resolve) => {
            const checkClient = () => {
                if (window.Appwrite && window.Appwrite.Client) {
                    this.client = new window.Appwrite.Client();
                    // Configure client
                    this.client
                        .setEndpoint(window.APPWRITE_CONFIG.endpoint)
                        .setProject(window.APPWRITE_CONFIG.projectId);
                    
                    debugRealtime.done('Appwrite client available');
                    resolve();
                } else {
                    debugRealtime.step('Appwrite client not ready, waiting...');
                    setTimeout(checkClient, 100);
                }
            };
            
            checkClient();
        });
    }

    setupEventHandlers() {
        // Connection state handlers
        this.client
            .subscribe('connected')
            .subscribe(() => {
                debugRealtime.info('Realtime connection established');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.processPendingSubscriptions();
            })
            .subscribe('closed')
            .subscribe(() => {
                debugRealtime.info('Realtime connection closed');
                this.isConnected = false;
            })
            .subscribe('error')
            .subscribe((error) => {
                debugRealtime.error('Realtime connection error', error);
                this.handleReconnection();
            });
    }

    // ====================
    // SUBSCRIPTION MANAGEMENT
    // ====================

    async initializeSubscriptions() {
        if (!this.currentBoard_id) {
            debugRealtime.warn('No current board ID, will subscribe when board is loaded');
            return;
        }

        try {
            if (this.config.subscriptions.boards) {
                await this.subscribeToBoardEvents();
            }
            
            if (this.config.subscriptions.folders) {
                await this.subscribeToFolderEvents();
            }
            
            if (this.config.subscriptions.canvasHeaders) {
                await this.subscribeToCanvasHeaderEvents();
            }
            
            if (this.config.subscriptions.drawingPaths) {
                await this.subscribeToDrawingPathEvents();
            }
            
            debugRealtime.done('All subscriptions initialized');
            
        } catch (error) {
            debugRealtime.error('Failed to initialize subscriptions', error);
            throw error;
        }
    }

    async subscribeToBoardEvents() {
        if (!window.APPWRITE_CONFIG?.databases?.main) {
            throw new Error('Database configuration not available');
        }

        const databaseId = window.APPWRITE_CONFIG.databases.main;
        const boardsCollectionId = window.APPWRITE_CONFIG.collections?.boards || 'boards';
        
        debugRealtime.start(`Subscribing to board events`);
        
        try {
            const subscription = this.client.subscribe(
                `databases.${databaseId}.collections.${boardsCollectionId}.documents`,
                (response) => this.handleBoardRealtimeEvent(response)
            );
            
            this.subscriptions.set('boards', subscription);
            debugRealtime.done(`Subscribed to board events`);
            
        } catch (error) {
            debugRealtime.error('Failed to subscribe to board events', error);
            throw error;
        }
    }

    async subscribeToFolderEvents() {
        if (!window.APPWRITE_CONFIG?.databases?.main) {
            throw new Error('Database configuration not available');
        }

        const databaseId = window.APPWRITE_CONFIG.databases.main;
        const foldersCollectionId = window.APPWRITE_CONFIG.collections?.folders || 'folders';
        
        debugRealtime.start(`Subscribing to folder events`);
        
        try {
            const subscription = this.client.subscribe(
                `databases.${databaseId}.collections.${foldersCollectionId}.documents`,
                (response) => this.handleFolderRealtimeEvent(response)
            );
            
            this.subscriptions.set('folders', subscription);
            debugRealtime.done(`Subscribed to folder events`);
            
        } catch (error) {
            debugRealtime.error('Failed to subscribe to folder events', error);
            throw error;
        }
    }

    async subscribeToCanvasHeaderEvents() {
        if (!window.APPWRITE_CONFIG?.databases?.main) {
            throw new Error('Database configuration not available');
        }

        const databaseId = window.APPWRITE_CONFIG.databases.main;
        const canvasHeadersCollectionId = window.APPWRITE_CONFIG.collections?.canvasHeaders || 'canvasHeaders';
        
        debugRealtime.start(`Subscribing to canvas header events`);
        
        try {
            const subscription = this.client.subscribe(
                `databases.${databaseId}.collections.${canvasHeadersCollectionId}.documents`,
                (response) => this.handleCanvasHeaderRealtimeEvent(response)
            );
            
            this.subscriptions.set('canvasHeaders', subscription);
            debugRealtime.done(`Subscribed to canvas header events`);
            
        } catch (error) {
            debugRealtime.error('Failed to subscribe to canvas header events', error);
            throw error;
        }
    }

    async subscribeToDrawingPathEvents() {
        if (!window.APPWRITE_CONFIG?.databases?.main) {
            throw new Error('Database configuration not available');
        }

        const databaseId = window.APPWRITE_CONFIG.databases.main;
        const drawingPathsCollectionId = window.APPWRITE_CONFIG.collections?.drawingPaths || 'drawingPaths';
        
        debugRealtime.start(`Subscribing to drawing path events`);
        
        try {
            const subscription = this.client.subscribe(
                `databases.${databaseId}.collections.${drawingPathsCollectionId}.documents`,
                (response) => this.handleDrawingPathRealtimeEvent(response)
            );
            
            this.subscriptions.set('drawingPaths', subscription);
            debugRealtime.done(`Subscribed to drawing path events`);
            
        } catch (error) {
            debugRealtime.error('Failed to subscribe to drawing path events', error);
            throw error;
        }
    }

    // ====================
    // EVENT HANDLING
    // ====================

    handleBoardRealtimeEvent(response) {
        if (!this.config.subscriptions.boards) return;
        
        debugRealtime.event('Board', response);
        
        const { events } = response;
        
        events.forEach(event => {
            switch(event.event) {
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.boards || 'boards'}.documents.create`:
                    this.handleBoardCreate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.boards || 'boards'}.documents.update`:
                    this.handleBoardUpdate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.boards || 'boards'}.documents.delete`:
                    this.handleBoardDelete(event.payload);
                    break;
            }
        });
    }

    handleFolderRealtimeEvent(response) {
        if (!this.config.subscriptions.folders) return;
        
        debugRealtime.event('Folder', response);
        
        const { events } = response;
        
        events.forEach(event => {
            switch(event.event) {
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.folders || 'folders'}.documents.create`:
                    this.handleFolderCreate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.folders || 'folders'}.documents.update`:
                    this.handleFolderUpdate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.folders || 'folders'}.documents.delete`:
                    this.handleFolderDelete(event.payload);
                    break;
            }
        });
    }

    handleCanvasHeaderRealtimeEvent(response) {
        if (!this.config.subscriptions.canvasHeaders) return;
        
        debugRealtime.event('CanvasHeader', response);
        
        const { events } = response;
        
        events.forEach(event => {
            switch(event.event) {
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.canvasHeaders || 'canvasHeaders'}.documents.create`:
                    this.handleCanvasHeaderCreate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.canvasHeaders || 'canvasHeaders'}.documents.update`:
                    this.handleCanvasHeaderUpdate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.canvasHeaders || 'canvasHeaders'}.documents.delete`:
                    this.handleCanvasHeaderDelete(event.payload);
                    break;
            }
        });
    }

    handleDrawingPathRealtimeEvent(response) {
        if (!this.config.subscriptions.drawingPaths) return;
        
        debugRealtime.event('DrawingPath', response);
        
        const { events } = response;
        
        events.forEach(event => {
            switch(event.event) {
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.drawingPaths || 'drawingPaths'}.documents.create`:
                    this.handleDrawingPathCreate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.drawingPaths || 'drawingPaths'}.documents.update`:
                    this.handleDrawingPathUpdate(event.payload);
                    break;
                case `databases.${window.APPWRITE_CONFIG.databases.main}.collections.${window.APPWRITE_CONFIG.collections?.drawingPaths || 'drawingPaths'}.documents.delete`:
                    this.handleDrawingPathDelete(event.payload);
                    break;
            }
        });
    }

    // ====================
    // BOARD EVENT HANDLERS
    // ====================

    handleBoardCreate(payload) {
        debugRealtime.step('Board created', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleBoardCreate) {
            window.zenbanApp.handleBoardCreate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleBoardCreate) {
            window.appwriteSync.handleBoardCreate(payload);
        }
    }

    handleBoardUpdate(payload) {
        debugRealtime.step('Board updated', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleBoardUpdate) {
            window.zenbanApp.handleBoardUpdate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleBoardUpdate) {
            window.appwriteSync.handleBoardUpdate(payload);
        }
    }

    handleBoardDelete(payload) {
        debugRealtime.step('Board deleted', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleBoardDelete) {
            window.zenbanApp.handleBoardDelete(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleBoardDelete) {
            window.appwriteSync.handleBoardDelete(payload);
        }
    }

    // ====================
    // FOLDER EVENT HANDLERS
    // ====================

    handleFolderCreate(payload) {
        debugRealtime.step('Folder created', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleFolderCreate) {
            window.zenbanApp.handleFolderCreate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleFolderCreate) {
            window.appwriteSync.handleFolderCreate(payload);
        }
        
        // Update AppState
        if (window.AppState && window.AppState.handleFolderCreate) {
            window.AppState.handleFolderCreate(payload);
        }
    }

    handleFolderUpdate(payload) {
        debugRealtime.step('Folder updated', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleFolderUpdate) {
            window.zenbanApp.handleFolderUpdate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleFolderUpdate) {
            window.appwriteSync.handleFolderUpdate(payload);
        }
        
        // Update AppState
        if (window.AppState && window.AppState.handleFolderUpdate) {
            window.AppState.handleFolderUpdate(payload);
        }
    }

    handleFolderDelete(payload) {
        debugRealtime.step('Folder deleted', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleFolderDelete) {
            window.zenbanApp.handleFolderDelete(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleFolderDelete) {
            window.appwriteSync.handleFolderDelete(payload);
        }
        
        // Update AppState
        if (window.AppState && window.AppState.handleFolderDelete) {
            window.AppState.handleFolderDelete(payload);
        }
    }

    // ====================
    // CANVAS HEADER EVENT HANDLERS
    // ====================

    handleCanvasHeaderCreate(payload) {
        debugRealtime.step('Canvas header created', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleCanvasHeaderCreate) {
            window.zenbanApp.handleCanvasHeaderCreate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleCanvasHeaderCreate) {
            window.appwriteSync.handleCanvasHeaderCreate(payload);
        }
    }

    handleCanvasHeaderUpdate(payload) {
        debugRealtime.step('Canvas header updated', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleCanvasHeaderUpdate) {
            window.zenbanApp.handleCanvasHeaderUpdate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleCanvasHeaderUpdate) {
            window.appwriteSync.handleCanvasHeaderUpdate(payload);
        }
    }

    handleCanvasHeaderDelete(payload) {
        debugRealtime.step('Canvas header deleted', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleCanvasHeaderDelete) {
            window.zenbanApp.handleCanvasHeaderDelete(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleCanvasHeaderDelete) {
            window.appwriteSync.handleCanvasHeaderDelete(payload);
        }
    }

    // ====================
    // DRAWING PATH EVENT HANDLERS
    // ====================

    handleDrawingPathCreate(payload) {
        debugRealtime.step('Drawing path created', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleDrawingPathCreate) {
            window.zenbanApp.handleDrawingPathCreate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleDrawingPathCreate) {
            window.appwriteSync.handleDrawingPathCreate(payload);
        }
    }

    handleDrawingPathUpdate(payload) {
        debugRealtime.step('Drawing path updated', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleDrawingPathUpdate) {
            window.zenbanApp.handleDrawingPathUpdate(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleDrawingPathUpdate) {
            window.appwriteSync.handleDrawingPathUpdate(payload);
        }
    }

    handleDrawingPathDelete(payload) {
        debugRealtime.step('Drawing path deleted', payload);
        
        if (window.zenbanApp && window.zenbanApp.handleDrawingPathDelete) {
            window.zenbanApp.handleDrawingPathDelete(payload);
        }
        
        if (window.appwriteSync && window.appwriteSync.handleDrawingPathDelete) {
            window.appwriteSync.handleDrawingPathDelete(payload);
        }
    }

    // ====================
    // BOARD MANAGEMENT
    // ====================

    setCurrentBoard(board_id, boardDocumentId = null) {
        debugRealtime.step(`Setting current board to ${board_id}`);
        
        if (this.currentBoard_id === board_id) {
            return;
        }
        
        this.currentBoard_id = board_id;
        this.boardDocumentId = boardDocumentId;
        
        // Re-initialize subscriptions with new board
        if (this.isInitialized) {
            this.initializeSubscriptions();
        }
    }

    // ====================
    // RECONNECTION HANDLING
    // ====================

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            debugRealtime.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = REALTIME_CONFIG.realtime.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        debugRealtime.warn(`Reconnection attempt ${this.reconnectAttempts}, retrying in ${delay}ms`);
        
        setTimeout(() => {
            this.initialize();
        }, delay);
    }

    processPendingSubscriptions() {
        if (this.pendingSubscriptions.length === 0) {
            return;
        }
        
        debugRealtime.step(`Processing ${this.pendingSubscriptions.length} pending subscriptions`);
        
        const pending = [...this.pendingSubscriptions];
        this.pendingSubscriptions = [];
        
        pending.forEach(subscription => {
            try {
                this[subscription]();
            } catch (error) {
                debugRealtime.error(`Failed to process pending subscription: ${subscription}`, error);
            }
        });
    }

    addPendingSubscription(subscription) {
        if (!this.isConnected) {
            this.pendingSubscriptions.push(subscription);
        } else {
            this[subscription]();
        }
    }

    // ====================
    // UTILITY METHODS
    // ====================

    getSubscriptionStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            subscriptions: Array.from(this.subscriptions.keys()),
            currentBoard_id: this.currentBoard_id,
            reconnectAttempts: this.reconnectAttempts,
            pendingSubscriptions: this.pendingSubscriptions.length
        };
    }

    // ====================
    // CLEANUP
    // ====================

    destroy() {
        // Unsubscribe from all subscriptions
        this.subscriptions.forEach((subscription, key) => {
            try {
                subscription.unsubscribe();
                debugRealtime.info(`Unsubscribed from ${key}`);
            } catch (error) {
                debugRealtime.error(`Failed to unsubscribe from ${key}`, error);
            }
        });
        
        this.subscriptions.clear();
        this.eventHandlers.clear();
        this.pendingSubscriptions = [];
        
        debugRealtime.info('Realtime service destroyed');
    }
}

// ====================
// GLOBAL EXPORTS
// ====================

window.appwriteRealtime = new RealtimeService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeService;
}

// ====================
// AUTO-INITIALIZATION
// ====================

function waitForRealtimeDependencies() {
    debugRealtime.step('Waiting for dependencies before initializing realtime service...');

    return new Promise((resolve) => {
        const checkDeps = () => {
            const status = {
                appwrite: !!window.Appwrite,
                client: !!window.Appwrite?.Client,
                config: !!window.APPWRITE_CONFIG,
                syncService: !!window.appwriteSync,
                zenbanApp: !!window.zenbanApp
            };

            debugRealtime.detail('Dependency status', status);

            // Check if all required dependencies are loaded
            if (window.Appwrite && window.Appwrite.Client && window.APPWRITE_CONFIG) {
                debugRealtime.done('All dependencies loaded, proceeding with initialization');
                resolve();
            } else {
                debugRealtime.step('Dependencies not ready, waiting...');
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
            await waitForRealtimeDependencies();
            await window.appwriteRealtime.initialize();
            debugRealtime.done('Realtime service initialized successfully');
        } catch (error) {
            debugRealtime.error('Failed to initialize realtime service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    });
} else {
    (async () => {
        try {
            await waitForRealtimeDependencies();
            await window.appwriteRealtime.initialize();
            debugRealtime.done('Realtime service initialized successfully');
        } catch (error) {
            debugRealtime.error('Failed to initialize realtime service after dependency check:', error);
            throw error; // Let it bubble up so it's not silent
        }
    })();
}

debugRealtime.info('Appwrite realtime service module loaded');
