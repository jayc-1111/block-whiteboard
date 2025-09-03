// === FIREBASE ERROR HANDLER (REPLACED WITH APPWRITE) ===
// This file previously provided Firebase-specific error handling and debugging utilities.
// It handled Firebase Auth errors, Firestore errors, network monitoring, and development debugging.
//
// Key Classes (Previously Exported):
// - FirebaseErrorHandler: Main error handling and user-friendly error messages
// - FirebaseDebugUtils: Development debugging and environment validation
// - ConnectionMonitor: Network connection monitoring
//
// Firebase Error Handler Functions:
// - logError(context, error, additionalInfo): Log errors with context
// - handleAuthError(error, context): Convert Firebase auth errors to user-friendly messages
// - handleNetworkError(error, context): Handle network-specific errors
// - safeAsyncCall(asyncFunction, context): Wrapper for safe async Firebase calls
//
// Firebase Debug Utils Functions:
// - logAuthState(user, context): Log authentication state changes
// - logFirestoreOperation(operation, path, data): Log Firestore operations
// - validateEnvironment(): Check Firebase service availability
//
// Connection Monitor Functions:
// - onConnectionChange(callback): Monitor online/offline status
// - handleOnline/handleOffline(): Network state change handlers
//
// Global Error Handling:
// - Unhandled Firebase promise rejection catcher
// - Firebase-specific error code detection and prevention
// - Development mode utilities for localhost debugging
//
// TODO: Reimplement with Appwrite:
// - Replace Firebase error codes with Appwrite error handling
// - Update auth error messages for Appwrite authentication
// - Replace Firestore operation logging with Appwrite database logging
// - Update environment validation for Appwrite services
// - Implement Appwrite-specific connection monitoring
//
// Original file backed up as firebase-error-handler.js.BAK or logic replaced with this comment block.

/*
// Original Firebase error handler implementation (commented out for reference):
/*
// Original Firebase error handler implementation (commented out for reference):
// export class FirebaseErrorHandler {
//     ... (Full implementation commented out - see firebase-error-handler.js.BAK)
// }
//
// export class FirebaseDebugUtils {
//     ... (Full implementation commented out - see firebase-error-handler.js.BAK)
// }
//
// export class ConnectionMonitor {
//     ... (Full implementation commented out - see firebase-error-handler.js.BAK)
// }
//
// ... (Global error boundary, development helpers, etc.)
*/

// ==================================================================
// STUB EXPORTS - Prevent import errors while Firebase is disabled
// ==================================================================
// These are placeholder exports that return errors or no-ops
// Replace with actual Appwrite implementations

export class FirebaseErrorHandler {
    static logError(context, error, additionalInfo = {}) {
        console.warn('Firebase error handler disabled - implement with Appwrite');
        console.error(`Error in ${context}:`, error);
    }
    
    static handleAuthError(error, context = 'Authentication') {
        console.warn('Firebase auth error handler disabled - implement with Appwrite');
        return error.message || 'Authentication error occurred';
    }
    
    static handleNetworkError(error, context = 'Network') {
        console.warn('Firebase network error handler disabled - implement with Appwrite');
        return 'Network error occurred. Please try again.';
    }
    
    static async safeAsyncCall(asyncFunction, context = 'Async Operation', fallbackValue = null) {
        console.warn('Firebase safeAsyncCall disabled - implement with Appwrite');
        try {
            const result = await asyncFunction();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message, originalError: error };
        }
    }
}

export class FirebaseDebugUtils {
    static logAuthState(user, context = 'Auth State Change') {
        console.warn('Firebase debug utils disabled - implement with Appwrite');
    }
    
    static logFirestoreOperation(operation, path, data = null) {
        console.warn('Firebase debug utils disabled - implement with Appwrite');
    }
    
    static validateEnvironment() {
        console.warn('Firebase environment validation disabled - implement with Appwrite');
        return false;
    }
}

export class ConnectionMonitor {
    constructor() {
        this.isOnline = navigator.onLine;
        this.callbacks = [];
        console.warn('Firebase connection monitor disabled - implement with Appwrite');
    }
    
    onConnectionChange(callback) {
        console.warn('Firebase connection monitor disabled - implement with Appwrite');
        callback(this.isOnline);
        return () => {};
    }
    
    removeCallback(callback) {
        console.warn('Firebase connection monitor disabled - implement with Appwrite');
    }
}

// Initialize connection monitor (stub)
export const connectionMonitor = new ConnectionMonitor();
