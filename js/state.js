// Enhanced state management module with proper synchronization
const AppState = (() => {
    // Private state
    const state = {
        categories: [],
        boards: [{
            id: 0,
            name: 'Board 1',
            categories: [],
            canvasHeaders: [],
            drawingPaths: []
        }],
        currentBoardId: 0,
        isDevMode: false,
        isGridSnapEnabled: true,
        
        // Drag state
        draggedFile: null,
        currentCategory: null,
        currentCanvasHeader: null,
        offset: { x: 0, y: 0 },
        expandedFile: null,
        highestZIndex: (typeof CONSTANTS !== 'undefined' && CONSTANTS.BASE_Z_INDEX) || 1000,
        
        // Selection state
        selectedItems: [],
        isSelecting: false,
        selectionStart: { x: 0, y: 0 },
        selectionRectangle: null,
        isDraggingMultiple: false,
        multiDragOffsets: []
    };
    
    // Initialize change callbacks
    const changeCallbacks = {};
    
    // List of keys that should sync to global variables
    const globalSyncKeys = [
        'categories', 'boards', 'currentBoardId', 'isDevMode', 'isGridSnapEnabled',
        'draggedFile', 'currentCategory', 'currentCanvasHeader', 'offset', 
        'expandedFile', 'highestZIndex', 'selectedItems', 'isSelecting',
        'selectionStart', 'selectionRectangle', 'isDraggingMultiple', 'multiDragOffsets'
    ];
    
    // Sync state to global variables
    function syncToGlobals(key, value) {
        if (globalSyncKeys.includes(key)) {
            try {
                // Safely update global variables
                window[key] = value;
                
                // Special handling for certain variables that might be used before window assignment
                if (typeof globalThis !== 'undefined') {
                    globalThis[key] = value;
                }
            } catch (error) {
                Debug.warn('AppState', `Failed to sync ${key} to global`, { error });
            }
        }
    }
    
    // Public API
    return {
        get: (key) => state[key],
        
        set: (key, value) => { 
            const oldValue = state[key];
            state[key] = value;
            
            // Sync to global variables
            syncToGlobals(key, value);
            
            // Trigger change callbacks if value actually changed
            if (oldValue !== value && changeCallbacks[key]) {
                changeCallbacks[key].forEach(callback => {
                    try {
                        callback(value, oldValue);
                    } catch (error) {
                        Debug.error('AppState', `Error in change callback for ${key}`, error);
                    }
                });
            }
        },
        
        // Change callback system
        changeCallbacks,
        
        onChange: (key, callback) => {
            if (!changeCallbacks[key]) {
                changeCallbacks[key] = [];
            }
            changeCallbacks[key].push(callback);
        },
        
        offChange: (key, callback) => {
            if (changeCallbacks[key]) {
                const index = changeCallbacks[key].indexOf(callback);
                if (index > -1) {
                    changeCallbacks[key].splice(index, 1);
                }
            }
        },

        getNextZIndex: () => ++state.highestZIndex,
        
        resetSelection: () => {
            this.set('selectedItems', []);
            this.set('isSelecting', false);
            this.set('selectionRectangle', null);
            this.set('isDraggingMultiple', false);
            this.set('multiDragOffsets', []);
        },
        
        // Commonly used getters
        getCategories: () => state.categories,
        getBoards: () => state.boards,
        getCurrentBoardId: () => state.currentBoardId,
        getSelectedItems: () => state.selectedItems,
        
        // Initialize global sync
        initializeGlobalSync: () => {
            Debug.info('AppState', 'Initializing global state synchronization');
            
            // Sync all current state to globals
            globalSyncKeys.forEach(key => {
                syncToGlobals(key, state[key]);
            });
            
            // Set up periodic sync to ensure consistency
            setInterval(() => {
                globalSyncKeys.forEach(key => {
                    if (window[key] !== state[key]) {
                        // Silently correct without warning for highestZIndex
                        if (key !== 'highestZIndex') {
                            Debug.warn('AppState', `Global variable ${key} out of sync, correcting`);
                        }
                        syncToGlobals(key, state[key]);
                    }
                });
            }, 5000);
        },
        
        // Manual sync from globals back to state (for compatibility)
        syncFromGlobals: () => {
            globalSyncKeys.forEach(key => {
                if (typeof window[key] !== 'undefined' && window[key] !== state[key]) {
                    Debug.detail('AppState', `Syncing ${key} from global to state`);
                    state[key] = window[key];
                }
            });
        },
        
        // Debug helpers
        getState: () => ({ ...state }),
        logState: () => Debug.info('AppState', 'Current state', { ...state })
    };
})();

// Initialize global references with proper fallbacks
let categories = AppState.get('categories') || [];
let boards = AppState.get('boards') || [{
    id: 0,
    name: 'Board 1',
    categories: [],
    headers: [],
    drawingPaths: []
}];
let currentBoardId = AppState.get('currentBoardId') || 0;
let isDevMode = AppState.get('isDevMode') || false;
let isGridSnapEnabled = AppState.get('isGridSnapEnabled') !== false;

// Drag and drop state
let draggedFile = AppState.get('draggedFile') || null;
let currentCategory = AppState.get('currentCategory') || null;
let currentCanvasHeader = AppState.get('currentCanvasHeader') || null;
let offset = AppState.get('offset') || { x: 0, y: 0 };
let expandedFile = AppState.get('expandedFile') || null;
let highestZIndex = AppState.get('highestZIndex') || (typeof CONSTANTS !== 'undefined' ? CONSTANTS.BASE_Z_INDEX : 1000);

// Selection state
let selectedItems = AppState.get('selectedItems') || [];
let isSelecting = AppState.get('isSelecting') || false;
let selectionStart = AppState.get('selectionStart') || { x: 0, y: 0 };
let selectionRectangle = AppState.get('selectionRectangle') || null;
let isDraggingMultiple = AppState.get('isDraggingMultiple') || false;
let multiDragOffsets = AppState.get('multiDragOffsets') || [];

// Grid size constant (fallback if CONSTANTS not loaded yet)
const GRID_SIZE = (typeof CONSTANTS !== 'undefined' && CONSTANTS.GRID_SIZE) || 22;

// Initialize global synchronization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AppState.initializeGlobalSync();
    });
} else {
    AppState.initializeGlobalSync();
}

// Export for backwards compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState };
} else if (typeof window !== 'undefined') {
    window.AppState = AppState;
}
