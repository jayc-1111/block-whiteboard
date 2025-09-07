// === DATABASE CONNECTION TEST ===
// This script tests the database connection and setup

async function testDatabaseConnection() {
    console.log('🧪 Testing database connection...');
    
    try {
        // Wait for Appwrite to be ready
        await new Promise(resolve => {
            const check = () => {
                if (window.databases) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
        
        const config = window.APPWRITE_CONFIG;
        console.log('✅ Appwrite services ready');
        
        // Test database access
        try {
            const database = await window.databases.get(config.databaseId);
            console.log('📚 Database found:', database);
        } catch (error) {
            console.error('❌ Database not found:', error.message);
            return;
        }
        
        // Test collections
        const collections = [
            'boards', 'bookmarks', 'folders', 'files', 'canvasHeaders', 'drawingPaths'
        ];
        
        for (const collectionId of collections) {
            try {
                const collection = await window.databases.getCollection(
                    config.databaseId,
                    collectionId
                );
                console.log(`📁 Collection ${collectionId}:`, collection.name);
                
                // List attributes
                try {
                    const attributes = await window.databases.listAttributes(
                        config.databaseId,
                        collectionId
                    );
                    console.log(`   Attributes (${attributes.total}):`, 
                        attributes.attributes.map(attr => attr.key));
                } catch (attrError) {
                    console.warn(`   ❌ Failed to list attributes for ${collectionId}:`, attrError.message);
                }
                
            } catch (error) {
                console.warn(`📁 Collection ${collectionId} not found:`, error.message);
            }
        }
        
        console.log('🏁 Database test completed');
        
    } catch (error) {
        console.error('💥 Database test failed:', error);
    }
}

// Run test when Appwrite is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testDatabaseConnection);
} else {
    setTimeout(testDatabaseConnection, 1000);
}

window.testDatabaseConnection = testDatabaseConnection;