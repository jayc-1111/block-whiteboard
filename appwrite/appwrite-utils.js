/**
 * Appwrite Utilities Service
 *
 * This service provides utility functions for Appwrite operations,
 * including enhanced error handling, retry logic, and content management.
 */

// ====================
// CONFIGURATION
// ====================
const UTILS_CONFIG = {
    // Retry configuration
    retry: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
    },

    // Error handling
    errors: {
        logToConsole: true,
        showUserNotifications: true,
        defaultErrorMessage: 'An error occurred. Please try again.',
        retryableErrors: [
            'timeout',
            'connection',
            'network',
            'unavailable',
            '502',
            '503',
            '504'
        ]
    },

    // Content limits
    content: {
        maxSize: 50000,
        truncationMessage: '[Content truncated - original size: __SIZE__ chars]',
        compressionEnabled: true
    }
};

// ====================
// DEBUG UTILITIES
// ====================

const debugUtils = {
    info: (msg, data) => console.log(`🔷 APPWRITE_UTILS: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE_UTILS ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE_UTILS: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE_UTILS: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE_UTILS: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE_UTILS: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE_UTILS: ${msg || 'Operation completed'}`)
};

// ====================
// ENHANCED DATABASE OPERATIONS
// ====================

/**
 * Enhanced listDocuments with retry logic and error handling
 */
async function enhancedListDocuments(databaseId, collectionId, queries = [], options = {}) {
    debugUtils.start(`Listing documents from ${collectionId}`);
    
    const maxRetries = options.maxRetries || UTILS_CONFIG.retry.maxAttempts;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        try {
            if (!window.appwriteDatabases) {
                throw new Error('Appwrite databases not initialized');
            }
            
            // Use the appropriate database based on collection
            const database = getDatabaseForCollection(collectionId);
            const result = await database.listDocuments(
                databaseId,
                collectionId,
                queries,
                options
            );
            
            debugUtils.done(`Successfully listed ${result.total} documents from ${collectionId}`);
            return result;
            
        } catch (error) {
            const isRetryable = isRetryableError(error);
            const shouldRetry = attempt < maxRetries && isRetryable;
            
            if (shouldRetry) {
                const delay = calculateRetryDelay(attempt);
                debugUtils.warn(`Attempt ${attempt} failed for ${collectionId}, retrying in ${delay}ms`, error.message);
                await sleep(delay);
            } else {
                debugUtils.error(`Failed to list documents from ${collectionId} after ${attempt} attempts`, error);
                throw error;
            }
        }
    }
}

/**
 * Enhanced createDocument with retry logic and error handling
 */
async function enhancedCreateDocument(databaseId, collectionId, documentId, data, permissions = []) {
    debugUtils.start(`Creating document in ${collectionId}`);
    
    const maxRetries = UTILS_CONFIG.retry.maxAttempts;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        try {
            if (!window.appwriteDatabases) {
                throw new Error('Appwrite databases not initialized');
            }
            
            // Use the appropriate database based on collection
            const database = getDatabaseForCollection(collectionId);
            const result = await database.createDocument(
                databaseId,
                collectionId,
                documentId,
                data,
                permissions
            );
            
            debugUtils.done(`Successfully created document in ${collectionId}`);
            return result;
            
        } catch (error) {
            const isRetryable = isRetryableError(error);
            const shouldRetry = attempt < maxRetries && isRetryable;
            
            if (shouldRetry) {
                const delay = calculateRetryDelay(attempt);
                debugUtils.warn(`Attempt ${attempt} failed for ${collectionId}, retrying in ${delay}ms`, error.message);
                await sleep(delay);
            } else {
                debugUtils.error(`Failed to create document in ${collectionId} after ${attempt} attempts`, error);
                throw error;
            }
        }
    }
}

/**
 * Enhanced updateDocument with retry logic and error handling
 */
async function enhancedUpdateDocument(databaseId, collectionId, documentId, data, permissions = []) {
    debugUtils.start(`Updating document ${documentId} in ${collectionId}`);
    
    const maxRetries = UTILS_CONFIG.retry.maxAttempts;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        try {
            if (!window.appwriteDatabases) {
                throw new Error('Appwrite databases not initialized');
            }
            
            // Use the appropriate database based on collection
            const database = getDatabaseForCollection(collectionId);
            const result = await database.updateDocument(
                databaseId,
                collectionId,
                documentId,
                data,
                permissions
            );
            
            debugUtils.done(`Successfully updated document ${documentId} in ${collectionId}`);
            return result;
            
        } catch (error) {
            const isRetryable = isRetryableError(error);
            const shouldRetry = attempt < maxRetries && isRetryable;
            
            if (shouldRetry) {
                const delay = calculateRetryDelay(attempt);
                debugUtils.warn(`Attempt ${attempt} failed for ${documentId} in ${collectionId}, retrying in ${delay}ms`, error.message);
                await sleep(delay);
            } else {
                debugUtils.error(`Failed to update document ${documentId} in ${collectionId} after ${attempt} attempts`, error);
                throw error;
            }
        }
    }
}

