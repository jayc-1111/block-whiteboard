// === FIREBASE GUEST AUTHENTICATION INITIALIZATION (REPLACED WITH APPWRITE) ===
// This file previously handled automatic guest account creation and initialization.
// It managed guest session persistence, auth state monitoring, and conflict prevention.
//
// Key Functions (Previously Exported):
// - initializeGuestAuth(): Create guest account if no user is authenticated
// - setAuthInProgress(inProgress): Flag to prevent conflicts during auth
//
// Guest Account Management:
// - Automatic anonymous sign-in for new users
// - LocalStorage persistence of guest ID
// - Cooldown period to prevent rapid guest account creation
// - Auth state monitoring to detect existing sessions
// - Guest session validation and cleanup
//
// Conflict Prevention:
// - Prevents guest creation during real auth attempts
// - Avoids duplicate guest accounts
// - Manages auth-in-progress flag
// - Coordinates with auth UI modal
//
// Session Persistence:
// - Stores guest ID in localStorage
// - Validates stored session against current user
// - Clears invalid sessions
// - Updates stored ID when session changes
//
// Initialization Flow:
// 1. Wait for Firebase Auth to be ready
// 2. Check for existing authenticated user
// 3. Validate stored guest ID against current session
// 4. Create new guest account if none exists
// 5. Set up auth state listeners for persistence
//
// TODO: Reimplement with Appwrite:
// - Replace Firebase anonymous auth with Appwrite anonymous sessions
// - Update localStorage keys and session validation
// - Replace authService calls with Appwrite account methods
// - Implement Appwrite auth state monitoring
// - Update cooldown and conflict prevention logic
//
// Original file backed up as guest-auth-init.js.BAK or logic replaced with this comment block.

/*
// Original Firebase import (commented out for reference):
/*
// Original Firebase import (commented out for reference):
// import { authService } from './firebase-config.js';
*/

// ==================================================================
// STUB EXPORTS - Prevent import errors while Firebase is disabled
// ==================================================================
// These are placeholder exports that return errors or no-ops
// Replace with actual Appwrite implementations

export async function initializeGuestAuth() {
    console.warn('Firebase guest auth disabled - implement with Appwrite');
    return Promise.resolve();
}

export function setAuthInProgress(inProgress) {
    console.warn('Firebase setAuthInProgress disabled - implement with Appwrite');
}

