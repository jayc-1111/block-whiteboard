/**
 * MARKED FOR REMOVAL: Development utility for testing popup blocking
 * Not needed in production. Used to test browser popup permissions.
 * Safe to delete - only provides window.testPopupBlocking() function
 */

// Popup blocker detection utility
export function testPopupBlocking() {
    Debug.ui.info('Testing popup blocking...');
    
    try {
        // Try to open a small popup
        const popup = window.open('', 'popup-test', 'width=1,height=1');
        
        if (!popup) {
            Debug.ui.warn('Popups are blocked by browser');
            return { blocked: true, reason: 'Popup blocked by browser' };
        }
        
        if (popup.closed) {
            Debug.ui.warn('Popup was immediately closed');
            return { blocked: true, reason: 'Popup immediately closed' };
        }
        
        // Close the test popup
        popup.close();
        Debug.ui.step('Popups are allowed');
        return { blocked: false };
        
    } catch (error) {
        Debug.ui.error('Popup test failed', error);
        return { blocked: true, reason: error.message };
    }
}

// Make available globally
window.testPopupBlocking = testPopupBlocking;

Debug.init.step('Popup test utility loaded. Call window.testPopupBlocking() to check popup permissions');
