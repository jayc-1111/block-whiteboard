// === APPWRITE GUEST AUTHENTICATION INITIALIZATION ===
// This file replaces Firebase guest-auth-init.js and handles automatic guest account creation
// using Appwrite anonymous sessions instead of Firebase anonymous authentication.
//
// Uses global Appwrite services (loaded via CDN)

// Wait for Appwrite services to be available
function waitForAppwriteServices() {
    return new Promise((resolve) => {
        const checkServices = () => {
            if (window.authService) {
                resolve({ authService: window.authService });
            } else {
                setTimeout(checkServices, 100);
            }
        };
        checkServices();
    });
}

// Get services when needed
let guestAuthService;
waitForAppwriteServices().then(services => {
    guestAuthService = services.authService;
});

// Wait for integration service to be available
function waitForIntegrationService() {
    return new Promise((resolve) => {
        const checkIntegration = () => {
            if (window.appwriteIntegration) {
                resolve({ appwriteIntegration: window.appwriteIntegration });
            } else {
                setTimeout(checkIntegration, 100);
            }
        };
        checkIntegration();
    });
}

// Track authentication state to prevent conflicts
let authInProgress = false;
let guestAuthTimeout = null;
let lastGuestCreationTime = 0;
let guestAuthInitInProgress = false;

// Configuration
const GUEST_CONFIG = {
    CREATION_COOLDOWN: 10000, // 10 seconds cooldown between guest creations
    GUEST_ID_KEY: 'zenban_appwrite_guest_id', // Updated storage key for Appwrite
    MAX_AUTH_WAIT_TIME: 3000 // Maximum wait time for auth state to stabilize
};

// Storage utilities
function getStoredGuestId() {
    try {
        return localStorage.getItem(GUEST_CONFIG.GUEST_ID_KEY);
    } catch (e) {
        window.Debug.appwrite.error('Cannot access localStorage', e);
        return null;
    }
}

function storeGuestId(uid) {
    try {
        localStorage.setItem(GUEST_CONFIG.GUEST_ID_KEY, uid);
        window.Debug.appwrite.info('Stored guest ID in localStorage', { uid });
    } catch (e) {
        window.Debug.appwrite.error('Cannot store guest ID in localStorage', e);
    }
}

function clearStoredGuestId() {
    try {
        localStorage.removeItem(GUEST_CONFIG.GUEST_ID_KEY);
        window.Debug.appwrite.info('Cleared stored guest ID');
    } catch (e) {
        window.Debug.appwrite.error('Cannot clear guest ID from localStorage', e);
    }
}

// Set authentication in progress flag
function setAuthInProgress(inProgress) {
    authInProgress = inProgress;
    window.Debug.appwrite.step(`Auth in progress: ${inProgress}`);
}

