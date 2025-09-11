// === FIREBASE CONFIGURATION FILE (REPLACED WITH APPWRITE) ===
// This file previously handled Firebase App initialization, Auth setup, and Firestore DB setup.
// It exported three main services that need to be reimplemented with Appwrite:
//
// 1. authService: Handled user authentication and account management
//    Key Functions (Previously Exported):
//    - authService.signInAnonymously() → Appwrite: account.createAnonymousSession()
//    - authService.signUp(email, password) → Appwrite: account.create() + account.createEmailSession()
//    - authService.signIn(email, password) → Appwrite: account.createEmailSession()
//    - authService.signInWithGoogle() → Appwrite: account.createOAuth2Session('google')
//    - authService.signOut() → Appwrite: account.deleteSession('current')
//    - authService.getCurrentUser() → Appwrite: account.get()
//    - authService.onAuthStateChange(callback) → Custom implementation with Appwrite
//    - authService.transferAnonymousData(fromUid, toUid) → Custom Appwrite implementation
//    - authService.createUserProfile(user, isGuest) → Appwrite: databases.createDocument()
//    - authService.updateUserProfileAfterLink(user) → Appwrite: databases.updateDocument()
//
// 2. dbService: Handled saving, loading, and deleting board data to/from Firestore
//    Key Functions (Previously Exported):
//    - dbService.saveBoard(boardData) → Appwrite: databases.createDocument() or databases.updateDocument()
//    - dbService.loadBoards() → Appwrite: databases.listDocuments()
//    - dbService.loadBoard(board_id) → Appwrite: databases.getDocument()
//    - dbService.deleteBoard(board_id) → Appwrite: databases.deleteDocument()
//    - dbService.getUserProfile() → Appwrite: databases.getDocument()
//
// 3. offlineService: Provided basic offline capability control
//    Key Functions (Previously Exported):
//    - offlineService.goOffline() → Custom implementation with Appwrite
//    - offlineService.goOnline() → Custom implementation with Appwrite
//
// Original Firebase configuration was:
// apiKey: "AIzaSyC0cgmwruNyna-KRs-T_uDRQ77g-oi-Zds"
// authDomain: "zenban-fb04d.firebaseapp.com"
// projectId: "zenban-fb04d"
// storageBucket: "zenban-fb04d.firebasestorage.app"
// messagingSenderId: "922934322238"
// appId: "1:922934322238:web:f356f25b2d80306b379d6f"
//
// TODO: Replace with Appwrite configuration:
// - Appwrite endpoint URL
// - Appwrite project ID
// - Appwrite database ID
// - Appwrite collections for users and boards
//
// File backed up as firebase-config.js.BAK or logic replaced with this comment block.

/*
// Original Firebase imports (commented out for reference):
// import { FirebaseErrorHandler, FirebaseDebugUtils } from './firebase-error-handler.js';
// import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
// import { 
//     getAuth, 
//     signInWithEmailAndPassword, 
//     createUserWithEmailAndPassword,
//     signInWithPopup,
//     signInWithRedirect,
//     getRedirectResult,
//     GoogleAuthProvider,
//     signOut as firebaseSignOut,
//     onAuthStateChanged,
//     signInAnonymously,
//     linkWithCredential,
//     EmailAuthProvider,
//     GoogleAuthProvider as GoogleProvider,
//     linkWithPopup,
//     linkWithRedirect,
//     browserLocalPersistence,
//     setPersistence
// } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
// import { 
//     getFirestore,
//     doc,
//     setDoc,
//     getDoc,
//     getDocs,
//     collection,
//     query,
//     orderBy,
//     deleteDoc,
//     serverTimestamp,
//     enableNetwork,
//     disableNetwork,
//     updateDoc
// } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
*/

