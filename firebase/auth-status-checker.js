/**
 * MARKED FOR REMOVAL: Development utility for checking auth status
 * Not needed in production. Used for debugging auth issues.
 * Safe to delete - only provides window.checkAuthStatus() function
 */

// Authentication status and guidance utility
export function checkAuthStatus() {
    Debug.auth.start('AUTHENTICATION STATUS CHECK');
    
    const currentUser = window.authService?.getCurrentUser();
    
    if (currentUser) {
        if (currentUser.isAnonymous) {
            const guestId = currentUser.uid.slice(-6).toUpperCase();
            Debug.auth.step('Status: Guest User');
            Debug.auth.detail(`Guest ID: ${guestId}`);
            Debug.auth.detail('Recommendation: Create a permanent account with email');
            Debug.auth.detail('How: Click "Sign In" → "Sign Up" → Enter email/password');
        } else {
            Debug.auth.step('Status: Authenticated User');
            Debug.auth.detail(`Email: ${currentUser.email}`);
            Debug.auth.detail('You have a permanent account!');
        }
    } else {
        Debug.auth.stepError('Status: No User');
        Debug.auth.detail('Recommendation: A guest account will be created automatically');
    }
    
    Debug.ui.start('BROWSER COMPATIBILITY CHECK');
    
    // Check popup support
    const popupTest = window.testPopupBlocking();
    if (popupTest.blocked) {
        Debug.ui.stepError('Popups: Blocked');
    } else {
        Debug.ui.step('Popups: Allowed');
    }
    
    // Check storage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        Debug.ui.step('LocalStorage: Available');
    } catch (e) {
        Debug.ui.stepError('LocalStorage: Blocked');
    }
    
    try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        Debug.ui.step('SessionStorage: Available');
    } catch (e) {
        Debug.ui.stepError('SessionStorage: Blocked');
    }
    
    // Check cookies
    if (navigator.cookieEnabled) {
        Debug.ui.step('Cookies: Enabled');
    } else {
        Debug.ui.stepError('Cookies: Disabled');
    }
    Debug.ui.done();
    
    Debug.info('Recommendations', 'RECOMMENDATIONS:');
    
    if (popupTest.blocked) {
        Debug.info('Recommendations', '• Allow popups for this site to enable Google sign-in');
    }
    
    Debug.info('Recommendations', '• Email authentication works best across all browsers');
    Debug.info('Recommendations', '• Guest accounts automatically sync your data');
    Debug.info('Recommendations', '• You can upgrade from guest to permanent account anytime');
    
    Debug.info('QuickActions', 'QUICK ACTIONS:');
    Debug.info('QuickActions', '• Create email account: Click "Sign In" → "Sign Up"');
    Debug.info('QuickActions', '• Reset everything: window.forceAuthReset()');
    Debug.info('QuickActions', '• Test popups: window.testPopupBlocking()');
    
    Debug.auth.done();
    
    return {
        user: currentUser,
        isGuest: currentUser?.isAnonymous || false,
        isAuthenticated: currentUser && !currentUser.isAnonymous,
        browserSupport: {
            popups: !popupTest.blocked,
            localStorage: (() => { try { localStorage.setItem('test', 'test'); localStorage.removeItem('test'); return true; } catch(e) { return false; } })(),
            sessionStorage: (() => { try { sessionStorage.setItem('test', 'test'); sessionStorage.removeItem('test'); return true; } catch(e) { return false; } })(),
            cookies: navigator.cookieEnabled
        }
    };
}

// Make available globally
window.checkAuthStatus = checkAuthStatus;

Debug.init.step('Auth status checker loaded. Call window.checkAuthStatus() for detailed authentication info');
