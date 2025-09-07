// === APPWRITE CONFIGURATION FILE ===
// This file replaces Firebase configuration and provides equivalent services
// for authentication, database operations, and offline functionality.
// 
// Using Appwrite CDN global namespace (window.Appwrite)
//
// Services provided:
// 1. authService: User authentication and account management
// 2. dbService: Board data storage and retrieval
// 3. offlineService: Basic offline capability control

// Appwrite project configuration
const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1', // Corrected endpoint
    projectId: '68b6ed180029c5632ed3', // Your project ID
    databaseId: '68b6f1aa003a536da72d', // Your database ID
    collections: {
        users: 'users', // Users collection ID
        boards: 'boards', // Boards collection ID
        bookmarks: 'bookmarks',
        folders: 'folders',
        files: 'files',
        canvasHeaders: 'canvasHeaders',
        drawingPaths: 'drawingPaths'
    }
};

// Initialize Appwrite client using global CDN namespace
const client = new Appwrite.Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

// Import Permission and Role from Appwrite CDN for document permissions
// Use destructured access to avoid conflicts
const appwriteSDK = window.Appwrite || {};
const Permission = appwriteSDK.Permission || appwriteSDK.Permission || function() {};
const Role = appwriteSDK.Role || appwriteSDK.Role || function() {};

// Permission helper functions for user-isolated documents
function getUserPermissions(userId) {
    return [
        Permission.read(Role.user(userId)),
        Permission.write(Role.user(userId)),
        Permission.delete(Role.user(userId))
    ];
}

// Enhanced document ID generator with email prefix (first 7 letters)
function generateBoardDocumentId(boardData, currentUser) {
    if (!currentUser) {
        // Fallback if not authenticated
        const timestamp = Date.now().toString().substring(-6);
        return `board_${boardData.id}_${timestamp}`.substring(0, 36);
    }

    const email = currentUser.email || 'guest';
    const userId = currentUser.$id;

    // Extract local part of email and clean for Appwrite compatibility
    // Keep only a-z, A-Z, 0-9, remove everything else including @ and periods
    const emailLocal = email.split('@')[0];
    const emailPrefix = emailLocal
        .replace(/[^a-zA-Z0-9]/g, '') // Remove invalid characters
        .substring(0, 7); // First 7 characters max

    // Ensure email prefix is at least 3 characters (for meaningful identification)
    const safeEmailPrefix = emailPrefix.length >= 3 ? emailPrefix :
                           emailPrefix + userId.substring(0, 3 - emailPrefix.length);

    // Extract hash components for uniqueness
    const userHash = userId.substring(0, 6); // First 6 chars of user ID

    // Extract timestamp from boardData.id if it contains one (like 'test-1737376542123')
    const boardIdParts = String(boardData.id).split('-');
    const embeddedTimestamp = boardIdParts.length > 1 ? boardIdParts[1] : Date.now().toString();
    const timestamp = embeddedTimestamp.toString().substring(-6); // Use consistent timestamp

    const boardHash = String(boardData.id).substring(0, 4); // First 4 chars of board ID

    // Format with email prefix: emailPrefix_userHash_boardHash_timestamp
    const documentId = `${safeEmailPrefix}_${userHash}_${boardHash}_${timestamp}`;

    // Ensure exactly 36 characters or less (Appwrite limit)
    const finalDocumentId = documentId.length <= 36 ? documentId : `board_${Date.now().toString().slice(-4)}_${userHash.slice(0, 8)}`;

    // Debug logging for transparency
    console.log('🎯 Generated board document ID:', {
        email: safeEmailPrefix,
        userHash: userHash,
        boardHash: boardHash,
        timestamp: timestamp,
        finalId: finalDocumentId,
        length: finalDocumentId.length
    });

    return finalDocumentId;
}

function getSharedPermissions(userId) {
    return [
        Permission.read(Role.user(userId))
    ];
}

// Permission constants for future use
const PERMISSION_CONSTANTS = {
    ANON_READABLE: [
        Permission.read(Role.any()),
        Permission.write(Role.user("CURRENT_USER_ID")),
        Permission.delete(Role.user("CURRENT_USER_ID"))
    ]
};