/**
 * Enhanced deleteDocument with retry logic and error handling
 */
async function enhancedDeleteDocument(databaseId, collectionId, documentId) {
    debugUtils.start(`Deleting document ${documentId} from ${collectionId}`);
    
    const maxRetries = UTILS_CONFIG.retry.maxAttempts;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        
        try {
            if (!window.appwriteDatabases) {
                throw new Error('Appwrite databases not initialized');
            }
            
            // Use the appropriate database based on collection
            const database = getDatabaseForCollection(collectionId);
            const result = await database.deleteDocument(
                databaseId,
                collectionId,
                documentId
            );
            
            debugUtils.done(`Successfully deleted document ${documentId} from ${collectionId}`);
            return result;
            
        } catch (error) {
            const isRetryable = isRetryableError(error);
            const shouldRetry = attempt < maxRetries && isRetryable;
            
            if (shouldRetry) {
                const delay = calculateRetryDelay(attempt);
                debugUtils.warn(`Attempt ${attempt} failed for ${documentId} in ${collectionId}, retrying in ${delay}ms`, error.message);
                await sleep(delay);
            } else {
                debugUtils.error(`Failed to delete document ${documentId} from ${collectionId} after ${attempt} attempts`, error);
                throw error;
            }
        }
    }
}

// ====================
// PERMISSION UTILITIES
// ====================

/**
 * Get proper Appwrite permissions for document creation
 * This function handles both authenticated and anonymous users gracefully
 */
function getDocumentPermissions() {
    try {
        // Check if Appwrite is available and auth service is initialized
        if (!window.Appwrite || !window.authService) {
            debugUtils.warn('Appwrite or authService not available, using default permissions');
            return [];
        }
        
        // Get current user
        const currentUser = window.authService.getCurrentUser();
        
        if (!currentUser) {
            // No user authenticated - use project-level permissions
            debugUtils.info('No user authenticated, using project permissions');
            return [];
        }
        
        // Check if this is an anonymous user
        const isAnonymousUser = currentUser.labels && currentUser.labels.includes('anonymous');
        
        if (isAnonymousUser) {
            // Anonymous user - grant write access to anyone who can read
            debugUtils.info('Anonymous user detected, using public permissions');
            return [
                Appwrite.Permission.read('any'),
                Appwrite.Permission.write('any')
            ];
        }
        
        // Real authenticated user - grant permissions to this specific user
        debugUtils.info('Real user authenticated, using user-specific permissions', {
            userId: currentUser.$id,
            email: currentUser.email
        });
        
        return [
            Appwrite.Permission.read(Appwrite.Role.user(currentUser.$id)),
            Appwrite.Permission.write(Appwrite.Role.user(currentUser.$id))
        ];
        
    } catch (error) {
        debugUtils.error('Failed to generate permissions', error);
        // Fallback to empty permissions (project-level)
        return [];
    }
}

// ====================
// DATABASE UTILITY FUNCTIONS
// ====================

/**
 * Get the appropriate database instance for a collection
 */
function getDatabaseForCollection(collectionName) {
    // Check if we have a collection-to-database mapping
    if (window.APPWRITE_CONFIG && window.APPWRITE_CONFIG.collectionDatabase) {
        const databaseName = window.APPWRITE_CONFIG.collectionDatabase[collectionName] || 'main';
        const databaseKey = `appwriteDatabases${databaseName.charAt(0).toUpperCase() + databaseName.slice(1)}`;
        
        if (window[databaseKey]) {
            return window[databaseKey];
        }
    }
    
    // Default to main database
    return window.appwriteDatabasesMain || window.appwriteDatabases;
}

// ====================
// ERROR HANDLING UTILITIES
// ====================

/**
 * Check if an error is retryable
 */