/*
// Original Firebase configuration (commented out for reference):
// const firebaseConfig = {
//     apiKey: "AIzaSyC0cgmwruNyna-KRs-T_uDRQ77g-oi-Zds",
//     authDomain: "zenban-fb04d.firebaseapp.com",
//     projectId: "zenban-fb04d",
//     storageBucket: "zenban-fb04d.firebasestorage.app",
//     messagingSenderId: "922934322238",
//     appId: "1:922934322238:web:f356f25b2d80306b379d6f",
//     measurementId: "G-35KTYPS824"
// };

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);
// const googleProvider = new GoogleAuthProvider();

// Set auth persistence to local (survives page refresh)
// setPersistence(auth, browserLocalPersistence).catch((error) => {
//     console.error('Failed to set auth persistence:', error);
// });

// Make db globally available for live sync
// window.db = db;

// Make authService globally available for environment checks
// window.authService = null; // Will be set after export

// Auth state observer
// let currentUser = null;
// const authStateCallbacks = [];

// onAuthStateChanged(auth, (user) => {
//     currentUser = user;
//     authStateCallbacks.forEach(callback => callback(user));
// });
*/

// TODO: Implement authService with Appwrite
// The authService object provided these authentication functions:
// - signInAnonymously(): Create anonymous session for guest users
// - signUp(email, password): Create new user account and sign in
// - signIn(email, password): Sign in existing user
// - signInWithGoogle(): OAuth sign-in with Google
// - transferAnonymousData(fromUid, toUid): Transfer guest data to real account
// - signOut(): Sign out current user
// - createUserProfile(user, isGuest): Create user profile document
// - updateUserProfileAfterLink(user): Update profile after account linking
// - getCurrentUser(): Get currently authenticated user
// - onAuthStateChange(callback): Subscribe to auth state changes
// - checkRedirectResult(): Check for OAuth redirect results

