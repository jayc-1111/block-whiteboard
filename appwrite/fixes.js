// === APPWRITE FIXES ===
// This script is automatically loaded from index.html to apply fixes
// for Appwrite integration issues and load the diagnostic tool

console.log('🔧 Loading Appwrite fixes and diagnostic tools...');

// Function to ensure database is properly set up
async function ensureAppwriteSetup() {
    console.log('🔧 Checking Appwrite database setup...');
    
    try {
        // Wait for appwrite integration to be ready
        if (!window.appwriteDatabaseSetup) {
            console.warn('⚠️ Appwrite database setup not available yet, waiting...');
            
            // Check every 500ms for up to 10 seconds
            for (let i = 0; i < 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (window.appwriteDatabaseSetup) break;
            }
            
            if (!window.appwriteDatabaseSetup) {
                console.error('❌ Appwrite database setup not available after waiting');
                return false;
            }
        }
        
        // Check database status
        console.log('🔍 Checking database status...');
        const status = await window.appwriteDatabaseSetup.checkDatabaseStatus();
        
        if (!status.exists || !status.complete) {
            console.log('⚙️ Database needs setup, running setup...');
            
            // Run database setup
            const setupResult = await window.appwriteDatabaseSetup.setupDatabase();
            
            if (setupResult.success) {
                console.log('✅ Database setup completed successfully');
                return true;
            } else {
                console.error('❌ Database setup failed:', setupResult.error);
                return false;
            }
        } else {
            console.log('✅ Database is already properly configured');
            return true;
        }
    } catch (error) {
        console.error('❌ Error checking/setting up database:', error);
        return false;
    }
}

