/**
 * Appwrite Setup Service (Consolidated)
 *
 * This consolidated service replaces multiple files:
 * - diagnostic.js (diagnostic UI)
 * - fixes.js (database fixes and patches)
 * - file-content-helper.js (content compression)
 *
 * Features:
 * - Database setup and validation
 * - Function patching for enhanced logging
 * - Content compression and size management
 * - Diagnostic UI and testing tools
 * - Document creation helpers
 * - Status monitoring and health checks
 */

// ====================
// CONFIGURATION
// ====================
const SETUP_CONFIG = {
    // Database limits
    limits: {
        folders: 100000, // 100KB
        canvasHeaders: 20000, // 20KB
        drawingPaths: 100000, // 100KB
        total: 220000 // 220KB theoretical max
    },

    // Compression settings
    compression: {
        enabled: true,
        maxSize: 50000,
        truncationMessage: '\n\n[Content truncated due to size limitations. Original size: __SIZE__ chars]'
    },

    // Diagnostic UI settings
    ui: {
        theme: {
            background: '#f8f9fa',
            border: '#dee2e6',
            textLight: '#666',
            textDark: '#333',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8',
            primary: '#007bff',
            secondary: '#6c757d'
        },
        dimensions: {
            panelWidth: '400px',
            headerHeight: '50px',
            logsHeight: '200px'
        }
    }
};

// ====================
// DEBUG UTILITIES
// ====================

const debugSetup = {
    info: (msg, data) => console.log(`🔷 APPWRITE_SETUP: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ APPWRITE_SETUP ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ APPWRITE_SETUP: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 APPWRITE_SETUP: ${msg}`),
    detail: (msg, data) => console.log(`📋 APPWRITE_SETUP: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 APPWRITE_SETUP: ${msg}`),
    done: (msg) => console.log(`✅ APPWRITE_SETUP: ${msg || 'Operation completed'}`)
};

// ====================
// DIAGNOSTIC UI
// ====================

/**
 * Create diagnostic UI
 */
