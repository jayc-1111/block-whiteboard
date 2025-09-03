// === APPWRITE INTEGRATION SERVICE ===
// This service integrates the database setup with the main application
// and provides easy-to-use functions for database initialization and management.

import { databaseSetup } from './database-setup.js';
import { authService } from './appwrite-config.js';

// Integration Service
const appwriteIntegration = {
    
    // Initialize database on app startup
    async initializeDatabase() {
        try {
            console.log('🔧 Initializing Appwrite integration...');
            
            // Check if user is authenticated
            const user = await authService.getCurrentUser();
            if (!user) {
                console.log('🔧 No authenticated user found, skipping database initialization');
                return { success: false, message: 'No authenticated user' };
            }
            
            // Run quick setup (users and boards only for faster startup)
            const setupResult = await databaseSetup.quickSetup();
            
            if (setupResult.success) {
                console.log('✅ Appwrite database initialized successfully');
                return { success: true, result: setupResult };
            } else {
                console.warn('⚠️ Some collections failed to initialize:', setupResult);
                return { success: true, partial: true, result: setupResult };
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize Appwrite database:', error);
            return { success: false, error: error.message };
        }
    },

    // Check database status and show warnings if needed
    async checkDatabaseStatus() {
        try {
            console.log('🔍 Checking Appwrite database status...');
            
            const status = await databaseSetup.checkCollectionStatus();
            if (!status.success) {
                return { success: false, error: status.error };
            }
            
            // Check for missing essential collections
            const essentialCollections = ['users', 'boards'];
            const missingEssentials = essentialCollections.filter(name => !status.status[name]?.exists);
            
            if (missingEssentials.length > 0) {
                console.warn(`⚠️ Missing essential collections: ${missingEssentials.join(', ')}`);
                return { 
                    success: false, 
                    message: 'Missing essential collections',
                    missing: missingEssentials,
                    status: status.status 
                };
            }
            
            console.log('✅ All essential collections are present');
            return { success: true, status: status.status };
            
        } catch (error) {
            console.error('❌ Failed to check database status:', error);
            return { success: false, error: error.message };
        }
    },

    // Setup database with user consent
    async setupDatabaseWithConsent() {
        try {
            // Check current status
            const currentStatus = await this.checkDatabaseStatus();
            
            if (currentStatus.success) {
                console.log('✅ Database is already set up');
                return currentStatus;
            }
            
            // Show setup prompt if missing collections
            if (currentStatus.missing && currentStatus.missing.length > 0) {
                console.log(`🔧 Setting up missing collections: ${currentStatus.missing.join(', ')}`);
                
                // Run full setup
                const setupResult = await databaseSetup.setupCollections();
                
                if (setupResult.success) {
                    console.log('✅ Database setup completed successfully');
                    return { success: true, result: setupResult };
                } else {
                    console.warn('⚠️ Some collections failed to setup:', setupResult);
                    return { success: true, partial: true, result: setupResult };
                }
            }
            
            return currentStatus;
            
        } catch (error) {
            console.error('❌ Failed to setup database with consent:', error);
            return { success: false, error: error.message };
        }
    },

    // Auto-setup on app initialization (with error handling)
    async autoSetup() {
        try {
            console.log('🚀 Starting auto-setup for Appwrite database...');
            
            // Check if database is already initialized
            const status = await this.checkDatabaseStatus();
            if (status.success) {
                console.log('✅ Database already initialized, skipping setup');
                return status;
            }
            
            // Initialize database
            const result = await this.initializeDatabase();
            
            if (result.success) {
                console.log('✅ Auto-setup completed successfully');
                return result;
            } else {
                console.error('❌ Auto-setup failed:', result.error);
                return result;
            }
            
        } catch (error) {
            console.error('❌ Auto-setup encountered error:', error);
            return { success: false, error: error.message };
        }
    },

    // Manual database management functions
    async manageDatabase() {
        try {
            console.log('🛠️ Opening database management interface...');
            
            // Create a simple management interface
            const managementDiv = document.createElement('div');
            managementDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                max-width: 400px;
            `;
            
            managementDiv.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">Appwrite Database Management</h3>
                <div id="db-status" style="margin-bottom: 15px; color: #666;">Checking status...</div>
                <button id="check-status-btn" style="margin-right: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Check Status</button>
                <button id="quick-setup-btn" style="margin-right: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Quick Setup</button>
                <button id="full-setup-btn" style="margin-right: 10px; padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">Full Setup</button>
                <button id="close-btn" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            `;
            
            // Add to document
            document.body.appendChild(managementDiv);
            
            // Close button
            document.getElementById('close-btn').addEventListener('click', () => {
                document.body.removeChild(managementDiv);
            });
            
            // Status button
            document.getElementById('check-status-btn').addEventListener('click', async () => {
                const statusResult = await this.checkDatabaseStatus();
                this.updateStatusDisplay(managementDiv, statusResult);
            });
            
            // Quick setup button
            document.getElementById('quick-setup-btn').addEventListener('click', async () => {
                const setupResult = await databaseSetup.quickSetup();
                this.updateStatusDisplay(managementDiv, setupResult);
            });
            
            // Full setup button
            document.getElementById('full-setup-btn').addEventListener('click', async () => {
                const setupResult = await databaseSetup.setupCollections();
                this.updateStatusDisplay(managementDiv, setupResult);
            });
            
            // Initial status check
            const statusResult = await this.checkDatabaseStatus();
            this.updateStatusDisplay(managementDiv, statusResult);
            
            return { success: true, message: 'Database management interface created' };
            
        } catch (error) {
            console.error('❌ Failed to create database management interface:', error);
            return { success: false, error: error.message };
        }
    },

    // Update status display in management interface
    updateStatusDisplay(container, result) {
        const statusDiv = container.querySelector('#db-status');
        
        if (result.success) {
            let message = '✅ Database is healthy';
            
            if (result.partial) {
                message = '⚠️ Partial setup - some collections may be missing';
            } else if (result.missing && result.missing.length > 0) {
                message = `❌ Missing collections: ${result.missing.join(', ')}`;
            } else if (result.result && result.result.summary) {
                const summary = result.result.summary;
                message = `✅ Setup completed (${summary.successful}/${summary.total} collections)`;
            }
            
            statusDiv.innerHTML = `<span style="color: #28a745;">${message}</span>`;
        } else {
            statusDiv.innerHTML = `<span style="color: #dc3545;">❌ Error: ${result.error || 'Unknown error'}</span>`;
        }
    },

    // Development utilities
    devUtils: {
        // Setup development environment
        async setupDev() {
            console.log('🔧 Setting up development environment...');
            
            try {
                // Run full setup
                const setupResult = await databaseSetup.setupCollections();
                
                // Create sample data if needed
                if (setupResult.success) {
                    await this.createSampleData();
                }
                
                return setupResult;
            } catch (error) {
                console.error('❌ Dev setup failed:', error);
                return { success: false, error: error.message };
            }
        },

        // Create sample data for testing
        async createSampleData() {
            console.log('📝 Creating sample data...');
            
            try {
                const user = await authService.getCurrentUser();
                if (!user) {
                    console.log('No user authenticated, skipping sample data creation');
                    return;
                }

                // Create a sample board
                const sampleBoard = {
                    boardId: 'sample-board-' + Date.now(),
                    userId: user.$id,
                    name: 'Sample Board',
                    folders: [{
                        title: 'Sample Folder',
                        position: { left: '100px', top: '100px' },
                        files: [{
                            title: 'Sample File',
                            content: { content: '<p>This is a sample file.</p>' },
                            bookmarks: [],
                            sections: []
                        }]
                    }],
                    canvasHeaders: [{
                        text: 'Welcome to Appwrite!',
                        position: { left: '200px', top: '50px' }
                    }],
                    drawingPaths: [],
                    lastModified: new Date().toISOString(),
                    isDevMode: true,
                    onboardingShown: true
                };

                // Save sample board using Appwrite database service
                const client = await databaseSetup.initClient();
                const databases = new Appwrite.Databases(client);
                
                await databases.createDocument(
                    databaseSetup.APPWRITE_CONFIG.databaseId,
                    databaseSetup.APPWRITE_CONFIG.collections.boards,
                    sampleBoard.boardId,
                    sampleBoard
                );

                console.log('✅ Sample data created successfully');
                return { success: true, message: 'Sample data created' };
                
            } catch (error) {
                console.error('❌ Failed to create sample data:', error);
                return { success: false, error: error.message };
            }
        },

        // Clean development data
        async cleanDev() {
            console.log('🧹 Cleaning development data...');
            
            try {
                const client = await databaseSetup.initClient();
                const databases = new Appwrite.Databases(client);
                
                // Get all boards and delete sample ones
                const boards = await databases.listDocuments(
                    databaseSetup.APPWRITE_CONFIG.databaseId,
                    databaseSetup.APPWRITE_CONFIG.collections.boards,
                    [Appwrite.Query.contains('boardId', 'sample-board-')]
                );
                
                for (const board of boards.documents) {
                    await databases.deleteDocument(
                        databaseSetup.APPWRITE_CONFIG.databaseId,
                        databaseSetup.APPWRITE_CONFIG.collections.boards,
                        board.$id
                    );
                }
                
                console.log('✅ Development data cleaned');
                return { success: true, message: 'Development data cleaned' };
                
            } catch (error) {
                console.error('❌ Failed to clean development data:', error);
                return { success: false, error: error.message };
            }
        }
    }
};

// Global functions for easy access
window.appwriteIntegration = appwriteIntegration;

// Convenience global functions
window.setupAppwriteDatabase = () => appwriteIntegration.setupDatabaseWithConsent();
window.checkAppwriteDatabase = () => appwriteIntegration.checkDatabaseStatus();
window.manageAppwriteDatabase = () => appwriteIntegration.manageDatabase();

// Development utilities
window.setupAppwriteDev = () => appwriteIntegration.devUtils.setupDev();
window.cleanAppwriteDev = () => appwriteIntegration.devUtils.cleanDev();

// Auto-integrate on load
if (typeof window !== 'undefined') {
    // Add to global Appwrite namespace
    window.Appwrite = window.Appwrite || {};
    window.Appwrite.Integration = appwriteIntegration;
    
    // Auto-initialize if enabled
    if (window.AppwriteAutoSetup !== false) {
        // Don't auto-run setup immediately, wait for user interaction or app ready
        console.log('🚀 Appwrite integration loaded - ready for setup');
    }
}

// Export for module usage
export { appwriteIntegration };
