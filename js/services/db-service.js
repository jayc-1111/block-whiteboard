/**
 * Database Service for Board Operations
 * 
 * This service provides board-specific database operations including
 * saving, updating, and deleting boards from the Appwrite database.
 */

// Debug utilities
const dbDebug = {
    info: (msg, data) => console.log(`🗃️ DB_SERVICE: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ DB_SERVICE ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ DB_SERVICE: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 DB_SERVICE: ${msg}`),
    detail: (msg, data) => console.log(`📋 DB_SERVICE: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 DB_SERVICE: ${msg}`),
    done: (msg) => console.log(`✅ DB_SERVICE: ${msg || 'Operation completed'}`)
}

// Get user email if available
function getUserEmail() {
    try {
        if (window.authService) {
            const currentUser = window.authService.getCurrentUser();
            if (currentUser && currentUser.email) {
                return currentUser.email;
            }
        }
        return '';
    } catch (error) {
        dbDebug.warn('Could not get user email', error.message);
        return '';
    }
}

// Get proper Appwrite permissions for board operations
function getBoardPermissions() {
    try {
        if (!window.Appwrite || !window.authService) {
            dbDebug.warn('Appwrite or authService not available, using default permissions');
            return [];
        }
        
        const currentUser = window.authService.getCurrentUser();
        
        if (!currentUser) {
            dbDebug.info('No user authenticated, using project permissions');
            return [];
        }
        
        const isAnonymousUser = currentUser.labels && currentUser.labels.includes('anonymous');
        
        if (isAnonymousUser) {
            dbDebug.info('Anonymous user detected, using public permissions');
            return [
                Appwrite.Permission.read('any'),
                Appwrite.Permission.write('any')
            ];
        }
        
        dbDebug.info('Real user authenticated, using user-specific permissions', {
            userId: currentUser.$id,
            email: currentUser.email
        });
        
        return [
            Appwrite.Permission.read(Appwrite.Role.user(currentUser.$id)),
            Appwrite.Permission.write(Appwrite.Role.user(currentUser.$id))
        ];
        
    } catch (error) {
        dbDebug.error('Failed to generate permissions', error);
        return [];
    }
}

/**
 * Save current board state to Appwrite database
 * This is a wrapper function that gets the current board data and saves it
 * @returns {Promise<Object>} - The save result
 */
async function saveCurrentBoard() {
    dbDebug.start('Saving current board to Appwrite database');
    
    try {
        // Get current board data from AppState
        const boards = AppState.get('boards');
        const currentBoard_stateId = AppState.get('currentBoard_stateId');
        
        if (!boards || currentBoard_stateId === undefined) {
            throw new Error('No board currently selected');
        }
        
        const currentBoard = boards.find(board => board.stateId === currentBoard_stateId);
        if (!currentBoard) {
            throw new Error('Current board not found in state');
        }
        
        dbDebug.detail('Current board data', {
            stateId: currentBoard.stateId,
            name: currentBoard.name || currentBoard.board_name,
            dbId: currentBoard.dbId,
            foldersCount: currentBoard.folders?.length || 0,
            headersCount: currentBoard.canvasHeaders?.length || 0,
            pathsCount: currentBoard.drawingPaths?.length || 0
        });
        
        // Call the main saveBoard function
        const result = await saveBoard(currentBoard);
        
        dbDebug.done('Current board saved successfully');
        return result;
        
    } catch (error) {
        dbDebug.error('Failed to save current board', error);
        throw new Error(`Failed to save current board: ${error.message}`);
    }
}

/**
 * Save board to Appwrite database
 * @param {Object} boardData - The board data to save
 * @returns {Promise<Object>} - The saved board data
 */
async function saveBoard(boardData) {
    dbDebug.start('Saving board to Appwrite database');
    
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    try {
        // Get the appropriate database service
        const databases = window.appwriteDatabasesMain || window.appwriteDatabases;
        if (!databases) {
            throw new Error('Appwrite databases service not available');
        }
        
        dbDebug.step('Preparing board data for save');
        
        // Prepare board data for storage (only board-level metadata)
        const boardToSave = {
            board_name: boardData.name || boardData.board_name || 'Untitled Board',
            email: getUserEmail()
        };
        
        dbDebug.detail('Board data prepared', {
            name: boardToSave.board_name
        });
        
        // Check if board already exists (has dbId)
        let savedBoard;
        if (boardData.dbId) {
            dbDebug.step('Updating existing board');
            
            // Get existing board first to preserve some fields
            try {
                const existingBoard = await databases.getDocument(
                    window.APPWRITE_CONFIG.collectionDatabase.boards,
                    window.APPWRITE_CONFIG.collections.boards,
                    boardData.dbId
                );
                savedBoard = await databases.updateDocument(
                    window.APPWRITE_CONFIG.collectionDatabase.boards,
                    window.APPWRITE_CONFIG.collections.boards,
                    boardData.dbId,
                    boardToSave
                );
                dbDebug.info(`Board updated successfully: ${savedBoard.$id}`);
            } catch (updateError) {
                if (updateError.code === 404) {
                    dbDebug.warn('Board not found, creating new one instead');
                    // Create new board if it doesn't exist
                    const permissions = getBoardPermissions();
                    savedBoard = await databases.createDocument(
                        window.APPWRITE_CONFIG.collectionDatabase.boards,
                        window.APPWRITE_CONFIG.collections.boards,
                        Appwrite.ID.unique(),
                        boardToSave,
                        permissions
                    );
                    dbDebug.info(`New board created: ${savedBoard.$id}`);
                } else {
                    throw updateError;
                }
            }
        } else {
            dbDebug.step('Creating new board');
            const permissions = getBoardPermissions();
            savedBoard = await databases.createDocument(
                window.APPWRITE_CONFIG.collectionDatabase.boards,
                window.APPWRITE_CONFIG.collections.boards,
                Appwrite.ID.unique(),
                boardToSave,
                permissions
            );
            dbDebug.info(`New board created: ${savedBoard.$id}`);
        }
        
        dbDebug.done('Board saved successfully');
        return {
            success: true,
            board: {
                stateId: boardData.stateId, // Local state identifier
                dbId: savedBoard.$id,
                name: savedBoard.board_name,
                email: savedBoard.email,
                $createdAt: savedBoard.$createdAt,
                $updatedAt: savedBoard.$updatedAt
            }
        };
        
    } catch (error) {
        dbDebug.error('Failed to save board', error);
        throw new Error(`Failed to save board: ${error.message}`);
    }
}