function createDiagnosticUI() {
    // Create container
    const container = document.createElement('div');
    container.id = 'appwrite-diagnostic';
    container.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: ${SETUP_CONFIG.ui.dimensions.panelWidth};
        background: ${SETUP_CONFIG.ui.theme.background};
        border-left: 1px solid ${SETUP_CONFIG.ui.theme.border};
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
        <h2 style="margin-top: 0; color: ${SETUP_CONFIG.ui.theme.textDark}; display: flex; justify-content: space-between; align-items: center;">
            <span>Appwrite Diagnostics</span>
            <button id="close-diagnostic" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </h2>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button id="run-diagnostics" style="flex: 1; padding: 8px; background: ${SETUP_CONFIG.ui.theme.primary}; color: white; border: none; border-radius: 4px; cursor: pointer;">Run Diagnostics</button>
            <button id="toggle-theme" style="flex: 1; padding: 8px; background: ${SETUP_CONFIG.ui.theme.secondary}; color: white; border: none; border-radius: 4px; cursor: pointer;">Toggle Theme</button>
        </div>
    `;
    container.appendChild(header);

    // Create content area
    const content = document.createElement('div');
    content.style.marginTop = '20px';

    // Create status section
    const statusSection = document.createElement('div');
    statusSection.innerHTML = `
        <h3 style="color: ${SETUP_CONFIG.ui.theme.textDark}; margin-bottom: 10px;">System Status</h3>
        <div id="system-status" style="font-family: monospace; font-size: 12px; line-height: 1.5;">
            <div style="color: ${SETUP_CONFIG.ui.theme.info};">Checking status...</div>
        </div>
    `;
    content.appendChild(statusSection);

    // Create logs section
    const logsSection = document.createElement('div');
    logsSection.innerHTML = `
        <h3 style="color: ${SETUP_CONFIG.ui.theme.textDark}; margin-bottom: 10px;">Recent Logs</h3>
        <div id="logs-container" style="height: ${SETUP_CONFIG.ui.dimensions.logsHeight}; overflow-y: auto; background: ${SETUP_CONFIG.ui.theme.background}; border: 1px solid ${SETUP_CONFIG.ui.theme.border}; padding: 10px; font-family: monospace; font-size: 12px; line-height: 1.4;">
            <div style="color: ${SETUP_CONFIG.ui.theme.info};">No logs yet...</div>
        </div>
    `;
    content.appendChild(logsSection);

    container.appendChild(content);

    // Add to body
    document.body.appendChild(container);

    // Add event listeners
    document.getElementById('close-diagnostic').addEventListener('click', () => {
        container.style.transform = 'translateX(100%)';
        debugSetup.info('Diagnostic UI closed');
    });

    document.getElementById('run-diagnostics').addEventListener('click', runDiagnostics);
    document.getElementById('toggle-theme').addEventListener('click', toggleTheme);

    // Store logs in array for display
    window.appwriteDiagnosticLogs = [];

    // Store refs for other functions
    window.appwriteDiagnosticRefs = {
        container: container,
        status: document.getElementById('system-status'),
        logs: document.getElementById('logs-container')
    };

    // Log creation using proper debugSetup method
    debugSetup.info('Diagnostic UI created');
}

/**
 * Run diagnostics
 */
function runDiagnostics() {
    const status = window.appwriteDiagnosticRefs.status;
    const logs = window.appwriteDiagnosticRefs.logs;
    
    status.innerHTML = '<div style="color: ' + SETUP_CONFIG.ui.theme.info + ';">Running diagnostics...</div>';
    
    const results = [];
    
    // Check Appwrite SDK
    if (typeof Appwrite !== 'undefined') {
        results.push({ check: 'Appwrite SDK', status: '✅ OK', message: 'SDK loaded' });
    } else {
        results.push({ check: 'Appwrite SDK', status: '❌ FAIL', message: 'SDK not loaded' });
    }
    
    // Check Appwrite config
    if (window.APPWRITE_CONFIG) {
        results.push({ check: 'Appwrite Config', status: '✅ OK', message: 'Configuration loaded' });
        
        // Check database IDs
        if (window.APPWRITE_CONFIG.databases && window.APPWRITE_CONFIG.databases.main) {
            results.push({ check: 'Main Database ID', status: '✅ OK', message: window.APPWRITE_CONFIG.databases.main });
        } else {
            results.push({ check: 'Main Database ID', status: '❌ FAIL', message: 'Database ID not found' });
        }
        
        if (window.APPWRITE_CONFIG.databases && window.APPWRITE_CONFIG.databases.main2) {
            results.push({ check: 'Main2 Database ID', status: '✅ OK', message: window.APPWRITE_CONFIG.databases.main2 });
        } else {
            results.push({ check: 'Main2 Database ID', status: '❌ FAIL', message: 'Database ID not found' });
        }
    } else {
        results.push({ check: 'Appwrite Config', status: '❌ FAIL', message: 'Configuration not loaded' });
    }
    
    // Check database services
    if (window.appwriteDatabases) {
        results.push({ check: 'Database Services', status: '✅ OK', message: 'Services initialized' });
    } else {
        results.push({ check: 'Database Services', status: '❌ FAIL', message: 'Services not initialized' });
    }
    
    // Check account service
    if (window.appwriteAccount) {
        results.push({ check: 'Account Service', status: '✅ OK', message: 'Service initialized' });
    } else {
        results.push({ check: 'Account Service', status: '❌ FAIL', message: 'Service not initialized' });
    }
    
    // Display results
    status.innerHTML = results.map(result => {
        const color = result.status === '✅ OK' ? SETUP_CONFIG.ui.theme.success : SETUP_CONFIG.ui.theme.error;
        return `<div style="color: ${color};">${result.status} ${result.check}: ${result.message}</div>`;
    }).join('');
    
    // Log results
    results.forEach(result => {
        const logMessage = `${result.status} ${result.check}: ${result.message}`;
        window.appwriteDiagnosticLogs.push(logMessage);
        addLogToDiagnostic(logMessage, result.status === '✅ OK' ? 'info' : 'error');
    });
    
    debugSetup.info('Diagnostics completed', results);
}

/**
 * Add log to diagnostic panel
 */
function addLogToDiagnostic(message, type = 'info') {
    const logs = window.appwriteDiagnosticRefs.logs;
    const timestamp = new Date().toLocaleTimeString();
    let color = SETUP_CONFIG.ui.theme.info;
    
    if (type === 'error') color = SETUP_CONFIG.ui.theme.error;
    else if (type === 'warn') color = SETUP_CONFIG.ui.theme.warning;
    else if (type === 'success') color = SETUP_CONFIG.ui.theme.success;
    
    const logEntry = document.createElement('div');
    logEntry.style.color = color;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    logs.appendChild(logEntry);
    logs.scrollTop = logs.scrollHeight;
}

/**
 * Toggle theme
 */
function toggleTheme() {
    const container = window.appwriteDiagnosticRefs.container;
    const isDark = container.style.background && container.style.background.includes('#2d3748');
    
    if (isDark) {
        container.style.background = SETUP_CONFIG.ui.theme.background;
        container.style.color = SETUP_CONFIG.ui.theme.textDark;
        container.querySelector('h2').style.color = SETUP_CONFIG.ui.theme.textDark;
        container.querySelector('h3').style.color = SETUP_CONFIG.ui.theme.textDark;
        debugSetup.info('Theme switched to light');
    } else {
        container.style.background = '#2d3748';
        container.style.color = '#e2e8f0';
        container.querySelector('h2').style.color = '#e2e8f0';
        container.querySelector('h3').style.color = '#e2e8f0';
        debugSetup.info('Theme switched to dark');
    }
}

// ====================
// APPWRITE SETUP
// ====================

/**
 * Initialize Appwrite setup service
 */
function initializeAppwriteSetup() {
    debugSetup.start('Initializing Appwrite Setup Service');
    
    try {
        // Check if Appwrite is ready
        if (!isAppwriteReady()) {
            debugSetup.warn('Appwrite not ready, waiting...');
            setTimeout(initializeAppwriteSetup, 1000);
            return;
        }
        
        // Create diagnostic UI (optional)
        if (document.getElementById('appwrite-diagnostic') === null) {
            createDiagnosticUI();
            
            // Add diagnostic toggle button
            const diagnosticBtn = document.createElement('button');
            diagnosticBtn.innerHTML = '🔍';
            diagnosticBtn.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${SETUP_CONFIG.ui.theme.primary};
                color: white;
                border: none;
                cursor: pointer;
                font-size: 16px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                transition: all 0.3s ease;
            `;
            diagnosticBtn.addEventListener('click', () => {
                const diagnostic = document.getElementById('appwrite-diagnostic');
                if (diagnostic) {
                    const isVisible = diagnostic.style.transform === 'translateX(0px)';
                    diagnostic.style.transform = isVisible ? 'translateX(100%)' : 'translateX(0px)';
                }
            });
            diagnosticBtn.addEventListener('mouseenter', () => {
                diagnosticBtn.style.transform = 'scale(1.1)';
            });
            diagnosticBtn.addEventListener('mouseleave', () => {
                diagnosticBtn.style.transform = 'scale(1)';
            });
            document.body.appendChild(diagnosticBtn);
            
            // Log creation using proper debugSetup method
            debugSetup.info('Diagnostic UI created');
        }
        
        // Ensure Appwrite setup
        ensureAppwriteSetup().then(result => {
            if (result.success) {
                debugSetup.done('Appwrite setup completed successfully');
                
                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('AppwriteSetupReady', {
                    detail: {
                        services: result.services,
                        status: 'ready'
                    }
                }));
            } else {
                debugSetup.error('Appwrite setup failed', result.error);
            }
        });
        
    } catch (error) {
        debugSetup.error('Failed to initialize Appwrite setup', error);
    }
}

