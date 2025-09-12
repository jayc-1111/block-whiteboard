// Enhanced state management module with proper synchronization
// CRITICAL: Make AppState available globally immediately after creation
const AppState = (() => {
    // Private state
    const state = {
        folders: [],
        boards: [],
        currentBoard_stateId: 0,
        dev_mode: false,
        isGridSnapEnabled: true,
        
        // Drag state
        draggedFile: null,
        currentFolder: null,
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
        'folders', 'boards', 'currentBoard_stateId', 'dev_mode', 'isGridSnapEnabled',
        'draggedFile', 'currentFolder', 'currentCanvasHeader', 'offset', 
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
            AppState.set('selectedItems', []);
            AppState.set('isSelecting', false);
            AppState.set('selectionRectangle', null);
            AppState.set('isDraggingMultiple', false);
            AppState.set('multiDragOffsets', []);
        },
        
        // Commonly used getters
        getFolders: () => state.folders,
        getBoards: () => state.boards,
        getCurrentBoard_stateId: () => state.currentBoard_stateId,
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
let folders = AppState.get('folders') || [];
let boards = AppState.get('boards') || [];
let currentBoard_stateId = AppState.get('currentBoard_stateId') || 0;
let dev_mode = AppState.get('dev_mode') || false;
let isGridSnapEnabled = AppState.get('isGridSnapEnabled') !== false;

// Drag and drop state
let draggedFile = AppState.get('draggedFile') || null;
let currentFolder = AppState.get('currentFolder') || null;
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

// LocalStorage utility for user-specific settings
const LocalSettings = {

    // Get dev_mode from Appwrite settings database
    getdev_mode: () => {
        try {
            // Try to get from AppState first (loaded from cloud)
            const devModeFromState = AppState.get('dev_mode');
            if (devModeFromState !== undefined) {
                return devModeFromState;
            }
            // Fallback to localStorage temporarily during migration
            const stored = localStorage.getItem('dev_mode');
            return stored !== null ? JSON.parse(stored) : false;
        } catch (error) {
            console.warn('Failed to read dev_mode from Appwrite', error);
            return false;
        }
    },

    // Set dev_mode to cloud settings database
    setdev_mode: async (value) => {
        try {
            // Update AppState immediately for UI responsiveness
            AppState.set('dev_mode', value);

            // Save to cloud using appwriteUtils
            if (window.appwriteUtils && window.appwriteUtils.saveUserSettings) {
                await window.appwriteUtils.saveUserSettings({ dev_mode: value });
                console.log('✅ Dev mode saved to cloud:', value);
            } else {
                console.warn('⚠️ appwriteUtils.saveUserSettings not available, relying on local state only');
            }

            // Update localStorage as backup/compatibility layer (cleanup later)
            localStorage.setItem('dev_mode', JSON.stringify(value));
        } catch (error) {
            console.error('Failed to save dev_mode to cloud', error);
            // Fallback to localStorage
            localStorage.setItem('dev_mode', JSON.stringify(value));
        }
    },

    // ONBOARDING DEPRECATED - These functions are kept for compatibility but will be removed
    getOnboardingShown: () => {
        console.warn('⚠️ getOnboardingShown is deprecated - onboarding is no longer used');
        return false;
    },

    setOnboardingShown: (value) => {
        console.warn('⚠️ setOnboardingShown is deprecated - onboarding is no longer used');
    },

    markOnboardingCompleted: () => {
        console.warn('⚠️ markOnboardingCompleted is deprecated - onboarding is no longer used');
    },

    // Initialize settings from cloud database on app start
    initializeFromLocalStorage: async () => {
        try {
            console.log('🔄 Loading user settings from cloud...');

            // Try to load from cloud first
            let cloudSettings = null;
            if (window.appwriteUtils && window.appwriteUtils.getUserSettings) {
                cloudSettings = await window.appwriteUtils.getUserSettings();
                console.log('✅ Loaded cloud settings:', cloudSettings);

                // Apply cloud settings to AppState
                if (cloudSettings && typeof cloudSettings.dev_mode === 'boolean') {
                    AppState.set('dev_mode', cloudSettings.dev_mode);
                }

            // ONBOARDING DEPRECATED - Cloud onboarding support removed
            // No longer processing onboarding settings as the feature is deprecated
            if (cloudSettings && typeof cloudSettings.onboarding === 'boolean') {
                console.warn('⚠️ Cloud onboarding settings found - this feature is deprecated and ignored');
            }
            }

        } catch (error) {
            console.error('❌ Failed to load cloud settings, falling back to localStorage:', error);
            console.log('🔄 Falling back to localStorage settings...');

            // Fallback to localStorage
            const dev_mode = LocalSettings.getdev_mode();
            const onboardingShown = LocalSettings.getOnboardingShown();

            AppState.set('dev_mode', dev_mode);

            // ONBOARDING DEPRECATED - No longer updating onboarding status
            const boards = AppState.get('boards') || [];
            const currentBoard_stateId = AppState.get('currentBoard_stateId') || 0;
            const currentBoard = boards.find(b => b.stateId === currentBoard_stateId);
            if (currentBoard && !currentBoard.onboardingShown) {
                console.warn('⚠️ Found board without onboardingShown - this is deprecated');
                currentBoard.onboardingShown = false; // Set to false since onboarding is deprecated
                AppState.set('boards', boards);
            }

            console.log(`Settings initialized from localStorage: dev_mode=${dev_mode}`);
        }
    }
};

// Initialize global synchronization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AppState.initializeGlobalSync();
    });
} else {
    AppState.initializeGlobalSync();
}

// Initialize LocalSettings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        LocalSettings.initializeFromLocalStorage();
    });
} else {
    // Small delay to ensure localStorage is available
    setTimeout(() => LocalSettings.initializeFromLocalStorage(), 50);
}

// Export for backwards compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState };
} else if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.LocalSettings = LocalSettings;
}
