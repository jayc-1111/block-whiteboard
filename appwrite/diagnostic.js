// === APPWRITE DIAGNOSTIC TOOL ===
// This script helps diagnose issues with Appwrite connectivity, authentication,
// and data storage operations. It provides detailed information and testing tools
// to identify why board data isn't saving properly.

// Create diagnostic UI
function createDiagnosticUI() {
    // Create container
    const container = document.createElement('div');
    container.id = 'appwrite-diagnostic';
    container.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 400px;
        background: #f8f9fa;
        border-left: 1px solid #dee2e6;
        padding: 20px;
        overflow-y: auto;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.innerHTML = `
        <h2 style="margin-top: 0; color: #333; display: flex; justify-content: space-between; align-items: center;">
            <span>Appwrite Diagnostics</span>
            <button id="close-diagnostic" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </h2>
        <p style="color: #666; margin-bottom: 20px;">
            This tool helps diagnose issues with saving data to Appwrite.
        </p>
    `;
    
    // Create content sections
    const sections = [
        {
            id: 'connection',
            title: 'Connection Status',
            content: `
                <div class="status-indicator" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span id="connection-status" style="width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 10px;"></span>
                    <span id="connection-text">Checking connection...</span>
                </div>
                <div class="details" id="connection-details" style="background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 15px; display: none;"></div>
                <button id="check-connection" class="action-button" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Check Connection</button>
            `
        },
        {
            id: 'auth',
            title: 'Authentication',
            content: `
                <div class="status-indicator" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span id="auth-status" style="width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 10px;"></span>
                    <span id="auth-text">Checking authentication...</span>
                </div>
                <div class="details" id="auth-details" style="background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 15px; display: none;"></div>
                <button id="check-auth" class="action-button" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Check Authentication</button>
            `
        },
        {
            id: 'database',
            title: 'Database Configuration',
            content: `
                <div class="status-indicator" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span id="database-status" style="width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 10px;"></span>
                    <span id="database-text">Checking database...</span>
                </div>
                <div class="details" id="database-details" style="background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 15px; display: none;"></div>
                <button id="check-database" class="action-button" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Check Database</button>
                <button id="setup-database" class="action-button" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Setup Database</button>
            `
        },
        {
            id: 'data',
            title: 'Data Analysis',
            content: `
                <div class="status-indicator" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span id="data-status" style="width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 10px;"></span>
                    <span id="data-text">Checking data sizes...</span>
                </div>
                <div class="details" id="data-details" style="background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 15px; display: none;"></div>
                <button id="analyze-data" class="action-button" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Analyze Current Data</button>
            `
        },
        {
            id: 'test',
            title: 'Save Test',
            content: `
                <div class="status-indicator" style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span id="test-status" style="width: 12px; height: 12px; border-radius: 50%; background: #ccc; margin-right: 10px;"></span>
                    <span id="test-text">Ready to test save</span>
                </div>
                <div class="details" id="test-details" style="background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-bottom: 15px; display: none;"></div>
                <button id="test-save" class="action-button" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Test Save</button>
                <button id="test-load" class="action-button" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;">Test Load</button>
            `
        },
        {
            id: 'logs',
            title: 'Console Logs',
            content: `
                <button id="clear-logs" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Clear Logs</button>
                <div id="console-logs" style="background: #222; color: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; height: 200px; overflow-y: auto;"></div>
            `
        }
    ];
    
    // Create sections
    const content = document.createElement('div');
    sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.style.cssText = `
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #dee2e6;
        `;
        
        sectionEl.innerHTML = `
            <h3 style="margin-top: 0; color: #444;">${section.title}</h3>
            ${section.content}
        `;
        
        content.appendChild(sectionEl);
    });
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-diagnostic';
    toggleButton.innerHTML = '🛠️ Debug';
    toggleButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;
    
    // Append elements
    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);
    document.body.appendChild(toggleButton);
    
    // Add event listeners
    toggleButton.addEventListener('click', () => {
        if (container.style.transform === 'translateX(0px)') {
            container.style.transform = 'translateX(100%)';
            toggleButton.innerHTML = '🛠️ Debug';
        } else {
            container.style.transform = 'translateX(0)';
            toggleButton.innerHTML = '❌ Close';
            runInitialChecks();
        }
    });
    
    document.getElementById('close-diagnostic').addEventListener('click', () => {
        container.style.transform = 'translateX(100%)';
        toggleButton.innerHTML = '🛠️ Debug';
    });
    
    // Action button listeners
    document.getElementById('check-connection').addEventListener('click', checkConnection);
    document.getElementById('check-auth').addEventListener('click', checkAuthentication);
    document.getElementById('check-database').addEventListener('click', checkDatabase);
    document.getElementById('setup-database').addEventListener('click', setupDatabase);
    document.getElementById('analyze-data').addEventListener('click', analyzeData);
    document.getElementById('test-save').addEventListener('click', testSave);
    document.getElementById('test-load').addEventListener('click', testLoad);
    document.getElementById('clear-logs').addEventListener('click', clearLogs);
    
    // Setup console log capture
    setupConsoleCapture();
}