// Document creation with proper user permissions
function createDocumentWithUserPermissions(databaseId, collectionId, documentId, documentData, providedUserId) {
    // Get current user if not provided
    if (!providedUserId && !currentUser) {
        throw new Error('No authenticated user available');
    }

    const userId = providedUserId || currentUser.$id;

    if (!userId) {
        throw new Error('User ID not available - user may not be authenticated');
    }

    // ✅ CORRECT FORMAT: user:[USER_ID]
    // This creates permission strings like: "read:user:userId123456"
    const userPermissions = [
        Permission.read(Role.user(userId)),   // "read:user:userId123456"
        Permission.write(Role.user(userId)),  // "write:user:userId123456"
        Permission.delete(Role.user(userId))  // "delete:user:userId123456"
    ];

    console.log('🎯 APPWRITE: Creating document with CORRECT user permissions format:', {
        documentId,
        userId: userId, // This is the actual user ID (e.g., "user123456")
        collectionId,
        permissionFormat: `user:${userId}`, // This is the string format
        permissionsCount: userPermissions.length
    });

    return databases.createDocument(
        databaseId,
        collectionId,
        documentId,
        documentData,
        userPermissions
    );
}

// Get current user permissions in correct format
function getCurrentUserPermissions() {
    if (!currentUser) {
        console.error('❌ Cannot get permissions: No authenticated user');
        return null;
    }

    const userId = currentUser.$id;

    console.log('🎯 APPWRITE: Generated user permissions for:', {
        userId: currentUser.$id,
        email: currentUser.email || 'N/A',
        permissionFormat: `user:${userId}` // e.g., "user:user123456"
    });

    return [
        Permission.read(Role.user(userId)),   // Allows owner to read
        Permission.write(Role.user(userId)),  // Allows owner to write
        Permission.delete(Role.user(userId))  // Allows owner to delete
    ];
}

// Export helper functions globally for use in other modules
window.createDocumentWithUserPermissions = createDocumentWithUserPermissions;
window.getCurrentUserPermissions = getCurrentUserPermissions;

// Utility functions for separation of concerns (separate collections strategy)

// Debug variable for Appwrite functions
const debug = window.Debug?.appwrite || {
    step: (msg) => console.log(`👉 APPWRITE SAVE: ${msg}`),
    detail: (msg) => console.log(`📋 APPWRITE SAVE: ${msg}`),
    error: (msg) => console.error(`❌ APPWRITE SAVE ERROR: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE SAVE: ${msg}`),
    warn: (msg) => console.warn(`⚠️ APPWRITE SAVE: ${msg}`)
};

// Save data to specific collection
async function saveToCollection(collectionName, items, boardId) {
    if (!Array.isArray(items) || items.length === 0) return;

    const permissions = getCurrentUserPermissions();

    debug.step(`🎯 Saving ${items.length} ${collectionName} to separate collection`);

    // Ensure document ID is valid for Appwrite (max 36 chars)
    function getCompliantDocumentId(preferredId) {
        if (preferredId && preferredId.length <= 36) {
            return preferredId;
        }
        // Use Appwrite's system-generated unique ID (always valid)
        return Appwrite.ID.unique();
    }

    for (const item of items) {
        const documentId = getCompliantDocumentId(item.id);

        try {
            switch (collectionName) {
                case 'folders':
                    await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        'folders',
                        documentId,
                        {
                            boardId: boardId,
                            title: item.title,
                            position: JSON.stringify(item.position),
                            files: JSON.stringify(item.files || [])
                            // Note: createdAt and updatedAt are system fields
                        },
                        permissions
                    );
                    break;

                case 'canvasHeaders': {
                    await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        'canvasHeaders',
                        Appwrite.ID.unique(), // Generate unique ID for each header
                        {
                            board_id: boardId, // Required board reference (note: lowercase)
                            text: item.text, // Required
                            position: JSON.stringify(item.position) // Required - serialize position object
                            // Note: createdAt and updatedAt are system fields handled by Appwrite
                        },
                        permissions
                    );
                    debug.done(`✅ Canvas header created: "${item.text}" at (${JSON.stringify(item.position)})`);
                    break;
                }

                case 'drawingPaths': {
                    // Create drawingPaths document with proper structure
                    const drawingData = {
                        board_id: boardId, // Reference to the board's system ID
                        drawing_paths: JSON.stringify({
                            points: item.points || [],
                            color: item.color || '#000000'
                        }),
                        color: item.color || '#000000' // Separate field for indexing
                    };

                    console.log('🎨 SAVING DRAWING DOCUMENT:', {
                        collectionId: 'drawingPaths',
                        boardId: boardId,
                        drawingData: drawingData,
                        pointsPreview: item.points ? item.points.substring(0, 50) + '...' : 'null',
                        color: drawingData.color
                    });

                    try {
                        const docResult = await databases.createDocument(
                            APPWRITE_CONFIG.databaseId,
                            'drawingPaths',
                            Appwrite.ID.unique(), // Generate unique ID for each drawing path
                            drawingData,
                            permissions
                        );
                        console.log('✅ DRAWING DOCUMENT CREATED SUCCESSFULLY:', {
                            docId: docResult.$id,
                            boardId: docResult.board_id,
                            color: docResult.color
                        });
                    } catch (drawingSaveError) {
                        console.log('❌ DRAWING DOCUMENT CREATION FAILED:', {
                            error: drawingSaveError.message,
                            code: drawingSaveError.code,
                            boardId: boardId
                        });
                        throw drawingSaveError;
                    }

                    break;
                }

                default:
                    debug.warn(`Unknown collection: ${collectionName}`);
            }
        } catch (error) {
            if (error.code !== 409) { // Not "already exists"
                debug.error(`Failed to save ${collectionName} item:`, error);
            }
        }
    }

    debug.done(`✅ Saved ${items.length} items to ${collectionName} collection`);
}

