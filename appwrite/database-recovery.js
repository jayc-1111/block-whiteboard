// Database Recovery Utilities
// This module provides comprehensive error recovery mechanisms for database operations

if (window['DATABASE_RECOVERY_LOADED']) {
    console.log('⚠️ database-recovery.js already loaded, skipping...');
} else {
    window['DATABASE_RECOVERY_LOADED'] = true;

    // Debug utilities
    const debugRecovery = {
        info: (msg, data) => console.log(`🔄 DATABASE_RECOVERY: ${msg}`, data || ''),
        error: (msg, error) => console.error(`❌ DATABASE_RECOVERY ERROR: ${msg}`, error),
        warn: (msg, data) => console.warn(`⚠️ DATABASE_RECOVERY: ${msg}`, data || ''),
        step: (msg) => console.log(`👉 DATABASE_RECOVERY: ${msg}`),
        detail: (msg, data) => console.log(`📋 DATABASE_RECOVERY: ${msg}`, data || ''),
        start: (msg) => console.log(`🚀 DATABASE_RECOVERY: ${msg}`),
        done: (msg) => console.log(`✅ DATABASE_RECOVERY: ${msg || 'Operation completed'}`)
    };

    // Recovery configuration
    const RECOVERY_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryableErrors: [
            'timeout',
            'connection',
            'network',
            'unavailable',
            '502',
            '503',
            '504',
            'ECONNRESET',
            'ETIMEDOUT'
        ],
        criticalCollections: ['boards', 'folders', 'canvasHeaders', 'drawingPaths'],
        essentialAttributes: {
            boards: ['board_id', 'name', '$updatedAt', 'createdAt', 'version'],
            folders: ['board_id', 'title', 'position'],
            canvasHeaders: ['board_id', 'text', 'position'],
            drawingPaths: ['board_id', 'drawing_paths']
        }
    };

    // Error classification and recovery strategies
    class RecoveryService {
        constructor() {
            this.recoveryAttempts = new Map();
            this.errorHistory = [];
            this.isRecovering = false;
        }

        // Classify error and determine recovery strategy
        classifyError(error) {
            const errorInfo = {
                originalError: error,
                timestamp: new Date().toISOString(),
                type: 'unknown',
                severity: 'medium',
                recoverable: false,
                recoveryStrategy: 'none'
            };

            const errorMessage = error.message || error.toString() || '';
            const errorCode = error.code || '';

            // Network/connection errors
            if (errorMessage.match(/timeout|connection|network|unavailable|50[234]/i) ||
                errorCode.match(/timeout|connection|network|50[234]/)) {
                errorInfo.type = 'network';
                errorInfo.severity = 'high';
                errorInfo.recoverable = true;
                errorInfo.recoveryStrategy = 'retry';
            }

            // Permission/authentication errors
            else if (errorMessage.match(/permission|unauthorized|forbidden|40[13]/i) ||
                     errorCode.match(/permission|unauthorized|forbidden|40[13]/)) {
                errorInfo.type = 'permission';
                errorInfo.severity = 'critical';
                errorInfo.recoverable = false;
                errorInfo.recoveryStrategy = 'reauth';
            }

            // Validation/attribute errors
            else if (errorMessage.match(/attribute|validation|400|schema/i)) {
                errorInfo.type = 'validation';
                errorInfo.severity = 'medium';
                errorInfo.recoverable = true;
                errorInfo.recoveryStrategy = 'fix-schema';
            }

            // Not found errors
            else if (errorMessage.match(/not found|404/i) ||
                     errorCode.match(/not found|404/)) {
                errorInfo.type = 'not-found';
                errorInfo.severity = 'medium';
                errorInfo.recoverable = true;
                errorInfo.recoveryStrategy = 'create-missing';
            }

            // Conflict errors
            else if (errorMessage.match(/conflict|409/i) ||
                     errorCode.match(/conflict|409/)) {
                errorInfo.type = 'conflict';
                errorInfo.severity = 'medium';
                errorInfo.recoverable = true;
                errorInfo.recoveryStrategy = 'retry-with-conflict-resolution';
            }

            // Rate limiting
            else if (errorMessage.match(/rate limit|429/i) ||
                     errorCode.match(/rate limit|429/)) {
                errorInfo.type = 'rate-limit';
                errorInfo.severity = 'low';
                errorInfo.recoverable = true;
                errorInfo.recoveryStrategy = 'retry-with-delay';
            }

            // Unknown errors
            else {
                errorInfo.type = 'unknown';
                errorInfo.severity = 'medium';
                errorInfo.recoverable = true; // Changed to true for better testing
                errorInfo.recoveryStrategy = 'retry';
            }

            this.errorHistory.push(errorInfo);
            return errorInfo;
        }

        // Execute recovery based on error classification
        async recoverFromError(error, context = {}) {
            const errorInfo = this.classifyError(error);
            debugRecovery.warn(`Classified error: ${errorInfo.type} (severity: ${errorInfo.severity})`, {
                error: errorInfo.originalError,
                strategy: errorInfo.recoveryStrategy,
                context
            });

            if (!errorInfo.recoverable) {
                debugRecovery.error('Error is not recoverable', errorInfo);
                throw error;
            }

            // Check recovery attempts
            const errorKey = `${errorInfo.type}_${context.operation || 'unknown'}`;
            const attempts = this.recoveryAttempts.get(errorKey) || 0;

            if (attempts >= RECOVERY_CONFIG.maxRetries) {
                debugRecovery.error(`Max recovery attempts (${RECOVERY_CONFIG.maxRetries}) exceeded for ${errorKey}`);
                throw error;
            }

            // Increment attempt counter
            this.recoveryAttempts.set(errorKey, attempts + 1);

            try {
                switch (errorInfo.recoveryStrategy) {
                    case 'retry':
                        return await this.retryOperation(context);
                    case 'fix-schema':
                        return await this.fixSchema(context);
                    case 'create-missing':
                        return await this.createMissingResources(context);
                    case 'retry-with-conflict-resolution':
                        return await this.retryWithConflictResolution(context);
                    case 'retry-with-delay':
                        return await this.retryWithBackoff(context);
                    case 'reauth':
                        return await this.reauthenticate(context);
                    default:
                        throw error;
                }
            } catch (recoveryError) {
                debugRecovery.error('Recovery attempt failed', recoveryError);
                
                // If recovery fails, wrap the original error with recovery context
                error.recoveryFailed = true;
                error.recoveryAttempts = attempts + 1;
                error.recoveryError = recoveryError;
                throw error;
            }
        }

        // Retry operation with exponential backoff
        async retryOperation(context, attempt = 1) {
            const delay = Math.min(
                RECOVERY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
                RECOVERY_CONFIG.maxDelay
            );

            debugRecovery.info(`Retrying operation (attempt ${attempt}), waiting ${delay}ms...`);

            await this.sleep(delay);

            try {
                return await context.operation();
            } catch (error) {
                if (attempt < RECOVERY_CONFIG.maxRetries) {
                    return this.retryOperation(context, attempt + 1);
                }
                throw error;
            }
        }

        // Fix schema issues by recreating or updating collections
        async fixSchema(context) {
            const { collection, databaseId, databases } = context;

            debugRecovery.step(`Attempting to fix schema for ${collection} collection...`);

            try {
                // Check if collection exists
                const exists = await this.checkCollectionExists(databases, databaseId, collection);
                
                if (!exists) {
                    debugRecovery.info(`Collection ${collection} doesn't exist, creating it...`);
                    return this.createCollection(collection, databaseId, databases);
                } else {
                    debugRecovery.info(`Collection ${collection} exists, checking attributes...`);
                    return this.validateAndFixAttributes(collection, databaseId, databases);
                }
            } catch (error) {
                debugRecovery.error('Schema fix failed', error);
                throw error;
            }
        }

        // Check if collection exists
        async checkCollectionExists(databases, databaseId, collectionId) {
            try {
                await databases.getCollection(databaseId, collectionId);
                return true;
            } catch (error) {
                if (error.code === 404) {
                    return false;
                }
                throw error;
            }
        }

        // Create collection with proper schema
        async createCollection(collectionName, databaseId, databases) {
            debugRecovery.step(`Creating ${collectionName} collection...`);

            try {
                // Create collection
                const collection = await databases.createCollection(
                    databaseId,
                    collectionName,
                    collectionName,
                    ['write'] // Permissions
                );

                debugRecovery.done(`Created ${collectionName} collection: ${collection.$id}`);

                // Add essential attributes
                await this.addEssentialAttributes(collectionName, databaseId, databases);

                return collection;
            } catch (error) {
                debugRecovery.error(`Failed to create ${collectionName} collection`, error);
                throw error;
            }
        }

        // Add essential attributes to collection
        async addEssentialAttributes(collectionName, databaseId, databases) {
            const essentialAttrs = RECOVERY_CONFIG.essentialAttributes[collectionName] || [];

            for (const attrName of essentialAttrs) {
                try {
                    const attrType = this.getAttributeType(collectionName, attrName);
                    
                    switch (attrType) {
                        case 'string':
                            await databases.createStringAttribute(databaseId, collectionName, attrName, 255, true);
                            break;
                        case 'datetime':
                            await databases.createDatetimeAttribute(databaseId, collectionName, attrName, true);
                            break;
                        case 'boolean':
                            await databases.createBooleanAttribute(databaseId, collectionName, attrName, false);
                            break;
                        case 'integer':
                            await databases.createIntegerAttribute(databaseId, collectionName, attrName, true);
                            break;
                    }

                    debugRecovery.info(`Added essential attribute ${attrName} to ${collectionName}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        debugRecovery.info(`Attribute ${attrName} already exists in ${collectionName}`);
                    } else {
                        debugRecovery.warn(`Failed to add attribute ${attrName} to ${collectionName}`, error);
                    }
                }
            }
        }

        // Get attribute type based on collection and attribute name
        getAttributeType(collectionName, attrName) {
            const typeMap = {
                boards: {
                    board_id: 'string',
                    name: 'string',
                    $updatedAt: 'datetime',
                    createdAt: 'datetime',
                    version: 'integer'
                },
                folders: {
                    board_id: 'string',
                    title: 'string',
                    position: 'string'
                },
                canvasHeaders: {
                    board_id: 'string',
                    text: 'string',
                    position: 'string'
                },
                drawingPaths: {
                    board_id: 'string',
                    drawing_paths: 'string'
                }
            };

            return typeMap[collectionName]?.[attrName] || 'string';
        }

        // Validate and fix collection attributes
        async validateAndFixAttributes(collectionName, databaseId, databases) {
            try {
                // Get existing attributes
                const attributes = await this.getCollectionAttributes(databases, databaseId, collectionName);
                const existingAttrNames = new Set(attributes.map(attr => attr.key));

                // Check for missing essential attributes
                const essentialAttrs = RECOVERY_CONFIG.essentialAttributes[collectionName] || [];
                const missingAttrs = essentialAttrs.filter(attr => !existingAttrNames.has(attr));

                if (missingAttrs.length > 0) {
                    debugRecovery.warn(`Missing essential attributes in ${collectionName}:`, missingAttrs);
                    await this.addEssentialAttributes(collectionName, databaseId, databases);
                }

                return { attributes, fixed: missingAttrs.length > 0 };
            } catch (error) {
                debugRecovery.error(`Failed to validate attributes for ${collectionName}`, error);
                throw error;
            }
        }

        // Get collection attributes with fallback methods
        async getCollectionAttributes(databases, databaseId, collectionId) {
            const methodsToTry = ['listAttributes', 'getAttributes', 'attributes'];

            for (const methodName of methodsToTry) {
                if (typeof databases[methodName] === 'function') {
                    try {
                        const result = await databases[methodName](databaseId, collectionId);
                        return result.attributes || [];
                    } catch (error) {
                        debugRecovery.warn(`Method ${methodName} failed for ${collectionId}`, error);
                    }
                }
            }

            // Fallback: return empty array
            return [];
        }

        // Create missing resources
        async createMissingResources(context) {
            const { collection, databaseId, databases } = context;

            debugRecovery.step(`Creating missing resources for ${collection}...`);

            try {
                // Check if collection exists
                const exists = await this.checkCollectionExists(databases, databaseId, collection);
                
                if (!exists) {
                    return this.createCollection(collection, databaseId, databases);
                }

                // Collection exists, check if we need to create sample data
                if (collection === 'boards' && context.createDefaultData) {
                    return this.createDefaultBoard(databases, databaseId);
                }

                return { success: true, message: 'Resources already exist' };
            } catch (error) {
                debugRecovery.error('Failed to create missing resources', error);
                throw error;
            }
        }

        // Create default board if none exist
        async createDefaultBoard(databases, databaseId) {
            try {
                // Check if boards exist first
                const existingBoards = await databases.listDocuments(databaseId, 'boards', [], { limit: 1 });
                
                if (existingBoards.total > 0) {
                    return { success: true, message: 'Boards already exist' };
                }

                // Create default board
                const defaultBoard = {
                    board_id: Appwrite.ID.unique(),
                    name: 'My Board',
                    folders: [],
                    canvasHeaders: [],
                    drawingPaths: [],
                    isDevMode: false,
                    onboardingShown: false,
                    version: 1,
                    createdAt: new Date().toISOString(),
                    $updatedAt: new Date().toISOString()
                };

                const result = await databases.createDocument(
                    databaseId,
                    'boards',
                    Appwrite.ID.unique(),
                    defaultBoard,
                    ['write']
                );

                debugRecovery.done('Created default board', { board_id: defaultBoard.board_id, documentId: result.$id });
                return { success: true, board: result };
            } catch (error) {
                debugRecovery.error('Failed to create default board', error);
                throw error;
            }
        }

        // Retry with conflict resolution
        async retryWithConflictResolution(context) {
            debugRecovery.step('Retrying with conflict resolution...');

            // Implement conflict resolution logic
            if (context.conflictResolution) {
                return context.conflictResolution();
            }

            // Default: retry with different ID or timestamp
            const delay = 1000; // 1 second delay
            await this.sleep(delay);

            if (context.operation) {
                return context.operation();
            }

            throw new Error('No operation provided for conflict resolution retry');
        }

        // Retry with backoff for rate limiting
        async retryWithBackoff(context, attempt = 1) {
            const delay = Math.min(
                RECOVERY_CONFIG.baseDelay * attempt * 2, // Linear backoff for rate limiting
                RECOVERY_CONFIG.maxDelay
            );

            debugRecovery.info(`Rate limited, retrying in ${delay}ms (attempt ${attempt})...`);
            await this.sleep(delay);

            if (attempt >= RECOVERY_CONFIG.maxRetries) {
                throw new Error('Max retries exceeded for rate limited operation');
            }

            if (context.operation) {
                return context.operation();
            }

            throw new Error('No operation provided for retry');
        }

        // Reauthentication fallback
        async reauthenticate(context) {
            debugRecovery.step('Attempting reauthentication...');

            if (typeof window.appwriteAuth !== 'undefined' && window.appwriteAuth.renewSession) {
                try {
                    await window.appwriteAuth.renewSession();
                    debugRecovery.done('Reauthentication successful');
                    
                    if (context.operation) {
                        return context.operation();
                    }
                } catch (authError) {
                    debugRecovery.error('Reauthentication failed', authError);
                }
            }

            throw new Error('Reauthentication not available or failed');
        }

        // Utility functions
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Reset recovery attempts for a specific error type
        resetRecoveryAttempts(errorType) {
            const keysToDelete = Array.from(this.recoveryAttempts.keys())
                .filter(key => key.startsWith(`${errorType}_`));
            
            keysToDelete.forEach(key => this.recoveryAttempts.delete(key));
            
            debugRecovery.info(`Reset recovery attempts for: ${errorType}`, { deletedKeys: keysToDelete });
        }

        // Get recovery statistics
        getRecoveryStats() {
            const stats = {
                totalErrors: this.errorHistory.length,
                recoveryAttempts: this.recoveryAttempts.size,
                errorTypes: {},
                recentErrors: this.errorHistory.slice(-5) // Last 5 errors
            };

            // Count error types
            this.errorHistory.forEach(error => {
                stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
            });

            return stats;
        }

        // Clear recovery history
        clearHistory() {
            this.errorHistory = [];
            this.recoveryAttempts.clear();
            debugRecovery.info('Cleared recovery history');
        }
    }

    // Initialize recovery service
    const recoveryService = new RecoveryService();

    // Global error handler for database operations
    function handleDatabaseError(error, context = {}) {
        debugRecovery.error('Database operation failed', error, context);

        // Add context to error
        error.recoveryContext = context;

        // Attempt recovery
        return recoveryService.recoverFromError(error, context).catch(recoveryError => {
            // If recovery fails, check if we should notify the user
            if (window.simpleNotifications && recoveryError.recoveryFailed) {
                const message = recoveryError.recoveryError?.message || 'Operation failed after multiple attempts';
                window.simpleNotifications.showNotification(message, 'error');
            }

            throw recoveryError;
        });
    }

    // Wrap database operations with recovery
    function withRecovery(operation, context = {}) {
        return async (...args) => {
            try {
                return await operation(...args);
            } catch (error) {
                return handleDatabaseError(error, { ...context, operation });
            }
        };
    }

    // Make recovery utilities available globally
    window.databaseRecovery = {
        recoveryService,
        handleDatabaseError,
        withRecovery,
        RECOVERY_CONFIG,
        getStats: () => recoveryService.getRecoveryStats(),
        clearHistory: () => recoveryService.clearHistory()
    };

    // Auto-initialize recovery monitoring
    function initializeRecoveryMonitoring() {
        debugRecovery.start('Initializing database recovery monitoring...');

        // Wrap global database operations with recovery
        if (window.appwriteDatabases) {
            const databases = window.appwriteDatabases;
            
            // Wrap critical methods
            ['createCollection', 'updateCollection', 'deleteCollection', 'listCollections'].forEach(method => {
                if (typeof databases[method] === 'function') {
                    const original = databases[method];
                    databases[method] = withRecovery(
                        original.bind(databases),
                        { service: 'databases', operation: method }
                    );
                }
            });
        }

        if (window.appwriteUtils) {
            // Wrap utils operations
            ['createDocument', 'updateDocument', 'deleteDocument', 'listDocuments'].forEach(method => {
                if (typeof window.appwriteUtils[method] === 'function') {
                    const original = window.appwriteUtils[method];
                    window.appwriteUtils[method] = withRecovery(
                        original.bind(window.appwriteUtils),
                        { service: 'utils', operation: method }
                    );
                }
            });
        }

        debugRecovery.done('Database recovery monitoring initialized');
    }

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRecoveryMonitoring);
    } else {
        setTimeout(initializeRecoveryMonitoring, 100);
    }

    debugRecovery.info('Database recovery module loaded');
}
