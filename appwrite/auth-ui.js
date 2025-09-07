// === APPWRITE AUTHENTICATION UI ===
// This file replaces Firebase auth-ui.js and handles the authentication user interface
// using Appwrite services instead of Firebase Auth.
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
let authServiceRef;
waitForAppwriteServices().then(services => {
    authServiceRef = services.authService;
});

// === STANDALONE BUTTON CREATION - NO SERVICE DEPENDENCIES ===
function createAuthButtonImmediately() {
    // Early check to avoid duplicates
    if (document.getElementById('signOutBtn')) return;

    const topBar = document.getElementById('topBar');
    if (!topBar) {
        // Retry once after a small delay if topBar not ready
        setTimeout(createAuthButtonImmediately, 100);
        return;
    }

    // Create the button
    const authBtn = document.createElement('button');
    authBtn.id = 'signOutBtn';
    authBtn.className = 'auth-button';
    authBtn.textContent = 'Sign Out';

    // Simple click handler
    authBtn.addEventListener('click', async () => {
        try {
            // Try to sign out first
            if (window.authService?.signOut) {
                await window.authService.signOut();
            }
        } catch (error) {
            console.log('Sign out failed, redirecting anyway');
        }
        // Always redirect
        window.location.href = 'appwrite/auth/index.html';
    });

    // Insert into toolbar
    const whiteboardSwitcher = document.getElementById('whiteboardSwitcher');
    if (whiteboardSwitcher) {
        topBar.insertBefore(authBtn, whiteboardSwitcher);
    } else {
        topBar.insertBefore(authBtn, topBar.firstChild);
    }

    // Update text based on auth status
    updateButtonText();
}

// Simple button text update - responsive to user state changes
function updateButtonText() {
    const btn = document.getElementById('signOutBtn');
    if (!btn) return;

    // Check user status
    if (window.authService?.getCurrentUser?.()) {
        btn.textContent = 'Sign Out';
    } else {
        btn.textContent = 'Sign In';
        // Change click handler for sign-in
        btn.onclick = () => {
            // Send user to auth page - they can sign in there
            window.location.href = 'appwrite/auth/index.html';
        };
    }
}

// INIT: Run immediately when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createAuthButtonImmediately, 50); // Small delay for element settlement
    });
} else {
    setTimeout(createAuthButtonImmediately, 50);
}

// Also listen for any user state changes to update button text
function watchForUserChanges() {
    let lastUserState = null;

    const checkUserState = () => {
        let currentUserState = null;

        if (window.authService?.getCurrentUser) {
            const user = window.authService.getCurrentUser();
            currentUserState = user ? 'authenticated' : 'guest';
        }

        if (currentUserState !== lastUserState) {
            updateButtonText();
            lastUserState = currentUserState;
        }
    };

    // Check every second
    setInterval(checkUserState, 1000);
    // Initial check
    setTimeout(checkUserState, 500);
}

// Start watching for user state changes
watchForUserChanges();

// Create auth modal HTML (CSP-compliant)
function createAuthModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.id = 'authModal';
    modal.innerHTML = `
        <div class="auth-modal">
            <div class="auth-header">
                <h2 id="authTitle">Create Your Account</h2>
                <button class="auth-close auth-close-btn" type="button">×</button>
            </div>

            <div class="auth-form">
                <div class="auth-tabs">
                    <button class="auth-tab auth-signin-tab" type="button">Sign In</button>
                    <button class="auth-tab active auth-signup-tab" type="button">Sign Up</button>
                </div>

                <form id="authForm">
                    <div class="auth-input-group">
                        <input type="email" id="authEmail" placeholder="Email" required>
                    </div>
                    <div class="auth-input-group">
                        <input type="password" id="authPassword" placeholder="Password" required>
                    </div>
                    <div class="auth-input-group" id="confirmPasswordGroup">
                        <input type="password" id="authConfirmPassword" placeholder="Confirm Password">
                    </div>

                    <button type="submit" class="auth-submit" id="authSubmitBtn">Sign Up</button>
                </form>

                <div class="auth-divider">
                    <span>OR</span>
                </div>

                <button class="auth-google auth-google-btn" type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                <div class="auth-notice" style="margin-top: 16px; font-size: 12px; color: #888; text-align: center;">
                    <strong>Recommended:</strong> Use email sign-in for best compatibility
                </div>

                <div class="auth-error" id="authError"></div>
            </div>
        </div>
    `;
    return modal;
}