// Load data from specific collection
async function loadFromCollection(collectionName, boardId) {
    try {
        const collectionId = collectionName;
        // Use consistent field naming: canvasHeaders and drawingPaths use board_id, folders uses boardId
        const queryField = (collectionName === 'drawingPaths' || collectionName === 'canvasHeaders') ? 'board_id' : 'boardId';
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            collectionId,
            [
                Appwrite.Query.equal(queryField, boardId)
            ]
        );

        return response.documents.map(doc => {
            switch (collectionName) {
                case 'folders':
                    return {
                        id: doc.$id,
                        title: doc.title,
                        position: JSON.parse(doc.position),
                        files: JSON.parse(doc.files),
                        createdAt: doc.$createdAt,
                        updatedAt: doc.$updatedAt
                    };

                case 'canvasHeaders':
                    return {
                        id: doc.$id,
                        text: doc.text,
                        position: JSON.parse(doc.position),
                        createdAt: doc.$createdAt,
                        updatedAt: doc.$updatedAt
                    };

                case 'drawingPaths':
                    const drawingData = JSON.parse(doc.drawing_paths || '{}');
                    return {
                        id: doc.$id,
                        points: drawingData.points || [],
                        color: drawingData.color || '#000000',
                        createdAt: doc.$createdAt,
                        updatedAt: doc.$updatedAt
                    };

                default:
                    return doc;
            }
        });
    } catch (error) {
        debug.error(`Failed to load ${collectionName}:`, error);
        return [];
    }
}

// Export utility functions globally
window.saveToCollection = saveToCollection;
window.loadFromCollection = loadFromCollection;

// Debug utilities for Appwrite
window.Debug = window.Debug || {};
window.Debug.appwrite = {
    info: (msg, data) => console.log(`🔷 APPWRITE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE: ${msg || 'Operation completed'}`)
};

// Auth state management
let currentUser = null;
const authStateCallbacks = [];