/*
// Original guest auth implementation (commented out for reference):

// Track if authentication is in progress to avoid conflicts
let authInProgress = false;
let guestAuthTimeout = null;
let lastGuestCreationTime = 0;
let guestAuthInitInProgress = false;

// Storage key for guest ID backup
const GUEST_ID_KEY = 'zenban_guest_id';
const GUEST_CREATION_COOLDOWN = 10000; // 10 seconds cooldown between guest creations

// Get stored guest ID
function getStoredGuestId() {
    try {
        return localStorage.getItem(GUEST_ID_KEY);
    } catch (e) {
        Debug.auth.warn('Cannot access localStorage', e);
        return null;
    }
}

// Store guest ID
function storeGuestId(uid) {
    try {
        localStorage.setItem(GUEST_ID_KEY, uid);
        Debug.auth.detail('Stored guest ID in localStorage', { uid });
    } catch (e) {
        Debug.auth.warn('Cannot store guest ID in localStorage', e);
    }
}

// Clear stored guest ID
function clearStoredGuestId() {
    try {
        localStorage.removeItem(GUEST_ID_KEY);
        Debug.auth.detail('Cleared stored guest ID');
    } catch (e) {
        Debug.auth.warn('Cannot clear guest ID from localStorage', e);
    }
}

// Initialize guest account only if no real authentication is happening
export async function initializeGuestAuth() {
    // Prevent concurrent initialization
    if (guestAuthInitInProgress) {
        Debug.auth.step('Guest auth initialization already in progress, skipping');
        return;
    }
    
    guestAuthInitInProgress = true;
    
    try {
        Debug.auth.start();
        Debug.auth.step('Checking authentication status');
    
    // Clear any pending guest auth
    if (guestAuthTimeout) {
        clearTimeout(guestAuthTimeout);
        guestAuthTimeout = null;
    }
    
    // Check for stored guest ID
    const storedGuestId = getStoredGuestId();
    if (storedGuestId) {
        Debug.auth.detail('Found stored guest ID', { uid: storedGuestId });
    }
    
    // Wait for Firebase Auth to be ready - wait for auth state to stabilize
    const currentUser = await new Promise((resolve) => {
        let resolved = false;
        let authStateCount = 0;
        let lastAuthState = undefined;
        let stableStateTimeout = null;
        
        const unsubscribe = authService.onAuthStateChange((user) => {
            authStateCount++;
            Debug.auth.detail('Auth state in promise', { 
                hasUser: !!user,
                uid: user?.uid,
                isAnonymous: user?.isAnonymous,
                stateCount: authStateCount
            });
            
            // Clear previous timeout
            if (stableStateTimeout) {
                clearTimeout(stableStateTimeout);
            }
            
            // If we have a user, resolve quickly
            if (user && !resolved) {
                stableStateTimeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        unsubscribe();
                        resolve(user);
                    }
                }, 200);
            } else if (!user && authStateCount >= 2) {
                // If no user after multiple checks, auth state is stable
                stableStateTimeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        unsubscribe();
                        resolve(null);
                    }
                }, 500);
            }
            
            lastAuthState = user;
        });
        
        // Maximum wait time
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                unsubscribe();
                resolve(lastAuthState || authService.getCurrentUser());
            }
        }, 3000); // Maximum 3 seconds wait
    });
    
    Debug.auth.step('Auth state determined', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        isAnonymous: currentUser?.isAnonymous,
        storedGuestId: storedGuestId
    });
    
    // Check if stored guest ID matches current user
    if (storedGuestId && currentUser && currentUser.uid !== storedGuestId) {
        Debug.auth.warn('Stored guest ID does not match current user', {
            stored: storedGuestId,
            current: currentUser.uid
        });
        // Update stored ID to match current user
        storeGuestId(currentUser.uid);
    }
    
    // If we have a stored guest ID but no current user, the session might be invalid
    if (storedGuestId && !currentUser && !authInProgress) {
        Debug.auth.step('Stored guest session appears invalid, clearing it');
        clearStoredGuestId();
    }
    
    if (!currentUser && !authInProgress) {
        // Check cooldown period
        const timeSinceLastCreation = Date.now() - lastGuestCreationTime;
        if (timeSinceLastCreation < GUEST_CREATION_COOLDOWN) {
            Debug.auth.step('Guest creation on cooldown', { 
                timeRemaining: Math.ceil((GUEST_CREATION_COOLDOWN - timeSinceLastCreation) / 1000) + 's' 
            });
            return;
        }
        
        Debug.auth.step('No user found - creating guest account');
        
        // Set flag to prevent conflicts
        authInProgress = true;
        
        try {
            const result = await authService.signInAnonymously();
            
            if (result.success) {
                Debug.auth.step('Guest account created');
                Debug.auth.detail('UID', { uid: result.user.uid });
                Debug.auth.detail('Guest ID', { guestId: result.user.uid.slice(-6).toUpperCase() });
                
                // Store guest ID for persistence
                storeGuestId(result.user.uid);
                lastGuestCreationTime = Date.now();
                
                // Sync service will handle loading boards on auth state change
                Debug.auth.step('Initial sync will be handled by sync service auth listener');
            } else {
                Debug.auth.stepError('Guest account creation failed', result.error);
            }
        } finally {
            authInProgress = false;
        }
    } else if (currentUser?.isAnonymous) {
        Debug.auth.step('Guest user already authenticated');
        Debug.auth.detail('UID', { uid: currentUser.uid });
        Debug.auth.detail('Guest ID', { guestId: currentUser.uid.slice(-6).toUpperCase() });
        
        // Update stored guest ID if different
        if (currentUser.uid !== storedGuestId) {
            Debug.auth.step('Updating stored guest ID');
            storeGuestId(currentUser.uid);
        }
        
        // Sync service will handle loading boards on auth state change
        Debug.auth.step('Sync will be handled by sync service auth listener');
    } else if (currentUser) {
        Debug.auth.step('Authenticated user found', { email: currentUser.email });
        // Clear stored guest ID since we have a real user
        if (storedGuestId) {
            clearStoredGuestId();
        }
    } else {
        Debug.auth.step('Authentication in progress - skipping guest creation');
    }
    } finally {
        guestAuthInitInProgress = false;
    }
}

// Function to set auth in progress (called by auth UI)
export function setAuthInProgress(inProgress) {
    authInProgress = inProgress;
    Debug.auth.detail('Auth in progress', { status: inProgress });
}

// Listen for auth state changes to update localStorage
// if (window.authService) {
//     authService.onAuthStateChange((user) => {
//         if (user?.isAnonymous) {
//             // Update stored guest ID
//             storeGuestId(user.uid);
//         } else if (user && !user.isAnonymous) {
//             // Clear stored guest ID for real users
//             clearStoredGuestId();
//         }
//     });
// }

// Delayed initialization to avoid conflicts with real auth
// setTimeout(() => {
//     initializeGuestAuth().catch(error => {
//         Debug.auth.error('Guest auth initialization failed', error);
//     });
// }, 1000); // Wait 1 second for app initialization

// ... (Full guest auth implementation commented out - see guest-auth-init.js.BAK)
// ... (Includes: localStorage management, session validation, cooldown logic)
// ... (Auth state monitoring, conflict prevention, initialization flow)
*/