// Initialize guest authentication with Appwrite
async function initializeGuestAuth() {
    // Prevent concurrent initialization
    if (guestAuthInitInProgress) {
        window.Debug.appwrite.step('Guest auth initialization already in progress, skipping');
        return;
    }
    
    guestAuthInitInProgress = true;
    
    try {
        // Ensure Debug namespace exists
        if (!window.Debug || !window.Debug.appwrite) {
            window.Debug = window.Debug || {};
            window.Debug.appwrite = {
                info: (msg, data) => console.log(`🔷 APPWRITE: ${msg}`, data || ''),
                error: (msg, error) => console.error(`❌ APPWRITE ERROR: ${msg}`, error),
                step: (msg) => console.log(`👉 APPWRITE: ${msg}`),
                detail: (msg, data) => console.log(`📋 APPWRITE: ${msg}`, data || '')
            };
        }
        
        window.Debug.appwrite.step('Starting Appwrite guest auth initialization');
        
        // Clear any pending guest auth
        if (guestAuthTimeout) {
            clearTimeout(guestAuthTimeout);
            guestAuthTimeout = null;
        }
        
        // Check for stored guest ID
        const storedGuestId = getStoredGuestId();
        if (storedGuestId) {
            window.Debug.appwrite.info('Found stored guest ID', { uid: storedGuestId });
        }
        
        // Wait for auth state to stabilize using Appwrite's account system
        const currentUser = await new Promise((resolve) => {
            let resolved = false;
            let authStateCount = 0;
            let stableStateTimeout = null;
            
            const unsubscribe = guestAuthService.onAuthStateChange((user) => {
                authStateCount++;
                window.Debug.appwrite.detail('Auth state check', { 
                    hasUser: !!user,
                    uid: user?.$id,
                    isAnonymous: user?.labels?.includes('anonymous'),
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
                    // No user after multiple checks, auth state is stable
                    stableStateTimeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            unsubscribe();
                            resolve(null);
                        }
                    }, 500);
                }
            });
            
            // Maximum wait time
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    unsubscribe();
                    resolve(guestAuthService.getCurrentUser());
                }
            }, GUEST_CONFIG.MAX_AUTH_WAIT_TIME);
        });
        
        window.Debug.appwrite.step('Auth state determined', {
            hasUser: !!currentUser,
            uid: currentUser?.$id,
            isAnonymous: currentUser?.labels?.includes('anonymous'),
            storedGuestId: storedGuestId
        });
        
        // Validate stored guest ID against current user
        if (storedGuestId && currentUser && currentUser.$id !== storedGuestId) {
            window.Debug.appwrite.step('Stored guest ID does not match current user', {
                stored: storedGuestId,
                current: currentUser.$id
            });
            // Update stored ID to match current user
            storeGuestId(currentUser.$id);
        }
        
        // Clear invalid stored session
        if (storedGuestId && !currentUser && !authInProgress) {
            window.Debug.appwrite.step('Stored guest session appears invalid, clearing it');
            clearStoredGuestId();
        }
        
        // Create guest account if needed
        if (!currentUser && !authInProgress) {
            // Check cooldown period
            const timeSinceLastCreation = Date.now() - lastGuestCreationTime;
            if (timeSinceLastCreation < GUEST_CONFIG.CREATION_COOLDOWN) {
                window.Debug.appwrite.step('Guest creation on cooldown', { 
                    timeRemaining: Math.ceil((GUEST_CONFIG.CREATION_COOLDOWN - timeSinceLastCreation) / 1000) + 's' 
                });
                return;
            }
            
            window.Debug.appwrite.step('No user found - creating Appwrite anonymous session');
            
            // Set flag to prevent conflicts
            authInProgress = true;
            
            try {
                const result = await guestAuthService.signInAnonymously();
                
                if (result.success) {
                    window.Debug.appwrite.info('Guest account created successfully');
                    window.Debug.appwrite.detail('Guest details', { 
                        uid: result.user.$id,
                        guestId: result.user.$id.slice(-6).toUpperCase()
                    });
                    
                    // Store guest ID
                    storeGuestId(result.user.$id);
                    
                    // Update timestamp
                    lastGuestCreationTime = Date.now();
                    
                    // Update dev mode display
                    if (window.setDevInfo) {
                        const guestId = result.user.$id.slice(-6).toUpperCase();
                        window.setDevInfo('guestId', guestId);
                        window.setDevInfo('userEmail', null);
                    }
                } else {
                    window.Debug.appwrite.error('Failed to create guest account', result.error);
                }
            } catch (error) {
                window.Debug.appwrite.error('Guest account creation error', error);
            } finally {
                authInProgress = false;
            }
        } else if (currentUser) {
            window.Debug.appwrite.info('User already authenticated, skipping guest creation');
            
            // Ensure guest ID is stored if this is an anonymous user
            if (currentUser.labels?.includes('anonymous')) {
                storeGuestId(currentUser.$id);
                
                // Update dev mode display
                if (window.setDevInfo) {
                    const guestId = currentUser.$id.slice(-6).toUpperCase();
                    window.setDevInfo('guestId', guestId);
                    window.setDevInfo('userEmail', null);
                }
            } else {
                // Real user - clear guest ID and update dev mode
                clearStoredGuestId();
                
                if (window.setDevInfo) {
                    window.setDevInfo('guestId', null);
                    window.setDevInfo('userEmail', currentUser.email);
                }
            }
        }
        
        window.Debug.appwrite.info('Guest auth initialization completed');
        
        // Initialize database setup after successful authentication
        try {
            const integration = await waitForIntegrationService();
            if (integration.appwriteIntegration) {
                window.Debug.appwrite.step('Initializing database setup after auth...');
                const setupResult = await integration.appwriteIntegration.initializeDatabase();
                if (setupResult.success) {
                    window.Debug.appwrite.info('Database setup completed after guest auth');
                } else {
                    window.Debug.appwrite.warn('Database setup failed after guest auth', setupResult);
                    // Try alternative setup method if quick setup fails
                    if (setupResult.message === 'No authenticated user' && currentUser) {
                        window.Debug.appwrite.step('Trying alternative setup method for guest user...');
                        try {
                            // Force setup with the authenticated user
                            const alternativeResult = await integration.appwriteIntegration.setupDatabaseWithConsent();
                            if (alternativeResult.success) {
                                window.Debug.appwrite.info('Alternative database setup completed');
                            } else {
                                window.Debug.appwrite.error('Alternative database setup also failed', alternativeResult);
                            }
                        } catch (altError) {
                            window.Debug.appwrite.error('Alternative setup error', altError);
                        }
                    }
                }
            }
        } catch (dbError) {
            window.Debug.appwrite.error('Database setup error after guest auth', dbError);
        }
        
    } catch (error) {
        // Fallback error logging if Debug namespace is still not available
        if (window.Debug && window.Debug.appwrite) {
            window.Debug.appwrite.error('Guest auth initialization failed', error);
        } else {
            console.error('❌ GUEST AUTH ERROR: Guest auth initialization failed', error);
        }
    } finally {
        guestAuthInitInProgress = false;
    }
}

// Auto-initialize when DOM is ready
function autoInitializeGuestAuth() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeGuestAuth, 1000);
        });
    } else {
        // DOM already ready
        setTimeout(initializeGuestAuth, 1000);
    }
}

// Start auto-initialization
autoInitializeGuestAuth();

// Make functions globally available (for compatibility)
window.initializeGuestAuth = initializeGuestAuth;
window.setAuthInProgress = setAuthInProgress;