// Authentication Service - Replaces Firebase authService
const authService = {
    
    // Create anonymous session (guest account)
    async signInAnonymously() {
        try {
            window.Debug.appwrite.step('Creating anonymous session');
            
            // Try to create anonymous session with Appwrite
            await account.createAnonymousSession();
            currentUser = await account.get();
            
            window.Debug.appwrite.info('Anonymous session created successfully', {
                userId: currentUser.$id,
                isAnonymous: currentUser.labels?.includes('anonymous')
            });
            
            // Update auth state
            authStateCallbacks.forEach(callback => callback(currentUser));
            
            return { success: true, user: currentUser };
        } catch (error) {
            window.Debug.appwrite.error('Failed to create anonymous session', error);
            return { success: false, error: error.message };
        }
    },

    // Sign up with email/password
    async signUp(email, password) {
        try {
            window.Debug.appwrite.step('Creating new account');
            
            // Check if current user is anonymous
            if (currentUser && currentUser.labels && currentUser.labels.includes('anonymous')) {
                // Link anonymous account by creating new account and transferring data
                const anonymousId = currentUser.$id;
                
                try {
                    // Create new account
                    const user = await account.create(Appwrite.ID.unique(), email, password);
                    // Sign in with new account
                    await account.createEmailSession(email, password);
                    currentUser = await account.get();
                    
                    // Transfer anonymous data
                    await this.transferAnonymousData(anonymousId, currentUser.$id);
                    
                    // Update user profile
                    await this.updateUserProfileAfterLink(currentUser);
                    
                    authStateCallbacks.forEach(callback => callback(currentUser));
                    return { success: true, user: currentUser };
                    
                } catch (linkError) {
                    if (linkError.code === 409) { // User already exists
                        // Sign in with existing account and transfer data
                        const session = await account.createEmailSession(email, password);
                        currentUser = await account.get();
                        await this.transferAnonymousData(anonymousId, currentUser.$id);
                        authStateCallbacks.forEach(callback => callback(currentUser));
                        return { success: true, user: currentUser };
                    }
                    throw linkError;
                }
            } else {
                // Regular sign up
                const user = await account.create(Appwrite.ID.unique(), email, password);
                await account.createEmailSession(email, password);
                currentUser = await account.get();
                
                await this.createUserProfile(currentUser);
                authStateCallbacks.forEach(callback => callback(currentUser));
                return { success: true, user: currentUser };
            }
        } catch (error) {
            window.Debug.appwrite.error('Sign up failed', error);
            return { success: false, error: error.message };
        }
    },

    // Sign in with email/password
    async signIn(email, password) {
        try {
            window.Debug.appwrite.step('Signing in with email');
            
            // Check if current user is anonymous
            if (currentUser && currentUser.labels && currentUser.labels.includes('anonymous')) {
                const anonymousId = currentUser.$id;
                const session = await account.createEmailSession(email, password);
                currentUser = await account.get();
                
                // Transfer anonymous data
                await this.transferAnonymousData(anonymousId, currentUser.$id);
                
                authStateCallbacks.forEach(callback => callback(currentUser));
                return { success: true, user: currentUser };
            } else {
                // Regular sign in
                const session = await account.createEmailSession(email, password);
                currentUser = await account.get();
                
                authStateCallbacks.forEach(callback => callback(currentUser));
                return { success: true, user: currentUser };
            }
        } catch (error) {
            window.Debug.appwrite.error('Sign in failed', error);
            return { success: false, error: error.message };
        }
    },

    // Sign in with Google OAuth
    async signInWithGoogle() {
        try {
            window.Debug.appwrite.step('Starting Google OAuth');
            
            // Get current origin for redirect URLs
            const currentOrigin = window.location.origin;
            const successUrl = `${currentOrigin}/appwrite/auth/index.html?auth=success`;
            const failureUrl = `${currentOrigin}/appwrite/auth/index.html?error=oauth_failed`;
            
            window.Debug.appwrite.detail('OAuth URLs', { successUrl, failureUrl });
            
            // Use popup-based OAuth with proper URLs
            account.createOAuth2Session(
                'google',
                successUrl,
                failureUrl
            );
            
            // Note: This will redirect, so we handle success in a callback
            return { success: true, redirecting: true };
        } catch (error) {
            window.Debug.appwrite.error('Google sign-in failed', error);
            
            // Provide helpful error messages
            if (error.message.includes('popup') || error.message.includes('blocked')) {
                return { success: false, error: 'Popups are blocked. Please allow popups and try again, or use email authentication.' };
            }
            
            if (error.message.includes('Invalid URI') || error.message.includes('platform')) {
                return { success: false, error: 'OAuth configuration issue. Please check Appwrite platform settings.' };
            }
            
            return { success: false, error: 'Google sign-in failed. Please try email authentication instead.' };
        }
    },

    // Sign out current user
    async signOut() {
        try {
            // Try to delete session, but don't fail if it doesn't work
            try {
                await account.deleteSession('current');
            } catch (sessionError) {
                // Ignore session deletion errors (e.g., when guest users don't have account scopes)
                window.Debug.appwrite.warn('Session deletion failed (ignoring)', sessionError.message);
            }
            currentUser = null;
            authStateCallbacks.forEach(callback => callback(null));
            return { success: true };
        } catch (error) {
            window.Debug.appwrite.error('Sign out failed', error);
            // Still consider signout successful even if there are errors
            currentUser = null;
            authStateCallbacks.forEach(callback => callback(null));
            return { success: true };
        }
    },

    // Get current user
    getCurrentUser() {
        return currentUser;
    },

    // Subscribe to auth state changes
    onAuthStateChange(callback) {
        authStateCallbacks.push(callback);
        // Call immediately with current state
        callback(currentUser);
        
        // Return unsubscribe function
        return () => {
            const index = authStateCallbacks.indexOf(callback);
            if (index > -1) {
                authStateCallbacks.splice(index, 1);
            }
        };
    },

    // Transfer data from anonymous account to real account
    async transferAnonymousData(fromUserId, toUserId) {
        try {
            window.Debug.appwrite.step('Starting data transfer');
            
            // Use prefix query to find all boards for the current user (works even after field removal)
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                [
                    Appwrite.Query.startsWith('$id', 'board_'),
                    Appwrite.Query.orderDesc('$updatedAt')
                ]
            );

            // Filter boards that belong to the anonymous user
            const userBoards = response.documents.filter(doc =>
                doc.$id.includes(fromUserId.substring(0, 10))
            );

            // Transfer each board to new account
            for (const board of userBoards) {
                const boardData = { ...board };
                delete boardData.$id; // Remove old ID
                boardData.userId = toUserId; // Update owner
                
                // Create document with proper permissions
                await createDocumentWithUserPermissions(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    Appwrite.ID.unique(),
                    boardData,
                    toUserId
                );
            }

            // Delete anonymous user data (optional - Appwrite will handle user cleanup)
            for (const board of userBoards) {
                await databases.deleteDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    board.$id
                );
            }

            window.Debug.appwrite.info(`Transferred ${userBoards.length} boards`);
            return { success: true, boardCount: userBoards.length };
        } catch (error) {
            window.Debug.appwrite.error('Data transfer failed', error);
            return { success: false, error: error.message };
        }
    },

    // Create user profile
    async createUserProfile(user, isGuest = false) {
        try {
            // Use Appwrite's account preferences for user data instead of a separate collection
            const preferences = {
                isGuest: isGuest,
                plan: 'free',
                boardCount: 0,
                createdAt: new Date().toISOString(),
                email: user.email || 'guest@zenban.app'
            };
            
            // Store preferences in Appwrite's account system
            await account.updatePrefs(preferences);
            
            window.Debug.appwrite.info('User preferences created in Appwrite account', { 
                userId: user.$id,
                preferences: preferences 
            });
        } catch (error) {
            window.Debug.appwrite.error('Failed to create user preferences', error);
        }
    },

    // Update user profile after linking accounts
    async updateUserProfileAfterLink(user) {
        try {
            // Update preferences in Appwrite's account system
            const preferences = {
                isGuest: false,
                plan: 'free', // Can be updated based on subscription status
                email: user.email,
                linkedAt: new Date().toISOString()
            };
            
            await account.updatePrefs(preferences);
            window.Debug.appwrite.info('User preferences updated after account link', { 
                userId: user.$id,
                email: user.email 
            });
        } catch (error) {
            window.Debug.appwrite.error('Failed to update user preferences', error);
        }
    },

    // Check for OAuth redirect result and handle auth state
    async checkOAuthResult() {
        try {
            // Check if we're on an OAuth callback URL
            const urlParams = new URLSearchParams(window.location.search);
            const isOAuthCallback = window.location.pathname.includes('/oauth/') || urlParams.has('userId');
            
            if (isOAuthCallback) {
                window.Debug.appwrite.step('Detected OAuth callback, checking session');
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // Try to get current user (works for both OAuth and regular sessions)
            currentUser = await account.get();
            if (currentUser) {
                window.Debug.appwrite.info('Found existing session', { userId: currentUser.$id });
                authStateCallbacks.forEach(callback => callback(currentUser));
                return { success: true, user: currentUser };
            }
        } catch (error) {
            // No active session or OAuth failed
            window.Debug.appwrite.step('No active session found');
        }
        return { success: false, noResult: true };
    },
};