// Appwrite Auth UI controller - Replaces Firebase authUI
const authUI = {
    isSignIn: false, // Default to Sign Up mode
    modal: null,

    init() {
        window.Debug.appwrite.info('Initializing Appwrite auth UI');

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

        // Add auth modal to page
        this.modal = createAuthModal();
        document.body.appendChild(this.modal);

        // Setup event listeners
        this.setupEventListeners();

        // Add auth button to top bar (retry until successful)
        this.addAuthButton();

        // Add user info to sidebar menu
        this.addUserInfoTosidebar();

        // Wait for authService to be available before setting up auth listeners
        const waitForAuthService = () => {
            if (window.authService && window.authService.onAuthStateChange) {
                this.setupAuthListeners();
                // Check for existing session immediately
                setTimeout(() => this.checkInitialAuthState(), 500);
            } else {
                setTimeout(waitForAuthService, 100);
            }
        };
        waitForAuthService();

        // Make globally available
        window.authUI = this;

        window.Debug.appwrite.info('Auth UI initialized successfully');
    },

    setupAuthListeners() {
        // Listen for auth state changes with better error handling
        const handleAuthStateChange = (user) => {
            try {
                window.Debug.appwrite.step('Auth state changed in UI');

                // Detect real vs anonymous user using Appwrite's labels
                const isRealUser = user && 
                                  (!user.labels || !user.labels.includes('anonymous')) && 
                                  user.email && 
                                  user.email !== 'guest@zenban.app';

                if (isRealUser) {
                    window.Debug.appwrite.info('Real user authenticated', { email: user.email });
                } else if (user) {
                    window.Debug.appwrite.info('Anonymous user active', { userId: user.$id });
                }

                // Update UI with a small delay to ensure DOM is ready
                setTimeout(() => {
                    try {
                        this.updateUIForUser(user);
                        this.updateUserInfoForsidebar(user);
                    } catch (uiError) {
                        window.Debug.appwrite.error('UI update failed', uiError);
                    }
                }, 0);

                // Update dev mode info
                if (window.setDevInfo) {
                    try {
                        if (user && user.labels && user.labels.includes('anonymous')) {
                            const guestId = user.$id.slice(-6).toUpperCase();
                            window.setDevInfo('guestId', guestId);
                            window.setDevInfo('userEmail', null);
                        } else if (user) {
                            window.setDevInfo('guestId', null);
                            window.setDevInfo('userEmail', user.email);
                        } else {
                            window.setDevInfo('guestId', null);
                            window.setDevInfo('userEmail', null);
                        }
                    } catch (devError) {
                        window.Debug.appwrite.error('Dev info update failed', devError);
                    }
                }
            } catch (error) {
                window.Debug.appwrite.error('Auth state change handling failed', error);
            }
        };

        // Set up the listener with proper error handling
        window.authService.onAuthStateChange(handleAuthStateChange);

        // Check for OAuth callbacks and existing users
        setTimeout(() => this.checkInitialAuthState(), 500);
    },

    checkInitialAuthState() {
        // Check for OAuth callbacks on initialization
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;
        if (currentUser) {
            this.updateUIForUser(currentUser);
            this.updateUserInfoForsidebar(currentUser);
        } else if (window.authService && window.authService.checkOAuthResult) {
            // Check for OAuth result after page load
            setTimeout(async () => {
                const oauthResult = await window.authService.checkOAuthResult();
                if (oauthResult.success) {
                    this.updateUIForUser(oauthResult.user);
                    this.updateUserInfoForsidebar(oauthResult.user);

                    // Trigger board sync after OAuth success
                    if (window.syncService && window.syncService.loadInitialBoards) {
                        window.syncService.loadInitialBoards();
                    }
                }
            }, 1000);
        }
    },

    setupEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.auth-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Tab buttons
        const signinTab = this.modal.querySelector('.auth-signin-tab');
        const signupTab = this.modal.querySelector('.auth-signup-tab');

        if (signinTab) {
            signinTab.addEventListener('click', () => this.switchToSignIn());
        }
        if (signupTab) {
            signupTab.addEventListener('click', () => this.switchToSignUp());
        }

        // Form submission
        const authForm = this.modal.querySelector('#authForm');
        if (authForm) {
            authForm.addEventListener('submit', (event) => this.handleSubmit(event));
        }

        // Google sign-in button
        const googleBtn = this.modal.querySelector('.auth-google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.signInWithGoogle());
        }

        // Modal overlay click to close
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });
    },

    addAuthButton() {
        // Simple, direct button creation - no service dependencies, no retry logic
        const topBar = document.getElementById('topBar');
        const whiteboardSwitcher = document.getElementById('whiteboardSwitcher');

        // Return early if button already exists
        if (document.getElementById('signOutBtn')) return;

        // Return early if topBar doesn't exist
        if (!topBar) return;

        // Create button
        const authButton = document.createElement('button');
        authButton.id = 'signOutBtn';
        authButton.className = 'auth-button';
        authButton.textContent = 'Sign Out';
        authButton.style.cssText = 'margin-right: 15px; align-self: center;';

        // Add click handler
        authButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Simple user check - handle gracefully if authService isn't ready
            if (window.authService?.getCurrentUser?.()) {
                // User exists - sign out
                this.signOut?.() || window.location.reload();
            } else {
                // No user or guest - show auth modal
                this.show?.();
            }
        });

        // Insert into toolbar
        if (whiteboardSwitcher) {
            topBar.insertBefore(authButton, whiteboardSwitcher);
        } else {
            topBar.insertBefore(authButton, topBar.firstChild);
        }

        // Update text based on current user
        if (window.authService?.getCurrentUser) {
            const currentUser = window.authService.getCurrentUser();
            if (!currentUser) {
                authButton.textContent = 'Sign In';
            }
        }
    },

    show() {
        const currentUser = window.authService.getCurrentUser();
        window.Debug.appwrite.step('Auth modal opened', {
            hasUser: !!currentUser,
            userId: currentUser?.$id
        });

        this.modal.style.display = 'flex';
        const emailInput = document.getElementById('authEmail');
        if (emailInput) {
            emailInput.focus();
        }
    },

    hide() {
        this.modal.style.display = 'none';
        this.clearErrors();
    },

    switchToSignIn() {
        this.isSignIn = true;
        document.getElementById('authTitle').textContent = 'Sign In to Zenban';
        document.getElementById('authSubmitBtn').textContent = 'Sign In';
        document.getElementById('confirmPasswordGroup').style.display = 'none';

        const tabs = this.modal.querySelectorAll('.auth-tab');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');

        this.clearErrors();
    },

    switchToSignUp() {
        this.isSignIn = false;
        document.getElementById('authTitle').textContent = 'Create Account';
        document.getElementById('authSubmitBtn').textContent = 'Sign Up';
        document.getElementById('confirmPasswordGroup').style.display = 'block';

        const tabs = this.modal.querySelectorAll('.auth-tab');
        tabs[1].classList.add('active');
        tabs[0].classList.remove('active');

        this.clearErrors();
    },

    async handleSubmit(event) {
        event.preventDefault();
        this.clearErrors();

        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;

        if (!this.isSignIn) {
            const confirmPassword = document.getElementById('authConfirmPassword').value;
            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }
        }

        // Show loading state
        const submitBtn = document.getElementById('authSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Loading...';
        submitBtn.disabled = true;

        try {
            window.Debug.appwrite.step('Attempting email authentication');
            const result = this.isSignIn
                ? await window.authService.signIn(email, password)
                : await window.authService.signUp(email, password);

            if (result.success) {
                window.Debug.appwrite.info('Email authentication successful');
                this.hide();

                // Force UI update
                setTimeout(() => {
                    this.updateUIForUser(result.user);
                }, 250);

                // Trigger board sync
                if (window.syncService) {
                    window.syncService.loadInitialBoards();
                }
            } else {
                window.Debug.appwrite.error('Email authentication failed', result.error);
                this.showError(result.error);
            }
        } catch (error) {
            window.Debug.appwrite.error('Auth error', error);
            this.showError('Authentication failed. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    },

    async signInWithGoogle() {
        this.clearErrors();

        try {
            window.Debug.appwrite.step('Attempting Google OAuth');
            const result = await window.authService.signInWithGoogle();

            if (result.success) {
                if (result.redirecting) {
                    window.Debug.appwrite.info('Google OAuth redirecting...');
                    // The page will redirect, so we don't need to do anything else
                    return;
                }

                window.Debug.appwrite.info('Google authentication successful');
                this.hide();

                // Force UI update with a small delay
                setTimeout(() => {
                    try {
                        const currentUser = window.authService.getCurrentUser();
                        this.updateUIForUser(currentUser);
                    } catch (uiError) {
                        window.Debug.appwrite.error('UI update after Google auth failed', uiError);
                    }
                }, 100);

                // Trigger board sync
                if (window.syncService && window.syncService.loadInitialBoards) {
                    setTimeout(() => {
                        try {
                            window.syncService.loadInitialBoards();
                        } catch (syncError) {
                            window.Debug.appwrite.error('Board sync after Google auth failed', syncError);
                        }
                    }, 200);
                }
            } else {
                window.Debug.appwrite.error('Google authentication failed', result.error);
                this.showError(result.error || 'Google sign-in failed. Please try email authentication instead.');
            }
        } catch (error) {
            window.Debug.appwrite.error('Google sign-in error', error);

            if (error.message?.includes('popup')) {
                this.showError('Popups are blocked. Please allow popups and try again, or use email authentication.');
            } else if (error.message?.includes('Invalid URI') || error.message?.includes('platform')) {
                this.showError('OAuth configuration issue. Please check Appwrite platform settings or try email authentication.');
            } else {
                this.showError('Google sign-in failed due to browser restrictions. Please use email authentication instead.');
            }
        }
    },

    async signOut() {
        try {
            window.Debug.appwrite.step('Attempting to sign out');
            // First clear local data
            if (window.syncService) {
                window.Debug.appwrite.step('Clearing local data');
                window.syncService.clearLocalData();
            }
            
            // Then sign out from Appwrite
            const result = await window.authService.signOut();
            window.Debug.appwrite.info('Sign out result', result);
            // Always proceed with signout regardless of result
            window.Debug.appwrite.info('Sign out successful');
            // Clear auth cache
            if (window.authGuard) {
                window.authGuard.currentUser = null;
            }
            localStorage.removeItem('zenbanAuth');
            // Redirect to auth page
            window.location.href = 'appwrite/auth/index.html';
        } catch (error) {
            window.Debug.appwrite.error('Sign out error', error);
            // Even if there's an error, still redirect to auth page
            window.location.href = 'appwrite/auth/index.html';
        }
    },

    addUserInfoTosidebar() {
        const attemptAddUserInfo = () => {
            const sidebarContent = document.querySelector('.sidebar-content .sidebar-content');
            if (!sidebarContent) {
                setTimeout(attemptAddUserInfo, 500);
                return;
            }

            // Check if user info container already exists
            if (document.querySelector('.sidebar-user-info')) {
                return;
            }

            const userInfoContainer = document.createElement('div');
            userInfoContainer.className = 'sidebar-user-info';
            userInfoContainer.innerHTML = `
                <div class="sidebar-separator"></div>
                <div class="sidebar-item" id="sidebarUserInfo" style="display: none;">
                    <span id="sidebarUserEmail" style="margin-left: 0; font-size: 0.85rem;"></span>
                </div>
            `;

            // Insert at appropriate location
            const bookmarksSection = sidebarContent.querySelector('.bookmarks-section');
            if (bookmarksSection) {
                sidebarContent.insertBefore(userInfoContainer, bookmarksSection);
            } else {
                sidebarContent.appendChild(userInfoContainer);
            }

            // Check current user and update UI
            const currentUser = window.authService.getCurrentUser();
            if (currentUser) {
                setTimeout(() => this.updateUserInfoForsidebar(currentUser), 100);
            }
        };

        attemptAddUserInfo();
    },

    // Simple button text update - button is always visible
    updateUIForUser(user) {
        const signOutBtn = document.getElementById('signOutBtn');
        if (!signOutBtn) return;

        // User exists and isn't anonymous - show "Sign Out"
        if (user && (!user.labels || !user.labels.includes('anonymous'))) {
            signOutBtn.textContent = 'Sign Out';
        } else {
            // No user or anonymous - show "Sign In"
            signOutBtn.textContent = 'Sign In';
        }
    },

    updateUserInfoForsidebar(user) {
        const userInfoElement = document.getElementById('sidebarUserInfo');
        const userEmailElement = document.getElementById('sidebarUserEmail');

        if (!userInfoElement || !userEmailElement) {
            setTimeout(() => this.updateUserInfoForsidebar(user), 100);
            return;
        }

        if (user) {
            // Check if this is a real authenticated user
            const isAuthenticatedUser = user &&
                                       (!user.labels || !user.labels.includes('anonymous')) &&
                                       user.email &&
                                       user.email !== 'guest@zenban.app';

            // Check if this is an anonymous user
            const isAnonymousUser = user && user.labels && user.labels.includes('anonymous');

            if (isAuthenticatedUser) {
                // Real user - show email
                userInfoElement.style.display = 'flex';
                userEmailElement.textContent = user.email;
                userEmailElement.style.color = '#40c9ff';
            } else if (isAnonymousUser) {
                // Anonymous user - show guest ID
                const guestId = user.$id.slice(-6).toUpperCase();
                userInfoElement.style.display = 'flex';
                userEmailElement.textContent = `Guest: ${guestId}`;
                userEmailElement.style.color = '#888';
            }
        } else {
            // No user - hide user info
            userInfoElement.style.display = 'none';
        }
    },

    showError(message) {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    },

    clearErrors() {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }
};

// Make authUI globally available (for compatibility)
window.authUI = authUI;
