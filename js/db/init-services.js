/**
 * Service Initialization and Testing
 * 
 * This file initializes all the services and ensures they're properly
 * exposed globally for use by other modules. It also provides testing
 * functions to verify that all required functions are available.
 */

/**
 * ====================
 *  DB Service Bridge
 * ====================
 * Modernized initialization of UI, Board, and DB services.
 * This file replaces legacy "syncService" usage.
 */

console.log('🚀 Initializing services...');

// Debug utilities
const initDebug = {
    info: (msg, data) => console.log(`🔧 INIT_SERVICES: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ INIT_SERVICES ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ INIT_SERVICES: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 INIT_SERVICES: ${msg}`),
    detail: (msg, data) => console.log(`📋 INIT_SERVICES: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 INIT_SERVICES: ${msg}`),
    done: (msg) => console.log(`✅ INIT_SERVICES: ${msg || 'Operation completed'}`)
};

/**
 * Test if all required functions are available globally
 * @returns {Object} - Test results
 */
function testRequiredFunctions() {
    initDebug.start('Testing required functions availability');
    
    const requiredFunctions = [
        // UI Service functions
        'showConfirmDialog',
        'updateBoardDropdown', 
        'showOnboardingIfEmpty',
        'createFolder',
        'deleteFolder',
        'createFileSlot',
        'startFolderDrag',
        'handleFolderDrag',
        'stopFolderDrag',
        
        // Board Service functions
        'loadBoard',
        'setupSelectionListeners',
        'initializeFoldersFromBoardData',
        'clearSelection',
        'selectItem',
        'toggleItemSelection',
        
        // Database Service functions
        'saveBoard',
        'saveCurrentBoard',
        'deleteBoard',
        'getBoard',
        
        // Other utilities
        'AppState'
    ];
    
    const results = {
        total: requiredFunctions.length,
        available: 0,
        missing: [],
        functions: {}
    };
    
    requiredFunctions.forEach(funcName => {
        let isAvailable = false;

        if (funcName === 'AppState') {
            // AppState is an object, not a function
            isAvailable = typeof window.AppState === 'object';
        } else {
            isAvailable = typeof window[funcName] === 'function';
        }

        results.functions[funcName] = isAvailable;

        if (isAvailable) {
            results.available++;
        } else {
            results.missing.push(funcName);
        }
    });
    
    const successRate = (results.available / results.total * 100).toFixed(1);
    
    initDebug.detail('Function availability test results', {
        total: results.total,
        available: results.available,
        missing: results.missing,
        successRate: `${successRate}%`
    });
    
    if (results.missing.length > 0) {
        initDebug.warn('Missing functions:', results.missing);
    } else {
        initDebug.done('All required functions are available');
    }
    
    return results;
}

/**
 * Wait for AppState to be available globally
 * @returns {Promise<void>}
 */
async function waitForAppState() {
    return new Promise((resolve) => {
        const checkAppState = () => {
            if (typeof window.AppState !== 'undefined' && window.AppState) {
                initDebug.detail('AppState is now available globally');
                resolve();
            } else {
                setTimeout(checkAppState, 5); // Check every 5ms
            }
        };
        initDebug.detail('Waiting for AppState to become available...');
        checkAppState();
    });
}

/**
 * Initialize all services and expose them globally
 */