/**
 * Check if Appwrite is ready
 */
function isAppwriteReady() {
    return typeof Appwrite !== 'undefined' && 
           window.APPWRITE_CONFIG && 
           window.appwriteDatabases && 
           window.appwriteAccount;
}

/**
 * Ensure Appwrite setup is complete
 */
async function ensureAppwriteSetup() {
    debugSetup.start('Ensuring Appwrite setup is complete');
    
    try {
        // Check if already set up
        if (window.appwriteSetupComplete) {
            debugSetup.info('Appwrite setup already complete');
            return { success: true, services: 'already_initialized' };
        }
        
        // Verify database configuration
        const dbConfig = window.APPWRITE_CONFIG?.databases;
        if (!dbConfig) {
            throw new Error('Database configuration not found');
        }
        
        debugSetup.detail('Database configuration', dbConfig);
        
    // Check database connection
    try {
        const databasesMain = window.appwriteDatabasesMain;
        await databasesMain.listDocuments(
            dbConfig.main,
            'boards',
            [Appwrite.Query.limit(1)]
        );
        debugSetup.info('Database connection verified');
    } catch (dbError) {
        debugSetup.warn('Database connection check failed', dbError.message);
        // Don't throw here, let the app continue
    }
        
        // Set up enhanced logging
        setupEnhancedLogging();
        
        // Mark as complete
        window.appwriteSetupComplete = true;
        
        return { 
            success: true, 
            services: {
                databases: window.appwriteDatabases,
                account: window.appwriteAccount,
                config: window.APPWRITE_CONFIG,
                diagnosticPanelAvailable: document.getElementById('appwrite-diagnostic')?.style.transform === 'translateX(0px)',
                contentHelperAvailable: true
            }
        };
        
    } catch (error) {
        debugSetup.error('Failed to ensure Appwrite setup', error);
        return { success: false, error: error.message };
    }
}

