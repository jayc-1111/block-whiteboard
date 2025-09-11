// =====================
// Minimal Appwrite Config
// =====================

const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1',
    projectId: '68b6ed180029c5632ed3', // verified project ID
    databases: {
        main: '68b6f1aa003a536da72d',
        main2: '68bd70bc003176578fec'
    },
    collections: {
        boards: 'boards',        // aligned to schema: boards collection in main DB
        folders: 'folders',      // aligned to schema: folders collection in main DB
        bookmarks: 'bookmarks'   // aligned to schema: bookmarks collection in main-2 DB
    },
    collectionDatabase: {
        boards: '68b6f1aa003a536da72d',
        folders: '68b6f1aa003a536da72d',
        bookmarks: '68bd70bc003176578fec'
    }
};

// Export globally
window.APPWRITE_CONFIG = APPWRITE_CONFIG;

// Authentication helper to get real user email instead of test data
async function getAuthenticatedUserEmail() {
    if (!window.appwriteAccount) {
        console.warn('❌ Appwrite account not available, using fallback');
        return 'anonymous@example.com';
    }

    try {
        const user = await window.appwriteAccount.get();
        return user.email || 'unknown@example.com';
    } catch (error) {
        console.warn('❌ No authenticated user, using fallback:', error.message);
        return 'anonymous@example.com';
    }
}

// Store current authenticated user globally
let currentAuthenticatedUser = null;

async function updateAuthenticatedUser() {
    if (!window.appwriteAccount) {
        console.warn('❌ Appwrite account not available');
        return null;
    }

    try {
        // Get the full user object from Appwrite including $id
        const fullUser = await window.appwriteAccount.get();
        currentAuthenticatedUser = {
            $id: fullUser.$id,
            email: fullUser.email
        };
        console.log('✅ Authenticated user updated:', currentAuthenticatedUser);
        return currentAuthenticatedUser;
    } catch (error) {
        console.warn('❌ Failed to get authenticated user, using fallback');
        // Fallback for when user isn't fully authenticated
        const userEmail = await getAuthenticatedUserEmail();
        currentAuthenticatedUser = { email: userEmail };
        return currentAuthenticatedUser;
    }
}

// Initialize Appwrite client
if (typeof Appwrite !== 'undefined') {
    window.appwriteClient = new Appwrite.Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);
    window.appwriteAccount = new Appwrite.Account(window.appwriteClient);
    window.appwriteDatabasesMain = new Appwrite.Databases(window.appwriteClient);
    window.appwriteDatabasesMain2 = new Appwrite.Databases(window.appwriteClient);

    // Export client + services for other modules
    window.AppwriteClient = window.appwriteClient;
    console.log('✅ Appwrite services initialized with endpoint and project ID', {
        endpoint: APPWRITE_CONFIG.endpoint,
        projectId: APPWRITE_CONFIG.projectId
    });

    // Try to get authenticated user on startup
    updateAuthenticatedUser();

    // Add missing global references that database-setup.js expects
    window.databases = window.appwriteDatabasesMain;           // Default database reference
    window.appwriteDatabases = window.appwriteDatabasesMain;    // Alias for compatibility

} else {
    console.warn('❌ Appwrite SDK not available');
}

