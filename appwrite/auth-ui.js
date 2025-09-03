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
        // Listen for auth state changes
        window.authService.onAuthStateChange((user) => {
            window.Debug.appwrite.step('Auth state changed in UI');

            // Detect real vs anonymous user
            const isRealUser = user && (!user.labels || !user.labels.includes('anonymous')) && user.email && user.email !== 'guest@zenban.app';

            if (isRealUser) {
                window.Debug.appwrite.info('Real user authenticated', { email: user.email });
            } else if (user) {
                window.Debug.appwrite.info('Anonymous user active', { userId: user.$id });
            }

            // Update UI
            setTimeout(() => {
                this.updateUIForUser(user);
                this.updateUserInfoForsidebar(user);
            }, 0);

            // Update dev mode info
            if (window.setDevInfo) {
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
            }
        });

        // Check for OAuth callbacks and existing users
        this.checkInitialAuthState();
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
        const attemptAddButton = () => {
            const topBar = document.getElementById('topBar');
            const whiteboardSwitcher = document.getElementById('whiteboardSwitcher');

            window.Debug.appwrite.detail('Attempting to add auth button', {
                topBar: !!topBar,
                whiteboardSwitcher: !!whiteboardSwitcher,
                existing: !!document.querySelector('.auth-button-container')
            });

            if (!topBar || !whiteboardSwitcher) {
                window.Debug.appwrite.detail('Missing required elements, retrying in 200ms...');
                setTimeout(attemptAddButton, 200);
                return;
            }

            // Check if auth container already exists
            if (document.querySelector('.auth-button-container')) {
                window.Debug.appwrite.info('Auth button container already exists');
                return;
            }

            const authContainer = document.createElement('div');
            authContainer.className = 'auth-button-container';
            authContainer.innerHTML = `
                <button id="authButton" class="auth-button">
                    Sign In
                </button>
                <div id="userMenu" class="user-menu" style="display: none;">
                    <button id="signOutBtn">Sign Out</button>
                </div>
            `;

            // Insert before whiteboard switcher
            whiteboardSwitcher.insertAdjacentElement('beforebegin', authContainer);

            // Setup event listeners
            const authButton = authContainer.querySelector('#authButton');
            const signOutBtn = authContainer.querySelector('#signOutBtn');

            if (authButton) {
                authButton.addEventListener('click', () => this.show());
                window.Debug.appwrite.info('Auth button click listener added');
            }

            if (signOutBtn) {
                this.signOutHandler = () => this.signOut();
                signOutBtn.addEventListener('click', this.signOutHandler);
                window.Debug.appwrite.info('Sign out button click listener added');
            }

            window.Debug.appwrite.info('Auth button successfully added to toolbar');

            // Check current user and update UI after a delay
            setTimeout(() => {
                if (window.authService && window.authService.getCurrentUser) {
                    const currentUser = window.authService.getCurrentUser();
                    if (currentUser) {
                        this.updateUIForUser(currentUser);
                    }
                }
            }, 300);
        };

        // Start immediately, then retry if needed
        attemptAddButton();
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

                // Force UI update
                setTimeout(() => {
                    this.updateUIForUser(result.user);
                }, 100);

                // Trigger board sync
                if (window.syncService && window.syncService.loadInitialBoards) {
                    window.syncService.loadInitialBoards();
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
            const result = await window.authService.signOut();
            if (result.success) {
                // Clear local data
                if (window.syncService) {
                    window.syncService.clearLocalData();
                }
            }
        } catch (error) {
            window.Debug.appwrite.error('Sign out error', error);
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

    updateUIForUser(user) {
        const authButton = document.getElementById('authButton');
        const userMenu = document.getElementById('userMenu');

        if (!authButton || !userMenu) {
            setTimeout(() => this.updateUIForUser(user), 100);
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
                // Real user - show email and sign out option
                authButton.textContent = user.email;
                authButton.classList.add('authenticated');
                authButton.style.color = '#40c9ff';
                userMenu.style.display = 'block';
            } else if (isAnonymousUser) {
                // Anonymous user - show guest ID and sign in option
                const guestId = user.$id.slice(-6).toUpperCase();
                authButton.textContent = `Guest: ${guestId}`;
                authButton.classList.remove('authenticated');
                authButton.style.color = '#888';
                userMenu.style.display = 'none';
            }
        } else {
            // No user - show sign in button
            authButton.textContent = 'Sign In';
            authButton.classList.remove('authenticated');
            authButton.style.color = '';
            userMenu.style.display = 'none';
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
