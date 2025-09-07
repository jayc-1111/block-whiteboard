// Guard clause to prevent redeclaration errors
if (window['DATABASE_SETUP_LOADED']) {
    console.log('⚠️ database-setup.js already loaded, skipping...');
} else {
window['DATABASE_SETUP_LOADED'] = true;

// === APPWRITE DATABASE SETUP ===
// This script automatically initializes the Appwrite database with required collections and attributes
// It runs automatically when the app starts if the database is not properly configured

// Debug utilities
const debug = window.Debug?.appwrite || {
    info: (msg, data) => console.log(`🔷 DATABASE_SETUP: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ DATABASE_SETUP ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ DATABASE_SETUP: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 DATABASE_SETUP: ${msg}`),
    detail: (msg, data) => console.log(`📋 DATABASE_SETUP: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 DATABASE_SETUP: ${msg}`),
    done: (msg) => console.log(`✅ DATABASE_SETUP: ${msg || 'Operation completed'}`)
};

// Wait for Appwrite and config to be ready
function waitForAppwriteReady() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        function checkReady() {
            attempts++;
            debug.step(`Checking Appwrite readiness (${attempts}/${maxAttempts})`);

            if (attempts > maxAttempts) {
                const error = 'Appwrite SDK or databases service not available after maximum attempts';
                debug.error(error);
                // Don't reject, resolve anyway to prevent app from hanging
                resolve();
                return;
            }

            // Check if Appwrite SDK is loaded first
            if (window.Appwrite) {
                debug.step('Appwrite SDK loaded, checking services...');
            }

            // Check if global services are available
            if (window.Appwrite && window.databases) {
                debug.done('Appwrite and databases service ready');
                resolve();
                return;
            }

            // If Appwrite is loaded but databases service isn't ready yet, initialize it
            if (window.Appwrite && !window.databases && window.APPWRITE_CONFIG) {
                try {
                    debug.step('Appwrite loaded, initializing databases service...');
                    // Try to initialize databases service from config
                    if (window.appwriteDatabases) {
                        window.databases = window.appwriteDatabases;
                        debug.done('Databases service initialized from config');
                        resolve();
                        return;
                    }
                } catch (initError) {
                    debug.warn('Failed to initialize databases service:', initError.message);
                }
            }

            // Log what's missing
            debug.detail('Still waiting for:', {
                'window.Appwrite': !!window.Appwrite,
                'window.databases': !!window.databases,
                'window.appwriteDatabases': !!window.appwriteDatabases,
                'window.APPWRITE_CONFIG': !!window.APPWRITE_CONFIG
            });

            setTimeout(checkReady, 100);
        }

        checkReady();
    });
}

// Get database configuration from global config
function getDatabaseConfig() {
    if (window.APPWRITE_CONFIG) {
        return window.APPWRITE_CONFIG;
    }
    // Fallback configuration
    return {
        endpoint: 'https://sfo.cloud.appwrite.io/v1',
        projectId: '68b6ed180029c5632ed3',
        databaseId: '68b6f1aa003a536da72d'
    };
}