async function initializeServices() {
    initDebug.start('Initializing all services');

    try {
        // Initialize AppState first (if available)
        if (typeof AppState !== 'undefined' && typeof AppState.initialize === 'function') {
            initDebug.step('Initializing AppState');
            AppState.initialize();
        }
        
        // Initialize UI Service
        if (typeof window.uiService !== 'undefined' && typeof window.uiService.initializeGlobalFunctions === 'function') {
            initDebug.step('Initializing UI Service');
            window.uiService.initializeGlobalFunctions();
        }
        
        // Initialize Board Service
        if (typeof window.boardService !== 'undefined') {
            initDebug.step('Initializing Board Service');
            window.boardService.config.initialized = true;
        }
        
        // Initialize Database Service
        if (typeof window.dbService !== 'undefined') {
            initDebug.step('Initializing Database Service');
            window.dbService.config.initialized = true;
        }
        
        // Expose critical functions directly
        initDebug.step('Exposing critical functions globally');
        
        // Make sure boardService methods are available
        if (window.boardService) {
            window.loadBoard = window.boardService.loadBoard;
            window.setupSelectionListeners = window.boardService.setupSelectionListeners;
            window.initializeFoldersFromBoardData = window.boardService.initializeFoldersFromBoardData;
            window.clearSelection = window.boardService.clearSelection;
            window.selectItem = window.boardService.selectItem;
            window.toggleItemSelection = window.boardService.toggleItemSelection;
        }
        
        // Make sure dbService methods are available
        if (window.dbService) {
            window.saveBoard = window.dbService.saveBoard;
            window.saveCurrentBoard = window.dbService.saveCurrentBoard;
            window.deleteBoard = window.dbService.deleteBoard;
            window.getBoard = window.dbService.getBoard;
        }
        
        // Wait for AppState and then test all functions
        await waitForAppState();
        const testResults = testRequiredFunctions();

        // 🚀 CLEAN SLATE FIX:
        // Replace legacy syncService with dbService wrapper
        window.syncService = {
            saveAfterAction: async (reason) => {
                try {
                    initDebug.detail(`SyncService.saveAfterAction called`, { reason });
                    if (window.dbService && typeof window.dbService.saveCurrentBoard === 'function') {
                        await window.dbService.saveCurrentBoard(reason);
                        initDebug.done(`Board saved [${reason}]`);
                    } else {
                        initDebug.warn('dbService.saveCurrentBoard not available');
                    }
                } catch (err) {
                    initDebug.error('SyncService.saveAfterAction failed', err);
                }
            }
        };

        // Update service initialization status
        if (window.uiService) window.uiService.config.initialized = true;
        if (window.boardService) window.boardService.config.initialized = true;
        if (window.dbService) window.dbService.config.initialized = true;

        initDebug.done('All services initialized successfully');

        return {
            success: true,
            testResults: testResults,
            message: `Services initialized with ${testResults.available}/${testResults.total} functions available`
        };

    } catch (error) {
        initDebug.error('Failed to initialize services', error);
        return {
            success: false,
            error: error.message,
            message: 'Service initialization failed'
        };
    }
}

/**
 * Test service integration
 * @returns {Object} - Integration test results
 */
function testServiceIntegration() {
    initDebug.start('Testing service integration');
    
    try {
        const results = {
            uiService: false,
            boardService: false,
            dbService: false,
            integration: false
        };
        
        // Test UI Service
        if (window.uiService && window.createFolder && window.createFileSlot) {
            initDebug.step('UI Service integration test passed');
            results.uiService = true;
        } else {
            initDebug.error('UI Service integration failed');
        }
        
        // Test Board Service
        if (window.boardService && window.loadBoard && window.initializeFoldersFromBoardData) {
            initDebug.step('Board Service integration test passed');
            results.boardService = true;
        } else {
            initDebug.error('Board Service integration failed');
        }
        
        // Test Database Service
        if (window.dbService && window.saveBoard && window.saveCurrentBoard) {
            initDebug.step('Database Service integration test passed');
            results.dbService = true;
        } else {
            initDebug.error('Database Service integration failed');
        }
        
        // Test overall integration
        const allServices = results.uiService && results.boardService && results.dbService;
        if (allServices) {
            initDebug.step('Overall integration test passed');
            results.integration = true;
            
            // Test function call chain
            if (typeof window.saveCurrentBoard === 'function' && 
                typeof window.createFolder === 'function' &&
                typeof window.initializeFoldersFromBoardData === 'function') {
                initDebug.detail('Function call chain test passed');
            } else {
                initDebug.warn('Function call chain test failed');
                results.integration = false;
            }
        } else {
            initDebug.error('Overall integration test failed');
        }
        
        const successCount = Object.values(results).filter(Boolean).length;
        const successRate = (successCount / Object.keys(results).length * 100).toFixed(1);
        
        initDebug.detail('Integration test results', {
            ...results,
            successCount,
            successRate: `${successRate}%`
        });
        
        return results;
        
    } catch (error) {
        initDebug.error('Integration test failed', error);
        return { error: error.message };
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        initDebug.info('DOM content loaded, initializing services...');
        const initResult = await initializeServices();
        if (initResult.success) {
            console.log('✅ Services initialized successfully');
        } else {
            console.error('❌ Service initialization failed:', initResult.error);
        }
    });
} else {
    // DOM already loaded
    initDebug.info('DOM already loaded, initializing services...');
    initializeServices().then(initResult => {
        if (initResult.success) {
            console.log('✅ Services initialized successfully');
        } else {
            console.error('❌ Service initialization failed:', initResult.error);
        }
    }).catch(error => {
        console.error('❌ Service initialization failed:', error);
    });
}

// Expose test functions globally for debugging
window.testRequiredFunctions = testRequiredFunctions;
window.testServiceIntegration = testServiceIntegration;

initDebug.info('Service initialization module loaded');