// Database Service - Replaces Firebase dbService
const dbService = {
    
    // Save board to cloud - ULTRA MINIMAL BOARDS (using system $id)
    async saveBoard(boardData) {
        if (!currentUser) {
            window.Debug.appwrite.error('Save failed - Not authenticated', {
                userState: 'null',
                reason: 'No current user found'
            });
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Validate board has content
            const hasContent = (
                (boardData.folders && boardData.folders.length > 0) ||
                (boardData.canvasHeaders && boardData.canvasHeaders.length > 0) ||
                (boardData.drawingPaths && boardData.drawingPaths.length > 0)
            );

            if (!hasContent) {
                window.Debug.appwrite.step('Skipping save - board is empty');
                return { success: true, skipped: true };
            }

            // STEP 1: Save/ensure board document exists (ULTRA MINIMAL with EMAIL PREFIX)
            const boardDocumentId = generateBoardDocumentId(boardData, currentUser);
            const userBoardId = boardData.id; // Keep our local board ID for document naming

            window.Debug.appwrite.step(`🎯 Minimal board document ID: ${boardDocumentId}`);

            // ✅ ULTRA MINIMAL: Add minimal required data to prevent empty document error
            const boardSaveData = {
                email: currentUser?.email || 'anonymous@zenban.app', // User email for reference
                board_name: boardData.name || 'My Board' // Required board name
                // Note: System fields ($createdAt, $updatedAt) and permissions handle audit trails
            };

            // Create or update with EMPTY data object (just a document to contain related collection references)
            const permissions = getCurrentUserPermissions();
            let boardDoc;

            try {
                // Try to update existing board
                boardDoc = await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    boardDocumentId,
                    boardSaveData
                );
                window.Debug.appwrite.done('✅ Minimal empty board document updated');
            } catch (error) {
                if (error.code === 404) {
                    // Create new ultra-minimal empty board document
                    boardDoc = await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.boards,
                        boardDocumentId,
                        boardSaveData,
                        permissions
                    );
                    window.Debug.appwrite.done('✅ Minimal empty board document created');
                } else {
                    throw error;
                }
            }

            // STEP 2: Save all data to SEPARATE COLLECTIONS
            // Use BOARD'S SYSTEM $id as reference (this is the optimization!)
            const boardSystemId = boardDoc.$id;

            if (boardData.folders && boardData.folders.length > 0) {
                await saveToCollection('folders', boardData.folders, boardSystemId);
                window.Debug.appwrite.done(`✅ ${boardData.folders.length} folders`);
            }

            if (boardData.canvasHeaders && boardData.canvasHeaders.length > 0) {
                await saveToCollection('canvasHeaders', boardData.canvasHeaders, boardSystemId);
                window.Debug.appwrite.done(`✅ ${boardData.canvasHeaders.length} headers`);
            }

            if (boardData.drawingPaths && boardData.drawingPaths.length > 0) {
                await saveToCollection('drawingPaths', boardData.drawingPaths, boardSystemId);
                window.Debug.appwrite.done(`✅ ${boardData.drawingPaths.length} paths`);
            }

            window.Debug.appwrite.info('🎉 Ultra-minimal board saved!', {
                localBoardId: userBoardId,
                systemBoardId: boardSystemId,
                documentId: boardDocumentId,
                timestamp: new Date().toISOString()
            });

            return { success: true, boardDoc };

        } catch (error) {
            window.Debug.appwrite.error('Failed to save board', {
                error: error.message,
                code: error.code || 'unknown',
                response: error.response || 'no response'
            });
            return { success: false, error: error.message, code: error.code, timestamp: new Date().toISOString() };
        }
    },

            // Load all boards for current user - ULTRA MINIMAL BOARDS (using system $id)
    async loadBoards() {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            window.Debug.appwrite.step('Loading ultra-minimal boards from Appwrite');

            // Use prefix query to find all boards for the current user
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                [
                    Appwrite.Query.startsWith('$id', 'board_'),
                    Appwrite.Query.orderDesc('$updatedAt')
                ]
            );

            // ✅ ULTRA MINIMAL: Load boards with their separate collection data
            const boards = [];
            for (const doc of response.documents) {
                // Extract user board ID from document ID (board_{userBoardId}_{userId-first10chars})
                const boardIdMatch = doc.$id.match(/board_([a-zA-Z0-9\-]+)_[a-zA-Z0-9]{10}/);
                const userBoardId = boardIdMatch ? boardIdMatch[1] : 'unknown';

                window.Debug.appwrite.step(`📊 Loading data for board: ${doc.name} (${doc.$id})`);

                // Load related data from separate collections using SYSTEM $id as reference
                let folders = [];
                let canvasHeaders = [];
                let drawingPaths = [];

                try {
                    const [
                        foldersData,
                        headersData,
                        pathsData
                    ] = await Promise.all([
                        loadFromCollection('folders', doc.$id), // Use system's $id
                        loadFromCollection('canvasHeaders', doc.$id),
                        loadFromCollection('drawingPaths', doc.$id)
                    ]);

                    folders = foldersData;
                    canvasHeaders = headersData;
                    drawingPaths = pathsData;

                    window.Debug.appwrite.detail(`Loaded ${folders.length} folders, ${canvasHeaders.length} headers, ${drawingPaths.length} paths`);

                } catch (collectionError) {
                    window.Debug.appwrite.warn('Failed to load from collections, using empty arrays', collectionError.message);
                    folders = [];
                    canvasHeaders = [];
                    drawingPaths = [];
                }

                // Generate board name from user email (no longer stored in database)
                const userEmail = currentUser.email || 'User';
                const boardName = `${userEmail}'s Board ${userBoardId}`;

                boards.push({
                    id: parseInt(userBoardId), // User's local board ID for frontend
                    name: boardName, // Generated from email
                    folders: folders,
                    canvasHeaders: canvasHeaders,
                    drawingPaths: drawingPaths,
                    updatedAt: doc.$updatedAt,
                    // isDevMode and onboardingShown removed - now stored in localStorage
                    createdAt: doc.$createdAt,
                    systemId: doc.$id // System's $id as the board identifier
                });
            }

            window.Debug.appwrite.done(`✅ Loaded ${boards.length} ultra-minimal boards`);
            return { success: true, boards };

        } catch (error) {
            // Handle missing collection gracefully
            if (error.code === 404 || error.message.includes('could not be found')) {
                window.Debug.appwrite.warn('Boards collection not found - database may not be initialized');

                // Try to trigger database setup
                if (window.appwriteIntegration) {
                    window.Debug.appwrite.step('Attempting to initialize database...');
                    try {
                        const setupResult = await window.appwriteIntegration.initializeDatabase();
                        if (setupResult.success) {
                            window.Debug.appwrite.info('Database setup completed, retrying board load');
                            return await this.loadBoards();
                        } else {
                            window.Debug.appwrite.error('Database setup failed', setupResult);
                        }
                    } catch (setupError) {
                        window.Debug.appwrite.error('Database setup error', setupError);
                    }
                }

                return { success: true, boards: [] };
            }

            window.Debug.appwrite.error('Failed to load boards', error);
            return { success: false, error: error.message };
        }
    },

    // Load specific board - ULTRA MINIMAL BOARDS (using EMAIL PREFIX)
    async loadBoard(boardId) {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            window.Debug.appwrite.step(`Loading specific board ${boardId} (ultra-minimal)`);

            // STEP 1: Generate board document ID with email prefix for loading
            const boardDataStub = { id: boardId }; // Stub board data for ID generation
            const documentId = generateBoardDocumentId(boardDataStub, currentUser);

            const board = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                documentId
            );

            window.Debug.appwrite.detail(`✅ Board document loaded: ${board.name}`);

            // STEP 2: Load related data from SEPARATE COLLECTIONS
            // Use BOARD'S SYSTEM $id as reference (this is the optimization!)
            let folders = [];
            let canvasHeaders = [];
            let drawingPaths = [];

            try {
                const [
                    foldersData,
                    headersData,
                    pathsData
                ] = await Promise.all([
                    loadFromCollection('folders', board.$id), // Use SYSTEM $id
                    loadFromCollection('canvasHeaders', board.$id),
                    loadFromCollection('drawingPaths', board.$id)
                ]);

                folders = foldersData;
                canvasHeaders = headersData;
                drawingPaths = pathsData;

                window.Debug.appwrite.done(`🎉 Loaded ${folders.length} folders, ${canvasHeaders.length} headers, ${drawingPaths.length} paths`);

            } catch (collectionError) {
                window.Debug.appwrite.warn('Failed to load from collections, using empty arrays', collectionError.message);
                folders = [];
                canvasHeaders = [];
                drawingPaths = [];
            }

            // Generate board name from user email (no longer stored in database)
            const userEmail = currentUser.email || 'User';
            const boardName = `${userEmail}'s Board ${boardId}`;

            const boardData = {
                id: boardId, // User's local board ID for frontend
                name: boardName, // Generated from email
                folders: folders,
                canvasHeaders: canvasHeaders,
                drawingPaths: drawingPaths,
                updatedAt: board.$updatedAt,
                // isDevMode and onboardingShown removed - now stored in localStorage
                createdAt: board.$createdAt,
                systemId: board.$id // System's $id for reference
            };

            window.Debug.appwrite.done(`✅ Single board loaded successfully`);
            return { success: true, board: boardData };

        } catch (error) {
            if (error.code === 404) {
                return { success: false, error: 'Board not found or access denied' };
            }
            window.Debug.appwrite.error('Failed to load board', error);
            return { success: false, error: error.message };
        }
    },

    // Delete board - ULTRA MINIMAL BOARDS (using system $id)
    async deleteBoard(boardId) {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            window.Debug?.appwrite?.step(`🗑️ Deleting board ${boardId} (ultra-minimal)`);

            // FIRST: Generate board document ID with email prefix for deletion
            const boardDataStub = { id: boardId }; // Stub board data for ID generation
            const documentId = generateBoardDocumentId(boardDataStub, currentUser);

            let boardSystemId;
            try {
                const board = await databases.getDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    documentId
                );
                boardSystemId = board.$id;
            } catch (findError) {
                return { success: false, error: 'Board not found' };
            }

            // STEP 1: Delete related data from separate collections using SYSTEM $id
            try {
                // Delete folders
                const foldersResponse = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.folders,
                    [Appwrite.Query.equal('boardId', boardSystemId)]
                );
                for (const folder of foldersResponse.documents) {
                    await databases.deleteDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.folders,
                        folder.$id
                    );
                }
                window.Debug?.appwrite?.done(`🗑️ Deleted ${foldersResponse.documents.length} folders`);

                // Delete canvas headers
                const headersResponse = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.canvasHeaders,
                    [Appwrite.Query.equal('board_id', boardSystemId)]
                );
                for (const header of headersResponse.documents) {
                    await databases.deleteDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.canvasHeaders,
                        header.$id
                    );
                }
                window.Debug?.appwrite?.done(`🗑️ Deleted ${headersResponse.documents.length} canvas headers`);

                // Delete drawing paths
                const pathsResponse = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.drawingPaths,
                    [Appwrite.Query.equal('board_id', boardSystemId)]
                );
                for (const path of pathsResponse.documents) {
                    await databases.deleteDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.drawingPaths,
                        path.$id
                    );
                }
                window.Debug?.appwrite?.done(`🗑️ Deleted ${pathsResponse.documents.length} drawing paths`);

            } catch (collectionDeleteError) {
                window.Debug?.appwrite?.warn('Some related data may not have been deleted', collectionDeleteError.message);
            }

            // STEP 2: Delete main board document
            await databases.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                documentId
            );

            window.Debug?.appwrite?.done(`✅ Board ${boardId} completely deleted`);
            return { success: true };

        } catch (error) {
            if (error.code === 404) {
                return { success: false, error: 'Board not found or access denied' };
            }
            window.Debug?.appwrite?.error('Failed to delete board', error);
            return { success: false, error: error.message };
        }
    },

    // Get user profile/preferences
    async getUserProfile() {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Get preferences from Appwrite's account system
            const preferences = await account.getPrefs();
            
            return { 
                success: true, 
                profile: {
                    userId: currentUser.$id,
                    email: currentUser.email,
                    preferences: preferences,
                    createdAt: currentUser.registration ? new Date(currentUser.registration).toISOString() : new Date().toISOString(),
                    lastLogin: currentUser.$createdAt
                }
            };
        } catch (error) {
            window.Debug.appwrite.error('Failed to load user preferences', error);
            return { success: false, error: error.message };
        }
    }
};

