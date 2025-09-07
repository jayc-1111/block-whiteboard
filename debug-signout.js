// Debug script to test signout functionality
console.log('=== Appwrite Signout Debug Script ===');

// Check if Appwrite is loaded
if (typeof Appwrite === 'undefined') {
    console.error('❌ Appwrite SDK not loaded');
} else {
    console.log('✅ Appwrite SDK loaded');
}

// Check if authService is available
if (typeof window.authService === 'undefined') {
    console.error('❌ authService not available');
} else {
    console.log('✅ authService available');
}

// Check if account is available
if (typeof window.appwriteAccount === 'undefined') {
    console.error('❌ Appwrite account not available');
} else {
    console.log('✅ Appwrite account available');
}

// Check current user status
try {
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (currentUser) {
        console.log('✅ Current user:', {
            id: currentUser.$id,
            email: currentUser.email,
            labels: currentUser.labels
        });
    } else {
        console.log('ℹ️ No current user');
    }
} catch (error) {
    console.error('❌ Error getting current user:', error);
}

// Test signOut method directly
async function testSignOut() {
    console.log('=== Testing signOut method ===');
    try {
        if (window.authService && window.authService.signOut) {
            console.log('✅ authService.signOut method exists');
            const result = await window.authService.signOut();
            console.log('signOut result:', result);
            if (result.success) {
                console.log('✅ Sign out successful');
            } else {
                console.error('❌ Sign out failed:', result.error);
            }
        } else {
            console.error('❌ authService.signOut method not found');
        }
    } catch (error) {
        console.error('❌ Error calling signOut:', error);
    }
}

// Check for signout button in DOM
function checkSignOutButton() {
    console.log('=== Checking for Sign Out Button ===');
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        console.log('✅ Sign out button found in DOM');
        console.log('Button text:', signOutBtn.textContent);
        console.log('Button event listeners:', getEventListeners(signOutBtn));
    } else {
        console.error('❌ Sign out button not found in DOM');
        
        // Try to find any button with "Sign Out" text
        const allButtons = document.querySelectorAll('button');
        console.log('All buttons found:', allButtons.length);
        allButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.textContent);
        });
    }
}

// Helper function to get event listeners (Chrome DevTools only)
function getEventListeners(element) {
    if (typeof window.getEventListeners !== 'undefined') {
        return window.getEventListeners(element);
    }
    return 'Event listener inspection not available';
}

// Run tests
console.log('Running tests...');
checkSignOutButton();

// Add a manual test button to the page
function addTestButton() {
    const testContainer = document.createElement('div');
    testContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ffeb3b;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 12px;
    `;
    testContainer.innerHTML = `
        <button id="debugSignOutBtn" style="margin: 5px;">Debug Sign Out</button>
        <button id="checkStatusBtn" style="margin: 5px;">Check Status</button>
    `;
    
    document.body.appendChild(testContainer);
    
    document.getElementById('debugSignOutBtn').addEventListener('click', async () => {
        console.log('=== Manual Sign Out Test ===');
        await testSignOut();
    });
    
    document.getElementById('checkStatusBtn').addEventListener('click', () => {
        checkSignOutButton();
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;
        console.log('Current user status:', currentUser);
    });
}

// Add test button when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTestButton);
} else {
    addTestButton();
}

console.log('=== Debug script loaded ===');