function isRetryableError(error) {
    if (!error) return false;
    
    const errorString = error.message || error.code || error.toString();
    const errorCode = error.code || '';
    
    // Check if error message contains retryable keywords
    const isRetryableByMessage = UTILS_CONFIG.errors.retryableErrors.some(keyword =>
        errorString.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Check if error code indicates server issues - safely handle different types
    const errorStringCode = String(errorCode || '');
    const isServerIssue = errorStringCode.startsWith('5') || ['502', '503', '504'].includes(errorCode);
    
    return isRetryableByMessage || isServerIssue;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(attempt) {
    const delay = UTILS_CONFIG.retry.baseDelay * Math.pow(UTILS_CONFIG.retry.backoffFactor, attempt - 1);
    return Math.min(delay, UTILS_CONFIG.retry.maxDelay) + Math.random() * 1000; // Add jitter
}

/**
 * Sleep utility for async delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle Appwrite errors consistently
 */
function handleAppwriteError(error, context = '') {
    debugUtils.error(`Appwrite error in ${context}`, error);
    
    const errorInfo = {
        message: error.message || UTILS_CONFIG.errors.defaultErrorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        type: error.type || 'UNKNOWN',
        context: context,
        timestamp: new Date().toISOString()
    };
    
    // Log to console if enabled
    if (UTILS_CONFIG.errors.logToConsole) {
        console.error('Appwrite Error:', errorInfo);
    }
    
    // Show user notification if enabled
    if (UTILS_CONFIG.errors.showUserNotifications && window.simpleNotifications) {
        window.simpleNotifications.showNotification(errorInfo.message, 'error');
    }
    
    return errorInfo;
}

/**
 * Wrap Appwrite operation with error handling
 */
async function withErrorHandling(operation, context = '') {
    try {
        return await operation();
    } catch (error) {
        handleAppwriteError(error, context);
        throw error;
    }
}

// ====================
// CONTENT UTILITIES
// ====================

/**
 * Compress content to fit size limits
 */
function compressContent(content, maxLength = UTILS_CONFIG.content.maxSize) {
    if (!content || typeof content !== 'string') {
        return content;
    }
    
    if (content.length <= maxLength) {
        return content;
    }
    
    const truncatedLength = maxLength - UTILS_CONFIG.content.truncationMessage.length;
    const truncated = content.substring(0, truncatedLength);
    
    return truncated + UTILS_CONFIG.content.truncationMessage
        .replace('__SIZE__', content.length.toString());
}

/**
 * Safe JSON parse with fallback
 */
function safeParseJSON(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        debugUtils.warn('Failed to parse JSON', error.message);
        return defaultValue;
    }
}

/**
 * Safe JSON stringify with error handling
 */
function safeStringifyJSON(obj, defaultValue = null) {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        debugUtils.warn('Failed to stringify JSON', error.message);
        return defaultValue;
    }
}

/**
 * Estimate content size
 */
function estimateContentSize(content) {
    if (typeof content === 'string') {
        return content.length;
    }
    
    if (typeof content === 'object') {
        return JSON.stringify(content).length;
    }
    
    return 0;
}

/**
 * Validate content size
 */
function validateContentSize(content, maxSize = UTILS_CONFIG.content.maxSize) {
    const size = estimateContentSize(content);
    return {
        isValid: size <= maxSize,
        size: size,
        maxSize: maxSize,
        status: size <= maxSize ? 'valid' : 'too_large'
    };
}

// ====================
// BOARD OPERATIONS
// ====================

/**
 * Get board by ID with enhanced error handling
 */
async function getBoardById(board_id) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main;

    return withErrorHandling(async () => {
        const database = getDatabaseForCollection('boards');
        const result = await database.getDocument(databaseId, 'boards', board_id);

        return result;
    }, 'getBoardById');
}

/**
 * Update board with enhanced error handling
 */
async function updateBoard(board_id, updates) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get user email if available (only if not already provided in updates)
    let $updatedAta = { ...updates };
    if (!$updatedAta.email) {
        try {
            if (window.authService) {
                const currentUser = window.authService.getCurrentUser();
                if (currentUser && currentUser.email) {
                    $updatedAta.email = currentUser.email;
                }
            }
        } catch (error) {
            debugUtils.warn('Could not get user email for board update', error.message);
        }
    }
    
    return withErrorHandling(async () => {
        const board = await getBoardById(board_id);
        
        return enhancedUpdateDocument(
            databaseId,
            'boards',
            board.$id,
            {
                ...board,
                ...$updatedAta,
                $updatedAt: new Date().toISOString()
            }
        );
    }, 'updateBoard');
}

/**
 * Create board with enhanced error handling
 */
async function createBoard(boardData) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get proper permissions - use project permissions if no user, otherwise user permissions
    const permissions = getDocumentPermissions();
    
    // Get user email if available
    let userEmail = '';
    try {
        if (window.authService) {
            const currentUser = window.authService.getCurrentUser();
            if (currentUser && currentUser.email) {
                userEmail = currentUser.email;
            }
        }
    } catch (error) {
        debugUtils.warn('Could not get user email for board creation', error.message);
    }
    
    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'boards',
            Appwrite.ID.unique(),
            {
                board_name: boardData.board_name || boardData.name || 'Untitled Board',
                email: userEmail
            },
            permissions
        );
    }, 'createBoard');
}