/*
// Original authService implementation (commented out for reference):
    // Sign in anonymously (guest account)
    async signInAnonymously() {
        try {
            // First check if we already have a user
            const existingUser = auth.currentUser;
            if (existingUser && existingUser.isAnonymous) {
                Debug.auth.step('Using existing anonymous user', { uid: existingUser.uid });
                return { success: true, user: existingUser };
            }
            
            // Enable persistence before signing in
            await setPersistence(auth, browserLocalPersistence);
            
            const userCredential = await signInAnonymously(auth);
            await this.createUserProfile(userCredential.user, true); // true = guest account
            return { success: true, user: userCredential.user };
        } catch (error) {
            Debug.auth.stepError('Anonymous sign-in failed', error);
            return { success: false, error: error.message };
        }
    },

    // Transfer data from anonymous account to real account
    async transferAnonymousData(fromUid, toUid) {
        try {
            Debug.sync.start();
            Debug.sync.step('Starting data transfer');
            Debug.sync.detail('From', { guestId: fromUid });
            Debug.sync.detail('To', { userId: toUid });
            
            // Get all boards from anonymous account
            const boardsRef = collection(db, 'users', fromUid, 'boards');
            const boardsSnapshot = await getDocs(boardsRef);
            
            // Transfer each board to the new account
            for (const boardDoc of boardsSnapshot.docs) {
                const boardData = boardDoc.data();
                boardData.owner = toUid; // Update owner
                await setDoc(doc(db, 'users', toUid, 'boards', boardDoc.id), boardData);
            }
            
            // Delete anonymous user data after successful transfer
            for (const boardDoc of boardsSnapshot.docs) {
                await deleteDoc(doc(db, 'users', fromUid, 'boards', boardDoc.id));
            }
            
            // Delete anonymous user profile
            await deleteDoc(doc(db, 'users', fromUid));
            
            Debug.sync.done(`Transferred ${boardsSnapshot.size} boards`);
            return { success: true, boardCount: boardsSnapshot.size };
        } catch (error) {
            Debug.sync.stepError('Data transfer failed', error);
            return { success: false, error: error.message };
        }
    },
    // Sign up with email/password
    async signUp(email, password) {
        try {
            // Check if current user is anonymous
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.isAnonymous) {
                // Link anonymous account to email/password
                const credential = EmailAuthProvider.credential(email, password);
                try {
                    const userCredential = await linkWithCredential(currentUser, credential);
                    await this.updateUserProfileAfterLink(userCredential.user);
                    return { success: true, user: userCredential.user };
                } catch (linkError) {
                    // If linking fails (account already exists), sign in and transfer data
                    if (linkError.code === 'auth/credential-already-in-use' || 
                        linkError.code === 'auth/email-already-in-use') {
                        const anonymousUid = currentUser.uid;
                        const signInResult = await signInWithEmailAndPassword(auth, email, password);
                        await this.transferAnonymousData(anonymousUid, signInResult.user.uid);
                        return { success: true, user: signInResult.user };
                    }
                    throw linkError;
                }
            } else {
                // Regular sign up
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await this.createUserProfile(userCredential.user);
                return { success: true, user: userCredential.user };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sign in with email/password
    async signIn(email, password) {
        return await FirebaseErrorHandler.safeAsyncCall(async () => {
            // Check if current user is anonymous
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.isAnonymous) {
                const anonymousUid = currentUser.uid;
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                await this.transferAnonymousData(anonymousUid, userCredential.user.uid);
                return { success: true, user: userCredential.user };
            } else {
                // Regular sign in
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                return { success: true, user: userCredential.user };
            }
        }, 'Email Sign In').then(result => {
            if (result.success) {
                FirebaseDebugUtils.logAuthState(result.data.user, 'Email Sign In Success');
                return result.data;
            } else {
                return { success: false, error: result.error };
            }
        });
    },

    // Sign in with Google
    async signInWithGoogle() {
        return await FirebaseErrorHandler.safeAsyncCall(async () => {
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.isAnonymous) {
                // Link anonymous account to Google using popup instead of redirect
                try {
                    const result = await linkWithPopup(currentUser, googleProvider);
                    return { success: true, user: result.user };
                } catch (linkError) {
                    if (linkError.code === 'auth/credential-already-in-use') {
                        // Account already exists, sign in normally
                        const result = await signInWithPopup(auth, googleProvider);
                        // Transfer anonymous data to existing account
                        const anonymousUid = currentUser.uid;
                        await this.transferAnonymousData(anonymousUid, result.user.uid);
                        return { success: true, user: result.user };
                    }
                    throw linkError;
                }
            } else {
                // Regular Google sign-in using popup
                const result = await signInWithPopup(auth, googleProvider);
                return { success: true, user: result.user };
            }
        }, 'Google Sign In').then(result => {
            if (result.success) {
                FirebaseDebugUtils.logAuthState(result.data.user, 'Google Sign In Success');
                return result.data;
            } else {
                // Handle specific sessionStorage errors
                if (result.originalError?.message?.includes('missing initial state') || 
                    result.originalError?.message?.includes('sessionStorage')) {
                    Debug.auth.warn('Google authentication failed due to browser storage restrictions');
                    return { success: false, error: 'Google sign-in failed due to browser restrictions. Please try email authentication instead.', storageIssue: true };
                }
                return { success: false, error: result.error };
            }
        });
    },

    // Check for redirect result on page load
    async checkRedirectResult() {
        return await FirebaseErrorHandler.safeAsyncCall(async () => {
            const result = await getRedirectResult(auth);
            if (result && result.user) {
                await this.createUserProfile(result.user);
                return { success: true, user: result.user };
            }
            return { success: false, noResult: true };
        }, 'Google Redirect Check').then(result => {
            if (result.success) {
                if (result.data.success && result.data.user) {
                    FirebaseDebugUtils.logAuthState(result.data.user, 'Google Redirect Success');
                    return result.data;
                }
                return result.data;
            } else {
                // Don't log CSP errors as serious issues
                if (result.originalError?.code === 'auth/internal-error') {
                    Debug.auth.warn('Google authentication redirect failed - likely due to CSP restrictions');
                    return { success: false, error: 'Google sign-in currently unavailable', cspIssue: true };
                }
                return { success: false, error: result.error };
            }
        });
    },

    // Sign out
    async signOut() {
        try {
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Create user profile if it doesn't exist
    async createUserProfile(user, isGuest = false) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email || 'guest@zenban.app',
                createdAt: serverTimestamp(),
                plan: 'free',
                boardCount: 0,
                isGuest: isGuest
            });
        }
    },

    // Update user profile after linking anonymous account
    async updateUserProfileAfterLink(user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            email: user.email,
            isGuest: false
        });
    },

    // Get current user
    getCurrentUser() {
        return currentUser;
    },

    // Subscribe to auth state changes
    onAuthStateChange(callback) {
        authStateCallbacks.push(callback);
        // Call immediately with current state
        callback(currentUser);
        // Return unsubscribe function
        return () => {
            const index = authStateCallbacks.indexOf(callback);
            if (index > -1) {
                authStateCallbacks.splice(index, 1);
            }
        };
    }
};
*/

