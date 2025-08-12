// Authentication UI and logic - CSP compliant version
import { authService } from './firebase-config.js';
import { setAuthInProgress } from './guest-auth-init.js';

// Create auth modal HTML without inline event handlers
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

// Auth UI controller
export const authUI = {
    isSignIn: false, // Default to Sign Up mode
    modal: null,
    
    init() {
        Debug.auth.start();
        Debug.auth.step('Initializing auth UI');
        
        // Add auth modal to page
        this.modal = createAuthModal();
        document.body.appendChild(this.modal);
        Debug.auth.step('Auth modal added to DOM');
        
        // Add auth button to top bar
        this.addAuthButton();
        Debug.auth.step('Auth button added to toolbar');
        
        // Setup event listeners after modal is created
        this.setupEventListeners();
        Debug.auth.step('Event listeners configured');
        
        // Check for Google redirect result (disabled - using popup auth now)
        // This was causing sessionStorage errors, so we've switched to popup-based auth
        /*
        authService.checkRedirectResult().then(result => {
            if (result.success && result.user) {
                console.log('🎉 Google sign-in completed via redirect');
                // Force UI update
                this.updateUIForUser(result.user);
                // Trigger board sync after successful auth
                if (window.syncService) {
                    window.syncService.loadBoardsFromFirebase();
                }
            }
        });
        */
        
        // Listen for auth state changes
        authService.onAuthStateChange((user) => {
            Debug.auth.step('Auth state changed');
            Debug.auth.detail('Auth state', user ? {
                email: user.email,
                isAnonymous: user.isAnonymous,
                uid: user.uid,
                emailVerified: user.emailVerified
            } : { status: 'No user' });
            
            // Detect if this is a real email user (not anonymous)
            const isRealUser = user && !user.isAnonymous && user.email && user.email !== 'none' && user.email !== 'guest@zenban.app';
            
            if (isRealUser) {
                Debug.auth.detail('Real user authenticated', { email: user.email });
            }
            
            // Force UI update with delay to ensure DOM is ready
            setTimeout(() => {
                this.updateUIForUser(user);
            }, 0);
            
            // Update dev mode info immediately when auth state changes
            if (window.setDevInfo) {
                if (user?.isAnonymous) {
                    const guestId = user.uid.slice(-6).toUpperCase();
                    window.setDevInfo('guestId', guestId);
                    window.setDevInfo('userEmail', null);
                    Debug.auth.detail('Dev mode updated - Guest', { guestId });
                } else if (user) {
                    window.setDevInfo('guestId', null);
                    window.setDevInfo('userEmail', user.email);
                    Debug.auth.detail('Dev mode updated - User', { email: user.email });
                } else {
                    window.setDevInfo('guestId', null);
                    window.setDevInfo('userEmail', null);
                    Debug.auth.detail('Dev mode cleared - No user');
                }
            }
        });
        
        // Also check current user immediately
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            Debug.auth.detail('Current user on init', { uid: currentUser.uid });
            this.updateUIForUser(currentUser);
            
            // Update dev info for current user
            if (window.setDevInfo) {
                if (currentUser.isAnonymous) {
                    const guestId = currentUser.uid.slice(-6).toUpperCase();
                    window.setDevInfo('guestId', guestId);
                    window.setDevInfo('userEmail', null);
                    Debug.auth.detail('Dev info set on init - Guest', { guestId });
                } else {
                    window.setDevInfo('guestId', null);
                    window.setDevInfo('userEmail', currentUser.email);
                    Debug.auth.detail('Dev info set on init - User', { email: currentUser.email });
                }
            }
        }
        
        // Make functions globally available for compatibility
        window.authUI = this;
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
            if (!topBar) {
                Debug.auth.detail('Auth UI: topBar element not found, retrying in 500ms...');
                setTimeout(attemptAddButton, 500);
                return;
            }
            
            // Check if auth container already exists
            if (document.querySelector('.auth-button-container')) {
                Debug.auth.detail('Auth container already exists');
                return;
            }
            
            const authContainer = document.createElement('div');
            authContainer.className = 'auth-button-container';
            authContainer.innerHTML = `
                <button id="authButton" class="auth-button">
                    Sign In
                </button>
                <div id="userMenu" class="user-menu" style="display: none;">
                    <span id="userEmail"></span>
                    <button id="signOutBtn">Sign Out</button>
                </div>
            `;
            
            // Insert at the end of topBar to appear on the right
            topBar.appendChild(authContainer);
            
            // Setup event listeners for auth button
            const authButton = authContainer.querySelector('#authButton');
            const signOutBtn = authContainer.querySelector('#signOutBtn');
            
            if (authButton) {
                authButton.addEventListener('click', () => this.show());
                Debug.auth.step('Auth button event listener added');
            }
            
            if (signOutBtn) {
                // Store reference to the sign out handler so we can remove it later
                this.signOutHandler = () => this.signOut();
                signOutBtn.addEventListener('click', this.signOutHandler);
                Debug.auth.step('Sign out button event listener added');
            }
            
            Debug.auth.step('Auth container added to topBar successfully');
            
            // Check if we have a current user and update UI immediately
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                Debug.auth.detail('Current user found during button setup', { user: currentUser.email || 'Anonymous' });
                setTimeout(() => this.updateUIForUser(currentUser), 100);
            }
        };
        
        // Try to add button immediately, with fallback retry logic
        attemptAddButton();
    },
    
    show() {
        // Log current auth state when modal is opened
        const currentUser = authService.getCurrentUser();
        Debug.auth.step('Auth modal opened', {
            hasUser: !!currentUser,
            uid: currentUser?.uid,
            isAnonymous: currentUser?.isAnonymous
        });
        
        // Prevent guest account creation while auth modal is open
        setAuthInProgress(true);
        
        this.modal.style.display = 'flex';
        const emailInput = document.getElementById('authEmail');
        if (emailInput) {
            emailInput.focus();
        }
    },
    
    hide() {
        this.modal.style.display = 'none';
        this.clearErrors();
        
        // Re-enable guest account creation after modal closes
        // Wait longer to ensure guest auth init doesn't run prematurely
        setTimeout(() => {
            setAuthInProgress(false);
        }, 1500);
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
        
        // Prevent guest account creation during auth
        setAuthInProgress(true);
        
        // Show loading state
        const submitBtn = document.getElementById('authSubmitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Loading...';
        submitBtn.disabled = true;
        
        try {
            Debug.auth.step('Attempting sign-in with email');
            Debug.auth.detail('Sign-in email', { email });
            const result = this.isSignIn 
                ? await authService.signIn(email, password)
                : await authService.signUp(email, password);
            
            Debug.auth.detail('Auth result', { success: result.success });
                
            if (result.success) {
                Debug.auth.step('Sign-in successful');
                Debug.auth.detail('User details', {
                    email: result.user.email,
                    uid: result.user.uid,
                    isAnonymous: result.user.isAnonymous
                });
                
                this.hide();
                
                // Force immediate UI update with the authenticated user
                setTimeout(() => {
                    Debug.auth.detail('Forcing UI update for authenticated user');
                    this.updateUIForUser(result.user);
                }, 250);
                
                // Trigger board sync after successful auth
                if (window.syncService) {
                    window.syncService.loadBoardsFromFirebase();
                }
            } else {
                Debug.auth.stepError('Sign-in failed', result.error);
                this.showError(result.error);
            }
        } catch (error) {
            Debug.auth.stepError('Auth error', error);
            this.showError('Authentication failed. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            // Re-enable guest account creation
            setAuthInProgress(false);
        }
    },
    
    async signInWithGoogle() {
        this.clearErrors();
        
        // Prevent guest account creation during Google auth
        setAuthInProgress(true);
        
        try {
            Debug.auth.step('Attempting Google sign-in with popup');
            
            // Remove the non-existent popup test
            // Just try to sign in directly
            const result = await authService.signInWithGoogle();
            
            if (result.success) {
                Debug.auth.step('Google sign-in completed successfully');
                Debug.auth.detail('Signed in as', { email: result.user.email });
                
                this.hide();
                
                // Force immediate UI update
                setTimeout(() => {
                    this.updateUIForUser(result.user);
                }, 100);
                
                // Trigger board sync after successful auth
                if (window.syncService && window.syncService.loadBoardsFromFirebase) {
                    window.syncService.loadBoardsFromFirebase();
                }
            } else {
                Debug.auth.detail('Google sign-in failed', { error: result.error });
                
                if (result.storageIssue) {
                    this.showError('Google sign-in is blocked by browser privacy settings. Please use email authentication instead.');
                } else if (result.cspIssue) {
                    this.showError('Google sign-in is temporarily unavailable. Please use email sign-in instead.');
                } else {
                    this.showError(result.error || 'Google sign-in failed. Please try email authentication instead.');
                }
            }
        } catch (error) {
            Debug.auth.stepError('Google sign-in error', error);
            
            if (error.message?.includes('popup-blocked')) {
                this.showError('Popups are blocked by your browser. Please allow popups for this site or use email authentication.');
            } else if (error.code === 'auth/popup-closed-by-user') {
                this.showError('Google sign-in was cancelled. Please try again or use email authentication.');
            } else if (error.code === 'auth/popup-blocked') {
                this.showError('Popups are blocked by browser. Please allow popups and try again, or use email authentication.');
            } else if (error.message?.includes('partitioned') || error.message?.includes('third-party')) {
                this.showError('Google sign-in is blocked by browser privacy settings. Please use email authentication instead.');
            } else if (error.code === 'auth/internal-error' || error.message?.includes('internal-error')) {
                this.showError('Google sign-in is currently unavailable due to browser restrictions. Please use email authentication instead.');
            } else {
                this.showError('Google sign-in failed due to browser security settings. Please use email authentication instead.');
            }
            
            // Add helper text for email authentication
            setTimeout(() => {
                const errorEl = document.getElementById('authError');
                if (errorEl && errorEl.textContent.includes('email authentication')) {
                    errorEl.innerHTML += '<br><br><strong>Tip:</strong> Click "Sign Up" above to create an account with your email address.';
                }
            }, 100);
        } finally {
            // Re-enable guest account creation
            setTimeout(() => {
                setAuthInProgress(false);
            }, 1000);
        }
    },
    
    async signOut() {
        try {
            const result = await authService.signOut();
            if (result.success) {
                // Clear local data
                if (window.syncService) {
                    window.syncService.clearLocalData();
                }
            }
        } catch (error) {
            Debug.auth.stepError('Sign out error', error);
        }
    },
    
    updateUIForUser(user) {
        const authButton = document.getElementById('authButton');
        const userMenu = document.getElementById('userMenu');
        const userEmail = document.getElementById('userEmail');
        
        Debug.auth.detail('updateUIForUser called', { user: user ? { email: user.email, uid: user.uid } : null });
        
        if (!authButton || !userMenu) {
            Debug.auth.stepError('Auth UI elements not found, retrying...');
            setTimeout(() => this.updateUIForUser(user), 100);
            return;
        }
        
        if (user) {
            // Check if this is a real authenticated user (not anonymous)
            const isAuthenticatedUser = user && 
                                       !user.isAnonymous && 
                                       user.email && 
                                       user.email !== 'none' && 
                                       user.email !== 'guest@zenban.app';
            
            // Check if this is a guest user
            const isGuestUser = user && user.isAnonymous;
            
            if (isAuthenticatedUser) {
                // Real authenticated user - show user menu with email
                Debug.auth.step('AUTHENTICATED USER CONFIRMED');
                Debug.auth.detail('User email', { email: user.email });
                
                authButton.style.display = 'none';
                authButton.style.visibility = 'hidden';
                
                userMenu.style.display = 'flex';
                userMenu.style.visibility = 'visible';
                userMenu.style.alignItems = 'center';
                userMenu.style.gap = '12px';
                
                if (userEmail) {
                    userEmail.textContent = user.email;
                    Debug.auth.detail('Email element updated', { email: user.email });
                }
                
                // Restore sign out functionality for authenticated users
                const signOutBtn = userMenu.querySelector('#signOutBtn');
                if (signOutBtn) {
                    signOutBtn.textContent = 'Sign Out';
                    
                    // Remove guest handler if it exists
                    if (this.showAuthHandler) {
                        signOutBtn.removeEventListener('click', this.showAuthHandler);
                    }
                    
                    // Add back the sign out handler
                    if (!this.signOutHandler) {
                        this.signOutHandler = () => this.signOut();
                    }
                    signOutBtn.addEventListener('click', this.signOutHandler);
                }
                
            } else if (isGuestUser) {
                // Guest user - show user menu with guest ID
                const guestId = user.uid.slice(-6).toUpperCase();
                Debug.auth.step('GUEST USER CONFIRMED');
                Debug.auth.detail('Guest ID', { guestId });
                
                authButton.style.display = 'none';
                authButton.style.visibility = 'hidden';
                
                userMenu.style.display = 'flex';
                userMenu.style.visibility = 'visible';
                userMenu.style.alignItems = 'center';
                userMenu.style.gap = '12px';
                
                if (userEmail) {
                    userEmail.textContent = `Guest: ${guestId}`;
                    userEmail.style.color = '#888';
                    Debug.auth.detail('Guest ID element updated', { guestId });
                }
                
                // Update sign out button text for guest
                const signOutBtn = userMenu.querySelector('#signOutBtn');
                if (signOutBtn) {
                    signOutBtn.textContent = 'Sign In';
                    
                    // Remove the old sign out handler if it exists
                    if (this.signOutHandler) {
                        signOutBtn.removeEventListener('click', this.signOutHandler);
                    }
                    
                    // Add new handler for showing auth modal
                    this.showAuthHandler = () => this.show();
                    signOutBtn.addEventListener('click', this.showAuthHandler);
                }
            }
        } else {
            // No user - show sign in button
            Debug.auth.detail('No user - showing sign in button');
            
            authButton.style.display = 'block';
            authButton.style.visibility = 'visible';
            
            userMenu.style.display = 'none';
            userMenu.style.visibility = 'hidden';
            
            authButton.textContent = 'Sign In';
        }
        
        // Log final state
        Debug.auth.detail('Final state', {
            authButtonDisplay: window.getComputedStyle(authButton).display,
            userMenuDisplay: window.getComputedStyle(userMenu).display
        });
    },
    
    showError(message) {
        const errorEl = document.getElementById('authError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            errorEl.style.color = '#ff4444';
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