// ====================
// FOLDER OPERATIONS
// ====================

/**
 * Get folders by board ID with enhanced error handling
 */
async function getFoldersByBoard_id(board_id) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    return withErrorHandling(async () => {
        const result = await enhancedListDocuments(
            databaseId,
            'folders',
            [Appwrite.Query.equal('board_id', board_id)],
            { orderAttributes: ['position'] }
        );
        
        return result.documents;
    }, 'getFoldersByBoard_id');
}

/**
 * Create folder with enhanced error handling
 */
async function createFolder(board_id, folderData) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get proper permissions
    const permissions = getDocumentPermissions();
    
    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'folders',
            Appwrite.ID.unique(),
            {
                board_id: board_id,
                title: folderData.title || 'Untitled Folder',
                position: folderData.position || '0,0',
                files: folderData.files || [],
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            },
            permissions
        );
    }, 'createFolder');
}

// ====================
// CANVAS HEADER OPERATIONS
// ====================

/**
 * Get canvas headers by board ID with enhanced error handling
 */
async function getCanvasHeadersByBoard_id(board_id) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    return withErrorHandling(async () => {
        const result = await enhancedListDocuments(
            databaseId,
            'canvasHeaders',
            [Appwrite.Query.equal('board_id', board_id)],
            { orderAttributes: ['position'] }
        );
        
        return result.documents;
    }, 'getCanvasHeadersByBoard_id');
}

/**
 * Create canvas header with enhanced error handling
 */
async function createCanvasHeader(board_id, headerData) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get proper permissions
    const permissions = getDocumentPermissions();
    
    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'canvasHeaders',
            Appwrite.ID.unique(),
            {
                board_id: board_id,
                title: headerData.text || headerData.title || 'Untitled Header',
                position: headerData.position || '0,0',
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            },
            permissions
        );
    }, 'createCanvasHeader');
}

// ====================
// DRAWING PATHS OPERATIONS
// ====================

/**
 * Get drawing paths by board ID with enhanced error handling
 */
async function getDrawingPathsByBoard_id(board_id) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    return withErrorHandling(async () => {
        const result = await enhancedListDocuments(
            databaseId,
            'drawingPaths',
            [Appwrite.Query.equal('board_id', board_id)],
            { orderAttributes: ['$$updatedAt'] }
        );
        
        return result.documents;
    }, 'getDrawingPathsByBoard_id');
}

/**
 * Create drawing path with enhanced error handling
 */
async function createDrawingPath(board_id, pathData) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get proper permissions
    const permissions = getDocumentPermissions();
    
    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'drawingPaths',
            Appwrite.ID.unique(),
            {
                board_id: board_id,
                drawing_paths: pathData.drawing_paths || pathData.paths || '',
                color: pathData.color || '#000000',
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            },
            permissions
        );
    }, 'createDrawingPath');
}

// ====================
// BOOKMARK OPERATIONS (for main2 database)
// ====================

/**
 * Get bookmarks with enhanced error handling
 */
async function getBookmarks() {
    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Database configuration not available');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;

    return withErrorHandling(async () => {
        const result = await enhancedListDocuments(
            databaseId,
            'bookmarks'
        );

        return result.documents;
    }, 'getBookmarks');
}

/**
 * Create bookmark with enhanced error handling
 */
async function createBookmark(bookmarkData) {
    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Database configuration not available');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;

    // Get proper permissions
    const permissions = getDocumentPermissions();

    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'bookmarks',
            Appwrite.ID.unique(),
            {
                title: bookmarkData.title || '',
                url: bookmarkData.url || '',
                description: bookmarkData.description || '',
                tags: bookmarkData.tags || [],
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            },
            permissions
        );
    }, 'createBookmark');
}

// ====================
// SETTINGS OPERATIONS (for main2 database)
// ====================

/**
 * Get settings for current user with enhanced error handling
 */