/**
 * Set up enhanced logging
 */
function setupEnhancedLogging() {
    debugSetup.step('Setting up enhanced logging');
    
    // Patch console methods to include timestamps
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = function(...args) {
        const timestamp = new Date().toISOString();
        originalLog(`[${timestamp}]`, ...args);
        if (window.appwriteDiagnosticLogs) {
            window.appwriteDiagnosticLogs.push(`[${timestamp}] LOG: ${args.join(' ')}`);
            addLogToDiagnostic(`LOG: ${args.join(' ')}`, 'info');
        }
    };
    
    console.warn = function(...args) {
        const timestamp = new Date().toISOString();
        originalWarn(`[${timestamp}]`, ...args);
        if (window.appwriteDiagnosticLogs) {
            window.appwriteDiagnosticLogs.push(`[${timestamp}] WARN: ${args.join(' ')}`);
            addLogToDiagnostic(`WARN: ${args.join(' ')}`, 'warn');
        }
    };
    
    console.error = function(...args) {
        const timestamp = new Date().toISOString();
        originalError(`[${timestamp}]`, ...args);
        if (window.appwriteDiagnosticLogs) {
            window.appwriteDiagnosticLogs.push(`[${timestamp}] ERROR: ${args.join(' ')}`);
            addLogToDiagnostic(`ERROR: ${args.join(' ')}`, 'error');
        }
    };
    
    debugSetup.done('Enhanced logging setup complete');
}

// ====================
// CONTENT HELPER
// ====================

/**
 * Compress content to fit size limits
 */
function compressContent(content, maxLength = SETUP_CONFIG.compression.maxSize) {
    if (!content || content.length <= maxLength) {
        return content;
    }
    
    const truncatedLength = maxLength - SETUP_CONFIG.compression.truncationMessage.length;
    const truncated = content.substring(0, truncatedLength);
    
    return truncated + SETUP_CONFIG.compression.truncationMessage
        .replace('__SIZE__', content.length.toString());
}

/**
 * Estimate board size
 */