// Run initial checks
function runInitialChecks() {
    checkConnection();
    checkAuthentication();
    checkDatabase();
    analyzeData();
}

// Check connection to Appwrite
async function checkConnection() {
    const statusElement = document.getElementById('connection-status');
    const textElement = document.getElementById('connection-text');
    const detailsElement = document.getElementById('connection-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Checking connection...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Testing connection to Appwrite server...';
    
    try {
        if (!window.appwriteClient) {
            throw new Error('Appwrite client not initialized');
        }
        
        // Get the endpoint from config
        const endpoint = window.APPWRITE_CONFIG?.endpoint || 'https://sfo.cloud.appwrite.io/v1';
        const projectId = window.APPWRITE_CONFIG?.projectId || '';
        
        // Check if we can ping the server
        const startTime = Date.now();
        await fetch(`${endpoint}/ping`).then(res => res.json());
        const endTime = Date.now();
        const pingTime = endTime - startTime;
        
        // Success
        statusElement.style.background = '#28a745'; // Green for success
        textElement.textContent = 'Connected to Appwrite';
        detailsElement.innerHTML = `
            <div>✅ Successfully connected to Appwrite</div>
            <div>🔗 Endpoint: ${endpoint}</div>
            <div>🏢 Project ID: ${projectId}</div>
            <div>⏱️ Ping: ${pingTime}ms</div>
        `;
        
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Connection failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to connect to Appwrite</div>
            <div>Error: ${error.message}</div>
            <div>Please check your network connection and Appwrite configuration.</div>
        `;
        
        console.error('Appwrite connection check failed:', error);
        return false;
    }
}

// Check authentication status
async function checkAuthentication() {
    const statusElement = document.getElementById('auth-status');
    const textElement = document.getElementById('auth-text');
    const detailsElement = document.getElementById('auth-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Checking authentication...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Testing authentication status...';
    
    try {
        if (!window.authService) {
            throw new Error('Auth service not initialized');
        }
        
        // Check if user is logged in
        const user = window.authService.getCurrentUser();
        
        if (!user) {
            // Not authenticated
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Not authenticated';
            detailsElement.innerHTML = `
                <div>❌ No active user session</div>
                <div>You need to log in to save data to Appwrite.</div>
                <div>Please create an account or sign in.</div>
            `;
            return false;
        }
        
        // Check if user is anonymous
        const isAnonymous = user.labels?.includes('anonymous') || false;
        
        if (isAnonymous) {
            // Anonymous user
            statusElement.style.background = '#ffc107'; // Yellow for warning
            textElement.textContent = 'Anonymous user';
            detailsElement.innerHTML = `
                <div>⚠️ Using anonymous session</div>
                <div>User ID: ${user.$id}</div>
                <div>Your data will be saved, but you won't be able to access it from other devices.</div>
                <div>Consider creating an account to fully sync your data.</div>
            `;
        } else {
            // Authenticated user
            statusElement.style.background = '#28a745'; // Green for success
            textElement.textContent = 'Authenticated';
            detailsElement.innerHTML = `
                <div>✅ Successfully authenticated</div>
                <div>User ID: ${user.$id}</div>
                <div>Email: ${user.email || 'No email'}</div>
                <div>Created: ${new Date(user.$createdAt).toLocaleString()}</div>
            `;
        }
        
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Authentication check failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to check authentication</div>
            <div>Error: ${error.message}</div>
            <div>This could indicate an issue with the authentication service.</div>
        `;
        
        console.error('Appwrite authentication check failed:', error);
        return false;
    }
}

// Check database configuration
async function checkDatabase() {
    const statusElement = document.getElementById('database-status');
    const textElement = document.getElementById('database-text');
    const detailsElement = document.getElementById('database-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Checking database...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Testing database configuration...';
    
    try {
        if (!window.appwriteDatabaseSetup) {
            throw new Error('Database setup service not initialized');
        }
        
        // Check database status
        const status = await window.appwriteDatabaseSetup.checkDatabaseStatus();
        
        if (!status.exists) {
            // Database doesn't exist
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Database not found';
            detailsElement.innerHTML = `
                <div>❌ Database not found or not accessible</div>
                <div>Error: ${status.message || status.error || 'Unknown error'}</div>
                <div>Click "Setup Database" to automatically create the required collections and attributes.</div>
            `;
            return false;
        }
        
        if (!status.complete) {
            // Database exists but is incomplete
            statusElement.style.background = '#ffc107'; // Yellow for warning
            textElement.textContent = 'Database incomplete';
            detailsElement.innerHTML = `
                <div>⚠️ Database configuration is incomplete</div>
                <div>Message: ${status.message || 'Some required attributes or collections are missing.'}</div>
                <div>Click "Setup Database" to automatically add missing attributes and collections.</div>
            `;
            return false;
        }
        
        // Database is properly configured
        statusElement.style.background = '#28a745'; // Green for success
        textElement.textContent = 'Database ready';
        detailsElement.innerHTML = `
            <div>✅ Database is properly configured</div>
            <div>All required collections and attributes are set up.</div>
            <div>Database ID: ${window.APPWRITE_CONFIG?.databaseId || 'Unknown'}</div>
        `;
        
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Database check failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to check database configuration</div>
            <div>Error: ${error.message}</div>
            <div>This could indicate an issue with the database service or permissions.</div>
        `;
        
        console.error('Appwrite database check failed:', error);
        return false;
    }
}

// Setup database
async function setupDatabase() {
    const statusElement = document.getElementById('database-status');
    const textElement = document.getElementById('database-text');
    const detailsElement = document.getElementById('database-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Setting up database...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Creating collections and attributes...';
    
    try {
        if (!window.appwriteDatabaseSetup) {
            throw new Error('Database setup service not initialized');
        }
        
        // Setup database
        const result = await window.appwriteDatabaseSetup.setupDatabase();
        
        if (!result.success) {
            // Setup failed
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Database setup failed';
            detailsElement.innerHTML = `
                <div>❌ Failed to set up database</div>
                <div>Error: ${result.error || 'Unknown error'}</div>
                <div>Please check the console for more details.</div>
            `;
            return false;
        }
        
        // Setup succeeded
        statusElement.style.background = '#28a745'; // Green for success
        textElement.textContent = 'Database setup complete';
        detailsElement.innerHTML = `
            <div>✅ Database setup completed successfully</div>
            <div>All required collections and attributes have been created.</div>
            <div>You may need to refresh the page to start using the new database configuration.</div>
        `;
        
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Database setup failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to set up database</div>
            <div>Error: ${error.message}</div>
            <div>This could indicate an issue with the database service or permissions.</div>
        `;
        
        console.error('Appwrite database setup failed:', error);
        return false;
    }
}

// Analyze data sizes
function analyzeData() {
    const statusElement = document.getElementById('data-status');
    const textElement = document.getElementById('data-text');
    const detailsElement = document.getElementById('data-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Analyzing data...';
    detailsElement.style.display = 'block';
    
    try {
        // Check if AppState exists
        if (!window.AppState) {
            throw new Error('AppState not initialized');
        }
        
        // Get current board data
        const boards = window.AppState.get('boards') || [];
        const currentBoardId = window.AppState.get('currentBoardId') || 0;
        const currentBoard = boards.find(b => b.id === currentBoardId);
        
        if (!currentBoard) {
            throw new Error('Current board not found');
        }
        
        // Analyze sizes
        const foldersStr = JSON.stringify(currentBoard.folders || []);
        const headersStr = JSON.stringify(currentBoard.canvasHeaders || []);
        const pathsStr = JSON.stringify(currentBoard.drawingPaths || []);
        
        const folderCount = currentBoard.folders?.length || 0;
        const headerCount = currentBoard.canvasHeaders?.length || 0;
        const pathCount = currentBoard.drawingPaths?.length || 0;
        
        const folderSize = foldersStr.length;
        const headerSize = headersStr.length;
        const pathSize = pathsStr.length;
        const totalSize = folderSize + headerSize + pathSize;
        
        // Check against limits
        const limits = {
            folders: 100000,
            canvasHeaders: 20000,
            drawingPaths: 100000,
            total: 220000 // Theoretical max of all attributes combined
        };
        
        const oversizedFields = [];
        if (folderSize > limits.folders) oversizedFields.push(`folders (${folderSize} > ${limits.folders})`);
        if (headerSize > limits.canvasHeaders) oversizedFields.push(`canvasHeaders (${headerSize} > ${limits.canvasHeaders})`);
        if (pathSize > limits.drawingPaths) oversizedFields.push(`drawingPaths (${pathSize} > ${limits.drawingPaths})`);
        
        // Update UI
        if (oversizedFields.length > 0) {
            // Data too large
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Data exceeds limits';
            detailsElement.innerHTML = `
                <div>❌ Data is too large for Appwrite storage</div>
                <div>Oversized fields: ${oversizedFields.join(', ')}</div>
                <div>Total size: ${formatBytes(totalSize)} / ${formatBytes(limits.total)}</div>
                <div>Consider simplifying your board or removing unused content.</div>
                <div>
                    <strong>Detailed sizes:</strong>
                    <ul style="margin-top: 5px;">
                        <li>Folders: ${formatBytes(folderSize)} / ${formatBytes(limits.folders)} (${folderCount} folders)</li>
                        <li>Headers: ${formatBytes(headerSize)} / ${formatBytes(limits.canvasHeaders)} (${headerCount} headers)</li>
                        <li>Drawings: ${formatBytes(pathSize)} / ${formatBytes(limits.drawingPaths)} (${pathCount} paths)</li>
                    </ul>
                </div>
            `;
        } else if (totalSize > limits.total * 0.8) {
            // Close to limits
            statusElement.style.background = '#ffc107'; // Yellow for warning
            textElement.textContent = 'Data approaching limits';
            detailsElement.innerHTML = `
                <div>⚠️ Data is approaching Appwrite storage limits</div>
                <div>Total size: ${formatBytes(totalSize)} / ${formatBytes(limits.total)} (${Math.round(totalSize / limits.total * 100)}%)</div>
                <div>Consider simplifying your board before it exceeds limits.</div>
                <div>
                    <strong>Detailed sizes:</strong>
                    <ul style="margin-top: 5px;">
                        <li>Folders: ${formatBytes(folderSize)} / ${formatBytes(limits.folders)} (${folderCount} folders)</li>
                        <li>Headers: ${formatBytes(headerSize)} / ${formatBytes(limits.canvasHeaders)} (${headerCount} headers)</li>
                        <li>Drawings: ${formatBytes(pathSize)} / ${formatBytes(limits.drawingPaths)} (${pathCount} paths)</li>
                    </ul>
                </div>
            `;
        } else {
            // Data within limits
            statusElement.style.background = '#28a745'; // Green for success
            textElement.textContent = 'Data within limits';
            detailsElement.innerHTML = `
                <div>✅ Data is within Appwrite storage limits</div>
                <div>Total size: ${formatBytes(totalSize)} / ${formatBytes(limits.total)} (${Math.round(totalSize / limits.total * 100)}%)</div>
                <div>
                    <strong>Detailed sizes:</strong>
                    <ul style="margin-top: 5px;">
                        <li>Folders: ${formatBytes(folderSize)} / ${formatBytes(limits.folders)} (${folderCount} folders)</li>
                        <li>Headers: ${formatBytes(headerSize)} / ${formatBytes(limits.canvasHeaders)} (${headerCount} headers)</li>
                        <li>Drawings: ${formatBytes(pathSize)} / ${formatBytes(limits.drawingPaths)} (${pathCount} paths)</li>
                    </ul>
                </div>
            `;
        }
        
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Data analysis failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to analyze data</div>
            <div>Error: ${error.message}</div>
            <div>This could indicate an issue with the data structure or AppState.</div>
        `;
        
        console.error('Data analysis failed:', error);
        return false;
    }
}

// Test saving to Appwrite
async function testSave() {
    const statusElement = document.getElementById('test-status');
    const textElement = document.getElementById('test-text');
    const detailsElement = document.getElementById('test-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Testing save...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Attempting to save test data to Appwrite...';
    
    try {
        // Create a simple test object
        const testData = {
            id: 999, // Use a special ID that won't conflict with real boards
            name: 'Diagnostic Test Board',
            folders: [
                {
                    title: 'Test Folder',
                    position: { left: '100px', top: '100px' },
                    files: [
                        {
                            title: 'Test File',
                            content: 'This is a test file created by the diagnostic tool.',
                            bookmarks: []
                        }
                    ]
                }
            ],
            canvasHeaders: [
                {
                    text: 'Test Header',
                    position: { left: '200px', top: '50px' }
                }
            ],
            drawingPaths: [],
            isDevMode: false,
            onboardingShown: true
        };
        
        // Check if dbService exists
        if (!window.dbService) {
            throw new Error('Database service not initialized');
        }
        
        // Attempt to save
        const startTime = Date.now();
        const result = await window.dbService.saveBoard(testData);
        const endTime = Date.now();
        const saveTime = endTime - startTime;
        
        if (!result.success) {
            // Save failed
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Save test failed';
            detailsElement.innerHTML = `
                <div>❌ Failed to save test data</div>
                <div>Error: ${result.error || 'Unknown error'}</div>
                <div>Code: ${result.code || 'N/A'}</div>
                <div>This indicates a problem with saving to Appwrite.</div>
                <div>Check the authentication and database sections above for more details.</div>
            `;
            
            console.error('Save test failed:', result);
            return false;
        }
        
        // Save succeeded
        statusElement.style.background = '#28a745'; // Green for success
        textElement.textContent = 'Save test successful';
        detailsElement.innerHTML = `
            <div>✅ Successfully saved test data to Appwrite</div>
            <div>Time taken: ${saveTime}ms</div>
            <div>Board ID: ${testData.id}</div>
            <div>Result: ${JSON.stringify(result, null, 2)}</div>
        `;
        
        console.log('Save test successful:', result);
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Save test failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to save test data</div>
            <div>Error: ${error.message}</div>
            <div>Stack: ${error.stack}</div>
            <div>This indicates a problem with the save operation.</div>
        `;
        
        console.error('Save test failed:', error);
        return false;
    }
}

// Test loading from Appwrite
async function testLoad() {
    const statusElement = document.getElementById('test-status');
    const textElement = document.getElementById('test-text');
    const detailsElement = document.getElementById('test-details');
    
    statusElement.style.background = '#ffc107'; // Yellow for checking
    textElement.textContent = 'Testing load...';
    detailsElement.style.display = 'block';
    detailsElement.innerHTML = 'Attempting to load test data from Appwrite...';
    
    try {
        // Check if dbService exists
        if (!window.dbService) {
            throw new Error('Database service not initialized');
        }
        
        // Attempt to load test board
        const startTime = Date.now();
        const result = await window.dbService.loadBoard(999); // Use the same special ID from testSave
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        if (!result.success) {
            // Load failed
            statusElement.style.background = '#dc3545'; // Red for failure
            textElement.textContent = 'Load test failed';
            detailsElement.innerHTML = `
                <div>❌ Failed to load test data</div>
                <div>Error: ${result.error || 'Unknown error'}</div>
                <div>This could indicate a problem with reading from Appwrite.</div>
                <div>If you haven't run the save test yet, run it first.</div>
            `;
            
            console.error('Load test failed:', result);
            return false;
        }
        
        // Load succeeded
        statusElement.style.background = '#28a745'; // Green for success
        textElement.textContent = 'Load test successful';
        detailsElement.innerHTML = `
            <div>✅ Successfully loaded test data from Appwrite</div>
            <div>Time taken: ${loadTime}ms</div>
            <div>Board name: ${result.board.name}</div>
            <div>Board folders: ${result.board.folders.length}</div>
        `;
        
        console.log('Load test successful:', result);
        return true;
    } catch (error) {
        // Failure
        statusElement.style.background = '#dc3545'; // Red for failure
        textElement.textContent = 'Load test failed';
        detailsElement.innerHTML = `
            <div>❌ Failed to load test data</div>
            <div>Error: ${error.message}</div>
            <div>Stack: ${error.stack}</div>
            <div>This indicates a problem with the load operation.</div>
        `;
        
        console.error('Load test failed:', error);
        return false;
    }
}

// Setup console log capture
function setupConsoleCapture() {
    const consoleLogsElement = document.getElementById('console-logs');
    if (!consoleLogsElement) return;
    
    // Store original console methods
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info
    };
    
    // Function to format and add log to UI
    const addLogToUI = (type, args) => {
        // Convert args to string
        const message = Array.from(args).map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        // Create log element
        const logElement = document.createElement('div');
        logElement.style.marginBottom = '5px';
        
        // Set color based on type
        let color = '#fff';
        let prefix = '';
        switch (type) {
            case 'error':
                color = '#f8d7da';
                prefix = '🔴 ERROR: ';
                break;
            case 'warn':
                color = '#fff3cd';
                prefix = '⚠️ WARNING: ';
                break;
            case 'info':
                color = '#d1ecf1';
                prefix = 'ℹ️ INFO: ';
                break;
            default:
                color = '#d4edda';
                prefix = '📝 LOG: ';
        }
        
        // Only capture Appwrite-related logs
        if (!message.includes('APPWRITE') && !message.includes('Appwrite') && !message.includes('appwrite')) {
            return;
        }
        
        logElement.style.color = color;
        logElement.textContent = `${prefix}${message}`;
        
        // Add log to UI
        consoleLogsElement.appendChild(logElement);
        
        // Scroll to bottom
        consoleLogsElement.scrollTop = consoleLogsElement.scrollHeight;
    };
    
    // Override console methods
    console.log = function() {
        originalConsole.log.apply(console, arguments);
        addLogToUI('log', arguments);
    };
    
    console.warn = function() {
        originalConsole.warn.apply(console, arguments);
        addLogToUI('warn', arguments);
    };
    
    console.error = function() {
        originalConsole.error.apply(console, arguments);
        addLogToUI('error', arguments);
    };
    
    console.info = function() {
        originalConsole.info.apply(console, arguments);
        addLogToUI('info', arguments);
    };
}

// Clear console logs
function clearLogs() {
    const consoleLogsElement = document.getElementById('console-logs');
    if (consoleLogsElement) {
        consoleLogsElement.innerHTML = '';
    }
}

// Format bytes to human-readable string
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initialize diagnostic UI when DOM is ready
function initDiagnostic() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createDiagnosticUI);
    } else {
        createDiagnosticUI();
    }
}

// Auto-initialize if loaded in browser
if (typeof window !== 'undefined') {
    initDiagnostic();
}

// Make diagnostic functions globally available
window.appwriteDiagnostic = {
    init: initDiagnostic,
    checkConnection,
    checkAuthentication,
    checkDatabase,
    setupDatabase,
    analyzeData,
    testSave,
    testLoad
};
