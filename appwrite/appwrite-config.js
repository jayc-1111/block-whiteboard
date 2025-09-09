// =====================
// Minimal Appwrite Config
// =====================

const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1',
    projectId: '68b6ed180029c5632ed3',
    databases: {
        main: '68b6f1aa003a536da72d',
        main2: '68bd70bc003176578fec'
    },
    collections: {
        boards: 'boards',
        bookmarks: 'bookmarks'
    },
    collectionDatabase: {
        boards: 'main',
        bookmarks: 'main2'
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
    const userEmail = await getAuthenticatedUserEmail();
    currentAuthenticatedUser = { email: userEmail };
    console.log('✅ Authenticated user updated:', userEmail);
    return currentAuthenticatedUser;
}

// Initialize Appwrite client
if (typeof Appwrite !== 'undefined') {
    window.appwriteClient = new Appwrite.Client()
        .setEndpoint(APPWRITE_CONFIG.endpoint)
        .setProject(APPWRITE_CONFIG.projectId);
    window.appwriteAccount = new Appwrite.Account(window.appwriteClient);
    window.appwriteDatabasesMain = new Appwrite.Databases(window.appwriteClient);
    window.appwriteDatabasesMain2 = new Appwrite.Databases(window.appwriteClient);
    console.log('✅ Appwrite services initialized');

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
                'boards',
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
                'boards'
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
            const permissions = [
                typeof Appwrite !== 'undefined' ?
                    Appwrite.Permission.read(Appwrite.Role.any()) :
                    []
            ];

            const result = await window.appwriteDatabasesMain.createDocument(
                APPWRITE_CONFIG.databases.main,
                'boards',
                boardData.id,
                {
                    board_name: boardData.name || 'New Board',
                    email: await getAuthenticatedUserEmail() // ✅ Now using real user email!
                },
                permissions
            );

            return {
                id: result.$id,
                name: result.board_name,
                data: {},
                createdAt: result.$createdAt
            };
        } catch (error) {
            console.error('❌ Failed to save board:', error);
            throw error;
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
        return null; // TODO: implement properly
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