function estimateBoardSize(folders, canvasHeaders, drawingPaths) {
    const foldersSize = JSON.stringify(folders || {}).length;
    const headersSize = JSON.stringify(canvasHeaders || {}).length;
    const pathsSize = JSON.stringify(drawingPaths || {}).length;
    
    return {
        total: foldersSize + headersSize + pathsSize,
        folders: foldersSize,
        headers: headersSize,
        paths: pathsSize,
        status: foldersSize + headersSize + pathsSize > SETUP_CONFIG.limits.total ? 'warning' : 'ok'
    };
}

/**
 * Safe JSON parse
 */
function safeParseJSON(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        debugSetup.warn('Failed to parse JSON', error.message);
        return defaultValue;
    }
}

// ====================
// DOCUMENT CREATION HELPERS
// ====================

/**
 * Create safe document function
 */
function createSafeDocumentFunction() {
    return function createDocument(collectionName, documentData, board_id) {
        if (!window.appwriteDatabases) {
            throw new Error('Appwrite databases not initialized');
        }
        
        if (!window.APPWRITE_CONFIG?.databases?.main) {
            throw new Error('Database configuration not available');
        }
        
        const databaseId = window.APPWRITE_CONFIG.databases.main;
        const collectionId = collectionName;
        
        try {
            return window.appwriteDatabases.createDocument(
                databaseId,
                collectionId,
                documentData.id || Appwrite.ID.unique(),
                documentData,
                ['write'] // Default permissions
            );
        } catch (error) {
            debugSetup.error('Failed to create document', error);
            throw error;
        }
    };
}

/**
 * Check database status
 */
async function checkDatabase() {
    debugSetup.step('Checking database status');
    
    try {
        if (!window.appwriteDatabases || !window.APPWRITE_CONFIG?.databases?.main) {
            return { 
                status: 'error', 
                message: 'Database services not initialized',
                services: {
                    databases: !!window.appwriteDatabases,
                    config: !!window.APPWRITE_CONFIG,
                    mainDbId: window.APPWRITE_CONFIG?.databases?.main
                }
            };
        }
        
        const dbId = window.APPWRITE_CONFIG.databases.main;
        
        // Try to list boards to verify connection
        const databasesMain = window.appwriteDatabasesMain;
        const result = await databasesMain.listDocuments(
            dbId,
            'boards',
            [Appwrite.Query.limit(1)]
        );
        
        return { 
            status: 'connected', 
            message: 'Database connection verified',
            boardCount: result.total,
            databaseId: dbId
        };
        
    } catch (error) {
        debugSetup.error('Database check failed', error);
        return { 
            status: 'error', 
            message: error.message,
            error: error
        };
    }
}

/**
 * Create section helper
 */
function createSection(title, content) {
    const section = document.createElement('div');
    section.style.marginBottom = '20px';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.color = SETUP_CONFIG.ui.theme.textDark;
    titleEl.style.marginBottom = '10px';
    
    const contentEl = document.createElement('div');
    contentEl.innerHTML = content;
    
    section.appendChild(titleEl);
    section.appendChild(contentEl);
    
    return section;
}

// ====================
// GLOBALS & AUTO-INIT
// ====================

window.appwriteSetup = {
    initialize: initializeAppwriteSetup,
    checkDatabase: checkDatabase,
    compressContent: compressContent,
    estimateBoardSize: estimateBoardSize,
    safeParseJSON: safeParseJSON,
    createSafeDocument: createSafeDocumentFunction()
};

window.safeCreateDocument = createSafeDocumentFunction();

window.appwriteContentHelper = {
    compressContent,
    estimateBoardSize,
    safeParseJSON
};

// Auto-initialize
if (document.readyState === 'complete') {
    initializeAppwriteSetup();
} else {
    window.addEventListener('DOMContentLoaded', initializeAppwriteSetup);
}

// Listen for Appwrite Ready event
window.addEventListener('AppwriteReady', () => {
    debugSetup.info('Appwrite services ready - initializing setup');
    setTimeout(initializeAppwriteSetup, 1000);
});

debugSetup.info('Appwrite setup service module loaded');