// Offline Service - Basic offline capability
const offlineService = {
    async goOffline() {
        // Appwrite handles offline behavior automatically
        window.Debug.appwrite.info('Offline mode activated');
    },

    async goOnline() {
        // Appwrite handles online reconnection automatically
        window.Debug.appwrite.info('Online mode activated');
    }
};

// Initialize auth state on load
async function initializeAuthState() {
    try {
        // First check for OAuth callbacks
        const oauthResult = await authService.checkOAuthResult();
        if (oauthResult.success) {
            window.Debug.appwrite.info('OAuth session established', { userId: oauthResult.user.$id });
            return;
        }
        
        // Check for existing session
        currentUser = await account.get();
        window.Debug.appwrite.info('Found existing session', { userId: currentUser.$id });
        authStateCallbacks.forEach(callback => callback(currentUser));
    } catch (error) {
        // No active session
        window.Debug.appwrite.step('No active session found');
        currentUser = null;
        authStateCallbacks.forEach(callback => callback(null));
    }
}

// Auto-initialize when script loads
initializeAuthState();

// Make services globally available (for compatibility)
window.authService = authService;
window.dbService = dbService;
window.offlineService = offlineService;
window.APPWRITE_CONFIG = APPWRITE_CONFIG;

// Also make client and services available for other modules
window.appwriteClient = client;
window.appwriteAccount = account;
window.appwriteDatabases = databases;
window.databases = databases; // For compatibility with database setup script

