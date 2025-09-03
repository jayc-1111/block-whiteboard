// === APPWRITE DATABASE SETUP TEST ===
// This file provides test functions to verify the Appwrite database setup works correctly.

// Test suite for database setup
const appwriteTests = {
    
    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Appwrite database setup tests...');
        
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: Check if Appwrite client is initialized
        const clientTest = await this.testClientInitialization();
        results.tests.push(clientTest);
        if (clientTest.passed) results.passed++;
        else results.failed++;
        
        // Test 2: Check collection status
        const statusTest = await this.testCollectionStatus();
        results.tests.push(statusTest);
        if (statusTest.passed) results.passed++;
        else results.failed++;
        
        // Test 3: Test quick setup
        const quickSetupTest = await this.testQuickSetup();
        results.tests.push(quickSetupTest);
        if (quickSetupTest.passed) results.passed++;
        else results.failed++;
        
        // Test 4: Test integration service
        const integrationTest = await this.testIntegrationService();
        results.tests.push(integrationTest);
        if (integrationTest.passed) results.passed++;
        else results.failed++;
        
        // Summary
        console.log(`\n🎯 Test Results: ${results.passed}/${results.passed + results.failed} tests passed`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        
        if (results.failed > 0) {
            console.log('\nFailed tests:');
            results.tests.filter(t => !t.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return results;
    },
    
    // Test 1: Client initialization
    async testClientInitialization() {
        try {
            console.log('🧪 Testing Appwrite client initialization...');
            
            if (typeof Appwrite === 'undefined') {
                return {
                    name: 'Client Initialization',
                    passed: false,
                    message: 'Appwrite SDK not loaded'
                };
            }
            
            // Check if we can create a client
            const client = new Appwrite.Client();
            if (!client) {
                return {
                    name: 'Client Initialization',
                    passed: false,
                    message: 'Failed to create Appwrite client'
                };
            }
            
            return {
                name: 'Client Initialization',
                passed: true,
                message: 'Appwrite client initialized successfully'
            };
            
        } catch (error) {
            return {
                name: 'Client Initialization',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Test 2: Collection status check
    async testCollectionStatus() {
        try {
            console.log('🧪 Testing collection status check...');
            
            if (typeof window.databaseSetup === 'undefined') {
                return {
                    name: 'Collection Status Check',
                    passed: false,
                    message: 'Database setup service not available'
                };
            }
            
            const status = await window.databaseSetup.checkCollectionStatus();
            if (!status.success) {
                return {
                    name: 'Collection Status Check',
                    passed: false,
                    message: `Failed to check status: ${status.error}`
                };
            }
            
            // Check if we got status data
            if (!status.status || Object.keys(status.status).length === 0) {
                return {
                    name: 'Collection Status Check',
                    passed: false,
                    message: 'No status data returned'
                };
            }
            
            console.log('📋 Collection status:', status.status);
            return {
                name: 'Collection Status Check',
                passed: true,
                message: 'Collection status checked successfully'
            };
            
        } catch (error) {
            return {
                name: 'Collection Status Check',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Test 3: Quick setup
    async testQuickSetup() {
        try {
            console.log('🧪 Testing quick setup...');
            
            if (typeof window.databaseSetup === 'undefined') {
                return {
                    name: 'Quick Setup',
                    passed: false,
                    message: 'Database setup service not available'
                };
            }
            
            const setupResult = await window.databaseSetup.quickSetup();
            if (!setupResult.success) {
                return {
                    name: 'Quick Setup',
                    passed: false,
                    message: `Setup failed: ${setupResult.error}`
                };
            }
            
            // Check if we got results
            if (!setupResult.results || setupResult.results.length === 0) {
                return {
                    name: 'Quick Setup',
                    passed: false,
                    message: 'No setup results returned'
                };
            }
            
            const successful = setupResult.results.filter(r => r.success).length;
            console.log(`📊 Quick setup results: ${successful}/${setupResult.results.length} collections successful`);
            
            return {
                name: 'Quick Setup',
                passed: true,
                message: `Quick setup completed (${successful}/${setupResult.results.length} successful)`
            };
            
        } catch (error) {
            return {
                name: 'Quick Setup',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Test 4: Integration service
    async testIntegrationService() {
        try {
            console.log('🧪 Testing integration service...');
            
            if (typeof window.appwriteIntegration === 'undefined') {
                return {
                    name: 'Integration Service',
                    passed: false,
                    message: 'Integration service not available'
                };
            }
            
            // Test status check
            const statusResult = await window.appwriteIntegration.checkDatabaseStatus();
            if (!statusResult.success) {
                return {
                    name: 'Integration Service',
                    passed: false,
                    message: `Status check failed: ${statusResult.error}`
                };
            }
            
            return {
                name: 'Integration Service',
                passed: true,
                message: 'Integration service working correctly'
            };
            
        } catch (error) {
            return {
                name: 'Integration Service',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Test 5: Create sample board
    async testCreateSampleBoard() {
        try {
            console.log('🧪 Testing sample board creation...');
            
            if (typeof window.appwriteIntegration === 'undefined') {
                return {
                    name: 'Sample Board Creation',
                    passed: false,
                    message: 'Integration service not available'
                };
            }
            
            const result = await window.appwriteIntegration.devUtils.createSampleData();
            if (!result.success) {
                return {
                    name: 'Sample Board Creation',
                    passed: false,
                    message: `Failed to create sample data: ${result.error}`
                };
            }
            
            return {
                name: 'Sample Board Creation',
                passed: true,
                message: 'Sample board created successfully'
            };
            
        } catch (error) {
            return {
                name: 'Sample Board Creation',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Test 6: Clean up sample data
    async testCleanSampleData() {
        try {
            console.log('🧪 Testing sample data cleanup...');
            
            if (typeof window.appwriteIntegration === 'undefined') {
                return {
                    name: 'Sample Data Cleanup',
                    passed: false,
                    message: 'Integration service not available'
                };
            }
            
            const result = await window.appwriteIntegration.devUtils.cleanDev();
            if (!result.success) {
                return {
                    name: 'Sample Data Cleanup',
                    passed: false,
                    message: `Failed to clean sample data: ${result.error}`
                };
            }
            
            return {
                name: 'Sample Data Cleanup',
                passed: true,
                message: 'Sample data cleaned successfully'
            };
            
        } catch (error) {
            return {
                name: 'Sample Data Cleanup',
                passed: false,
                message: `Error: ${error.message}`
            };
        }
    },
    
    // Interactive test runner
    async runInteractiveTests() {
        console.log('🧪 Interactive Appwrite Setup Test');
        console.log('==================================');
        
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            console.error('❌ This test must be run in a browser environment');
            return;
        }
        
        // Check if Appwrite is loaded
        if (typeof Appwrite === 'undefined') {
            console.error('❌ Appwrite SDK is not loaded. Please include Appwrite SDK first.');
            return;
        }
        
        // Run basic tests first
        console.log('\n🔬 Running basic tests...');
        const basicResults = await this.runAllTests();
        
        if (basicResults.failed === 0) {
            console.log('\n✅ All basic tests passed! Would you like to run advanced tests?');
            
            // Ask user if they want to continue
            if (confirm('All basic tests passed! Would you like to run advanced tests including sample data creation?')) {
                console.log('\n🔬 Running advanced tests...');
                
                const sampleResult = await this.testCreateSampleBoard();
                console.log(`Sample board test: ${sampleResult.passed ? '✅' : '❌'} ${sampleResult.message}`);
                
                // Clean up
                setTimeout(async () => {
                    console.log('\n🧹 Cleaning up sample data...');
                    const cleanResult = await this.testCleanSampleData();
                    console.log(`Cleanup test: ${cleanResult.passed ? '✅' : '❌'} ${cleanResult.message}`);
                    
                    // Final summary
                    console.log('\n🎯 Advanced tests completed!');
                    console.log('You can now use the Appwrite database setup in your application.');
                }, 2000);
            }
        } else {
            console.log('\n❌ Some basic tests failed. Please fix these issues first.');
            console.log('Check the browser console for detailed error messages.');
        }
    }
};

// Make tests globally available
window.appwriteTests = appwriteTests;

// Quick test function
window.testAppwriteSetup = () => appwriteTests.runAllTests();

// Interactive test function
window.interactiveTestAppwriteSetup = () => appwriteTests.runInteractiveTests();

// Auto-run tests if in development mode
if (typeof window !== 'undefined' && window.DEV_MODE) {
    console.log('🧪 Auto-running Appwrite setup tests in development mode...');
    setTimeout(() => {
        appwriteTests.runAllTests().then(results => {
            if (results.failed === 0) {
                console.log('✅ All Appwrite setup tests passed!');
            } else {
                console.warn('⚠️ Some Appwrite setup tests failed');
            }
        });
    }, 3000);
}

// Export for module usage
export { appwriteTests };