// Function to patch the save function to add debugging
function patchSaveFunction() {
    console.log('🩹 Patching save functions with enhanced logging...');
    
    try {
        // Patch syncService saveCurrentBoard
        if (window.syncService && window.syncService.saveCurrentBoard) {
            const originalSave = window.syncService.saveCurrentBoard;
            
            window.syncService.saveCurrentBoard = async function() {
                console.log('🔷 ENHANCED SAVE: Starting save operation...');
                
                // Check authentication
                const authService = window.authService;
                if (!authService) {
                    console.error('🔷 ENHANCED SAVE: authService not available');
                    return { success: false, error: 'Auth service not available' };
                }
                
                const user = authService.getCurrentUser();
                if (!user) {
                    console.error('🔷 ENHANCED SAVE: No user authenticated');
                    return { success: false, error: 'Not authenticated' };
                }
                
                console.log('🔷 ENHANCED SAVE: User authenticated', { 
                    userId: user.$id,
                    isAnonymous: user.labels?.includes('anonymous') || false
                });
                
                // Get board data
                const boards = window.AppState?.get('boards') || [];
                const currentBoardId = window.AppState?.get('currentBoardId') || 0;
                const currentBoard = boards.find(b => b.id === currentBoardId);
                
                if (!currentBoard) {
                    console.error('🔷 ENHANCED SAVE: Current board not found');
                    return { success: false, error: 'Current board not found' };
                }
                
                // Log data sizes
                const foldersStr = JSON.stringify(currentBoard.folders || []);
                const headersStr = JSON.stringify(currentBoard.canvasHeaders || []);
                const pathsStr = JSON.stringify(currentBoard.drawingPaths || []);
                
                console.log('🔷 ENHANCED SAVE: Data sizes', {
                    folders: foldersStr.length,
                    canvasHeaders: headersStr.length,
                    drawingPaths: pathsStr.length,
                    total: foldersStr.length + headersStr.length + pathsStr.length
                });
                
                // Check against limits
                const limits = {
                    folders: 100000,
                    canvasHeaders: 20000,
                    drawingPaths: 100000
                };
                
                const oversized = [];
                if (foldersStr.length > limits.folders) oversized.push('folders');
                if (headersStr.length > limits.canvasHeaders) oversized.push('canvasHeaders');
                if (pathsStr.length > limits.drawingPaths) oversized.push('drawingPaths');
                
                if (oversized.length > 0) {
                    console.warn('🔷 ENHANCED SAVE: Data exceeds limits', { oversized });
                }
                
                // Call original save function
                console.log('🔷 ENHANCED SAVE: Calling original save function...');
                const startTime = Date.now();
                const result = await originalSave.apply(this, arguments);
                const endTime = Date.now();
                
                // Log result
                if (result.success) {
                    console.log(`🔷 ENHANCED SAVE: Save successful (took ${endTime - startTime}ms)`);
                } else {
                    console.error('🔷 ENHANCED SAVE: Save failed', result);
                }
                
                return result;
            };
            
            console.log('✅ Save function patched successfully');
        } else {
            console.warn('⚠️ Could not patch syncService.saveCurrentBoard - not available');
        }

        // Patch createDocument in appwrite-config.js to handle minimal document creation better
        if (window.dbService) {
            // Create a helper function to create documents with proper permissions and all required fields
            window.safeCreateDocument = async function(databaseId, collectionId, documentId, data) {
                if (!window.appwriteDatabases) {
                    console.error('❌ DOCUMENT HELPER: Appwrite databases service not available');
                    return { success: false, error: 'Databases service not available' };
                }

                // Get current user
                const user = window.authService?.getCurrentUser();
                if (!user) {
                    console.error('❌ DOCUMENT HELPER: No authenticated user');
                    return { success: false, error: 'Not authenticated' };
                }

                try {
                    console.log('🔧 DOCUMENT HELPER: Creating document with enhanced method', { 
                        documentId, 
                        collectionId,
                        userId: user.$id
                    });

                    // Ensure required boolean fields have values
                    const enhancedData = {
                        ...data,
                        // Common required fields that caused issues
                        isDevMode: data.isDevMode !== undefined ? data.isDevMode : false,
                        onboardingShown: data.onboardingShown !== undefined ? data.onboardingShown : false,
                        // Add timestamp fields if not present
                        createdAt: data.createdAt || new Date().toISOString(),
                        updatedAt: data.updatedAt || new Date().toISOString()
                    };

                    // Add explicit permissions for the current user
                    const permissions = [
                        `read("user:${user.$id}")`,
                        `update("user:${user.$id}")`,
                        `delete("user:${user.$id}")`
                    ];

                    // Attempt to create the document with enhanced data and explicit permissions
                    const result = await window.appwriteDatabases.createDocument(
                        databaseId,
                        collectionId,
                        documentId,
                        enhancedData,
                        permissions
                    );

                    console.log('✅ DOCUMENT HELPER: Document created successfully', { 
                        id: result.$id,
                        permissions: result.$permissions
                    });

                    return { success: true, document: result };
                } catch (error) {
                    console.error('❌ DOCUMENT HELPER: Failed to create document', {
                        error: error.message,
                        code: error.code,
                        type: error.type
                    });
                    return { success: false, error: error.message, code: error.code };
                }
            };

            console.log('✅ Document creation helper added');
        } else {
            console.warn('⚠️ Could not add document creation helper - dbService not available');
        }
    } catch (error) {
        console.error('❌ Error patching save function:', error);
    }
}

// Automatically initialize fixes
async function initAppwriteFixes() {
    console.log('🚀 Initializing Appwrite fixes...');
    
    try {
        // Wait for page to be fully loaded
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }
        
        // Give other scripts time to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ensure database is set up
        await ensureAppwriteSetup();
        
        // Patch save function
        patchSaveFunction();
        
        console.log('✅ Appwrite fixes initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Appwrite fixes:', error);
    }
}

// Run initialization
initAppwriteFixes();

// Make functions available globally
window.appwriteFixes = {
    ensureAppwriteSetup,
    patchSaveFunction,
    initAppwriteFixes,
    safeCreateDocument: window.safeCreateDocument
};
