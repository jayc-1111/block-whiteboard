/**
 * Test Module Loading
 * 
 * This script tests if all required modules are loading correctly
 * and exposes the necessary functions.
 */

console.log('🧪 Starting module tests...');

// Test if required modules exist
function testModuleLoading() {
    console.log('🔍 Testing module loading...');
    
    const tests = [
        { name: 'appwriteUtils', module: window.appwriteUtils },
        { name: 'dbService', module: window.dbService },
        { name: 'uiService', module: window.uiService },
        { name: 'AppState', module: window.AppState }
    ];
    
    const results = tests.map(test => {
        const exists = !!test.module;
        console.log(`${exists ? '✅' : '❌'} ${test.name}: ${exists ? 'Found' : 'Missing'}`);
        return { name: test.name, exists, module: test.module };
    });
    
    // Check for specific functions
    console.log('\n🔍 Testing function availability...');
    
    const functionTests = [
        { name: 'showConfirmDialog', func: window.showConfirmDialog },
        { name: 'createFolder', func: window.createFolder },
        { name: 'loadBoard', func: window.loadBoard },
        { name: 'updateBoardDropdown', func: window.updateBoardDropdown },
        { name: 'showOnboardingIfEmpty', func: window.showOnboardingIfEmpty },
        { name: 'setupSelectionListeners', func: window.setupSelectionListeners },
        { name: 'saveBoard', func: window.dbService?.saveBoard },
        { name: 'deleteBoard', func: window.dbService?.deleteBoard }
    ];
    
    const functionResults = functionTests.map(test => {
        const exists = typeof test.func === 'function';
        console.log(`${exists ? '✅' : '❌'} ${test.name}: ${exists ? 'Available' : 'Missing'}`);
        return { name: test.name, exists, func: test.func };
    });
    
    // Summary
    const moduleSuccess = results.every(r => r.exists);
    const functionSuccess = functionResults.every(r => r.exists);
    
    console.log('\n📊 Test Summary:');
    console.log(`Modules: ${moduleSuccess ? '✅ All loaded' : '❌ Some missing'}`);
    console.log(`Functions: ${functionSuccess ? '✅ All available' : '❌ Some missing'}`);
    
    return {
        modules: results,
        functions: functionResults,
        success: moduleSuccess && functionSuccess
    };
}

// Run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testModuleLoading);
} else {
    testModuleLoading();
}

// Make test function available globally
window.testModuleLoading = testModuleLoading;

console.log('🧪 Module test script loaded');