// Set global reference for environment checks
// window.authService = authService;

// TODO: Implement dbService with Appwrite
// The dbService object provided these database functions:
// - saveBoard(boardData): Save board to cloud database  → Appwrite: databases.createDocument() or databases.updateDocument()
// - loadBoards(): Load all boards for current user  → Appwrite: databases.listDocuments()
// - loadBoard(board_id): Load specific board by ID  → Appwrite: databases.getDocument()
// - deleteBoard(board_id): Delete board from cloud database  → Appwrite: databases.deleteDocument()
// - getUserProfile(): Get current user's profile data  → Appwrite: databases.getDocument()

/*
// Original dbService implementation (commented out for reference):
// Database functions
// export const dbService = {
    // Save board
    async saveBoard(boardData) {
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        Debug.firebase.detail('Saving board to Firebase', {
            uid: currentUser.uid,
            isGuest: currentUser.isAnonymous,
            board_id: boardData.id,
            boardName: boardData.name
        });

        // Enhanced console logging for debugging
        console.log('[FIRESTORE DEBUG] Starting board save:', {
            timestamp: new Date().toISOString(),
            userId: currentUser.uid,
            isGuest: currentUser.isAnonymous,
            board_id: boardData.id,
            boardName: boardData.name,
            hasFolders: boardData.folders?.length > 0,
            hasHeaders: boardData.canvasHeaders?.length > 0,
            folderCount: boardData.folders?.length || 0,
            headerCount: boardData.canvasHeaders?.length || 0
        });

        try {
            // Additional validation - don't save empty boards
            const hasContent = (
                (boardData.folders && boardData.folders.length > 0) ||
                (boardData.canvasHeaders && boardData.canvasHeaders.length > 0) ||
                (boardData.drawingPaths && boardData.drawingPaths.length > 0)
            );
            
            if (!hasContent) {
                Debug.firebase.step('Skipping save - board is empty');
                console.log('[FIRESTORE DEBUG] Save skipped - board is empty');
                return { success: true, skipped: true };
            }
            
            const boardRef = doc(db, 'users', currentUser.uid, 'boards', boardData.id.toString());
            const saveData = {
                ...boardData,
                lastModified: serverTimestamp(),
                owner: currentUser.uid
            };
            
            Debug.firebase.detail('Document path', { path: `users/${currentUser.uid}/boards/${boardData.id}` });
            
            // Log the actual data being saved (truncated for large objects)
            const dataPreview = {
                ...saveData,
                folders: saveData.folders?.map(cat => ({
                    title: cat.title,
                    fileCount: cat.files?.length || 0
                })) || [],
                canvasHeaders: saveData.canvasHeaders?.map(h => ({ text: h.text })) || []
            };
            console.log('[FIRESTORE DEBUG] Data to save:', dataPreview);
            
            // Check data size before attempting save
            const dataSize = JSON.stringify(saveData).length;
            console.log('[FIRESTORE DEBUG] Data size:', dataSize, 'bytes');
            
            if (dataSize > 900000) { // 900KB limit
                console.error('[FIRESTORE ERROR] Data too large for Firestore:', dataSize, 'bytes');
                return { success: false, error: 'Board data too large for Firestore' };
            }
            
            // Retry logic for Firebase write errors
            let retries = 3;
            let lastError = null;
            
            while (retries > 0) {
                try {
                    console.log(`[FIRESTORE DEBUG] Attempting save (retries left: ${retries})`);
                    await setDoc(boardRef, saveData);
                    console.log('[FIRESTORE DEBUG] Board saved successfully');
                    Debug.firebase.step('Board saved to Firestore successfully');
                    break; // Success, exit loop
                } catch (error) {
                    lastError = error;
                    retries--;
                    
                    // Enhanced error logging
                    console.error('[FIRESTORE ERROR] Write failed:', {
                        code: error.code,
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        details: error.details || 'No additional details',
                        retriesLeft: retries,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Log detailed error information
                    Debug.firebase.stepError(`Firebase write error (retries left: ${retries})`, {
                        code: error.code,
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        details: error.details || 'No additional details'
                    });
                    
                    // Handle specific error types
                    if (error.code === 'aborted' || error.message?.includes('NS_BINDING_ABORTED')) {
                        console.warn('[FIRESTORE WARN] Write aborted, retrying...');
                        Debug.firebase.stepError(`Firebase write aborted, retries left: ${retries}`, error);
                        if (retries > 0) {
                            // Wait before retry with exponential backoff
                            const delay = Math.pow(2, (3 - retries)) * 1000; // 1s, 2s, 4s
                            console.log(`[FIRESTORE DEBUG] Waiting ${delay}ms before retry...`);
                            Debug.firebase.detail(`Waiting ${delay}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    } else if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                        console.error('[FIRESTORE ERROR] Authentication error - stopping retries');
                        Debug.firebase.stepError('Authentication error - stopping retries', error);
                        break; // Don't retry auth errors
                    } else if (error.code === 'invalid-argument' || error.code === 'failed-precondition') {
                        console.error('[FIRESTORE ERROR] Data validation error - stopping retries');
                        Debug.firebase.stepError('Data validation error - stopping retries', error);
                        break; // Don't retry validation errors
                    } else {
                        // For other errors, retry with exponential backoff
                        console.warn('[FIRESTORE WARN] Unknown error, retrying...');
                        if (retries > 0) {
                            const delay = Math.pow(2, (3 - retries)) * 1000;
                            console.log(`[FIRESTORE DEBUG] Unknown error, waiting ${delay}ms before retry...`);
                            Debug.firebase.detail(`Unknown error, waiting ${delay}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }
                    }
                    
                    throw error; // Re-throw if not a retriable error or no retries left
                }
            }
            
            if (retries === 0 && lastError) {
                console.error('[FIRESTORE ERROR] All retries failed:', lastError);
                throw lastError;
            }
            
            // Update board count only if we actually saved
            const userRef = doc(db, 'users', currentUser.uid);
            const boardsCollection = collection(db, 'users', currentUser.uid, 'boards');
            const boardsSnapshot = await getDocs(boardsCollection);
            
            // Only update if there are boards with content
            if (boardsSnapshot.size > 0) {
                // Use setDoc with merge:true to create document if it doesn't exist
                await setDoc(userRef, {
                    boardCount: boardsSnapshot.size,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
                
                Debug.firebase.detail('User board count updated', { count: boardsSnapshot.size });
            }
            
            return { success: true };
        } catch (error) {
            Debug.firebase.stepError('Error saving board', error);
            return { success: false, error: error.message };
        }
    },

    // Load all boards for current user
    async loadBoards() {
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        Debug.firebase.detail('Loading boards from Firebase', {
            uid: currentUser.uid,
            isGuest: currentUser.isAnonymous
        });

        try {
            const boardsRef = collection(db, 'users', currentUser.uid, 'boards');
            const q = query(boardsRef, orderBy('lastModified', 'desc'));
            Debug.firebase.detail('Query path', { path: `users/${currentUser.uid}/boards` });
            
            const querySnapshot = await getDocs(q);
            Debug.firebase.detail('Query snapshot size', { size: querySnapshot.size });
            
            const boards = [];
            querySnapshot.forEach((doc) => {
                const boardData = doc.data();
                Debug.firebase.detail('Found board', {
                    docId: doc.id,
                    name: boardData.name,
                    owner: boardData.owner,
                    lastModified: boardData.lastModified
                });
                boards.push({ ...boardData, id: parseInt(doc.id) });
            });
            
            Debug.firebase.detail('Total boards loaded', { count: boards.length });
            
            return { success: true, boards };
        } catch (error) {
            Debug.firebase.stepError('Error loading boards', error);
            return { success: false, error: error.message };
        }
    },

    // Load specific board
    async loadBoard(board_id) {
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        try {
            const boardRef = doc(db, 'users', currentUser.uid, 'boards', board_id.toString());
            const boardSnap = await getDoc(boardRef);
            
            if (boardSnap.exists()) {
                return { success: true, board: { ...boardSnap.data(), id: parseInt(boardSnap.id) } };
            } else {
                return { success: false, error: 'Board not found' };
            }
        } catch (error) {
            Debug.firebase.stepError('Error loading board', error);
            return { success: false, error: error.message };
        }
    },

    // Delete board
    async deleteBoard(board_id) {
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        try {
            const boardRef = doc(db, 'users', currentUser.uid, 'boards', board_id.toString());
            await deleteDoc(boardRef);
            return { success: true };
        } catch (error) {
            console.error('Error deleting board:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user profile
    async getUserProfile() {
        if (!currentUser) return { success: false, error: 'Not authenticated' };

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                return { success: true, profile: userSnap.data() };
            } else {
                return { success: false, error: 'Profile not found' };
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            return { success: false, error: error.message };
        }
    }
//     ... (Full dbService implementation commented out - see firebase-config.js.BAK)
// };
*/