// Basic database service for board operations
const dbService = {
    async loadBoard(board_id) {
        try {
            const response = await window.appwriteDatabasesMain.getDocument(
                APPWRITE_CONFIG.databases.main,
                APPWRITE_CONFIG.collections.boards,
                board_id
            );
            return {
                id: response.$id,
                name: response.board_name || 'Unnamed Board',
                data: response.data || {},
                createdAt: response.$createdAt
            };
        } catch (error) {
            console.error('❌ Failed to load board:', error);
            return null;
        }
    },

    async loadBoards() {
        try {
            const response = await window.appwriteDatabasesMain.listDocuments(
                APPWRITE_CONFIG.databases.main,
                APPWRITE_CONFIG.collections.boards
            );
            return response.documents.map(board => ({
                id: board.$id,
                name: board.board_name || 'Unnamed Board',
                data: board.data || {},
                createdAt: board.$createdAt
            }));
        } catch (error) {
            console.error('❌ Failed to load boards:', error);
            return [];
        }
    },

    async saveBoard(boardData) {
        try {
            const databaseId = APPWRITE_CONFIG.databases.main;

            // Get current user for permissions
            const currentUser = window.authService?.getCurrentUser?.();
            const currentUserId = currentUser?.$id;
            const userEmail = await getAuthenticatedUserEmail();
            const boardName = boardData.name || 'New Board';

            // Check if board already exists (by name and email combination)
            let existingBoards;
            try {
                existingBoards = await window.appwriteDatabasesMain.listDocuments(
                    databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    [
                        window.Appwrite?.Query?.equal('board_name', boardName) || {},
                        userEmail ? (window.Appwrite?.Query?.equal('email', userEmail) || {}) : {}
                    ].filter(q => Object.keys(q).length > 0)
                );
            } catch (error) {
                console.warn('Could not check for existing boards, proceeding with creation:', error);
                existingBoards = { documents: [] };
            }

            // Determine permissions based on user context and board position
            let permissions = [];
            if (typeof window.Appwrite !== 'undefined') {
                // First board: Use project-level permissions (users: ANY)
                if (!existingBoards.documents || existingBoards.documents.length === 0) {
                    // No existing board with this name/email - create new with project-level permissions
                    permissions = [
                        window.Appwrite.Permission.read('any'),
                        window.Appwrite.Permission.update('any'),
                        window.Appwrite.Permission.delete('any')
                    ];
                } else if (currentUserId) {
                    // Subsequent boards: Use user-specific permissions
                    permissions = [
                        window.Appwrite.Permission.read(window.Appwrite.Role.user(currentUserId)),
                        window.Appwrite.Permission.update(window.Appwrite.Role.user(currentUserId)),
                        window.Appwrite.Permission.delete(window.Appwrite.Role.user(currentUserId))
                    ];
                } else {
                    // Fallback for anonymous users
                    permissions = [
                        window.Appwrite.Permission.read('any'),
                        window.Appwrite.Permission.update('any'),
                        window.Appwrite.Permission.delete('any')
                    ];
                }
            }

            // If board exists, update it instead of creating new
            if (existingBoards.documents && existingBoards.documents.length > 0) {
                const existingBoard = existingBoards.documents[0]; // Take first match

                // Update existing board
                const result = await window.appwriteDatabasesMain.updateDocument(
                    databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    existingBoard.$id,
                    {
                        board_name: boardName,
                        email: userEmail,
                        $updatedAt: new Date().toISOString()
                    },
                    permissions  // Update permissions too
                );

                return {
                    success: true,
                    id: result.$id,
                    name: result.board_name,
                    data: result,
                    createdAt: result.$createdAt,
                    updatedAt: result.$updatedAt
                };
            } else {
                // Create new board
                const result = await window.appwriteDatabasesMain.createDocument(
                    databaseId,
                APPWRITE_CONFIG.collections.boards,
                    window.Appwrite?.ID?.unique() || boardData.id || Date.now().toString(),
                    {
                        board_name: boardName,
                        email: userEmail,
                        $updatedAt: new Date().toISOString()
                    },
                    permissions
                );

                return {
                    success: true,
                    id: result.$id,
                    name: result.board_name,
                    data: result,
                    createdAt: result.$createdAt
                };
            }

        } catch (error) {
            console.error('❌ Failed to save board:', error);
            // Return consistent error format instead of throwing
            return {
                success: false,
                error: error.message || 'Unknown save error',
                details: error
            };
        }
    },

    async deleteBoard(board_id) {
        try {
            await window.appwriteDatabasesMain.deleteDocument(
                APPWRITE_CONFIG.databases.main,
                'boards',
                board_id
            );
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to delete board:', error);
            throw error;
        }
    }
};

// Authentication service
const authService = {
    async signIn(email, password) {
        try {
            const session = await window.appwriteAccount.createEmailSession(email, password);
            const user = await window.appwriteAccount.get();
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async signUp(email, password) {
        try {
            const user = await window.appwriteAccount.create(
                Appwrite.ID.unique(),
                email,
                password
            );
            await window.appwriteAccount.createEmailSession(email, password);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async signOut() {
        try {
            await window.appwriteAccount.deleteSession('current');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    getCurrentUser() {
        try {
            return currentAuthenticatedUser;
        } catch (error) {
            console.error('❌ Failed to get current user:', error);
            return null;
        }
    }
};

// Permissions helper function - REQUIRED for folder saving to work
window.getCurrentUserPermissions = function() {
    // Return appropriate permissions for folder operations
    // Based on database schema - Users: Create, Read, Update, Delete as true
    try {
        const currentUser = window.authService?.getCurrentUser?.();
        const currentUserId = currentUser?.$id;

        if (typeof window.Appwrite === 'undefined') {
            console.warn('❌ Appwrite SDK not available for permissions');
            return []; // Empty permissions fallback
        }

        if (!currentUserId) {
            // Anonymous user - use project-level permissions
            return [
                window.Appwrite.Permission.read('any'),
                window.Appwrite.Permission.update('any'),
                window.Appwrite.Permission.delete('any')
            ];
        } else {
            // Authenticated user - use user-specific permissions
            return [
                window.Appwrite.Permission.read(window.Appwrite.Role.user(currentUserId)),
                window.Appwrite.Permission.update(window.Appwrite.Role.user(currentUserId)),
                window.Appwrite.Permission.delete(window.Appwrite.Role.user(currentUserId))
            ];
        }
    } catch (error) {
        console.warn('❌ Error getting user permissions, using fallback:', error);
        // Fallback permissions for anonymous users
        if (typeof window.Appwrite !== 'undefined') {
            return [
                window.Appwrite.Permission.read('any'),
                window.Appwrite.Permission.update('any'),
                window.Appwrite.Permission.delete('any')
            ];
        }
        return []; // No permissions available
    }
};

// Export services globally
window.dbService = dbService;
window.authService = authService;

// Debug utilities - including start() method for database-setup.js compatibility
window.Debug = window.Debug || {};
window.Debug.appwrite = {
    info: (msg) => console.log(`🔷 APPWRITE: ${msg}`),
    error: (msg, error) => console.error(`❌ APPWRITE ERROR: ${msg}`, error || ''),
    warn: (msg) => console.warn(`⚠️ APPWRITE: ${msg}`),
    step: (msg) => console.log(`👉 APPWRITE: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE: ${msg}`),  // ✅ CRITICAL: Added for database-setup.js
    done: (msg) => console.log(`✅ APPWRITE: ${msg || 'Operation completed'}`),
    debug: (msg, data) => console.log(`🔍 APPWRITE: ${msg}`, data || ''),
    clear: (msg, data) => console.log(`✨ APPWRITE: ${msg}`, data || '')
};

console.log('✅ Minimal Appwrite config loaded - ready for testing');