// Convenience functions for database setup
window.setupAppwriteDatabase = async () => {
    if (!window.appwriteIntegration) {
        console.warn('Appwrite integration not available');
        return { success: false, error: 'Integration service not available' };
    }
    return await window.appwriteIntegration.initializeDatabase();
};

window.checkAppwriteDatabase = async () => {
    if (!window.appwriteIntegration) {
        console.warn('Appwrite integration not available');
        return { success: false, error: 'Integration service not available' };
    }
    return await window.appwriteIntegration.checkDatabaseStatus();
};

// Add function to trigger database setup on demand
window.ensureDatabaseSetup = async () => {
    console.log('🔧 Checking if database setup is needed...');
    
    try {
        // Check current database status
        if (!window.appwriteIntegration) {
            console.warn('Appwrite integration not available');
            return { success: false, error: 'Integration service not available' };
        }
        
        const statusResult = await window.appwriteIntegration.checkDatabaseStatus();
        
        if (statusResult.success) {
            const missingCollections = ['users', 'boards'].filter(
                name => !statusResult.status[name]?.exists
            );
            
            if (missingCollections.length > 0) {
                console.log(`🔧 Missing collections: ${missingCollections.join(', ')}, setting up...`);
                const setupResult = await window.appwriteIntegration.initializeDatabase();
                return setupResult;
            } else {
                console.log('✅ Database is already set up');
                return { success: true, message: 'Database already configured' };
            }
        } else {
            console.log('🔧 Database status check failed, attempting setup...');
            return await window.appwriteIntegration.initializeDatabase();
        }
    } catch (error) {
        console.error('❌ Failed to ensure database setup:', error);
        return { success: false, error: error.message };
    }
};