/**
 * Delete board from Appwrite database
 * @param {string} boardDbId - The database ID of the board to delete
 * @returns {Promise<Object>} - The deletion result
 */
async function deleteBoard(boardDbId) {
    dbDebug.start(`Deleting board ${boardDbId} from Appwrite database`);
    
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    try {
        // Get the appropriate database service
        const databases = window.appwriteDatabasesMain || window.appwriteDatabases;
        if (!databases) {
            throw new Error('Appwrite databases service not available');
        }
        
        dbDebug.step('Deleting board from database');
        
        // Delete the board document
        const boardsCollectionId = window.APPWRITE_CONFIG.collections.boards;
        const boardsDatabaseId = window.APPWRITE_CONFIG.collectionDatabase.boards;
        try {
            await databases.deleteDocument(boardsDatabaseId, boardsCollectionId, boardDbId);
            dbDebug.done(`Board ${boardDbId} deleted successfully from collection ${boardsCollectionId}`);
            return {
                success: true,
                message: `Board deleted successfully`
            };
        } catch (deleteError) {
            if (deleteError.code === 404) {
                dbDebug.warn(`Board ${boardDbId} not found in Appwrite, treating as successful deletion`);
                return {
                    success: true,
                    message: 'Board not found, already deleted'
                };
            }
            throw deleteError;
        }
        
    } catch (error) {
        dbDebug.error('Failed to delete board', error);
        throw new Error(`Failed to delete board: ${error.message}`);
    }
}

/**
 * Get board by database ID
 * @param {string} boardDbId - The database ID of the board to retrieve
 * @returns {Promise<Object>} - The board data
 */
async function getBoard(boardDbId) {
    dbDebug.start(`Getting board ${boardDbId} from Appwrite database`);
    
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    try {
        // Get the appropriate database service
        const databases = window.appwriteDatabasesMain || window.appwriteDatabases;
        if (!databases) {
            throw new Error('Appwrite databases service not available');
        }
        
        dbDebug.step('Retrieving board from database');
        
        // Get the board document
        const board = await databases.getDocument(
            window.APPWRITE_CONFIG.collectionDatabase.boards,
            window.APPWRITE_CONFIG.collections.boards,
            boardDbId
        );
        
        const parsedBoard = {
            stateId: 0, // Will be set by caller
            dbId: board.$id,
            name: board.board_name,
            email: board.email,
            $createdAt: board.$createdAt,
            $updatedAt: board.$updatedAt
        };
        
        dbDebug.done('Board retrieved successfully');
        return parsedBoard;
        
    } catch (error) {
        dbDebug.error('Failed to get board', error);
        throw new Error(`Failed to get board: ${error.message}`);
    }
}

/**
 * List all boards from the database
 * @returns {Promise<Array>} - Array of board objects
 */
async function loadBoards() {
    dbDebug.start('Loading all boards from database');
    
    if (!window.APPWRITE_CONFIG?.databases?.main) {
        throw new Error('Database configuration not available');
    }
    
    const databaseId = window.APPWRITE_CONFIG.databases.main;
    
    try {
        // Get the appropriate database service
        const databases = window.appwriteDatabasesMain || window.appwriteDatabases;
        if (!databases) {
            throw new Error('Appwrite databases service not available');
        }
        
        dbDebug.step('Querying boards collection');
        
        // List all boards from the collection
        const boards = await databases.listDocuments(
            window.APPWRITE_CONFIG.collectionDatabase.boards,
            window.APPWRITE_CONFIG.collections.boards
        );
        
        if (boards.documents.length === 0) {
            dbDebug.info('No boards found in database');
            return [];
        }
        
        // Parse and format each board
        const formattedBoards = boards.documents.map((board, index) => ({
            stateId: index, // Use sequential index for stateId (0, 1, 2...)
            dbId: board.$id, // Keep database ID separate
            name: board.board_name,
            email: board.email,
            $createdAt: board.$createdAt,
            $updatedAt: board.$updatedAt
        }));
        
        dbDebug.info(`Loaded ${formattedBoards.length} boards`);
        dbDebug.detail('Boards list', formattedBoards.map(b => ({ id: b.id, name: b.name, updatedAt: b.$updatedAt })));
        
        return formattedBoards;
        
    } catch (error) {
        dbDebug.error('Failed to load boards', error);
        throw new Error(`Failed to load boards: ${error.message}`);
    }
}

// Make functions available globally
window.dbService = {
    saveBoard,
    saveCurrentBoard,
    deleteBoard,
    getBoard,
    loadBoards,
    
    // Configuration
    config: {
        initialized: false,
        debugEnabled: true
    }
};

dbDebug.info('Database service module loaded');