// TODO: Implement offlineService with Appwrite
// The offlineService object provided these offline capability functions:
// - goOffline(): Disable network operations  → Custom implementation with Appwrite
// - goOnline(): Enable network operations  → Custom implementation with Appwrite

/*
// Original offlineService implementation (commented out for reference):
// Offline support
// export const offlineService = {
//     async goOffline() {
//         await disableNetwork(db);
//     },
// 
//     async goOnline() {
//         await enableNetwork(db);
//     }
// };
*/

// ==================================================================
// STUB EXPORTS - Prevent import errors while Firebase is disabled
// ==================================================================
// These are placeholder exports that return errors or no-ops
// Replace with actual Appwrite implementations

export const authService = {
    signInAnonymously: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    signUp: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    signIn: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    signInWithGoogle: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    signOut: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    getCurrentUser: () => null,
    onAuthStateChange: (callback) => {
        console.warn('Firebase authService disabled - implement with Appwrite');
        callback(null); // Call immediately with no user
        return () => {}; // Return unsubscribe function
    },
    transferAnonymousData: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    createUserProfile: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    updateUserProfileAfterLink: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    checkRedirectResult: async () => ({ success: false, noResult: true })
};

export const dbService = {
    saveBoard: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    loadBoards: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    loadBoard: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    deleteBoard: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' }),
    getUserProfile: async () => ({ success: false, error: 'Firebase disabled - implement with Appwrite' })
};

export const offlineService = {
    goOffline: async () => console.warn('Firebase offlineService disabled - implement with Appwrite'),
    goOnline: async () => console.warn('Firebase offlineService disabled - implement with Appwrite')
};

// Set global reference (for compatibility)
// window.authService = authService; // Commented out to prevent Appwrite override
// window.dbService = dbService; // Commented out to prevent Appwrite override
