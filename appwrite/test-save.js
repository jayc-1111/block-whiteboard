// === APPWRITE TEST SAVE UTILITY ===
// This utility provides a simple way to test saving to Appwrite
// and diagnose any potential issues with the save process

// Debug utilities
const debugLog = (msg, data) => console.log(`🧪 ${msg}`, data || '');
const debugError = (msg, error) => console.error(`❌ TEST ERROR: ${msg}`, error);
const debugSuccess = (msg, data) => console.log(`✅ ${msg}`, data || '');

// Main test function
async function testAppwriteSave() {
    debugLog('Testing database connection...');
    
    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Appwrite services not found', { 
            appwriteDatabases: !!window.appwriteDatabases,
            authService: !!window.authService
        });
        return { success: false, error: 'Appwrite services not loaded properly' };
    }
    
    debugSuccess('Appwrite services ready');
    
    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated', { reason: 'No current user found' });
        return { success: false, error: 'Not authenticated. Please sign in first.' };
    }
    
    debugLog('User authenticated', { userId: currentUser.$id });
    
    try {
        // Create comprehensive test board with all data types
        const baseTimestamp = Date.now();
        const testBoard = {
            id: 'test-' + baseTimestamp,
            boardId: 'test-' + baseTimestamp,
            name: 'Comprehensive Test Board',
            folders: [
                {
                    id: 'folder-1-' + baseTimestamp,
                    title: 'Project Documentation',
                    position: JSON.stringify({ left: '100px', top: '100px' }),
                    z_index: 1,
                    files: [
                        {
                            id: 'file-1-1-' + baseTimestamp,
                            title: 'API Specifications',
                            content: '# API Documentation\n\nThis contains all API endpoints...'
                        },
                        {
                            id: 'file-1-2-' + baseTimestamp,
                            title: 'User Manual',
                            content: 'Welcome to the user manual...'
                        }
                    ]
                },
                {
                    id: 'folder-2-' + baseTimestamp,
                    title: 'Assets & Media',
                    position: JSON.stringify({ left: '300px', top: '200px' }),
                    z_index: 2,
                    files: [
                        {
                            id: 'file-2-1-' + baseTimestamp,
                            title: 'Logo Assets',
                            content: 'Repository for company logos and branding...'
                        }
                    ]
                }
            ],
            canvasHeaders: [
                {
                    id: 'header-1-' + baseTimestamp,
                    text: 'Project Phase 1',
                    position: JSON.stringify({ left: '200px', top: '50px' })
                },
                {
                    id: 'header-2-' + baseTimestamp,
                    text: 'Week 3 Timeline',
                    position: JSON.stringify({ left: '400px', top: '150px' })
                }
            ],
            drawingPaths: [
                {
                    id: 'drawing-1-' + baseTimestamp,
                    color: '#FF6B6B',
                    points: JSON.stringify([
                        { x: 150, y: 200 },
                        { x: 250, y: 300 },
                        { x: 350, y: 250 }
                    ])
                },
                {
                    id: 'drawing-2-' + baseTimestamp,
                    color: '#4ECDC4',
                    points: JSON.stringify([
                        { x: 500, y: 100 },
                        { x: 550, y: 200 },
                        { x: 600, y: 150 }
                    ])
                }
            ],
            isDevMode: false,
            onboardingShown: true
        };
        
        // Log test board data
        debugLog('Preparing test board data', {
            id: testBoard.id,
            name: testBoard.name,
            foldersCount: testBoard.folders.length,
            headersCount: testBoard.canvasHeaders.length
        });
        
        // Test folder save first (using separate collections WITH PERMISSIONS)
        debugLog('Testing folder save with permissions...');

        // Prepare folder data with shorter ID to stay under Appwrite's 36-char limit
        const folderIdPrefix = 'test-folder-' + Date.now().toString().slice(-6); // Shorter prefix
        const testFolder = {
            id: folderIdPrefix,
            boardRef: testBoard.id,
            title: 'Test Folder (With Permissions)',
            position: JSON.stringify({ left: '150px', top: '150px' }),
            files: JSON.stringify([])
            // Note: createdAt and updatedAt are system fields handled by Appwrite
        };

        try {
            // Create a short folder document ID that stays within Appwrite limits
            const userShortId = currentUser.$id.substring(0, 4); // Just first 4 chars of user ID
            const folderDocId = `f_${folderIdPrefix}_${userShortId}`;
            const compliantFolderDocId = folderDocId.length <= 36 ? folderDocId :
                `f_test_${Date.now().toString().slice(-6)}_${userShortId}`;

            // Get user permissions using our global helper function
            const folderPermissions = getCurrentUserPermissions();

            debugLog('Creating folder with permissions (short ID)', {
                folderId: compliantFolderDocId,
                length: compliantFolderDocId.length,
                userId: currentUser.$id,
                permissionCount: folderPermissions ? folderPermissions.length : 0
            });

            // For this test, we'll use a known system ID for board lookup
            // In real usage, this would be the actual board's system $id
            const testBoardId = "board-test-" + currentUser.$id.substring(0, 16);

            const folderResult = await window.appwriteDatabases.createDocument(
                window.APPWRITE_CONFIG.databaseId,
                window.APPWRITE_CONFIG.collections.folders,
                compliantFolderDocId,
                {
                    board_id: testBoardId, // ✅ Use correct lowercase field name
                    title: testFolder.title,
                    position: testFolder.position,
                    files: testFolder.files,
                    z_index: 1 // ✅ Required attribute for folders collection
                    // Note: createdAt and updatedAt are system fields handled by Appwrite
                },
                folderPermissions // ✅ Added permissions!
            );

            debugSuccess('Folder saved with permissions successfully', {
                folderId: folderResult.$id,
                createdAt: folderResult.$createdAt,
                permissions: folderResult.$permissions
            });
        } catch (folderError) {
            debugError('Folder save with permissions failed', {
                error: folderError.message,
                code: folderError.code,
                collection: window.APPWRITE_CONFIG.collections.folders
            });
        }
        
        // Now try saving the complete board
        debugLog('Testing complete board save...');
        
        if (window.dbService && window.dbService.saveBoard) {
            const result = await window.dbService.saveBoard(testBoard);
            
            if (result.success) {
                debugSuccess('Board saved successfully', {
                    boardId: testBoard.id,
                    timestamp: new Date().toISOString()
                });
                
                // Try to immediately retrieve the saved board using SAME EXACT board data object
                debugLog('Attempting to retrieve saved board...');
    try {
        const collectionId = collectionName;

        // Add debug logging for the query
        console.log(`🔍 QUERY DEBUG: Loading ${collectionName} for boardId "${boardId}"`);
        console.log(`🔍 QUERY DEBUG: Collection ID: ${collectionId}`);
        console.log(`🔍 QUERY DEBUG: Database ID: ${APPWRITE_CONFIG.databaseId}`);

        // List all documents in the collection first (unfiltered) to debug
        try {
            const allDocsQuery = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                collectionId,
                [window.Appwrite.Query.limit(10)] // Get first 10 docs
            );
            console.log(`🔍 QUERY DEBUG: Found ${allDocsQuery.documents?.length || 0} total docs in ${collectionName}:`,
                allDocsQuery.documents?.map(doc => ({
                    $id: doc.$id,
                    board_id: doc.board_id || doc.boardId,
                    hasBoardId: !!(doc.board_id || doc.boardId)
                }))
            );
        } catch (allDocsError) {
            console.log(`🔍 QUERY DEBUG: Error listing all docs:`, allDocsError.message);
        }

        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            collectionId,
            [
                Appwrite.Query.equal('board_id', boardId)
            ]
        );

        console.log(`🔍 QUERY DEBUG: Found ${response.documents?.length || 0} docs matching board_id: "${boardId}"`);
        console.log(`🔍 QUERY DEBUG: Matched documents:`, response.documents?.map(doc => ({
            $id: doc.$id,
            board_id: doc.board_id,
            color: doc.color
        })));
                    
                    debugSuccess('Board retrieved successfully', {
                        docId: retrievedDoc.$id,
                        name: retrievedDoc.name,
                        isDevMode: retrievedDoc.isDevMode,
                        systemId: retrievedDoc.$id
                        // Note: boardId field removed - we use system's $id instead
                    });
                    
                    // ✅ ADDITIONAL: Comprehensive data verification test
                    debugLog('🔍 Testing comprehensive data retrieval...');

                    // Test 1: Verify all folders were saved and retrieved
                    const expectedFolders = testBoard.folders.length; // 2 folders
                    const expectedFiles = testBoard.folders.reduce((sum, f) => sum + f.files.length, 0); // 3 files total
                    const expectedHeaders = testBoard.canvasHeaders.length; // 2 headers
                    const expectedDrawings = testBoard.drawingPaths.length; // 2 drawings

                    // Load the board using dbService to test full retrieval
                    try {
                        const loadResult = await window.dbService.loadBoard(testBoard.id);

                        if (loadResult.success) {
                            const board = loadResult.board;

                            debugLog('✅ Comprehensive load successful', {
                                foldersFound: board.folders?.length || 0,
                                expectedFolders: expectedFolders,
                                headersFound: board.canvasHeaders?.length || 0,
                                expectedHeaders: expectedHeaders,
                                drawingsFound: board.drawingPaths?.length || 0,
                                expectedDrawings: expectedDrawings
                            });

                            // Verify data integrity
                            let dataIntegrityValid = true;

                            // Check folders
                            if (board.folders?.length !== expectedFolders) {
                                debugError('❌ Folder count mismatch', {
                                    expected: expectedFolders,
                                    found: board.folders?.length
                                });
                                dataIntegrityValid = false;
                            }

                            // Check files
                            const totalFiles = board.folders?.reduce((sum, f) => sum + f.files.length, 0) || 0;
                            if (totalFiles !== expectedFiles) {
                                debugError('❌ File count mismatch', {
                                    expected: expectedFiles,
                                    found: totalFiles
                                });
                                dataIntegrityValid = false;
                            }

                            // Check headers
                            if (board.canvasHeaders?.length !== expectedHeaders) {
                                debugError('❌ Header count mismatch', {
                                    expected: expectedHeaders,
                                    found: board.canvasHeaders?.length
                                });
                                dataIntegrityValid = false;
                            }

                            // Check drawings
                            if (board.drawingPaths?.length !== expectedDrawings) {
                                debugError('❌ Drawing count mismatch', {
                                    expected: expectedDrawings,
                                    found: board.drawingPaths?.length
                                });
                                dataIntegrityValid = false;
                            }

                            if (dataIntegrityValid) {
                                debugSuccess('🎉 COMPREHENSIVE TEST PASSED!', {
                                    message: 'All data types successfully saved and retrieved',
                                    breakdown: `${board.folders?.length || 0} folders, ${totalFiles} files, ${board.canvasHeaders?.length || 0} headers, ${board.drawingPaths?.length || 0} drawings`
                                });
                            }

                        } else {
                            debugError('❌ Comprehensive load failed', loadResult.error);
                        }

                    } catch (comprehensiveError) {
                        debugError('❌ Comprehensive test error', comprehensiveError.message);
                    }

                    return {
                        success: true,
                        message: 'Comprehensive test completed successfully',
                        board: testBoard.id,
                        document: documentId,
                        stats: {
                            folders: expectedFolders,
                            files: expectedFiles,
                            headers: expectedHeaders,
                            drawings: expectedDrawings
                        }
                    };
                } catch (retrieveError) {
                    debugError('Board retrieval failed', {
                        error: retrieveError.message,
                        code: retrieveError.code
                    });
                    
                    return { 
                        success: false, 
                        error: 'Save succeeded but retrieval failed: ' + retrieveError.message,
                        saveResult: result
                    };
                }
            } else {
                debugError('Board save failed', { 
                    error: result.error,
                    code: result.code 
                });
                
                return { 
                    success: false, 
                    error: 'Board save failed: ' + result.error,
                    result: result
                };
            }
        } else {
            debugError('dbService.saveBoard function not found');
            return { success: false, error: 'dbService.saveBoard function not available' };
        }
    } catch (error) {
        debugError('Test failed with an unexpected error', error);
        return { success: false, error: error.message };
    }
}

