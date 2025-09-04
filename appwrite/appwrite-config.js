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
    endpoint: 'https://sfo.cloud.appwrite.io/v1', // San Francisco region
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
            
            const session = await account.createAnonymousSession();
            currentUser = await account.get();
            
            // Create user profile for guest
            await this.createUserProfile(currentUser, true);
            
            // Notify auth state listeners
            authStateCallbacks.forEach(callback => callback(currentUser));
            
            window.Debug.appwrite.info('Anonymous session created', { uid: currentUser.$id });
            return { success: true, user: currentUser };
        } catch (error) {
            window.Debug.appwrite.error('Anonymous sign-in failed', error);
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
            const successUrl = `${currentOrigin}/oauth/success`;
            const failureUrl = `${currentOrigin}/oauth/failure`;
            
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
            await account.deleteSession('current');
            currentUser = null;
            authStateCallbacks.forEach(callback => callback(null));
            return { success: true };
        } catch (error) {
            window.Debug.appwrite.error('Sign out failed', error);
            return { success: false, error: error.message };
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
            
            // Get all boards from anonymous account
            const boardsResponse = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                [Appwrite.Query.equal('boardId', '0')] // Get the default board with ID 0
            );

            // Filter boards that belong to the anonymous user
            const userBoards = boardsResponse.documents.filter(doc => doc.userId === fromUserId);

            // Transfer each board to new account
            for (const board of userBoards) {
                const boardData = { ...board };
                delete boardData.$id; // Remove old ID
                boardData.userId = toUserId; // Update owner
                
                await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    Appwrite.ID.unique(),
                    boardData
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
    
    // Save board to cloud
    async saveBoard(boardData) {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            window.Debug.appwrite.detail('Saving board to Appwrite', {
                userId: currentUser.$id,
                boardId: boardData.id,
                boardName: boardData.name
            });

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

            // Create a unique document ID that combines user and board information
            // This allows us to easily identify and filter boards by user
            const documentId = `user_${currentUser.$id}_board_${boardData.id}`;
            
            const saveData = {
                boardId: boardData.id,
                name: boardData.name,
                folders: boardData.folders || [],
                canvasHeaders: boardData.canvasHeaders || [],
                drawingPaths: boardData.drawingPaths || [],
                lastModified: new Date().toISOString(),
                isDevMode: boardData.isDevMode || false,
                onboardingShown: boardData.onboardingShown || false
            };

            // Try to update existing board first
            try {
                await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    documentId,
                    saveData
                );
                window.Debug.appwrite.detail('Board updated successfully', { documentId });
            } catch (updateError) {
                // If update fails (document doesn't exist), create new board
                const createData = {
                    ...saveData,
                    createdAt: new Date().toISOString()
                };
                
                await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.boards,
                    documentId,
                    createData
                );
                window.Debug.appwrite.detail('Board created successfully', { documentId });
            }

            window.Debug.appwrite.info('Board saved successfully');
            return { success: true };

        } catch (error) {
            window.Debug.appwrite.error('Failed to save board', error);
            return { success: false, error: error.message };
        }
    },

    // Load all boards for current user
    async loadBoards() {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            window.Debug.appwrite.step('Loading boards from Appwrite');

            // Use prefix query to find all boards for the current user
            // Document IDs follow pattern: user_${userId}_board_${boardId}
            const prefix = `user_${currentUser.$id}_board_`;
            
            const response = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                [
                    Appwrite.Query.startsWith('$id', prefix),
                    Appwrite.Query.orderDesc('lastModified')
                ]
            );

            // Extract board ID from document ID and prepare board data
            const boards = response.documents.map(doc => {
                // Extract numeric board ID from document ID (user_${userId}_board_${boardId})
                const boardIdMatch = doc.$id.match(/board_(\d+)$/);
                const boardId = boardIdMatch ? parseInt(boardIdMatch[1]) : parseInt(doc.boardId);
                
                return {
                    id: boardId,
                    boardId: doc.boardId,
                    name: doc.name,
                    folders: doc.folders || [],
                    canvasHeaders: doc.canvasHeaders || [],
                    drawingPaths: doc.drawingPaths || [],
                    lastModified: doc.lastModified,
                    isDevMode: doc.isDevMode || false,
                    onboardingShown: doc.onboardingShown || false,
                    createdAt: doc.createdAt
                };
            });

            window.Debug.appwrite.info(`Loaded ${boards.length} boards for user ${currentUser.$id}`);
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
                            // Retry loading boards
                            return await this.loadBoards();
                        } else {
                            window.Debug.appwrite.error('Database setup failed', setupResult);
                        }
                    } catch (setupError) {
                        window.Debug.appwrite.error('Database setup error', setupError);
                    }
                }
                
                // Return empty boards if setup fails or integration not available
                return { success: true, boards: [] };
            }
            
            window.Debug.appwrite.error('Failed to load boards', error);
            return { success: false, error: error.message };
        }
    },

    // Load specific board
    async loadBoard(boardId) {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Create the expected document ID for this user and board
            const documentId = `user_${currentUser.$id}_board_${boardId}`;
            
            const board = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                documentId
            );

            return { 
                success: true, 
                board: { 
                    id: boardId,
                    boardId: board.boardId,
                    name: board.name,
                    folders: board.folders || [],
                    canvasHeaders: board.canvasHeaders || [],
                    drawingPaths: board.drawingPaths || [],
                    lastModified: board.lastModified,
                    isDevMode: board.isDevMode || false,
                    onboardingShown: board.onboardingShown || false,
                    createdAt: board.createdAt
                } 
            };

        } catch (error) {
            if (error.code === 404) {
                return { success: false, error: 'Board not found or access denied' };
            }
            window.Debug.appwrite.error('Failed to load board', error);
            return { success: false, error: error.message };
        }
    },

    // Delete board
    async deleteBoard(boardId) {
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Create the expected document ID for this user and board
            const documentId = `user_${currentUser.$id}_board_${boardId}`;
            
            await databases.deleteDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.boards,
                documentId
            );
            
            return { success: true };

        } catch (error) {
            if (error.code === 404) {
                return { success: false, error: 'Board not found or access denied' };
            }
            window.Debug.appwrite.error('Failed to delete board', error);
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
