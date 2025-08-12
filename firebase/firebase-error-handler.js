// Enhanced Firebase error handling and debugging utilities
export class FirebaseErrorHandler {
    static logError(context, error, additionalInfo = {}) {
        // Check if this is a cancelled popup request (not a real error)
        if (error.code === 'auth/cancelled-popup-request') {
            Debug.firebase.warn(`❎ Firebase Cancelled Request in ${context}: ${error.message}`);
            Debug.firebase.detail('Additional Info', additionalInfo);
            if (error.stack) {
                Debug.firebase.detail('Stack Trace', { stack: error.stack });
            }
        } else {
            Debug.firebase.error(`Firebase Error in ${context}`, error);
            Debug.firebase.detail('Additional Info', additionalInfo);
            if (error.stack) {
                Debug.firebase.detail('Stack Trace', { stack: error.stack });
            }
        }
    }

    static handleAuthError(error, context = 'Authentication') {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/email-already-in-use': 'An account already exists with this email address.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
            'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
            'auth/credential-already-in-use': 'This account is already linked to another user.',
            'auth/requires-recent-login': 'Please sign out and sign in again to complete this action.'
        };

        const userFriendlyMessage = errorMessages[error.code] || error.message || 'An unexpected error occurred.';
        
        this.logError(context, error, { 
            code: error.code,
            userFriendlyMessage 
        });

        return userFriendlyMessage;
    }

    static handleNetworkError(error, context = 'Network') {
        if (!navigator.onLine) {
            const message = 'You appear to be offline. Please check your internet connection.';
            this.logError(context, error, { offline: true });
            return message;
        }

        this.logError(context, error);
        return 'Network error occurred. Please try again.';
    }

    static async safeAsyncCall(asyncFunction, context = 'Async Operation', fallbackValue = null) {
        try {
            const result = await asyncFunction();
            return { success: true, data: result };
        } catch (error) {
            const message = this.handleAuthError(error, context);
            return { success: false, error: message, originalError: error };
        }
    }
}

// Debug utilities for development
export class FirebaseDebugUtils {
    static logAuthState(user, context = 'Auth State Change') {
        if (user) {
            Debug.auth.detail(context, {
                uid: user.uid,
                email: user.email || 'No email',
                displayName: user.displayName || 'No display name',
                isAnonymous: user.isAnonymous,
                emailVerified: user.emailVerified,
                providerId: user.providerId,
                creationTime: user.metadata?.creationTime,
                lastSignInTime: user.metadata?.lastSignInTime
            });
        } else {
            Debug.auth.detail(context, { status: 'No user authenticated' });
        }
    }

    static logFirestoreOperation(operation, path, data = null) {
        Debug.firebase.detail(`Firestore: ${operation}`, {
            path: path,
            data: data,
            time: new Date().toISOString()
        });
    }

    static validateEnvironment() {
        const checks = {
            'Firebase App': typeof window.db !== 'undefined', // Check for our Firestore instance
            'Auth Available': typeof window.authService !== 'undefined' || document.querySelector('script[src*="firebase-auth"]') !== null,
            'Firestore Available': typeof window.db !== 'undefined',
            'Network Online': navigator.onLine,
            'Local Storage': typeof Storage !== 'undefined',
            'Cookies Enabled': navigator.cookieEnabled
        };

        Debug.firebase.info('Firebase Environment Check');
        Object.entries(checks).forEach(([check, passed]) => {
            Debug.firebase.detail(check, { status: passed ? 'Passed' : 'Failed' });
        });

        return Object.values(checks).every(Boolean);
    }
}

// Enhanced connection monitoring
export class ConnectionMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.callbacks = [];
        
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    handleOnline() {
        Debug.firebase.info('Connection restored');
        this.isOnline = true;
        this.callbacks.forEach(callback => callback(true));
    }

    handleOffline() {
        Debug.firebase.warn('Connection lost');
        this.isOnline = false;
        this.callbacks.forEach(callback => callback(false));
    }

    onConnectionChange(callback) {
        this.callbacks.push(callback);
        // Call immediately with current state
        callback(this.isOnline);
    }

    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }
}

// Global error boundary for uncaught Firebase errors
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('auth/') || 
        event.reason?.code?.startsWith('firestore/')) {
        
        Debug.firebase.error('Unhandled Firebase Promise Rejection', event.reason);
        FirebaseErrorHandler.logError('Unhandled Promise', event.reason);
        
        // Prevent the error from appearing in console as unhandled
        event.preventDefault();
    }
});

// Initialize connection monitor
export const connectionMonitor = new ConnectionMonitor();

// Development mode helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
    window.FirebaseDebugUtils = FirebaseDebugUtils;
    window.FirebaseErrorHandler = FirebaseErrorHandler;
    
    // Auto-validate environment on load
    setTimeout(() => {
        FirebaseDebugUtils.validateEnvironment();
    }, 2000);
}
