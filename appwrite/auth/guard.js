// === ZENBAN AUTHENTICATION GUARD ===
// This module provides mandatory authentication checking and routing
// Must be loaded before the main app to ensure authentication is required

(function(window) {

    // Configuration
    const AUTH_CONFIG = {
        authPageUrl: '/appwrite/auth/index.html',
        mainAppUrl: '/index.html',
        storageKey: 'zenbanAuth'
    };

    // Initialize Appwrite if not already done
    let account = null;
    let client = null;

    try {
        // Use existing client if available
        if (window.appwriteClient && window.appwriteAccount) {
            client = window.appwriteClient;
            account = window.appwriteAccount;
        } else {
            // Initialize new client
            client = new Appwrite.Client()
                .setEndpoint('https://sfo.cloud.appwrite.io/v1')
                .setProject('68b6ed180029c5632ed3');

            account = new Appwrite.Account(client);

            // Make globally available
            window.appwriteClient = client;
            window.appwriteAccount = account;
        }
    } catch (error) {
        console.error('Failed to initialize Appwrite client:', error);
    }

    // Auth Guard class
    class AuthGuard {
        constructor() {
            this.isAuthenticating = false;
            this.currentUser = null;
            this.sessionMonitor = null;
            this.isMonitoring = false;
            this.lastAuthCheck = null;
        }

        /**
         * Check if user is authenticated
         * Returns user object if authenticated, null otherwise
         */
        async getCurrentUser() {
            if (!account) return null;

            try {
                const user = await account.get();

                // Validate user (including anonymous/guest users)
                this.currentUser = user;

                // Cache in localStorage for faster access
                const authData = {
                    userId: user.$id,
                    email: user.email || 'guest@zenban.app',
                    name: user.name || 'Guest',
                    isAnonymous: user.labels?.includes('anonymous'),
                    authenticatedAt: new Date().toISOString()
                };
                localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(authData));

                return user;
            } catch (error) {
                console.log('Not authenticated:', error.message);
                this.currentUser = null;
                localStorage.removeItem(AUTH_CONFIG.storageKey);
                return null;
            }
        }

        /**
         * Check authentication state (with localStorage fallback)
         */
        async checkAuthState() {
            console.log('🔍 Checking authentication state...');

            // First check localStorage cache
            try {
                const localAuth = localStorage.getItem(AUTH_CONFIG.storageKey);
                if (localAuth) {
                    const authData = JSON.parse(localAuth);

                    // Validate cached data structure
                    if (!authData || !authData.userId || !authData.authenticatedAt) {
                        console.log('❌ Invalid cached authentication data structure');
                        localStorage.removeItem(AUTH_CONFIG.storageKey);
                        return false;
                    }

                    // Check if cache is recent (within 24 hours)
                    const authenticatedAt = new Date(authData.authenticatedAt);
                    const now = new Date();
                    const timeDiff = now - authenticatedAt;

                    console.log('📅 Cache age:', Math.floor(timeDiff / 1000), 'seconds');

                    if (timeDiff < (24 * 60 * 60 * 1000)) { // 24 hours
                        console.log('💾 Valid cached authentication found');

                        // Additional validation: ensure user data looks legitimate
                        if (!authData.email || authData.email.trim() === '') {
                            console.log('❌ Cached session has invalid email - treating as unauthenticated');
                            localStorage.removeItem(AUTH_CONFIG.storageKey);
                            return false;
                        }

                        // Set current user from cache
                        this.currentUser = authData;

                        // Try to validate with Appwrite (fresh check)
                        try {
                            const freshUser = await account.get();
                            console.log('👤 Fresh Appwrite session confirmed');
                            return true;
                        } catch (freshError) {
                            // Appwrite session expired but cache is valid
                            console.log('⚠️ Cached session valid but Appwrite session expired');
                            return true; // Trust cache if it's recent
                        }
                    } else {
                        console.log('⏰ Cache expired, clearing...');
                        localStorage.removeItem(AUTH_CONFIG.storageKey);
                    }
                } else {
                    console.log('📭 No cached authentication found');
                }
            } catch (error) {
                console.error('❌ Error checking cached auth:', error);
                localStorage.removeItem(AUTH_CONFIG.storageKey);
            }

            // If no valid cache, check Appwrite directly
            console.log('🔍 Checking Appwrite session directly...');
            const freshUser = await this.getCurrentUser();
            if (freshUser) {
                console.log('✅ Appwrite session found');
                return true;
            }

            console.log('🚫 No authentication found');
            return false;
        }

        /**
         * Redirect to authentication page
         */
        redirectToAuth() {
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `${AUTH_CONFIG.authPageUrl}?redirect=${currentUrl}`;
        }

        /**
         * Redirect to main app
         */
        redirectToApp() {
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');

            if (redirect) {
                // Decode the redirect URL and ensure it's a valid path
                try {
                    const decodedRedirect = decodeURIComponent(redirect);
                    // Check if it's a valid URL or just a path
                    if (decodedRedirect.startsWith('http')) {
                        // It's a full URL, use it as is
                        window.location.href = decodedRedirect;
                    } else {
                        // It's a relative path, resolve it properly
                        const baseUrl = window.location.origin + window.location.pathname;
                        const resolvedUrl = new URL(decodedRedirect, baseUrl).href;
                        window.location.href = resolvedUrl;
                    }
                } catch (e) {
                    // Fallback to main app URL if redirect fails
                    window.location.href = AUTH_CONFIG.mainAppUrl;
                }
            } else {
                window.location.href = AUTH_CONFIG.mainAppUrl;
            }
        }

        /**
         * Enforce mandatory authentication (allow guest users for testing)
         */
        async enforceAuth() {
            // Don't enforce if already authenticating
            if (this.isAuthenticating) return;
            this.isAuthenticating = true;

            const isAuthenticated = await this.checkAuthState();

            // If we have any user (including anonymous), allow access for testing
            if (isAuthenticated && this.currentUser) {
                console.log('User confirmed (including guest). Proceeding...', {
                    userId: this.currentUser.$id,
                    email: this.currentUser.email,
                    isAnonymous: this.currentUser.labels?.includes('anonymous')
                });
                this.isAuthenticating = false;
                return true;
            }

            // If no user found, redirect to auth page
            console.log('No user found. Redirecting to auth page...');
            this.redirectToAuth();
            this.isAuthenticating = false;
            return false;
        }

        /**
         * Check if current page is auth page
         */
        isAuthPage() {
            return window.location.pathname.includes('/auth/') ||
                   window.location.href.includes('/auth/');
        }

        /**
         * Sign out current user (clear both cache and session)
         */
        async signOut() {
            console.log('🚪 Signing user out...');

            try {
                // Clear session (don't fail if this errors)
                if (account) {
                    try {
                        await account.deleteSession('current');
                        console.log('🗑️ Session cleared');
                    } catch (sessionError) {
                        console.warn('Session delete error:', sessionError.message);
                    }
                }

                // Clear local cache
                localStorage.removeItem(AUTH_CONFIG.storageKey);
                this.currentUser = null;
                console.log('🗂️ Cache cleared');

                // Redirect to auth page
                this.redirectToAuth();
                return true;
            } catch (error) {
                console.error('Sign out error:', error);
                // Still try to redirect even if there was an error
                this.redirectToAuth();
                return false;
            }
        }

        /**
         * Handle OAuth callback
         */
        handleOAuthCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const isOAuthSuccess = urlParams.has('auth') && urlParams.get('auth') === 'success';
            const isOAuthFailure = urlParams.has('error') && urlParams.get('error') === 'oauth_failed';

            if (isOAuthSuccess) {
                console.log('OAuth success callback detected');
                this.redirectToApp();
                return true;
            } else if (isOAuthFailure) {
                console.log('OAuth failure callback detected');
                // Error will be handled by auth page
                return false;
            }

            return null;
        }

        /**
         * Get current user information
         */
        getUser() {
            return this.currentUser;
        }

        /**
         * Start continuous session monitoring (every 10 seconds)
         */
        startSessionMonitoring() {
            if (this.isMonitoring || !account) {
                console.log('Session monitoring already active or account not available');
                return;
            }

            this.isMonitoring = true;
            console.log('👀 Starting continuous session monitoring (10-second intervals)');

            // Clear any existing monitor
            if (this.sessionMonitor) {
                clearInterval(this.sessionMonitor);
            }

            // Start monitoring
            this.sessionMonitor = setInterval(async () => {
                await this.validateSession();
            }, 10000); // Check every 10 seconds

            // Initial check
            setTimeout(() => this.validateSession(), 1000);
        }

        /**
         * Stop session monitoring
         */
        stopSessionMonitoring() {
            if (!this.isMonitoring) return;

            this.isMonitoring = false;
            if (this.sessionMonitor) {
                clearInterval(this.sessionMonitor);
                this.sessionMonitor = null;
            }
            console.log('⏸️ Stopped session monitoring');
        }

        /**
         * Validate current session and redirect if expired
         */
        async validateSession() {
            if (!account) return;

            const now = new Date();
            const timeSinceLastCheck = this.lastAuthCheck ? now - this.lastAuthCheck : Infinity;
            this.lastAuthCheck = now;

            try {
                // Check if we have a cached user
                const localAuth = localStorage.getItem(AUTH_CONFIG.storageKey);

                if (localAuth) {
                    const authData = JSON.parse(localAuth);

                    // Quick validation of cache structure
                    if (authData && authData.userId) {
                        // Try to refresh session with Appwrite
                        console.log('🔄 Validating session with Appwrite...');
                        const user = await account.get();

                        // Session is valid - update cache timestamp
                        this.currentUser = user;
                        const updatedAuthData = {
                            ...authData,
                            authenticatedAt: new Date().toISOString()
                        };
                        localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(updatedAuthData));

                        console.log('✅ Session validated successfully', {
                            userId: user.$id,
                            email: user.email || 'anonymous'
                        });

                        // UI updates handled by main index.html sign out button

                        return true;
                    }
                } else {
                    console.log('⚠️ No cached session found during monitoring');
                }

                throw new Error('No valid session found');

            } catch (error) {
                console.warn('🚨 Session validation failed:', error.message);

                // Session has expired or is invalid
                console.log('🔴 Session expired - clearing cache and redirecting to auth');

                // Clear invalid session data
                localStorage.removeItem(AUTH_CONFIG.storageKey);
                this.currentUser = null;

                // UI updates handled by main index.html sign out button

                // Stop monitoring temporarily to avoid infinite redirects
                this.stopSessionMonitoring();

                // Redirect to auth page after a small delay
                setTimeout(() => {
                    console.log('🔀 Redirecting to auth page due to expired session');
                    this.redirectToAuth();
                }, 1000);

                return false;
            }
        }
    }

    // Create global instance
    const authGuard = new AuthGuard();

    // Export to global scope
    window.AuthGuard = AuthGuard;
    window.authGuard = authGuard;

    // Auto-initialize for main app (skip for auth page)
    if (!authGuard.isAuthPage()) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                const isAuthenticated = await authGuard.enforceAuth();
                // Start session monitoring if user is authenticated
                if (isAuthenticated) {
                    authGuard.startSessionMonitoring();
                }
            });
        } else {
            // DOM already ready
            setTimeout(async () => {
                const isAuthenticated = await authGuard.enforceAuth();
                // Start session monitoring if user is authenticated
                if (isAuthenticated) {
                    authGuard.startSessionMonitoring();
                }
            }, 0);
        }

        // Handle OAuth callbacks
        if (window.location.search) {
            authGuard.handleOAuthCallback();
        }
    } else {
        console.log('Auth page detected - skipping auth enforcement');
    }

})(window);

// Utility function for other scripts
window.requireAuth = () => window.authGuard && window.authGuard.enforceAuth();

// Function to check if user is logged in
window.isAuthenticated = () => {
    return !!(window.authGuard && window.authGuard.currentUser);
};

// Function to get current user
window.getCurrentUser = () => {
    return window.authGuard ? window.authGuard.getUser() : null;
};

console.log('🔐 Zenban Authentication Guard loaded');