// Database setup function
async function setupDatabase() {
    debug.start('Starting automatic database setup...');
    
    try {
        // Wait for Appwrite to be ready
        await waitForAppwriteReady();
        
        // Get configuration
        const config = getDatabaseConfig();
        debug.detail('Using database configuration', {
            endpoint: config.endpoint,
            projectId: config.projectId,
            databaseId: config.databaseId
        });
        
        // Use global databases instance
        const databases = window.databases;
        if (!databases) {
            throw new Error('Global databases service not available');
        }
        
        // Check if boards collection already exists
        let collectionExists = false;
        let collectionId = 'boards';
        
        try {
            // Try to get collection info to see if it exists
            const existingCollection = await databases.getCollection(
                config.databaseId,
                collectionId
            );
            collectionExists = true;
            debug.info('Boards collection already exists', { id: existingCollection.$id });
        } catch (error) {
            if (error.code === 404) {
                debug.info('Boards collection not found, will create it');
                collectionExists = false;
            } else {
                debug.warn('Error checking collection existence, will attempt creation', error.message);
                collectionExists = false;
            }
        }
        
        // Create boards collection if it doesn't exist
        if (!collectionExists) {
            debug.step('Creating boards collection...');
            try {
                const collection = await databases.createCollection(
                    config.databaseId,
                    collectionId, // collectionId
                    'boards', // name
                    // Permissions for authenticated users
                    ['users']
                );
                debug.done(`Collection created: ${collection.name} (${collection.$id})`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info('Collection already exists (concurrent creation)');
                } else {
                    throw error;
                }
            }
        }
        
        // Add required attributes to boards collection
        debug.step('Adding required attributes...');
        
        const attributes = [
            { name: 'boardId', type: 'string', size: 36, required: true },
            { name: 'name', type: 'string', size: 255, required: true },
            { name: 'updatedAt', type: 'datetime', required: false },
            { name: 'createdAt', type: 'datetime', required: false },
            { name: 'folders', type: 'string', size: 100000, required: false },     // Increased from 10000
            { name: 'canvasHeaders', type: 'string', size: 20000, required: false }, // Increased from 5000
            { name: 'drawingPaths', type: 'string', size: 100000, required: false }, // Increased from 20000
            { name: 'isDevMode', type: 'boolean', required: false },
            { name: 'onboardingShown', type: 'boolean', required: false }
        ];
        
        // Create folders collection
        debug.step('Creating folders collection...');
        try {
            const foldersCollection = await databases.createCollection(
                config.databaseId,
                'folders', // collectionId
                'folders', // name
                // Permissions for authenticated users
                ['users']
            );
            debug.done(`Folders collection created: ${foldersCollection.name} (${foldersCollection.$id})`);
        } catch (error) {
            if (error.message.includes('already exists') || error.code === 409) {
                debug.info('Folders collection already exists (concurrent creation)');
            } else {
                debug.error('Failed to create folders collection', error);
                throw error;
            }
        }

        // Create canvasHeaders collection (previously missing!)
        debug.step('Creating canvasHeaders collection...');
        try {
            const canvasHeadersCollection = await databases.createCollection(
                config.databaseId,
                'canvasHeaders', // collectionId
                'canvasHeaders', // name
                // Permissions for authenticated users
                ['users']
            );
            debug.done(`Canvas Headers collection created: ${canvasHeadersCollection.name} (${canvasHeadersCollection.$id})`);
        } catch (error) {
            if (error.message.includes('already exists') || error.code === 409) {
                debug.info('CanvasHeaders collection already exists (concurrent creation)');
            } else {
                debug.error('Failed to create canvasHeaders collection', error);
                throw error;
            }
        }

        // Create drawingPaths collection (previously missing!)
        debug.step('Creating drawingPaths collection...');
        try {
            const drawingPathsCollection = await databases.createCollection(
                config.databaseId,
                'drawingPaths', // collectionId
                'drawingPaths', // name
                // Permissions for authenticated users
                ['users']
            );
            debug.done(`Drawing Paths collection created: ${drawingPathsCollection.name} (${drawingPathsCollection.$id})`);
        } catch (error) {
            if (error.message.includes('already exists') || error.code === 409) {
                debug.info('DrawingPaths collection already exists (concurrent creation)');
            } else {
                debug.error('Failed to create drawingPaths collection', error);
                throw error;
            }
        }

        // Create boards indexes
        debug.step('Creating boards indexes...');
        const currentBoardsIndexes = [
            // ✅ ONLY ONE INDEX: For your query pattern Appwrite.Query.orderDesc('$updatedAt')
            { name: 'boards_sort_index', attributes: ['$updatedAt'] }
        ];

        for (const idx of currentBoardsIndexes) {
            try {
                await databases.createIndex(
                    config.databaseId,
                    'boards',
                    idx.name,
                    'key',
                    idx.attributes
                );
                debug.done(`Added ${idx.name} index to boards`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${idx.name} index already exists in boards`);
                } else {
                    debug.warn(`Could not create ${idx.name} index in boards`, error.message);
                }
            }
        }

        // Create folders indexes
        debug.step('Creating folders indexes...');
        const foldersIndexes = [
            { name: 'folder_boardId_index', attributes: ['boardId'] },
            { name: 'folder_sort_index', attributes: ['$updatedAt'] }
        ];

        for (const idx of foldersIndexes) {
            try {
                await databases.createIndex(
                    config.databaseId,
                    'folders',
                    idx.name,
                    'key',
                    idx.attributes
                );
                debug.done(`Added ${idx.name} index to folders`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${idx.name} index already exists in folders`);
                } else {
                    debug.warn(`Could not create ${idx.name} index in folders`, error.message);
                }
            }
        }

        // Create canvasHeaders indexes
        debug.step('Creating canvasHeaders indexes...');
        const canvasHeadersIndexes = [
            { name: 'canvasHeaders_board_id_index', attributes: ['board_id'] }, // Fixed: use board_id
            { name: 'canvasHeaders_sort_index', attributes: ['$updatedAt'] }
        ];

        for (const idx of canvasHeadersIndexes) {
            try {
                await databases.createIndex(
                    config.databaseId,
                    'canvasHeaders',
                    idx.name,
                    'key',
                    idx.attributes
                );
                debug.done(`Added ${idx.name} index to canvasHeaders`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${idx.name} index already exists in canvasHeaders`);
                } else {
                    debug.warn(`Could not create ${idx.name} index in canvasHeaders`, error.message);
                }
            }
        }

        // Create drawingPaths indexes (with requested naming format: board_id_updatedAt)
        debug.step('Creating drawingPaths indexes...');
        const drawingPathsIndexes = [
            { name: 'drawingPaths_board_id_index', attributes: ['board_id'] },
            { name: 'drawingPaths_board_id_updatedAt_index', attributes: ['board_id', '$updatedAt'] }, // ✅ REQUESTED FORMAT
            { name: 'drawingPaths_color_index', attributes: ['color'] },
            { name: 'drawingPaths_sort_index', attributes: ['$updatedAt'] }
        ];

        for (const idx of drawingPathsIndexes) {
            try {
                await databases.createIndex(
                    config.databaseId,
                    'drawingPaths',
                    idx.name,
                    'key',
                    idx.attributes
                );
                debug.done(`Added ${idx.name} index to drawingPaths`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${idx.name} index already exists in drawingPaths`);
                } else {
                    debug.warn(`Could not create ${idx.name} index in drawingPaths`, error.message);
                }
            }
        }
        
        // Add required attributes to canvasHeaders collection
        debug.step('Adding required attributes to canvasHeaders collection...');

        const canvasHeadersAttributes = [
            { name: 'board_id', type: 'string', size: 36, required: true }, // Changed from boardId to board_id
            { name: 'text', type: 'string', size: 255, required: true },
            { name: 'position', type: 'string', size: 1000, required: true },
            { name: 'createdAt', type: 'datetime', required: false },
            { name: 'updatedAt', type: 'datetime', required: false }
        ];

        for (const attr of canvasHeadersAttributes) {
            try {
                switch (attr.type) {
                    case 'string':
                        await databases.createStringAttribute(
                            config.databaseId,
                            'canvasHeaders',
                            attr.name,
                            attr.size,
                            attr.required
                        );
                        break;
                    case 'datetime':
                        await databases.createDatetimeAttribute(
                            config.databaseId,
                            'canvasHeaders',
                            attr.name,
                            attr.required
                        );
                        break;
                }
                debug.done(`Added ${attr.name} attribute (${attr.type}) to canvasHeaders collection`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${attr.name} attribute already exists in canvasHeaders collection`);
                } else {
                    debug.error(`Failed to create ${attr.name} attribute in canvasHeaders collection`, error);
                }
            }
        }

        // Add required attributes to drawingPaths collection
        debug.step('Adding required attributes to drawingPaths collection...');

        const drawingPathsAttributes = [
            { name: 'board_id', type: 'string', size: 36, required: true },
            { name: 'drawing_paths', type: 'string', size: 100000, required: true },
            { name: 'color', type: 'string', size: 7, required: false },
            { name: 'createdAt', type: 'datetime', required: false },
            { name: 'updatedAt', type: 'datetime', required: false }
        ];

        for (const attr of drawingPathsAttributes) {
            try {
                switch (attr.type) {
                    case 'string':
                        await databases.createStringAttribute(
                            config.databaseId,
                            'drawingPaths',
                            attr.name,
                            attr.size,
                            attr.required
                        );
                        break;
                    case 'datetime':
                        await databases.createDatetimeAttribute(
                            config.databaseId,
                            'drawingPaths',
                            attr.name,
                            attr.required
                        );
                        break;
                }
                debug.done(`Added ${attr.name} attribute (${attr.type}) to drawingPaths collection`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${attr.name} attribute already exists in drawingPaths collection`);
                } else {
                    debug.error(`Failed to create ${attr.name} attribute in drawingPaths collection`, error);
                }
            }
        }

        // Add required attributes to folders collection
        debug.step('Adding required attributes to folders collection...');

        const folderAttributes = [
            { name: 'boardId', type: 'string', size: 255, required: true },
            { name: 'title', type: 'string', size: 255, required: true },
            { name: 'position', type: 'string', size: 1000, required: true },
            { name: 'files', type: 'string', size: 10000, required: false },
            { name: 'createdAt', type: 'datetime', required: false },
            { name: 'updatedAt', type: 'datetime', required: false }
        ];
        
        for (const attr of folderAttributes) {
            try {
                switch (attr.type) {
                    case 'string':
                        await databases.createStringAttribute(
                            config.databaseId,
                            'folders',
                            attr.name,
                            attr.size,
                            attr.required
                        );
                        break;
                    case 'datetime':
                        await databases.createDatetimeAttribute(
                            config.databaseId,
                            'folders',
                            attr.name,
                            attr.required
                        );
                        break;
                    case 'boolean':
                        await databases.createBooleanAttribute(
                            config.databaseId,
                            'folders',
                            attr.name,
                            attr.required
                        );
                        break;
                }
                debug.done(`Added ${attr.name} attribute (${attr.type}) to folders collection`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${attr.name} attribute already exists in folders collection`);
                } else {
                    debug.error(`Failed to create ${attr.name} attribute in folders collection`, error);
                    // Continue with other attributes instead of failing completely
                }
            }
        }
        
        for (const attr of attributes) {
            try {
                switch (attr.type) {
                    case 'string':
                        await databases.createStringAttribute(
                            config.databaseId,
                            collectionId,
                            attr.name,
                            attr.size,
                            attr.required
                        );
                        break;
                    case 'datetime':
                        await databases.createDatetimeAttribute(
                            config.databaseId,
                            collectionId,
                            attr.name,
                            attr.required
                        );
                        break;
                    case 'boolean':
                        await databases.createBooleanAttribute(
                            config.databaseId,
                            collectionId,
                            attr.name,
                            attr.required
                        );
                        break;
                }
                debug.done(`Added ${attr.name} attribute (${attr.type})`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${attr.name} attribute already exists`);
                } else {
                    debug.error(`Failed to create ${attr.name} attribute`, error);
                    // Continue with other attributes instead of failing completely
                }
            }
        }
        
        // Add additional attributes
        const additionalAttributes = [
            { name: 'onboardingShown', type: 'boolean', required: false }
        ];
        
        for (const attr of additionalAttributes) {
            try {
                await databases.createBooleanAttribute(
                    config.databaseId,
                    collectionId,
                    attr.name,
                    attr.required
                );
                debug.done(`Added ${attr.name} attribute (${attr.type})`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${attr.name} attribute already exists`);
                } else {
                    debug.error(`Failed to create ${attr.name} attribute`, error);
                }
            }
        }
        
        // Add indexes - OPTIMAL INDEX STRATEGY
        debug.step('Creating optimized indexes...');

        const indexes = [
            // ✅ ONLY ONE INDEX: For your query pattern Appwrite.Query.orderDesc('$updatedAt')
            { name: 'boards_sort_index', attributes: ['$updatedAt'] }
            // ❌ REMOVED userId_index - permissions handle user isolation automatically!
        ];
        
        for (const idx of indexes) {
            try {
                await databases.createIndex(
                    config.databaseId,
                    collectionId,
                    idx.name,
                    'key',
                    idx.attributes
                );
                debug.done(`Added ${idx.name} index`);
            } catch (error) {
                if (error.message.includes('already exists') || error.code === 409) {
                    debug.info(`${idx.name} index already exists`);
                } else {
                    debug.warn(`Could not create ${idx.name} index`, error.message);
                }
            }
        }
        
        debug.done('Database setup completed successfully!');
        return { success: true };
        
    } catch (error) {
        debug.error('Database setup failed', error);
        return { success: false, error: error.message };
    }
}

// Check if database is properly set up
async function checkDatabaseStatus() {
    debug.step('Checking database status...');
    
    try {
        // Wait for Appwrite to be ready
        await waitForAppwriteReady();
        
        const config = getDatabaseConfig();
        const databases = window.databases;
        const boardsCollectionId = 'boards';
        const foldersCollectionId = 'folders';

        try {
            // Check if boards collection exists and has required attributes
            const boardsAttributes = await databases.listAttributes(config.databaseId, boardsCollectionId);
            const requiredBoardsAttributes = ['boardId', 'name', 'updatedAt', 'folders', 'canvasHeaders', 'drawingPaths'];
            const missingBoardsAttributes = requiredBoardsAttributes.filter(attr =>
                !boardsAttributes.attributes.find(a => a.key === attr)
            );

            if (missingBoardsAttributes.length > 0) {
                debug.warn('Missing boards attributes', missingBoardsAttributes);
                return {
                    exists: true,
                    complete: false,
                    message: `Missing boards attributes: ${missingBoardsAttributes.join(', ')}`
                };
            }

            // Check if folders collection exists and has required attributes
            try {
                const foldersAttributes = await databases.listAttributes(config.databaseId, foldersCollectionId);
                const requiredFoldersAttributes = ['boardId', 'title', 'position', 'files'];
                const missingFoldersAttributes = requiredFoldersAttributes.filter(attr =>
                    !foldersAttributes.attributes.find(a => a.key === attr)
                );

                if (missingFoldersAttributes.length > 0) {
                    debug.warn('Missing folders attributes', missingFoldersAttributes);
                    return {
                        exists: true,
                        complete: false,
                        message: `Missing folders attributes: ${missingFoldersAttributes.join(', ')}`
                    };
                }
            } catch (foldersError) {
                debug.warn('Folders collection or attributes not found', foldersError.message);
                return { exists: true, complete: false, message: 'Folders collection not found or not accessible' };
            }

            debug.done('Database is properly configured');
            return { exists: true, complete: true, message: 'Database is properly configured' };
        } catch (attrError) {
            debug.warn('Boards collection or attributes not found', attrError.message);
            return { exists: false, message: 'Boards collection not found or not accessible' };
        }
    } catch (error) {
        debug.error('Database status check failed', error);
        return { exists: false, error: error.message };
    }
}

// Check if Appwrite SDK is loaded
function isAppwriteReady() {
    return typeof Appwrite !== 'undefined' && 
           typeof Appwrite.Client !== 'undefined' && 
           typeof Appwrite.Databases !== 'undefined';
}

// Wait for Appwrite SDK to load
function waitForAppwrite(callback, maxAttempts = 50) {
    let attempts = 0;
    
    function check() {
        attempts++;
        
        if (isAppwriteReady()) {
            console.log('✅ Appwrite SDK loaded successfully');
            callback();
        } else if (attempts < maxAttempts) {
            console.log(`⏳ Waiting for Appwrite SDK... (attempt ${attempts}/${maxAttempts})`);
            setTimeout(check, 200);
        } else {
            console.error('❌ Appwrite SDK failed to load. Please check your internet connection and refresh the page.');
        }
    }
    
    check();
}

// Auto-initialize database when services are ready
function initializeDatabaseSetup() {
    // Only run setup if we're not on the auth pages
    if (window.location.pathname.includes('/auth/')) {
        debug.info('Skipping database setup on auth pages');
        return;
    }

    debug.start('Starting database initialization check...');
    
    // Wait for Appwrite services to be ready
    waitForAppwriteReady()
        .then(async () => {
            debug.step('Checking database status...');
            const status = await checkDatabaseStatus();
            
            if (!status.exists || !status.complete) {
                debug.step('Database needs setup, running automatic setup...');
                const result = await setupDatabase();
                if (result.success) {
                    debug.done('Database setup completed successfully!');
                    // Show a notification to refresh the page
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showNotification('Database setup completed! Please refresh the page.', 'success');
                    }
                } else {
                    debug.error('Database setup failed', result.error);
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showNotification('Database setup failed. Please check the console.', 'error');
                    }
                }
            } else {
                debug.done('Database is already properly configured');
            }
        })
        .catch(error => {
            debug.error('Failed to initialize database setup', error);
        });
}

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDatabaseSetup);
} else {
    // DOM already loaded, initialize immediately
    setTimeout(initializeDatabaseSetup, 100);
}

// Make functions available globally
window.appwriteDatabaseSetup = {
    setupDatabase,
    checkDatabaseStatus,
    initializeDatabaseSetup
};

} // End of guard clause