// Create a simple UI for running the test
function createBoardTestUI() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.backgroundColor = '#f0f0f0';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    container.style.zIndex = '9999';
    container.style.maxWidth = '300px';
    
    const title = document.createElement('h3');
    title.textContent = 'Appwrite Permissions Test';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '16px';

    // Create button container for multiple test buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'column';
    buttonContainer.style.gap = '8px';

    // Basic Save Test Button
    const button = document.createElement('button');
    button.textContent = '📁 Run Board Test';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#4a69bd';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.width = '100%';

    // Permission Test Button
    const permissionButton = document.createElement('button');
    permissionButton.textContent = '🔐 Test Permissions Only';
    permissionButton.style.padding = '8px 12px';
    permissionButton.style.backgroundColor = '#10b981';
    permissionButton.style.color = 'white';
    permissionButton.style.border = 'none';
    permissionButton.style.borderRadius = '4px';
    permissionButton.style.cursor = 'pointer';
    permissionButton.style.width = '100%';

    // Comprehensive Test Button
    const comprehensiveButton = document.createElement('button');
    comprehensiveButton.textContent = '🎯 Run Full Test Suite';
    comprehensiveButton.style.padding = '8px 12px';
    comprehensiveButton.style.backgroundColor = '#8b5cf6';
    comprehensiveButton.style.color = 'white';
    comprehensiveButton.style.border = 'none';
    comprehensiveButton.style.borderRadius = '4px';
    comprehensiveButton.style.cursor = 'pointer';
    comprehensiveButton.style.width = '100%';

    // NEW: Folder Test Button
    const folderTestButton = document.createElement('button');
    folderTestButton.textContent = '📂 Run Folder Test';
    folderTestButton.style.padding = '8px 12px';
    folderTestButton.style.backgroundColor = '#f59e0b';
    folderTestButton.style.color = 'white';
    folderTestButton.style.border = 'none';
    folderTestButton.style.borderRadius = '4px';
    folderTestButton.style.cursor = 'pointer';
    folderTestButton.style.width = '100%';

    // NEW: File Test Button
    const fileTestButton = document.createElement('button');
    fileTestButton.textContent = '📄 Run File Test';
    fileTestButton.style.padding = '8px 12px';
    fileTestButton.style.backgroundColor = '#8b5cf6';
    fileTestButton.style.color = 'white';
    fileTestButton.style.border = 'none';
    fileTestButton.style.borderRadius = '4px';
    fileTestButton.style.cursor = 'pointer';
    fileTestButton.style.width = '100%';

    // NEW: Canvas Headers Test Button
    const canvasHeadersTestButton = document.createElement('button');
    canvasHeadersTestButton.textContent = '🏷️ Run Headers Test';
    canvasHeadersTestButton.style.padding = '8px 12px';
    canvasHeadersTestButton.style.backgroundColor = '#ec4899';
    canvasHeadersTestButton.style.color = 'white';
    canvasHeadersTestButton.style.border = 'none';
    canvasHeadersTestButton.style.borderRadius = '4px';
    canvasHeadersTestButton.style.cursor = 'pointer';
    canvasHeadersTestButton.style.width = '100%';

    // NEW: Canvas Drawings Test Button
    const canvasDrawingsTestButton = document.createElement('button');
    canvasDrawingsTestButton.textContent = '🎨 Run Drawings Test';
    canvasDrawingsTestButton.style.padding = '8px 12px';
    canvasDrawingsTestButton.style.backgroundColor = '#f59e0b';
    canvasDrawingsTestButton.style.color = 'white';
    canvasDrawingsTestButton.style.border = 'none';
    canvasDrawingsTestButton.style.borderRadius = '4px';
    canvasDrawingsTestButton.style.cursor = 'pointer';
    canvasDrawingsTestButton.style.width = '100%';

    buttonContainer.appendChild(button);
    buttonContainer.appendChild(permissionButton);
    buttonContainer.appendChild(folderTestButton);
    buttonContainer.appendChild(fileTestButton);
    buttonContainer.appendChild(canvasHeadersTestButton);
    buttonContainer.appendChild(canvasDrawingsTestButton);
    buttonContainer.appendChild(comprehensiveButton);
    
    const resultDiv = document.createElement('div');
    resultDiv.style.marginTop = '10px';
    resultDiv.style.fontSize = '14px';
    resultDiv.style.maxHeight = '150px';
    resultDiv.style.overflow = 'auto';
    resultDiv.style.whiteSpace = 'pre-wrap';
    resultDiv.style.wordBreak = 'break-word';
    
    // Add diagnostic information
    const diagInfo = document.createElement('div');
    diagInfo.style.marginTop = '15px';
    diagInfo.style.fontSize = '12px';
    diagInfo.style.color = '#555';
    
    // Check if services are available
    const authLoaded = !!window.authService;
    const dbLoaded = !!window.dbService;
    const appwriteLoaded = !!window.appwriteDatabases;
    
    diagInfo.innerHTML = `
        <div><strong>Diagnostic Info:</strong></div>
        <div>Auth Service: ${authLoaded ? '✅' : '❌'}</div>
        <div>DB Service: ${dbLoaded ? '✅' : '❌'}</div>
        <div>Appwrite: ${appwriteLoaded ? '✅' : '❌'}</div>
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '6px 10px';
    closeButton.style.backgroundColor = '#ddd';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.marginTop = '10px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(container);
    });

    // Event listeners for all test buttons
    button.addEventListener('click', async () => {
        resultDiv.textContent = '🧪 Running basic save test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testAppwriteSave();

            if (result.success) {
                resultDiv.textContent = `✅ Basic save test successful!\n\nBoard ID: ${result.board}\nDocument: ${result.document}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Basic save test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // Permission test button event listener
    permissionButton.addEventListener('click', async () => {
        resultDiv.textContent = '🔐 Running permission test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testPermissionFiltering();

            if (result.success) {
                resultDiv.textContent = `✅ Permission test successful!\n\nDocument: ${result.documentCreated}\nUser: ${result.userId}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Permission test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // NEW: Folder test button event listener
    folderTestButton.addEventListener('click', async () => {
        resultDiv.textContent = '📂 Running folder test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testFolderOperations();

            if (result.success) {
                resultDiv.textContent = `✅ Folder test successful!\n\n${result.message}\nFolder: ${result.folderId}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Folder test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // NEW: File test button event listener
    fileTestButton.addEventListener('click', async () => {
        resultDiv.textContent = '📄 Running file test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testFileOperations();

            if (result.success) {
                resultDiv.textContent = `✅ File test successful!\n\n${result.message}\nFile: ${result.fileId}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ File test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // NEW: Canvas Headers test button event listener
    canvasHeadersTestButton.addEventListener('click', async () => {
        resultDiv.textContent = '🏷️ Running headers test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testCanvasHeadersOperations();

            if (result.success) {
                resultDiv.textContent = `✅ Headers test successful!\n\n${result.message}\nHeader: ${result.headerId}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Headers test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // NEW: Canvas Drawings test button event listener
    canvasDrawingsTestButton.addEventListener('click', async () => {
        resultDiv.textContent = '🎨 Running drawings test...';
        resultDiv.style.color = '#333';

        try {
            const result = await testCanvasDrawingsOperations();

            if (result.success) {
                resultDiv.textContent = `✅ Drawings test successful!\n\n${result.message}\nDrawing: ${result.drawingId}`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Drawings test failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

    // Comprehensive test button event listener
    comprehensiveButton.addEventListener('click', async () => {
        resultDiv.textContent = '🎯 Running full test suite...';
        resultDiv.style.color = '#333';

        try {
            const result = await testComprehensivePermissions();

            if (result.success) {
                resultDiv.textContent = `🎉 ALL TESTS PASSED!\n\nPermission system validated successfully`;
                resultDiv.style.color = 'green';
            } else {
                resultDiv.textContent = `❌ Some tests failed:\n${result.error}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `❌ Error: ${error.message}`;
            resultDiv.style.color = 'red';
        }
    });

// Add the container to the document
    container.appendChild(title);
    container.appendChild(buttonContainer);
    container.appendChild(resultDiv);
    container.appendChild(diagInfo);
    container.appendChild(closeButton);

    document.body.appendChild(container);
}

// Auto-initialize when script loads
if (document.readyState === 'complete') {
    createBoardTestUI();
} else {
    window.addEventListener('load', createBoardTestUI);
}

// TODO UPDATE LIST - Current status:
// [x] Investigate why drawing documents are not being created
// [x] Check board saving logic in dbService
// [x] Verify drawingPaths processing in saveToCollection
// [x] Examine query logic for retrieving drawings
// [x] Fixed drawingPaths to actually create documents instead of logging setup message
// [x] Added comprehensive debug logging (both save + query processes)
// [x] Fixed query field name consistency (board_id vs boardId)
// [x] Confirmed database attributes are correct (board_id, color, drawing_paths)
// [x] Identified persistent "expected: 2, found: 0" issue despite fixes
// [⏳] DEFERRED: Deep database architecture investigation needed
// [ ] Create indexes using MCP tool with board_id_updatedAt naming format
// [ ] Test that indexes are working correctly for the requested collections
// [ ] Verify drawing_paths field is functioning as expected with proper queries

// Test permission filtering functionality
async function testPermissionFiltering() {
    debugLog('🔐 Testing permission-based filtering...');

    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Services not available');
        return { success: false, error: 'Services not loaded' };
    }

    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated');
        return { success: false, error: 'Not authenticated' };
    }

    debugLog('User authenticated for permission test', { userId: currentUser.$id });

    try {
        // Test 1: Create document with permissions
        const testDocId = `perm_test_${Date.now()}_${currentUser.$id.substring(0, 6)}`;
        const compliantDocId = testDocId.length <= 36 ? testDocId : `perm_test_${Date.now()}`;

        // Use the correct permission format function
        const permissions = getCurrentUserPermissions();

        debugLog('Creating test document with permissions', {
            docId: compliantDocId,
            userId: currentUser.$id,
            permissionsCount: permissions.length
        });

        const testDoc = {
            email: currentUser.email || 'anonymous@zenban.app',
            board_name: 'Permission Test Board'
            // Note: createdAt is a system field automatically added by Appwrite
            // Note: updatedAt is a system field automatically added by Appwrite
        };

        const result = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.boards,
            compliantDocId,
            testDoc,
            permissions
        );

        debugSuccess('✅ Document created with permissions', {
            docId: result.$id,
            permissions: result.$permissions?.length || 0
        });

        // Test 2: Verify document retrieval works
        try {
            const retrieved = await window.appwriteDatabases.getDocument(
                window.APPWRITE_CONFIG.databaseId,
                window.APPWRITE_CONFIG.collections.boards,
                compliantDocId
            );

            debugSuccess('✅ Owner can read their own document', {
                docId: retrieved.$id,
                name: retrieved.name
            });
        } catch (readError) {
            debugError('❌ Owner cannot read their own document', readError);
            return { success: false, error: 'Permission issue - document not readable by owner' };
        }

        // Test 3: Verify permission filtering (if we can test with another user)
        debugLog('🔍 Testing query filtering...');

        // Query for boards - should only return boards with user permissions
        const queryResult = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.boards,
            [
                window.Appwrite.Query.startsWith('$id', 'board_'),
                window.Appwrite.Query.orderDesc('$updatedAt')
            ]
        );

        debugSuccess('✅ Query successful - permission filtering active', {
            docsFound: queryResult.documents.length,
            totalDocs: queryResult.total
        });

        // Verify all retrieved documents belong to the current user
        let allBelongToUser = true;
        for (const doc of queryResult.documents) {
            // Check if at least one permission allows this user
            const userHasAccess = doc.$permissions?.some(perm =>
                perm.includes(`user:${currentUser.$id}`)
            );

            if (!userHasAccess) {
                allBelongToUser = false;
                debugError('❌ Document found without user permissions', {
                    docId: doc.$id,
                    permissions: doc.$permissions
                });
                break;
            }
        }

        if (allBelongToUser) {
            debugSuccess('✅ Permission filtering verified - all documents accessible to user only');
        }

        return {
            success: true,
            message: 'Permission system working correctly',
            documentCreated: compliantDocId,
            userId: currentUser.$id
        };

    } catch (error) {
        debugError('❌ Permission test failed', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Complete comprehensive test
async function testComprehensivePermissions() {
    debugLog('🧪 Running comprehensive permission test suite...');

    const mainTest = await testAppwriteSave();
    const permissionTest = await testPermissionFiltering();

    if (mainTest.success && permissionTest.success) {
        debugSuccess('🎉 ALL TESTS PASSED - Permissions system working correctly!');
        return {
            success: true,
            message: 'Complete permission system validated',
            mainTest: mainTest,
            permissionTest: permissionTest
        };
    } else {
        debugError('❌ Some tests failed', {
            mainTest: mainTest.success,
            permissionTest: permissionTest.success
        });
        return {
            success: false,
            error: 'Some tests failed',
            mainTest: mainTest,
            permissionTest: permissionTest
        };
    }
}

// Dedicated folder operations test
async function testFolderOperations() {
    debugLog('📂 Testing folder-specific operations...');

    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Services not available for folder test');
        return { success: false, error: 'Services not loaded' };
    }

    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated for folder test');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const timestamp = Date.now();
        const folderBaseId = `foldertest_${timestamp}`;

        // Create test folder with complete structure
        const testFolder = {
            id: folderBaseId,
            title: '📂 Folder Operations Test',
            position: JSON.stringify({ left: '250px', top: '150px' }),
            z_index: 5,
            files: JSON.stringify([
                {
                    id: `file_${timestamp}_1`,
                    title: 'Test Document.txt',
                    content: 'This is a test document for folder operations'
                },
                {
                    id: `file_${timestamp}_2`,
                    title: 'Project Note.md',
                    content: '# Project Note\n\nThis tests folder file functionality.'
                }
            ])
        };

        // Generate folder document ID
        const userShortId = currentUser.$id.substring(0, 4);
        const folderDocumentId = `ftst_${timestamp}_${userShortId}`;

        debugLog('📂 Creating test folder with files', {
            folderId: folderDocumentId,
            folderTitle: testFolder.title,
            fileCount: 2

        });

        // STEP 1: Create folder document with proper schema
        const folderPermissions = getCurrentUserPermissions();
        const folderResult = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            folderDocumentId,
            {
                board_id: 'test-board-' + currentUser.$id.substring(0, 8), // Required board reference
                title: testFolder.title, // Required
                position: testFolder.position, // Required
                z_index: testFolder.z_index, // Required
                files: testFolder.files // Optional but included for test
            },
            folderPermissions
        );

        debugSuccess('✅ Folder created successfully', {
            folderId: folderResult.$id,
            title: folderResult.title,
            zIndex: folderResult.z_index,
            createdAt: folderResult.$createdAt
        });

        // STEP 2: Retrieve and verify folder
        debugLog('📂 Retrieving folder for verification...');
        const retrievedFolder = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            folderDocumentId
        );

        debugSuccess('✅ Folder retrieved successfully', {
            folderId: retrievedFolder.$id,
            title: retrievedFolder.title,
            zIndex: retrievedFolder.z_index
        });

        // STEP 3: Verify folder data integrity
        let integrityCheckPassed = true;

        if (retrievedFolder.title !== testFolder.title) {
            debugError('❌ Title mismatch', {
                expected: testFolder.title,
                found: retrievedFolder.title
            });
            integrityCheckPassed = false;
        }

        if (retrievedFolder.z_index !== testFolder.z_index) {
            debugError('❌ Z-index mismatch', {
                expected: testFolder.z_index,
                found: retrievedFolder.z_index
            });
            integrityCheckPassed = false;
        }

        // Verify files were saved correctly
        const savedFiles = JSON.parse(retrievedFolder.files);
        const expectedFiles = JSON.parse(testFolder.files);

        if (savedFiles.length !== expectedFiles.length) {
            debugError('❌ File count mismatch', {
                expected: expectedFiles.length,
                found: savedFiles.length
            });
            integrityCheckPassed = false;
        } else {
            debugSuccess('✅ Folder files verified', {
                fileCount: savedFiles.length,
                titles: savedFiles.map(f => f.title)
            });
        }

        // STEP 4: Test folder update operation
        debugLog('📂 Testing folder update...');
        const updatedTitle = '📂 Updated Folder Title';
        const updateResult = await window.appwriteDatabases.updateDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            folderDocumentId,
            { title: updatedTitle }
        );

        debugSuccess('✅ Folder updated successfully', {
            oldTitle: testFolder.title,
            newTitle: updatedTitle
        });

        // STEP 5: Verify update was persisted
        const updatedFolder = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            folderDocumentId
        );

        if (updatedFolder.title !== updatedTitle) {
            debugError('❌ Update verification failed', {
                expected: updatedTitle,
                found: updatedFolder.title
            });
            integrityCheckPassed = false;
        } else {
            debugSuccess('✅ Update persistence verified');
        }

        // STEP 6: Test folder queriying
        debugLog('📂 Testing folder query operations...');
        const folderQuery = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            [
                window.Appwrite.Query.equal('board_id', retrievedFolder.board_id)
            ]
        );

        debugSuccess('✅ Folder queries working', {
            totalFolders: folderQuery.documents.length,
            queryField: 'board_id',
            queryValue: retrievedFolder.board_id
        });

        if (integrityCheckPassed) {
            debugSuccess('🎉 FOLDER TEST COMPLETED SUCCESSFULLY!', {
                message: 'All folder operations validated',
                summary: 'Created → Retrieved → Updated → Queried'
            });

            return {
                success: true,
                message: 'Folder test passed with all CRUD operations validated',
                folderId: folderDocumentId,
                operations: ['Create', 'Read', 'Update', 'Query']
            };
        } else {
            return {
                success: false,
                error: 'Folder data integrity check failed',
                folderId: folderDocumentId
            };
        }

    } catch (error) {
        debugError('❌ Folder test failed', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Dedicated file operations test
async function testFileOperations() {
    debugLog('📄 Testing file-specific operations...');

    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Services not available for file test');
        return { success: false, error: 'Services not loaded' };
    }

    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated for file test');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const timestamp = Date.now();

        // STEP 1: First create a folder (since files need folder_id reference)
        debugLog('📄 Creating parent folder for files...');
        const userShortId = currentUser.$id.substring(0, 4);
        const folderDocumentId = `filetest_fold_${timestamp}_${userShortId}`;

        const folderPermissions = getCurrentUserPermissions();
        const folderResult = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.folders,
            folderDocumentId,
            {
                board_id: 'test-board-' + currentUser.$id.substring(0, 8), // Required board reference
                title: '📄 File Test Parent Folder', // Required
                position: JSON.stringify({ left: '150px', top: '100px' }), // Required
                z_index: 3, // Required
                files: JSON.stringify([]) // Optional but included for test
            },
            folderPermissions
        );

        debugSuccess('✅ Parent folder created', {
            folderId: folderResult.$id,
            title: folderResult.title
        });

        // STEP 2: Create test files
        const testFiles = [
            {
                id: `filetest_md_${timestamp}`,
                title: '📄 README.md',
                content: '# Markdown File Test\n\nThis is a **markdown** file for testing file operations.\n\n## Features\n- File creation\n- Content storage\n- Type classification',
                type: 'markdown'
            },
            {
                id: `filetest_txt_${timestamp}`,
                title: '📄 Notes.txt',
                content: 'Plain text file for testing basic file operations.\nLine 2 content.\nLine 3 with more content.',
                type: 'text'
            }
        ];

        const fileIds = [];
        const filePermissions = getCurrentUserPermissions();

        // Create first file
        const fileDocId1 = `ft_${testFiles[0].id}_${userShortId}`;
        const fileResult1 = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId1,
            {
                folder_id: folderResult.$id, // Reference to parent folder
                title: testFiles[0].title, // Required
                content: testFiles[0].content, // Optional but included for test
                type: testFiles[0].type // Required
            },
            filePermissions
        );

        fileIds.push(fileResult1.$id);
        debugSuccess('✅ First file created', {
            fileId: fileResult1.$id,
            title: fileResult1.title,
            type: fileResult1.type
        });

        // Create second file
        const fileDocId2 = `ft_${testFiles[1].id}_${userShortId}`;
        const fileResult2 = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId2,
            {
                folder_id: folderResult.$id, // Reference to parent folder
                title: testFiles[1].title, // Required
                content: testFiles[1].content, // Optional but included for test
                type: testFiles[1].type // Required
            },
            filePermissions
        );

        fileIds.push(fileResult2.$id);
        debugSuccess('✅ Second file created', {
            fileId: fileResult2.$id,
            title: fileResult2.title,
            type: fileResult2.type
        });

        // STEP 3: Retrieve and verify files
        debugLog('📄 Retrieving files for verification...');

        // Retrieve first file
        const retrievedFile1 = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId1
        );

        // Retrieve second file
        const retrievedFile2 = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId2
        );

        debugSuccess('✅ Files retrieved successfully', {
            file1: retrievedFile1.title,
            file2: retrievedFile2.title
        });

        // STEP 4: Verify file data integrity
        let integrityCheckPassed = true;

        if (retrievedFile1.title !== testFiles[0].title) {
            debugError('❌ File 1 title mismatch', {
                expected: testFiles[0].title,
                found: retrievedFile1.title
            });
            integrityCheckPassed = false;
        }

        if (retrievedFile1.content !== testFiles[0].content) {
            debugError('❌ File 1 content mismatch');
            integrityCheckPassed = false;
        }

        if (retrievedFile1.type !== testFiles[0].type) {
            debugError('❌ File 1 type mismatch', {
                expected: testFiles[0].type,
                found: retrievedFile1.type
            });
            integrityCheckPassed = false;
        }

        if (retrievedFile2.title !== testFiles[1].title) {
            debugError('❌ File 2 title mismatch', {
                expected: testFiles[1].title,
                found: retrievedFile2.title
            });
            integrityCheckPassed = false;
        }

        if (retrievedFile2.content !== testFiles[1].content) {
            debugError('❌ File 2 content mismatch');
            integrityCheckPassed = false;
        }

        if (integrityCheckPassed) {
            debugSuccess('✅ File content verified', {
                file1ContentLength: retrievedFile1.content.length,
                file2ContentLength: retrievedFile2.content.length,
                file1Type: retrievedFile1.type,
                file2Type: retrievedFile2.type
            });
        }

        // STEP 5: Test file update operation
        debugLog('📄 Testing file update...');
        const updatedContent = 'Updated content for test file.';
        const updateResult = await window.appwriteDatabases.updateDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId1,
            { content: updatedContent }
        );

        debugSuccess('✅ File updated successfully', {
            oldContentLength: testFiles[0].content.length,
            newContentLength: updatedContent.length
        });

        // STEP 6: Verify update was persisted
        const updatedFile = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            fileDocId1
        );

        if (updatedFile.content !== updatedContent) {
            debugError('❌ Update verification failed', {
                expected: updatedContent,
                found: updatedFile.content
            });
            integrityCheckPassed = false;
        } else {
            debugSuccess('✅ Update persistence verified');
        }

        // STEP 7: Test file querying by folder_id
        debugLog('📄 Testing file query operations...');
        const fileQuery = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            [
                window.Appwrite.Query.equal('folder_id', folderResult.$id)
            ]
        );

        debugSuccess('✅ File queries working', {
            totalFiles: fileQuery.documents.length,
            expectedFiles: 2,
            queryField: 'folder_id',
            queryValue: folderResult.$id
        });

        if (fileQuery.documents.length !== 2) {
            debugError('❌ File query count mismatch', {
                expected: 2,
                found: fileQuery.documents.length
            });
            integrityCheckPassed = false;
        }

        // STEP 8: Test file type filtering
        debugLog('📄 Testing file type filtering...');
        const markdownFiles = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.files,
            [
                window.Appwrite.Query.equal('folder_id', folderResult.$id),
                window.Appwrite.Query.equal('type', 'markdown')
            ]
        );

        debugSuccess('✅ File type filtering working', {
            markdownFiles: markdownFiles.documents.length,
            expectedMarkdownFiles: 1
        });

        if (markdownFiles.documents.length !== 1) {
            debugError('❌ Markdown file count mismatch', {
                expected: 1,
                found: markdownFiles.documents.length
            });
            integrityCheckPassed = false;
        }

        if (integrityCheckPassed) {
            debugSuccess('🎉 FILE TEST COMPLETED SUCCESSFULLY!', {
                message: 'All file operations validated',
                summary: 'Created → Retrieved → Updated → Queried → Filtered'
            });

            return {
                success: true,
                message: 'File test passed with all CRUD operations validated',
                fileId: fileDocId1,
                totalFiles: 2,
                operations: ['Create', 'Read', 'Update', 'Query', 'Filter']
            };
        } else {
            return {
                success: false,
                error: 'File data integrity check failed',
                fileId: fileDocId1
            };
        }

    } catch (error) {
        debugError('❌ File test failed', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Dedicated canvas headers operations test
async function testCanvasHeadersOperations() {
    debugLog('🏷️ Testing canvas headers operations...');

    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Services not available for canvas headers test');
        return { success: false, error: 'Services not loaded' };
    }

    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated for canvas headers test');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const timestamp = Date.now();

        // STEP 1: Create test canvas headers
        const testHeaders = [
            {
                id: `header-section-${timestamp}`,
                text: '🏷️ Project Phase 1 - Overview',
                position: JSON.stringify({ left: '150px', top: '75px' })
            },
            {
                id: `header-milestone-${timestamp}`,
                text: '🏷️ Q2 Q3 Intersection Point',
                position: JSON.stringify({ left: '450px', top: '225px' })
            }
        ];

        const headerIds = [];
        const headerPermissions = getCurrentUserPermissions();

        // Create first header
        const timestamp1 = Date.now().toString().slice(-6); // Last 6 digits
        const userShortId = currentUser.$id.substring(0, 4); // First 4 chars
        const headerDocId1 = `ht${timestamp1}${userShortId}`; // e.g., "ht123456abcd"

        const headerResult1 = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId1,
            {
                board_id: 'test-board-' + currentUser.$id.substring(0, 8), // Required board reference
                text: testHeaders[0].text, // Required
                position: testHeaders[0].position // Required
                // Note: createdAt and updatedAt are system fields handled by Appwrite
            },
            headerPermissions
        );

        headerIds.push(headerResult1.$id);
        debugSuccess('✅ First header created', {
            headerId: headerResult1.$id,
            text: headerResult1.text,
            createdAt: headerResult1.$createdAt
        });

        // Create second header
        const timestamp2 = (Date.now() + 1).toString().slice(-6); // Slightly different timestamp
        const headerDocId2 = `ht${timestamp2}${userShortId}`; // e.g., "ht123457abcd"

        const headerResult2 = await window.appwriteDatabases.createDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId2,
            {
                board_id: 'test-board-' + currentUser.$id.substring(0, 8), // Required board reference
                text: testHeaders[1].text, // Required
                position: testHeaders[1].position // Required
                // Note: createdAt and updatedAt are system fields handled by Appwrite
            },
            headerPermissions
        );

        headerIds.push(headerResult2.$id);
        debugSuccess('✅ Second header created', {
            headerId: headerResult2.$id,
            text: headerResult2.text,
            createdAt: headerResult2.$createdAt
        });

        // STEP 2: Retrieve and verify headers
        debugLog('🏷️ Retrieving canvas headers for verification...');

        // Retrieve first header
        const retrievedHeader1 = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId1
        );

        // Retrieve second header
        const retrievedHeader2 = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId2
        );

        debugSuccess('✅ Headers retrieved successfully', {
            header1: retrievedHeader1.text.substring(0, 20) + '...',
            header2: retrievedHeader2.text.substring(0, 20) + '...'
        });

        // STEP 3: Verify header data integrity
        let integrityCheckPassed = true;

        if (retrievedHeader1.text !== testHeaders[0].text) {
            debugError('❌ Header 1 text mismatch', {
                expected: testHeaders[0].text,
                found: retrievedHeader1.text
            });
            integrityCheckPassed = false;
        }

        if (retrievedHeader1.position !== testHeaders[0].position) {
            debugError('❌ Header 1 position mismatch', {
                expected: testHeaders[0].position,
                found: retrievedHeader1.position
            });
            integrityCheckPassed = false;
        }

        if (retrievedHeader2.text !== testHeaders[1].text) {
            debugError('❌ Header 2 text mismatch', {
                expected: testHeaders[1].text,
                found: retrievedHeader2.text
            });
            integrityCheckPassed = false;
        }

        if (retrievedHeader2.position !== testHeaders[1].position) {
            debugError('❌ Header 2 position mismatch', {
                expected: testHeaders[1].position,
                found: retrievedHeader2.position
            });
            integrityCheckPassed = false;
        }

        if (integrityCheckPassed) {
            debugSuccess('✅ Header content verified', {
                header1TextLength: retrievedHeader1.text.length,
                header2TextLength: retrievedHeader2.text.length,
                header1Position: JSON.parse(retrievedHeader1.position),
                header2Position: JSON.parse(retrievedHeader2.position)
            });
        }

        // STEP 4: Test header update operation
        debugLog('🏷️ Testing header update...');
        const updatedText = '🏷️ UPDATED - Project Launch Preparation';
        const updateResult = await window.appwriteDatabases.updateDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId1,
            { text: updatedText }
        );

        debugSuccess('✅ Header updated successfully', {
            oldText: testHeaders[0].text.substring(0, 20) + '...',
            newText: updatedText.substring(0, 20) + '...'
        });

        // STEP 5: Verify update was persisted
        const updatedHeader = await window.appwriteDatabases.getDocument(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            headerDocId1
        );

        if (updatedHeader.text !== updatedText) {
            debugError('❌ Update verification failed', {
                expected: updatedText,
                found: updatedHeader.text
            });
            integrityCheckPassed = false;
        } else {
            debugSuccess('✅ Update persistence verified');
        }

        // STEP 6: Test header querying
        debugLog('🏷️ Testing header query operations...');
        const headerQuery = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            [
                window.Appwrite.Query.orderDesc('$createdAt')
            ]
        );

        debugSuccess('✅ Header queries working', {
            totalHeaders: headerQuery.documents.length,
            expectedHeaders: 2,
            sortBy: '$createdAt DESC'
        });

        if (headerQuery.documents.length < 2) {
            debugError('❌ Header query count mismatch', {
                expected: 2,
                found: headerQuery.documents.length
            });
            integrityCheckPassed = false;
        }

        // STEP 7: Test header search/query filtering
        debugLog('🏷️ Testing header search operations...');
        const phaseHeaders = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.canvasHeaders,
            [
                window.Appwrite.Query.contains('text', 'Phase')
            ]
        );

        debugSuccess('✅ Header search filtering working', {
            phaseHeaders: phaseHeaders.documents.length,
            expectedPhaseHeaders: 1,
            searchTerm: 'Phase'
        });

        if (phaseHeaders.documents.length !== 1) {
            debugError('❌ Phase header count mismatch', {
                expected: 1,
                found: phaseHeaders.documents.length
            });
            integrityCheckPassed = false;
        }

        if (integrityCheckPassed) {
            debugSuccess('🎉 CANVAS HEADERS TEST COMPLETED SUCCESSFULLY!', {
                message: 'All canvas header operations validated',
                summary: 'Created → Retrieved → Updated → Queried → Searched'
            });

            return {
                success: true,
                message: 'Canvas headers test passed with all CRUD operations validated',
                headerId: headerDocId1,
                totalHeaders: 2,
                operations: ['Create', 'Read', 'Update', 'Query', 'Search']
            };
        } else {
            return {
                success: false,
                error: 'Canvas headers data integrity check failed',
                headerId: headerDocId1
            };
        }

    } catch (error) {
        debugError('❌ Canvas headers test failed', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Dedicated canvas drawings operations test - PROPER BOARD-BASED ARCHITECTURE
async function testCanvasDrawingsOperations() {
    debugLog('🎨 Testing canvas drawings operations using board-based architecture...');

    // Verify Appwrite services are loaded
    if (!window.appwriteDatabases || !window.authService) {
        debugError('Services not available for canvas drawings test');
        return { success: false, error: 'Services not loaded' };
    }

    // Check authentication
    const currentUser = window.authService.getCurrentUser();
    if (!currentUser) {
        debugError('Not authenticated for canvas drawings test');
        return { success: false, error: 'Not authenticated' };
    }

    // PRE-CHECKING: Make sure collections exist
    debugLog('🔍 Pre-checking collections existence...');

    try {
        // Try to query drawingPaths collection to see if it exists
        const testQuery = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            'drawingPaths',
            []
        );

        debugLog('✅ Collection "drawingPaths" exists - proceeding with test');

    } catch (error) {
        if (error.code === 404 || error.message.includes('could not be found')) {
            console.error('🚨 COLLECTION MISSING!');
            console.error('📋 TO FIX THIS ERROR:');
            console.error('   1. Open: https://sfo.cloud.appwrite.io/console');
            console.error('   2. Go to: Databases → ' + window.APPWRITE_CONFIG.databaseId);
            console.error('   3. Create collection "drawingPaths"');
            console.error('   4. Set permissions to: ["users"]');
            console.error('   5. Add attributes:');
            console.error('      - board_id (string, required, size: 36)');
            console.error('      - drawing_paths (string, required, size: 100000)');
            console.error('      - color (string, optional, size: 7)');
            console.error('   6. Save and re-run the test');
            return {
                success: false,
                error: 'Collection "drawingPaths" does not exist. Please create it first!'
            };
        }
        throw error;
    }

    try {
        const timestamp = Date.now();

        // STEP 1: Create unique test board with drawingPaths (REAL APP ARCHITECTURE)
        const uniqueBoardId = `test-drawings-board-${timestamp}-${currentUser.$id.substring(0, 6)}`;

        const testBoard = {
            id: uniqueBoardId,
            boardId: uniqueBoardId,
            name: '🎨 Drawing Test Board',
            folders: [],
            canvasHeaders: [],
            drawingPaths: [
                {
                    id: `drawing-red-test-${timestamp}`,
                    color: '#FF6B6B',
                    points: JSON.stringify([
                        { x: 150 + Math.floor(Math.random() * 50), y: 200 + Math.floor(Math.random() * 50) },
                        { x: 250 + Math.floor(Math.random() * 50), y: 220 + Math.floor(Math.random() * 50) },
                        { x: 350 + Math.floor(Math.random() * 50), y: 210 + Math.floor(Math.random() * 50) },
                        { x: 400 + Math.floor(Math.random() * 50), y: 300 + Math.floor(Math.random() * 50) }
                    ])
                },
                {
                    id: `drawing-blue-test-${timestamp}`,
                    color: '#4ECDC4',
                    points: JSON.stringify([
                        { x: 100 + Math.floor(Math.random() * 50), y: 150 + Math.floor(Math.random() * 50) },
                        { x: 200 + Math.floor(Math.random() * 50), y: 160 + Math.floor(Math.random() * 50) },
                        { x: 250 + Math.floor(Math.random() * 50), y: 180 + Math.floor(Math.random() * 50) },
                        { x: 300 + Math.floor(Math.random() * 50), y: 200 + Math.floor(Math.random() * 50) }
                    ])
                }
            ],
            isDevMode: false,
            onboardingShown: true
        };

        // STEP 2: Save board - LET SYNC SERVICE CREATE DRAWING DOCUMENTS AUTOMATICALLY
        debugLog('🎨 Saving test board (sync service will auto-create drawing documents)...');
        debugLog('Board data being saved:', {
            boardId: testBoard.id,
            drawingPathsCount: testBoard.drawingPaths.length,
            drawingPathsData: testBoard.drawingPaths
        });

        const saveResult = await window.dbService.saveBoard(testBoard);

        if (!saveResult.success) {
            debugError('❌ Failed to save test board', saveResult.error);
            return { success: false, error: 'Board save failed: ' + saveResult.error };
        }

        debugSuccess('✅ Board saved successfully - drawing documents auto-created');

        // STEP 3: Query the automatically-created drawing documents
        debugLog('🎨 Querying automatically-created drawing documents...');

        // Wait a moment for indexing (Appwrite needs time to index new documents)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Query by board_id to find all drawings for this board
        const boardDrawings = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.drawingPaths,
            [
                window.Appwrite.Query.equal('board_id', uniqueBoardId)
            ]
        );

        debugSuccess('✅ Found automatically-created drawing documents', {
            totalFound: boardDrawings.documents.length,
            expected: testBoard.drawingPaths.length,
            boardId: uniqueBoardId,
            queryUsed: 'board_id'
        });

        if (boardDrawings.documents.length !== testBoard.drawingPaths.length) {
            // DEBUG: Try alternative queries to see what's actually in the database
            debugLog('🔍 DEBUG: Checking what drawings actually exist...');
            try {
                const allDrawings = await window.appwriteDatabases.listDocuments(
                    window.APPWRITE_CONFIG.databaseId,
                    window.APPWRITE_CONFIG.collections.drawingPaths,
                    [
                        window.Appwrite.Query.orderDesc('$createdAt'),
                        window.Appwrite.Query.limit(10)
                    ]
                );

                debugLog('🕵️‍♂️ All recent drawings in database:', allDrawings.documents.map(d => ({
                    id: d.$id,
                    board_id: d.board_id,
                    color: d.color,
                    createdAt: d.$createdAt
                })));

                // Try querying without board_id filter
                const unreliableDrawings = await window.appwriteDatabases.listDocuments(
                    window.APPWRITE_CONFIG.databaseId,
                    window.APPWRITE_CONFIG.collections.drawingPaths,
                    []
                );

                debugLog('📊 Total drawings in system:', unreliableDrawings.documents.length);

            } catch (debugError) {
                debugError('❌ Debug query failed', debugError.message);
            }

            debugError('❌ Board drawing count mismatch', {
                expected: testBoard.drawingPaths.length,
                found: boardDrawings.documents.length,
                boardIdUsed: uniqueBoardId
            });
            return {
                success: false,
                error: 'Wrong number of drawings created automatically'
            };
        }

        // STEP 4: Verify each drawing has correct data
        let integrityCheckPassed = true;
        for (let i = 0; i < boardDrawings.documents.length; i++) {
            const dbDrawing = boardDrawings.documents[i];
            const expectedDrawing = testBoard.drawingPaths[i];

            debugLog(`🎨 Verifying drawing ${i + 1} data integrity...`);

            // Check color field exists
            if (dbDrawing.color !== expectedDrawing.color) {
                debugError(`❌ Drawing ${i + 1} color mismatch`, {
                    expected: expectedDrawing.color,
                    found: dbDrawing.color
                });
                integrityCheckPassed = false;
            }

            // Check drawing_paths JSON content
            const dbDrawingPaths = JSON.parse(dbDrawing.drawing_paths);
            const expectedDrawingPaths = JSON.parse(expectedDrawing.points);

            if (dbDrawingPaths.color !== expectedDrawing.color) {
                debugError(`❌ Drawing ${i + 1} JSON color mismatch`, {
                    expected: expectedDrawing.color,
                    found: dbDrawingPaths.color
                });
                integrityCheckPassed = false;
            }

            if (JSON.stringify(dbDrawingPaths.points) !== expectedDrawing.points) {
                debugError(`❌ Drawing ${i + 1} points mismatch`);
                integrityCheckPassed = false;
            }

            debugSuccess(`✅ Drawing ${i + 1} verified`, {
                id: dbDrawing.$id,
                color: dbDrawing.color,
                pointsCount: dbDrawingPaths.points.length
            });
        }

        // STEP 5: Test board-based querying (since color is now embedded in JSON)
        debugLog('🎨 Testing board-based drawing querying...');
        const boardDrawingsQuery = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.drawingPaths,
            [
                window.Appwrite.Query.equal('board_id', uniqueBoardId)
            ]
        );

        debugSuccess('✅ Board-based querying working', {
            totalDrawings: boardDrawingsQuery.documents.length,
            expected: testBoard.drawingPaths.length,
            boardId: uniqueBoardId
        });

        if (boardDrawingsQuery.documents.length !== testBoard.drawingPaths.length) {
            debugError('❌ Board drawing count mismatch', {
                expected: testBoard.drawingPaths.length,
                found: boardDrawingsQuery.documents.length
            });
            integrityCheckPassed = false;
        }

        // STEP 6: Test drawing update operation through board
        debugLog('🎨 Testing drawing update through board...');
        const updatedPoints = [
            { x: 200 + Math.floor(Math.random() * 50), y: 250 + Math.floor(Math.random() * 50) },
            { x: 300 + Math.floor(Math.random() * 50), y: 270 + Math.floor(Math.random() * 50) },
            { x: 350 + Math.floor(Math.random() * 50), y: 290 + Math.floor(Math.random() * 50) }
        ];

        const updatedBoard = { ...testBoard };
        updatedBoard.drawingPaths[0].points = JSON.stringify(updatedPoints);
        updatedBoard.updatedAt = new Date().toISOString();

        const updateResult = await window.dbService.saveBoard(updatedBoard);

        if (!updateResult.success) {
            debugError('❌ Board update failed', updateResult.error);
            return { success: false, error: 'Board update failed: ' + updateResult.error };
        }

        debugSuccess('✅ Board updated successfully');

        // STEP 7: Verify update persisted in database
        const updatedBoardDrawings = await window.appwriteDatabases.listDocuments(
            window.APPWRITE_CONFIG.databaseId,
            window.APPWRITE_CONFIG.collections.drawingPaths,
            [
                window.Appwrite.Query.equal('board_id', uniqueBoardId),
                window.Appwrite.Query.equal('color', testBoard.drawingPaths[0].color)
            ]
        );

        if (updatedBoardDrawings.documents.length === 1) {
            const updatedDrawingDoc = updatedBoardDrawings.documents[0];
            const updatedDrawingData = JSON.parse(updatedDrawingDoc.drawing_paths);

            if (JSON.stringify(updatedDrawingData.points) === JSON.stringify(updatedPoints)) {
                debugSuccess('✅ Drawing update persisted correctly');
            } else {
                debugError('❌ Drawing update not persisted correctly');
                integrityCheckPassed = false;
            }
        } else {
            debugError('❌ Could not find updated drawing for verification');
            integrityCheckPassed = false;
        }

        // STEP 8: Final success validation
        if (integrityCheckPassed) {
            debugSuccess('🎉 CANVAS DRAWINGS TEST COMPLETED SUCCESSFULLY!', {
                message: 'All drawing operations validated with proper board architecture',
                summary: 'Board Saved → Auto Created → Verified → Updated → Persisted'
            });

            return {
                success: true,
                message: 'Canvas drawings test passed with board-based architecture',
                boardId: uniqueBoardId,
                drawingsCreated: boardDrawings.documents.length,
                operations: ['Board Creation', 'Auto Document Creation', 'Data Verification', 'Update Testing']
            };
        } else {
            return {
                success: false,
                error: 'Drawing data integrity check failed',
                boardId: uniqueBoardId
            };
        }

    } catch (error) {
        debugError('❌ Canvas drawings test failed', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

// Export test functions for external use
window.testAppwriteSave = testAppwriteSave;
window.testPermissionFiltering = testPermissionFiltering;
window.testComprehensivePermissions = testComprehensivePermissions;
window.testFolderOperations = testFolderOperations;
window.testFileOperations = testFileOperations;
window.testCanvasHeadersOperations = testCanvasHeadersOperations;
window.testCanvasDrawingsOperations = testCanvasDrawingsOperations;
