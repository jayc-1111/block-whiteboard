// === APPWRITE DATABASE SETUP SERVICE ===
// This service provides programmatic setup of Appwrite collections and indexes
// based on the Firebase data structure from the original implementation.
//
// Usage:
// import { databaseSetup } from './appwrite/database-setup.js';
// await databaseSetup.setupCollections();

// Appwrite configuration
const APPWRITE_CONFIG = {
    endpoint: 'https://sfo.cloud.appwrite.io/v1',
    projectId: '68b6ed180029c5632ed3',
    databaseId: '68b6f1aa003a536da72d',
    collections: {
        users: 'users',
        boards: 'boards',
        bookmarks: 'bookmarks',
        folders: 'folders',
        files: 'files',
        canvasHeaders: 'canvasHeaders',
        drawingPaths: 'drawingPaths'
    }
};

// Collection schemas based on Firebase data structure
const COLLECTION_SCHEMAS = {
    users: {
        name: 'users',
        permissions: {
            read: ['any'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'userId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'email',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 255
            },
            {
                key: 'isGuest',
                type: 'boolean',
                required: true,
                default: false,
                array: false
            },
            {
                key: 'plan',
                type: 'string',
                required: true,
                default: 'free',
                array: false,
                size: 50
            },
            {
                key: 'boardCount',
                type: 'integer',
                required: true,
                default: 0,
                array: false
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastUpdated',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'userId',
                type: 'unique'
            },
            {
                key: 'email',
                type: 'unique'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    boards: {
        name: 'boards',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'userId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'name',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 255
            },
            {
                key: 'folders',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'canvasHeaders',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'drawingPaths',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'isDevMode',
                type: 'boolean',
                required: true,
                default: false,
                array: false
            },
            {
                key: 'onboardingShown',
                type: 'boolean',
                required: true,
                default: false,
                array: false
            }
        ],
        indexes: [
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'boardId',
                type: 'unique'
            },
            {
                key: 'lastModified',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    bookmarks: {
        name: 'bookmarks',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'bookmarkId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'fileId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'folderId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'title',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 255
            },
            {
                key: 'url',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 2048
            },
            {
                key: 'description',
                type: 'string',
                required: false,
                default: '',
                array: false,
                size: 5000
            },
            {
                key: 'screenshot',
                type: 'string',
                required: false,
                default: '',
                array: false,
                size: 1000000 // 1MB limit for base64 images
            },
            {
                key: 'image',
                type: 'string',
                required: false,
                default: '',
                array: false,
                size: 500000 // 500KB limit for base64 images
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'bookmarkId',
                type: 'unique'
            },
            {
                key: 'boardId',
                type: 'general'
            },
            {
                key: 'fileId',
                type: 'general'
            },
            {
                key: 'folderId',
                type: 'general'
            },
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    folders: {
        name: 'folders',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'folderId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'title',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 255
            },
            {
                key: 'position',
                type: 'json',
                required: true,
                default: { left: 0, top: 0 },
                array: false
            },
            {
                key: 'files',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'folderId',
                type: 'unique'
            },
            {
                key: 'boardId',
                type: 'general'
            },
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    files: {
        name: 'files',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'fileId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'folderId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'title',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 255
            },
            {
                key: 'content',
                type: 'json',
                required: false,
                default: {},
                array: false
            },
            {
                key: 'bookmarks',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'sections',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'position',
                type: 'json',
                required: true,
                default: { left: 0, top: 0 },
                array: false
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'fileId',
                type: 'unique'
            },
            {
                key: 'boardId',
                type: 'general'
            },
            {
                key: 'folderId',
                type: 'general'
            },
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    canvasHeaders: {
        name: 'canvasHeaders',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'headerId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'text',
                type: 'string',
                required: true,
                default: '',
                array: false,
                size: 1000
            },
            {
                key: 'position',
                type: 'json',
                required: true,
                default: { left: 0, top: 0 },
                array: false
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'headerId',
                type: 'unique'
            },
            {
                key: 'boardId',
                type: 'general'
            },
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    },
    drawingPaths: {
        name: 'drawingPaths',
        permissions: {
            read: ['users'],
            write: ['users'],
            delete: ['users']
        },
        attributes: [
            {
                key: 'pathId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'boardId',
                type: 'string',
                required: true,
                default: '',
                array: false
            },
            {
                key: 'paths',
                type: 'json',
                required: false,
                default: [],
                array: false
            },
            {
                key: 'createdAt',
                type: 'datetime',
                required: true,
                array: false
            },
            {
                key: 'lastModified',
                type: 'datetime',
                required: true,
                array: false
            }
        ],
        indexes: [
            {
                key: 'pathId',
                type: 'unique'
            },
            {
                key: 'boardId',
                type: 'general'
            },
            {
                key: 'userId',
                type: 'general'
            },
            {
                key: 'createdAt',
                type: 'general'
            }
        ]
    }
};

// Database Setup Service
const databaseSetup = {
    
    // Initialize Appwrite client
    async initClient() {
        try {
            // Check if Appwrite client is available globally
            if (window.appwriteClient) {
                return window.appwriteClient;
            }
            
            // Initialize new client if not available
            const client = new Appwrite.Client()
                .setEndpoint(APPWRITE_CONFIG.endpoint)
                .setProject(APPWRITE_CONFIG.projectId);
                
            window.appwriteClient = client;
            return client;
        } catch (error) {
            console.error('Failed to initialize Appwrite client:', error);
            throw error;
        }
    },

    // Main setup function
    async setupCollections() {
        try {
            console.log('🚀 Starting Appwrite database setup...');
            
            // Initialize client
            const client = await this.initClient();
            const databases = new Appwrite.Databases(client);
            
            // Setup each collection
            const collections = Object.values(COLLECTION_SCHEMAS);
            let setupResults = [];
            
            for (const schema of collections) {
                try {
                    console.log(`📋 Setting up collection: ${schema.name}`);
                    const result = await this.setupCollection(databases, schema);
                    setupResults.push({ name: schema.name, success: true, result });
                    console.log(`✅ Collection ${schema.name} setup completed`);
                } catch (error) {
                    console.error(`❌ Collection ${schema.name} setup failed:`, error);
                    setupResults.push({ name: schema.name, success: false, error: error.message });
                }
            }
            
            // Summary
            const successful = setupResults.filter(r => r.success).length;
            const failed = setupResults.filter(r => !r.success).length;
            
            console.log(`🎉 Database setup completed: ${successful} successful, ${failed} failed`);
            
            if (failed > 0) {
                console.error('Failed collections:', setupResults.filter(r => !r.success));
            }
            
            return {
                success: failed === 0,
                results: setupResults,
                summary: {
                    total: collections.length,
                    successful,
                    failed
                }
            };
            
        } catch (error) {
            console.error('Database setup failed:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    },

    // Setup individual collection
    async setupCollection(databases, schema) {
        try {
            // Check if collection exists
            const existingCollection = await this.getCollection(databases, schema.name);
            
            if (existingCollection) {
                console.log(`📋 Collection ${schema.name} already exists, updating...`);
                return await this.updateCollection(databases, schema);
            } else {
                console.log(`📋 Creating new collection: ${schema.name}`);
                return await this.createCollection(databases, schema);
            }
        } catch (error) {
            console.error(`❌ Failed to setup collection ${schema.name}:`, error);
            throw error;
        }
    },

    // Get existing collection
    async getCollection(databases, collectionName) {
        try {
            const response = await databases.listCollections([
                Appwrite.Query.equal('name', collectionName)
            ]);
            
            if (response.collections.length > 0) {
                return response.collections[0];
            }
            return null;
        } catch (error) {
            if (error.code === 404) {
                return null; // Collection doesn't exist
            }
            throw error;
        }
    },

    // Create new collection
    async createCollection(databases, schema) {
        try {
            // Create collection
            const collection = await databases.createCollection(
                APPWRITE_CONFIG.databaseId,
                schema.name,
                schema.name,
                schema.permissions
            );
            
            // Add attributes
            for (const attribute of schema.attributes) {
                await databases.createStringAttribute(
                    APPWRITE_CONFIG.databaseId,
                    collection.$id,
                    attribute.key,
                    attribute.size || 255,
                    attribute.required,
                    attribute.default,
                    attribute.array
                );
            }
            
            // Add indexes
            for (const index of schema.indexes) {
                await databases.createIndex(
                    APPWRITE_CONFIG.databaseId,
                    collection.$id,
                    `${schema.name}_${index.key}`,
                    index.type,
                    [index.key]
                );
            }
            
            return { created: true, collectionId: collection.$id };
        } catch (error) {
            console.error(`❌ Failed to create collection ${schema.name}:`, error);
            throw error;
        }
    },

    // Update existing collection
    async updateCollection(databases, schema) {
        try {
            // Get existing collection
            const existingCollection = await this.getCollection(databases, schema.name);
            
            // Update permissions if needed
            if (JSON.stringify(existingCollection.permissions) !== JSON.stringify(schema.permissions)) {
                await databases.updateCollection(
                    APPWRITE_CONFIG.databaseId,
                    existingCollection.$id,
                    schema.name,
                    schema.permissions
                );
            }
            
            // Check and add missing attributes
            const existingAttributes = existingCollection.attributes;
            for (const attribute of schema.attributes) {
                const existingAttr = existingAttributes.find(a => a.key === attribute.key);
                if (!existingAttr) {
                    // Add missing attribute
                    await databases.createStringAttribute(
                        APPWRITE_CONFIG.databaseId,
                        existingCollection.$id,
                        attribute.key,
                        attribute.size || 255,
                        attribute.required,
                        attribute.default,
                        attribute.array
                    );
                }
            }
            
            return { updated: true, collectionId: existingCollection.$id };
        } catch (error) {
            console.error(`❌ Failed to update collection ${schema.name}:`, error);
            throw error;
        }
    },

    // Quick setup for minimal collections (users and boards only)
    async quickSetup() {
        try {
            console.log('🚀 Starting quick Appwrite setup (users + boards only)...');
            
            const client = await this.initClient();
            const databases = new Appwrite.Databases(client);
            
            // Setup only users and boards collections
            const essentialCollections = [COLLECTION_SCHEMAS.users, COLLECTION_SCHEMAS.boards];
            let setupResults = [];
            
            for (const schema of essentialCollections) {
                try {
                    console.log(`📋 Setting up collection: ${schema.name}`);
                    const result = await this.setupCollection(databases, schema);
                    setupResults.push({ name: schema.name, success: true, result });
                    console.log(`✅ Collection ${schema.name} setup completed`);
                } catch (error) {
                    console.error(`❌ Collection ${schema.name} setup failed:`, error);
                    setupResults.push({ name: schema.name, success: false, error: error.message });
                }
            }
            
            const successful = setupResults.filter(r => r.success).length;
            console.log(`🎉 Quick setup completed: ${successful}/${essentialCollections.length} collections ready`);
            
            return {
                success: setupResults.every(r => r.success),
                results: setupResults,
                summary: {
                    total: essentialCollections.length,
                    successful,
                    failed: essentialCollections.length - successful
                }
            };
            
        } catch (error) {
            console.error('Quick setup failed:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    },

    // Check collection status
    async checkCollectionStatus() {
        try {
            const client = await this.initClient();
            const databases = new Appwrite.Databases(client);
            
            const status = {};
            const collections = Object.values(COLLECTION_SCHEMAS);
            
            for (const schema of collections) {
                try {
                    const existing = await this.getCollection(databases, schema.name);
                    status[schema.name] = {
                        exists: !!existing,
                        collectionId: existing?.$id || null,
                        attributes: existing?.attributes || [],
                        permissions: existing?.permissions || null
                    };
                } catch (error) {
                    status[schema.name] = {
                        exists: false,
                        error: error.message
                    };
                }
            }
            
            return {
                success: true,
                status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: {}
            };
        }
    },

    // Reset database (dangerous operation)
    async resetDatabase() {
        try {
            console.warn('🚨 DATABASE RESET INITIATED - This will delete all collections and data!');
            
            if (!confirm('Are you sure you want to reset the database? This cannot be undone!')) {
                return { success: false, message: 'Database reset cancelled' };
            }
            
            const client = await this.initClient();
            const databases = new Appwrite.Databases(client);
            
            // Get all existing collections
            const existingCollections = await databases.listCollections(APPWRITE_CONFIG.databaseId);
            
            // Delete each collection
            for (const collection of existingCollections.collections) {
                try {
                    await databases.deleteCollection(APPWRITE_CONFIG.databaseId, collection.$id);
                    console.log(`🗑️ Deleted collection: ${collection.name}`);
                } catch (error) {
                    console.error(`❌ Failed to delete collection ${collection.name}:`, error);
                }
            }
            
            console.log('✅ Database reset completed');
            return { success: true, message: 'Database reset completed' };
        } catch (error) {
            console.error('Database reset failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Make setup service globally available
window.databaseSetup = databaseSetup;

// Auto-initialize on load (optional)
if (typeof window !== 'undefined') {
    // Add to global Appwrite namespace
    window.Appwrite = window.Appwrite || {};
    window.Appwrite.DatabaseSetup = databaseSetup;
    
    // Create convenience function for quick setup
    window.setupAppwriteDatabase = async () => {
        console.log('🚀 Quick Appwrite database setup initiated...');
        return await databaseSetup.quickSetup();
    };
    
    // Create function to check status
    window.checkAppwriteDatabase = async () => {
        console.log('📋 Checking Appwrite database status...');
        return await databaseSetup.checkCollectionStatus();
    };
}

// Export for module usage
export { databaseSetup, COLLECTION_SCHEMAS, APPWRITE_CONFIG };

// Export individual functions
export {
    setupCollections,
    quickSetup,
    checkCollectionStatus,
    resetDatabase
};