async function getUserSettings() {
    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Database configuration not available');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;

    return withErrorHandling(async () => {
        let userEmail = 'anonymous';
        try {
            if (window.authService) {
                const currentUser = window.authService.getCurrentUser();
                if (currentUser && currentUser.email) {
                    userEmail = currentUser.email;
                } else if (currentUser && currentUser.$id) {
                    userEmail = `user_${currentUser.$id}`;
                }
            }
        } catch (error) {
            debugUtils.warn('Could not get user for settings lookup', error.message);
        }

        const result = await enhancedListDocuments(
            databaseId,
            'settings',
            [Appwrite.Query.limit(1)] // Only need the first settings document
        );

        // Return the first settings document or default values
        if (result.documents && result.documents.length > 0) {
            const settings = result.documents[0];
            debugUtils.detail('Found user settings', settings);
            return {
                dev_mode: settings.dev_mode || false,
                onboarding: settings.onboarding || false
            };
        }

        debugUtils.info('No settings found, returning defaults');
        return {
            dev_mode: false,
            onboarding: false
        };
    }, 'getUserSettings');
}

/**
 * Save settings for current user with enhanced error handling
 */
async function saveUserSettings(settingsData) {
    if (!window.APPWRITE_CONFIG?.databases?.main2) {
        throw new Error('Database configuration not available');
    }

    const databaseId = window.APPWRITE_CONFIG.databases.main2;

    // Get proper permissions
    const permissions = getDocumentPermissions();

    return withErrorHandling(async () => {
        // First try to get existing settings
        const existingSettings = await enhancedListDocuments(
            databaseId,
            'settings',
            [Appwrite.Query.limit(1)]
        );

        // Update existing or create new
        if (existingSettings.documents && existingSettings.documents.length > 0) {
            const existingDoc = existingSettings.documents[0];
            return enhancedUpdateDocument(
                databaseId,
                'settings',
                existingDoc.$id,
                {
                    ...existingDoc,
                    dev_mode: settingsData.dev_mode !== undefined ? settingsData.dev_mode : existingDoc.dev_mode || false,
                    onboarding: settingsData.onboarding !== undefined ? settingsData.onboarding : existingDoc.onboarding || false,
                    $updatedAt: new Date().toISOString()
                },
                permissions
            );
        } else {
            return enhancedCreateDocument(
                databaseId,
                'settings',
                Appwrite.ID.unique(),
                {
                    dev_mode: settingsData.dev_mode !== undefined ? settingsData.dev_mode : false,
                    onboarding: settingsData.onboarding !== undefined ? settingsData.onboarding : false
                },
                permissions
            );
        }
    }, 'saveUserSettings');
}

// ====================
// FILE OPERATIONS (for main database)
// ====================

/**
 * Get files with enhanced error handling
 */
async function getFiles() {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    return withErrorHandling(async () => {
        const result = await enhancedListDocuments(
            databaseId,
            'files'
        );
        
        return result.documents;
    }, 'getFiles');
}

/**
 * Create file with enhanced error handling
 */
async function createFile(fileData) {
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    // Get proper permissions
    const permissions = getDocumentPermissions();
    
    return withErrorHandling(async () => {
        return enhancedCreateDocument(
            databaseId,
            'files',
            Appwrite.ID.unique(),
            {
                name: fileData.name || '',
                type: fileData.type || '',
                size: fileData.size || 0,
                url: fileData.url || '',
                metadata: fileData.metadata || {},
                createdAt: new Date().toISOString(),
                $updatedAt: new Date().toISOString()
            },
            permissions
        );
    }, 'createFile');
}

// ====================
// GLOBALS & EXPORTS
// ====================

window.appwriteUtils = {
    // Enhanced database operations
    listDocuments: enhancedListDocuments,
    createDocument: enhancedCreateDocument,
    updateDocument: enhancedUpdateDocument,
    deleteDocument: enhancedDeleteDocument,
    
    // Permission utilities
    getDocumentPermissions,
    
    // Database utility
    getDatabaseForCollection,
    
    // Error handling
    handleAppwriteError,
    withErrorHandling,
    isRetryableError,
    calculateRetryDelay,
    
    // Content utilities
    compressContent,
    safeParseJSON,
    safeStringifyJSON,
    estimateContentSize,
    validateContentSize,
    
    // Board operations
    getBoardById,
    updateBoard,
    createBoard,
    
    // Folder operations
    getFoldersByBoard_id,
    createFolder,
    
    // Canvas header operations
    getCanvasHeadersByBoard_id,
    createCanvasHeader,
    
    // Drawing paths operations
    getDrawingPathsByBoard_id,
    createDrawingPath,
    
    // Bookmark operations (main2 database)
    getBookmarks,
    createBookmark,
    
    // File operations (main database)
    getFiles,
    createFile,
    
    // settings operations (main2 database)
    getUserSettings,
    saveUserSettings,

    // Configuration
    config: UTILS_CONFIG
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.appwriteUtils;
}

debugUtils.info('Appwrite utilities service module loaded');
