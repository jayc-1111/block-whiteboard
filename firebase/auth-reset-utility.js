/**
 * MARKED FOR REMOVAL: Development utility for testing authentication
 * Not needed in production. Used for debugging auth issues.
 * Safe to delete - only provides window.forceAuthReset() function
 */

// Authentication reset utility for debugging
import { authService } from './firebase-config.js';
import { setAuthInProgress } from './guest-auth-init.js';

// Force sign out and clear all auth state
export async function forceAuthReset() {
    Debug.auth.start('FORCING AUTHENTICATION RESET');
    
    // Set auth in progress to prevent guest account creation
    setAuthInProgress(true);
    
    try {
        // Sign out current user
        const result = await authService.signOut();
        Debug.auth.step('Forced sign out', result);
        
        // Clear browser storage that might be causing issues
        try {
            localStorage.clear();
            sessionStorage.clear();
            Debug.auth.step('Cleared localStorage and sessionStorage');
        } catch (storageError) {
            Debug.auth.warn('Could not clear storage', storageError);
        }
        
        // Clear any cached auth state
        if (window.syncService) {
            window.syncService.clearLocalData();
        }
        
        // Clear dev info
        if (window.setDevInfo) {
            window.setDevInfo('guestId', null);
            window.setDevInfo('userEmail', null);
        }
        
        // Wait a moment for state to clear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        Debug.auth.done('Authentication state reset complete');
        Debug.auth.info('Ready for fresh authentication attempt');
        Debug.auth.info('Please refresh the page for best results');
        
        return { success: true };
        
    } catch (error) {
        Debug.auth.error('Failed to reset auth state', error);
        return { success: false, error: error.message };
    } finally {
        // Re-enable guest auth after a delay
        setTimeout(() => {
            setAuthInProgress(false);
        }, 2000);
    }
}

// Make available globally for debugging
window.forceAuthReset = forceAuthReset;

Debug.init.step('Auth reset utility loaded. Call window.forceAuthReset() to clear all auth state');
