/**
 * MARKED FOR REMOVAL: Live sync feature is disabled
 * Live sync was causing duplicate folders and UI issues
 * Safe to delete - feature is disabled via window.LIVE_SYNC_DISABLED = true
 */

// Simplified live sync service without mouse-based control
import { dbService, authService } from './firebase-config.js';
import { 
    doc, 
    onSnapshot, 
    collection, 
    query, 
    orderBy, 
    serverTimestamp,
    updateDoc,
    addDoc,
    getDocs,
    getDoc,
    limit,
    where,
    Timestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

export const liveSyncService = {
    listeners: new Map(),
    isApplyingRemoteChanges: false,
    lastLocalChangeTime: 0,
    isLocalChange: false, // Flag to track local changes
    syncQueue: [],
    userPresence: new Map(),
    pendingSyncWhileDragging: false,
    lastBackup: null,
    dataProtectionEnabled: true,
    firebaseBackupInterval: null,
    lastFirebaseBackupTime: 0,
    backupIntervalMinutes: 30,
    
    init() {
        // Check if live sync should be enabled
        if (window.LIVE_SYNC_DISABLED) {
            Debug.liveSync.step('Live sync is disabled - skipping initialization');
            return;
        }
        
        Debug.liveSync.start();
        Debug.liveSync.step('Initializing live sync service');
        window.liveSyncService = this;
        
        // Log data protection info
        console.log('%c⚠️ Data Protection Enabled', 'color: #4CAF50; font-weight: bold');
        console.log('If you lose data, type: recoverBoard() in the console');
        console.log('To disable protection: toggleDataProtection(false)');
        
        // Wait for all dependencies to be ready
        this.waitForDependencies(() => {
            // Listen for auth state changes
            authService.onAuthStateChange((user) => {
                if (user) {
                    Debug.liveSync.step('User authenticated - preparing live sync');
                    // Additional delay to ensure everything is loaded
                    setTimeout(() => this.startLiveSync(), 2000);
                    this.initUserPresence();
                    } else {
                    Debug.liveSync.stopped('User signed out - stopping live sync');
                    this.stopLiveSync();
                    this.stopAutomaticBackups();
                    this.clearUserPresence();
                }
            });
            
            // Setup change detection
            this.setupSmartChangeDetection();
            
            // Setup periodic sync verification
            this.setupSyncVerification();
        });
    },
    
    // Wait for all dependencies to be ready
    waitForDependencies(callback) {
        const checkDependencies = () => {
            const dependencies = {
                'AppState': typeof AppState !== 'undefined',
                'authService': typeof authService !== 'undefined',
                'window.db': typeof window.db !== 'undefined'
            };
            
            const allReady = Object.values(dependencies).every(ready => ready === true);
            
            if (allReady) {
                Debug.liveSync.step('All dependencies ready - starting live sync');
                callback();
            } else {
                Debug.liveSync.detail('Waiting for dependencies', { 
                    missing: Object.entries(dependencies)
                        .filter(([key, ready]) => !ready)
                        .map(([key]) => key)
                });
                setTimeout(checkDependencies, 1000);
            }
        };
        
        checkDependencies();
    },
    
    // Start real-time listeners for current user's boards
    async startLiveSync() {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        Debug.liveSync.step('Starting live sync listeners');
        Debug.liveSync.detail('User', { email: user.email });
        
        try {
            // Listen to all boards for this user
            const boardsRef = collection(window.db, 'users', user.uid, 'boards');
            const boardsQuery = query(boardsRef, orderBy('lastModified', 'desc'));
            
            const unsubscribe = onSnapshot(boardsQuery, (snapshot) => {
                this.handleBoardsSnapshot(snapshot);
            }, (error) => {
                Debug.liveSync.stepError('Boards listener error', error);
            });
            
            this.listeners.set('boards', unsubscribe);
            
            // Listen to specific board changes
            this.listenToCurrentBoard();
            
            Debug.liveSync.done('Live sync active');
            
            // Update dev overlay
            if (window.setDevInfo) {
                window.setDevInfo('liveSync', true);
            }
            
            // Start automatic Firebase backups
            this.startAutomaticBackups();
            
        } catch (error) {
            Debug.liveSync.stepError('Failed to start live sync', error);
        }
    },
    
    // Listen to changes on the current board
    listenToCurrentBoard() {
        const user = authService.getCurrentUser();
        const currentBoardId = AppState.get('currentBoardId');
        
        if (!user || currentBoardId === undefined) return;
        
        // Stop existing board listener
        if (this.listeners.has('currentBoard')) {
            this.listeners.get('currentBoard')();
            this.listeners.delete('currentBoard');
        }
        
        Debug.liveSync.step(`Setting up listener for board ${currentBoardId}`);
        
        try {
            const boardRef = doc(window.db, 'users', user.uid, 'boards', currentBoardId.toString());
            
            const unsubscribe = onSnapshot(boardRef, (doc) => {
                if (doc.exists()) {
                    this.handleBoardSnapshot(doc);
                }
            }, (error) => {
                Debug.liveSync.stepError('Board listener error', error);
            });
            
            this.listeners.set('currentBoard', unsubscribe);
            
        } catch (error) {
            Debug.liveSync.stepError('Failed to setup board listener', error);
        }
    },
    
    // Handle boards collection changes
    handleBoardsSnapshot(snapshot) {
        if (this.isApplyingRemoteChanges) return;
        
        // Skip if this is a local change
        if (this.isLocalChange || Date.now() - this.lastLocalChangeTime < 3000) {
            Debug.liveSync.detail('Skipping boards update - local change detected');
            return;
        }
        
        // Don't update boards list while user is actively working
        if (this.isUserCurrentlyDragging()) {
            Debug.liveSync.detail('User is dragging - postponing boards update');
            return;
        }
        
        Debug.liveSync.step('Received boards update from server');
        
        const boards = [];
        snapshot.forEach((doc) => {
            const boardData = { ...doc.data(), id: parseInt(doc.id) };
            boards.push(this.deserializeBoardFromFirebase(boardData));
        });
        
        // Don't overwrite local data with empty Firebase data for new users
        const currentBoards = AppState.get('boards');
        if (boards.length === 0 && currentBoards.length > 0) {
            Debug.liveSync.detail('Ignoring empty boards update - keeping local data');
            return;
        }
        
        // Check if this is different from our current state
        if (!this.boardsEqual(currentBoards, boards)) {
            Debug.liveSync.step('Applying boards update');
            this.isApplyingRemoteChanges = true;
            
            AppState.set('boards', boards);
            
            // Update UI if needed
            if (typeof updateBoardDropdown === 'function') {
                updateBoardDropdown();
            }
            
            this.isApplyingRemoteChanges = false;
            if (window.liveSyncUI) {
                window.liveSyncUI.showUpdateNotification('Boards updated');
            }
        }
    },
    
    // Handle individual board changes
    handleBoardSnapshot(doc) {
        if (this.isApplyingRemoteChanges) return;
        
        const boardData = { ...doc.data(), id: parseInt(doc.id) };
        const board = this.deserializeBoardFromFirebase(boardData);
        
        Debug.liveSync.step(`Received update for board: "${board.name}"`);
        
        // Check if user is currently dragging - never interrupt active dragging
        const isDragging = this.isUserCurrentlyDragging();
        if (isDragging) {
            Debug.liveSync.detail('User is dragging - postponing update');
            return;
        }
        
        // Enhanced own-change detection
        const serverTime = boardData.lastModified?.toMillis() || 0;
        const timeDiff = serverTime - this.lastLocalChangeTime;
        const isVeryRecent = timeDiff >= 0 && timeDiff <= 3000; // Only ignore if within 3 seconds
        
        if (isVeryRecent) {
            Debug.liveSync.detail('Ignoring very recent own change', {
                timeDiff: Math.round(timeDiff/1000) + 's'
            });
            return;
        }
        
        // Check if remote data is stale (older than local changes)
        if (serverTime < this.lastLocalChangeTime - 5000) { // 5 second buffer
            Debug.liveSync.detail('Remote data is older than recent local changes - skipping', {
                serverTime: new Date(serverTime).toISOString(),
                lastLocalChange: new Date(this.lastLocalChangeTime).toISOString()
            });
            return;
        }
        
        // IMPORTANT: Check if the board content is actually different
        const currentBoards = AppState.get('boards');
        const currentBoard = currentBoards.find(b => b.id === board.id);
        
        // Deep comparison to prevent unnecessary reloads
        if (currentBoard && this.boardsContentEqual(currentBoard, board)) {
            Debug.liveSync.detail('Board content unchanged - skipping reload');
            return;
        }
        
        Debug.liveSync.step('Applying update');
        Debug.liveSync.detail('Update details', {
            timeDiff: Math.round(timeDiff/1000) + 's',
            fromUser: boardData.lastModifiedBy
        });
        
        // Apply the remote changes
        this.applyRemoteBoardChanges(board);
    },
    
    // Calculate content weight for a board (more accurate than just counting)
    calculateContentWeight(board) {
        let weight = 0;
        
        // Folders weight
        if (board.folders) {
            weight += board.folders.length * 100; // Each folder worth 100 points
            
            // Files weight
            board.folders.forEach(cat => {
                if (cat.files) {
                    weight += cat.files.length * 50; // Each file worth 50 points
                    
                    // Content weight (based on actual content)
                    cat.files.forEach(file => {
                        if (file.content && file.content.ops) {
                            // Count actual text content
                            const textLength = file.content.ops.reduce((sum, op) => {
                                return sum + (typeof op.insert === 'string' ? op.insert.length : 0);
                            }, 0);
                            weight += Math.min(textLength, 1000); // Cap at 1000 per file
                        }
                    });
                }
            });
        }
        
        // Canvas headers weight
        if (board.canvasHeaders) {
            weight += board.canvasHeaders.length * 75; // Each header worth 75 points
        }
        
        return weight;
    },
    
    // Create backup of current board state
    createBackup() {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const currentBoard = boards.find(b => b.id === currentBoardId);
        
        if (currentBoard) {
            this.lastBackup = {
                timestamp: Date.now(),
                board: JSON.parse(JSON.stringify(currentBoard)) // Deep clone
            };
            Debug.liveSync.detail('Created backup of current board state');
            
            // Store backup in localStorage for extra safety
            try {
                localStorage.setItem('boardBackup_' + currentBoardId, JSON.stringify(this.lastBackup));
            } catch (e) {
                Debug.liveSync.detail('Could not store backup in localStorage', e);
            }
        }
    },
    
    // Restore from backup
    restoreFromBackup() {
        if (!this.lastBackup) {
            Debug.liveSync.detail('No backup available to restore');
            return false;
        }
        
        const boards = AppState.get('boards');
        const boardIndex = boards.findIndex(b => b.id === this.lastBackup.board.id);
        
        if (boardIndex !== -1) {
            boards[boardIndex] = this.lastBackup.board;
            AppState.set('boards', boards);
            
            // Update UI
            const currentBoardId = AppState.get('currentBoardId');
            if (this.lastBackup.board.id === currentBoardId) {
                this.updateCurrentBoardUI(this.lastBackup.board);
            }
            
            if (window.liveSyncUI) {
                window.liveSyncUI.showUpdateNotification('Data restored from backup', 'success');
            }
            
            Debug.liveSync.step('Restored board from backup');
            return true;
        }
        
        return false;
    },
    
    // Firebase Backup Methods
    
    // Create a backup in Firebase
    async createFirebaseBackup() {
        const user = authService.getCurrentUser();
        if (!user) return false;
        
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const currentBoard = boards.find(b => b.id === currentBoardId);
        
        if (!currentBoard) return false;
        
        try {
            const backupData = {
                boardId: currentBoardId,
                boardName: currentBoard.name,
                board: JSON.stringify(currentBoard),
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                contentWeight: this.calculateContentWeight(currentBoard),
                foldersCount: currentBoard.folders?.length || 0,
                filesCount: currentBoard.folders?.reduce((sum, cat) => sum + (cat.files?.length || 0), 0) || 0
            };
            
            const backupsRef = collection(window.db, 'users', user.uid, 'backups');
            const docRef = await addDoc(backupsRef, backupData);
            
            this.lastFirebaseBackupTime = Date.now();
            Debug.liveSync.step('Created Firebase backup', { id: docRef.id });
            
            // Clean old backups (keep last 20)
            this.cleanOldBackups();
            
            return true;
        } catch (error) {
            Debug.liveSync.stepError('Failed to create Firebase backup', error);
            return false;
        }
    },
    
    // Get list of available backups from Firebase
    async getFirebaseBackups(boardId = null) {
        const user = authService.getCurrentUser();
        if (!user) return [];
        
        try {
            const backupsRef = collection(window.db, 'users', user.uid, 'backups');
            let backupsQuery;
            
            if (boardId !== null) {
                backupsQuery = query(
                    backupsRef, 
                    where('boardId', '==', boardId),
                    orderBy('timestamp', 'desc'),
                    limit(20)
                );
            } else {
                backupsQuery = query(
                    backupsRef,
                    orderBy('timestamp', 'desc'),
                    limit(20)
                );
            }
            
            const snapshot = await getDocs(backupsQuery);
            const backups = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                backups.push({
                    id: doc.id,
                    boardId: data.boardId,
                    boardName: data.boardName,
                    timestamp: data.timestamp?.toDate() || new Date(data.createdAt),
                    createdAt: data.createdAt,
                    contentWeight: data.contentWeight || 0,
                    foldersCount: data.foldersCount || 0,
                    filesCount: data.filesCount || 0
                });
            });
            
            return backups;
        } catch (error) {
            Debug.liveSync.stepError('Failed to get Firebase backups', error);
            return [];
        }
    },
    
    // Restore from a specific Firebase backup
    async restoreFromFirebaseBackup(backupId) {
        const user = authService.getCurrentUser();
        if (!user) return false;
        
        try {
            const backupRef = doc(window.db, 'users', user.uid, 'backups', backupId);
            const backupSnap = await getDoc(backupRef);
            
            if (!backupSnap.exists()) {
                Debug.liveSync.stepError('Backup not found');
                return false;
            }
            
            const backupData = backupSnap.data();
            const board = JSON.parse(backupData.board);
            
            // Create local backup before restoring
            this.createBackup();
            
            // Update board in AppState
            const boards = AppState.get('boards');
            const boardIndex = boards.findIndex(b => b.id === board.id);
            
            if (boardIndex !== -1) {
                boards[boardIndex] = board;
                AppState.set('boards', boards);
                
                // Update UI if current board
                const currentBoardId = AppState.get('currentBoardId');
                if (board.id === currentBoardId) {
                    this.updateCurrentBoardUI(board);
                }
                
                if (window.liveSyncUI) {
                    const backupDate = backupData.timestamp?.toDate() || new Date(backupData.createdAt);
                    window.liveSyncUI.showUpdateNotification(
                        `Restored from backup (${backupDate.toLocaleString()})`, 
                        'success'
                    );
                }
                
                Debug.liveSync.step('Restored from Firebase backup');
                return true;
            }
            
            return false;
        } catch (error) {
            Debug.liveSync.stepError('Failed to restore from Firebase backup', error);
            return false;
        }
    },
    
    // Clean old backups (keep most recent 20)
    async cleanOldBackups() {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        try {
            const backupsRef = collection(window.db, 'users', user.uid, 'backups');
            const backupsQuery = query(backupsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(backupsQuery);
            
            const backups = [];
            snapshot.forEach((doc) => {
                backups.push({ id: doc.id, timestamp: doc.data().timestamp });
            });
            
            // Delete backups beyond the 20th
            if (backups.length > 20) {
                const toDelete = backups.slice(20);
                for (const backup of toDelete) {
                    await deleteDoc(doc(window.db, 'users', user.uid, 'backups', backup.id));
                }
                Debug.liveSync.detail(`Cleaned ${toDelete.length} old backups`);
            }
        } catch (error) {
            Debug.liveSync.detail('Failed to clean old backups', error);
        }
    },
    
    // Start automatic Firebase backups
    startAutomaticBackups() {
        // Clear any existing interval
        if (this.firebaseBackupInterval) {
            clearInterval(this.firebaseBackupInterval);
        }
        
        // Initial backup
        this.createFirebaseBackup();
        
        // Set up interval (30 minutes)
        this.firebaseBackupInterval = setInterval(() => {
            const timeSinceLastBackup = Date.now() - this.lastFirebaseBackupTime;
            
            // Only backup if there's been activity
            if (timeSinceLastBackup >= this.backupIntervalMinutes * 60 * 1000) {
                this.createFirebaseBackup();
            }
        }, this.backupIntervalMinutes * 60 * 1000);
        
        Debug.liveSync.step(`Started automatic backups every ${this.backupIntervalMinutes} minutes`);
    },
    
    // Stop automatic backups
    stopAutomaticBackups() {
        if (this.firebaseBackupInterval) {
            clearInterval(this.firebaseBackupInterval);
            this.firebaseBackupInterval = null;
            Debug.liveSync.step('Stopped automatic backups');
        }
    },

    // Apply remote board changes to the UI
    applyRemoteBoardChanges(board) {
        Debug.liveSync.step(`Applying remote changes for board: "${board.name}"`);
        
        // Skip if this is our own local change
        if (this.isLocalChange) {
            Debug.liveSync.detail('Skipping UI update - change originated locally');
            return;
        }
        
        // Additional check: if the change happened very recently (within 3 seconds), skip it
        const timeSinceLastLocal = Date.now() - this.lastLocalChangeTime;
        if (timeSinceLastLocal < 3000) {
            Debug.liveSync.detail('Skipping UI update - too close to local change', { timeSinceLastLocal });
            return;
        }
        
        this.isApplyingRemoteChanges = true;
        
        try {
            // CRITICAL: Check if remote board has actual content
            const hasFolders = board.folders && board.folders.length > 0;
            const hasCanvasHeaders = board.canvasHeaders && board.canvasHeaders.length > 0;
            
            if (!hasFolders && !hasCanvasHeaders) {
                Debug.liveSync.detail('Remote board is empty - skipping to prevent data loss');
                return;
            }
            
            // Get current board to check for data loss
            const boards = AppState.get('boards');
            const currentBoard = boards.find(b => b.id === board.id);
            
            if (currentBoard && this.dataProtectionEnabled) {
                // Create backup before any changes
                this.createBackup();
                
                // Calculate content weights for better comparison
                const currentWeight = this.calculateContentWeight(currentBoard);
                const remoteWeight = this.calculateContentWeight(board);
                
                Debug.liveSync.detail('Content weight comparison', {
                    current: currentWeight,
                    remote: remoteWeight,
                    difference: remoteWeight - currentWeight
                });
                
                // If remote has significantly less content (more than 30% loss), skip update
                if (currentWeight > 0 && remoteWeight < currentWeight * 0.7) {
                    Debug.liveSync.detail('Remote has significantly less content - blocking update');
                    if (window.liveSyncUI) {
                        window.liveSyncUI.showUpdateNotification('Update blocked - remote has less data', 'warning');
                        window.liveSyncUI.showDataProtectionAlert();
                    }
                    
                    // Optionally force sync our local data to remote
                    this.forceLocalSync();
                    return;
                }
                
                // Additional checks for empty boards
                const currentHasContent = currentWeight > 0;
                const remoteIsEmpty = remoteWeight === 0;
                
                if (currentHasContent && remoteIsEmpty) {
                    Debug.liveSync.detail('Preventing update with empty remote board');
                    if (window.liveSyncUI) {
                        window.liveSyncUI.showUpdateNotification('Update blocked - remote board is empty', 'warning');
                        window.liveSyncUI.showDataProtectionAlert();
                    }
                    return;
                }
            }
            
            // Update board in AppState
            const boardIndex = boards.findIndex(b => b.id === board.id);
            
            if (boardIndex !== -1) {
                boards[boardIndex] = board;
                AppState.set('boards', boards);
            }
            
            // If this is the current board, update the UI
            const currentBoardId = AppState.get('currentBoardId');
            if (board.id === currentBoardId) {
                this.updateCurrentBoardUI(board);
            }
            
            if (window.liveSyncUI) {
                window.liveSyncUI.showUpdateNotification(`${board.name} loaded`);
            }
            
        } catch (error) {
            Debug.liveSync.stepError('Error applying remote changes', error);
        } finally {
            this.isApplyingRemoteChanges = false;
        }
    },
    
    // Update current board UI with remote changes
    updateCurrentBoardUI(board) {
        Debug.liveSync.step('Updating UI with remote changes');
        
        // Clear canvas
        const canvas = document.getElementById('canvas');
        if (canvas) {
            // Save expanded file state before clearing
            const expandedFile = AppState.get('expandedFile');
            
            canvas.innerHTML = '';
            AppState.set('folders', []);
            
            // Apply folders
            if (board.folders) {
                board.folders.forEach((catData, index) => {
                    this.createFolderFromRemoteData(catData, index);
                });
            }
            
            // Apply canvas headers (fixed property name)
            if (board.canvasHeaders && typeof loadCanvasHeaders === 'function') {
                loadCanvasHeaders(board.canvasHeaders);
            }
            
            // Update board name
            const boardNameEl = document.getElementById('boardName');
            if (boardNameEl && boardNameEl.textContent !== board.name) {
                boardNameEl.textContent = board.name;
            }
            
            const selectorText = document.querySelector('.board-selector-text');
            if (selectorText && selectorText.textContent !== board.name) {
                selectorText.textContent = board.name;
            }
            
            // Restore expanded file if it still exists
            if (expandedFile) {
                setTimeout(() => {
                    const newFile = document.querySelector(`[data-file-id="${expandedFile.dataset.fileId}"]`);
                    if (newFile) {
                        // Re-expand the file
                        newFile.click();
                    }
                }, 100);
            }
        }
    },
    
    // Create folder from remote data with live sync considerations
    createFolderFromRemoteData(catData, index) {
        try {
            let catIndex;
            
            if (typeof createFolder === 'function') {
                catIndex = createFolder(
                    catData.title,
                    parseInt(catData.position.left) || (100 + index * 220),
                    parseInt(catData.position.top) || 100
                );
            } else {
                catIndex = this.createFolderManually(catData, index);
            }
            
            // Add files
            if (catData.files) {
                catData.files.forEach((fileData) => {
                    if (typeof addFileToFolder === 'function') {
                        addFileToFolder(catIndex, fileData.title, fileData.content);
                    }
                });
            }
            
        } catch (error) {
            Debug.liveSync.stepError('Failed to create folder from remote data', error);
        }
    },
    
    // Setup smart change detection - only sync on real changes
    setupSmartChangeDetection() {
        // Wait for AppState to be properly initialized
        if (typeof AppState === 'undefined' || !AppState.onChange) {
            Debug.liveSync.detail('AppState not ready, retrying change detection setup...');
            setTimeout(() => this.setupSmartChangeDetection(), 1000);
            return;
        }
        
        Debug.liveSync.step('Setting up smart change detection');
        
        // Specific change listeners for meaningful events
        this.setupSpecificChangeListeners();
        
        // Monitor board state changes
        AppState.onChange('boards', (boards) => {
            if (!this.isApplyingRemoteChanges && this.hasSignificantChanges(boards)) {
                Debug.liveSync.step('Significant board changes detected');
                this.scheduleSync();
            }
        });
        
        // Setup drag end detection for pending syncs
        this.setupDragEndDetection();
    },
    
    // Setup specific change listeners for targeted events
    setupSpecificChangeListeners() {
        // 1. Folder position changes
        this.monitorFolderPositions();
        
        // 2. Quill editor changes
        this.monitorQuillChanges();
        
        // 3. Theme changes
        this.monitorThemeChanges();
        
        // 4. Element additions/removals
        this.monitorElementChanges();
    },
    
    // Monitor folder position changes specifically
    monitorFolderPositions() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        let positionCheckTimeout;
        
        const observer = new MutationObserver((mutations) => {
            if (this.isApplyingRemoteChanges) return;
            
            let hasPositionChange = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.classList.contains('folder') || target.classList.contains('super-header')) {
                        hasPositionChange = true;
                        Debug.liveSync.detail('Position change detected', { type: target.classList.contains('folder') ? 'folder' : 'super-header' });
                    }
                }
            });
            
            if (hasPositionChange) {
                clearTimeout(positionCheckTimeout);
                positionCheckTimeout = setTimeout(() => {
                    if (!this.isUserCurrentlyDragging()) {
                        this.handleLocalChange();
                    }
                }, 1000); // Wait for drag to complete
            }
        });
        
        observer.observe(canvas, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });
    },
    
    // Monitor Quill editor changes
    monitorQuillChanges() {
        // Hook into Quill instances when they're created
        const originalQuill = window.Quill;
        if (originalQuill) {
            window.Quill = function(...args) {
                const quillInstance = new originalQuill(...args);
                
                // Add change listener to this Quill instance
                quillInstance.on('text-change', (delta, oldDelta, source) => {
                    if (source === 'user' && !window.liveSyncService.isApplyingRemoteChanges) {
                        Debug.liveSync.detail('Quill text change detected');
                        window.liveSyncService.handleLocalChange();
                    }
                });
                
                return quillInstance;
            };
            
            // Preserve static methods
            Object.setPrototypeOf(window.Quill, originalQuill);
            Object.assign(window.Quill, originalQuill);
        }
    },
    
    // Monitor theme changes
    monitorThemeChanges() {
        // Hook into theme change functions if they exist
        if (typeof setBackground === 'function') {
            const originalSetBackground = setBackground;
            window.setBackground = function(...args) {
                Debug.liveSync.detail('Theme change detected');
                window.liveSyncService.handleLocalChange();
                return originalSetBackground.apply(this, args);
            };
        }
    },
    
    // Monitor element additions/removals
    monitorElementChanges() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        let elementChangeTimeout;
        
        const observer = new MutationObserver((mutations) => {
            if (this.isApplyingRemoteChanges) return;
            
            let hasElementChange = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    // Check if meaningful elements were added/removed
                    const meaningfulNodes = [...mutation.addedNodes, ...mutation.removedNodes].filter(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.classList.contains('folder') || 
                         node.classList.contains('super-header') ||
                         node.classList.contains('file'))
                    );
                    
                    if (meaningfulNodes.length > 0) {
                        hasElementChange = true;
                        Debug.liveSync.detail('Element change detected', { count: meaningfulNodes.length });
                    }
                }
            });
            
            if (hasElementChange) {
                clearTimeout(elementChangeTimeout);
                elementChangeTimeout = setTimeout(() => {
                    this.handleLocalChange();
                }, 500); // Quick response for element changes
            }
        });
        
        observer.observe(canvas, {
            childList: true,
            subtree: true
        });
    },
    
    // Check if changes are significant enough to sync
    hasSignificantChanges(newBoards) {
        if (!this.lastKnownState) {
            this.lastKnownState = JSON.stringify(newBoards);
            return false; // First time, don't sync yet
        }
        
        const currentState = JSON.stringify(newBoards);
        const hasChanges = currentState !== this.lastKnownState;
        
        if (hasChanges) {
            this.lastKnownState = currentState;
            return true;
        }
        
        return false;
    },
    
    // Setup drag end detection for pending syncs
    setupDragEndDetection() {
        // Monitor mouse/touch end events globally
        const handleDragEnd = () => {
            // Wait a moment for drag state to clear
            setTimeout(() => {
                if (!this.isUserCurrentlyDragging() && this.pendingSyncWhileDragging) {
                    Debug.liveSync.step('Drag ended - syncing pending changes');
                    this.pendingSyncWhileDragging = false;
                    this.scheduleSync();
                }
            }, 50); // Faster drag end detection
        };
        
        // Listen for drag end events
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
        
        // Monitor AppState changes for drag operations ending
        AppState.onChange('currentFolder', (folder) => {
            if (!folder) handleDragEnd(); // Folder drag ended
        });
        
        AppState.onChange('currentSuperHeader', (header) => {
            if (!header) handleDragEnd(); // Super header drag ended
        });
        
        AppState.onChange('isDraggingMultiple', (isDragging) => {
            if (!isDragging) handleDragEnd(); // Multiple selection drag ended
        });
    },
    
    // Check if user is currently dragging anything
    isUserCurrentlyDragging() {
        // Check AppState for drag operations
        const draggedFile = AppState.get('draggedFile');
        const currentFolder = AppState.get('currentFolder');
        const currentSuperHeader = AppState.get('currentSuperHeader');
        const isDraggingMultiple = AppState.get('isDraggingMultiple');
        const isSelecting = AppState.get('isSelecting');
        
        // Check for active mouse/touch operations
        const hasMouseDown = document.body.classList.contains('dragging') || 
                            document.body.classList.contains('moving') ||
                            document.body.classList.contains('no-select');
        
        // Check for elements being dragged
        const draggedElement = document.querySelector('.being-dragged, .dragging, .selected');
        
        const isDragging = !!(draggedFile || currentFolder || currentSuperHeader || 
                             isDraggingMultiple || isSelecting || hasMouseDown || 
                             draggedElement);
        
        if (isDragging) {
            Debug.liveSync.detail('User is actively dragging - blocking remote updates');
        }
        
        return isDragging;
    },
    
    // Enhanced change tracking with better timestamps
    handleLocalChange() {
        this.lastLocalChangeTime = Date.now();
        Debug.liveSync.detail('Local change detected, timestamp updated');
        this.scheduleSync();
    },
    
    // Schedule sync with throttling and drag awareness
    scheduleSync() {
        // Don't schedule sync while user is dragging
        if (this.isUserCurrentlyDragging()) {
            Debug.liveSync.detail('Postponing sync - user is dragging');
            // Schedule sync for when dragging stops
            this.pendingSyncWhileDragging = true;
            return;
        }
        
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            // Double-check user isn't dragging when timeout fires
            if (!this.isUserCurrentlyDragging()) {
                this.syncCurrentBoardToFirebase();
                this.pendingSyncWhileDragging = false;
            } else {
                Debug.liveSync.detail('Sync cancelled - user started dragging');
                // Try again later
                this.scheduleSync();
            }
        }, 2000); // 2 second throttle for faster syncing
    },
    
    // Sync current board to Firebase for live sync
    async syncCurrentBoardToFirebase() {
        const user = authService.getCurrentUser();
        if (!user || this.isApplyingRemoteChanges) return;
        
        Debug.liveSync.step('Syncing local changes to Firebase');
        
        try {
            // Save current board state
            if (typeof saveCurrentBoard === 'function') {
                saveCurrentBoard();
            }
            
            const boards = AppState.get('boards');
            const currentBoardId = AppState.get('currentBoardId');
            const board = boards.find(b => b.id === currentBoardId);
            
            if (board) {
                // Add timestamp and user info
                const serializedBoard = window.syncService.serializeBoardForFirebase(board);
                serializedBoard.lastModified = serverTimestamp();
                serializedBoard.lastModifiedBy = user.email;
                
                const result = await dbService.saveBoard(serializedBoard);
                
                if (result.success) {
                    Debug.liveSync.step('Local changes synced to Firebase');
                    if (window.liveSyncUI) {
                        window.liveSyncUI.showUpdateNotification('Changes synced', 'success');
                    }
                } else {
                    Debug.liveSync.stepError('Failed to sync to Firebase', result.error);
                    if (window.liveSyncUI) {
                        window.liveSyncUI.showUpdateNotification('Sync failed - check connection', 'error');
                    }
                }
            }
            
        } catch (error) {
            Debug.liveSync.stepError('Error syncing to Firebase', error);
        }
    },
    
    // User presence system
    initUserPresence() {
        const user = authService.getCurrentUser();
        if (!user) return;
        
        Debug.liveSync.step('Initializing user presence');
        
        // TODO: Implement user presence with Firestore
        // This would track who's currently viewing/editing each board
    },
    
    // Setup periodic sync verification
    setupSyncVerification() {
        setInterval(() => {
            this.verifySyncState();
        }, 30000); // Check every 30 seconds
    },
    
    // Verify sync state and fix drift
    async verifySyncState() {
        const user = authService.getCurrentUser();
        if (!user || this.isApplyingRemoteChanges) return;
        
        try {
            const currentBoardId = AppState.get('currentBoardId');
            const result = await dbService.loadBoard(currentBoardId);
            
            if (result.success) {
                const remoteBoard = window.syncService.deserializeBoardFromFirebase(result.board);
                const localBoards = AppState.get('boards');
                const localBoard = localBoards.find(b => b.id === currentBoardId);
                
                if (localBoard && !this.boardsEqual([localBoard], [remoteBoard])) {
                    Debug.liveSync.detail('Sync drift detected, applying server state');
                    this.applyRemoteBoardChanges(remoteBoard);
                }
            }
        } catch (error) {
            Debug.liveSync.stepError('Error verifying sync state', error);
        }
    },
    
    // Compare boards for equality
    boardsEqual(boards1, boards2) {
        if (boards1.length !== boards2.length) return false;
        
        for (let i = 0; i < boards1.length; i++) {
            const b1 = boards1[i];
            const b2 = boards2[i];
            
            if (b1.name !== b2.name || 
                b1.folders?.length !== b2.folders?.length ||
                b1.canvasHeaders?.length !== b2.canvasHeaders?.length) {
                return false;
            }
        }
        
        return true;
    },
    
    // Deep comparison of board content to prevent unnecessary reloads
    boardsContentEqual(board1, board2) {
        // Compare basic properties
        if (board1.name !== board2.name || 
            board1.background !== board2.background ||
            board1.theme !== board2.theme) {
            return false;
        }
        
        // Compare folders
        if (board1.folders?.length !== board2.folders?.length) {
            return false;
        }
        
        // Deep compare folders
        if (board1.folders) {
            for (let i = 0; i < board1.folders.length; i++) {
                const cat1 = board1.folders[i];
                const cat2 = board2.folders[i];
                
                if (cat1.title !== cat2.title ||
                    cat1.position?.left !== cat2.position?.left ||
                    cat1.position?.top !== cat2.position?.top ||
                    cat1.files?.length !== cat2.files?.length) {
                    return false;
                }
                
                // Compare files
                if (cat1.files) {
                    for (let j = 0; j < cat1.files.length; j++) {
                        const file1 = cat1.files[j];
                        const file2 = cat2.files[j];
                        
                        if (file1.title !== file2.title ||
                            JSON.stringify(file1.content) !== JSON.stringify(file2.content)) {
                            return false;
                        }
                    }
                }
            }
        }
        
        // Compare canvas headers
        if (board1.canvasHeaders?.length !== board2.canvasHeaders?.length) {
            return false;
        }
        
        if (board1.canvasHeaders) {
            for (let i = 0; i < board1.canvasHeaders.length; i++) {
                const h1 = board1.canvasHeaders[i];
                const h2 = board2.canvasHeaders[i];
                
                if (h1.text !== h2.text ||
                    h1.position?.left !== h2.position?.left ||
                    h1.position?.top !== h2.position?.top) {
                    return false;
                }
            }
        }
        
        return true;
    },
    
    // Stop all listeners
    stopLiveSync() {
        Debug.liveSync.stopped('Stopping live sync');
        
        this.listeners.forEach((unsubscribe, key) => {
            unsubscribe();
            Debug.liveSync.step(`Stopped ${key} listener`);
        });
        
        this.listeners.clear();
        clearTimeout(this.syncTimeout);
        
        // Update dev overlay
        if (window.setDevInfo) {
            window.setDevInfo('liveSync', false);
        }
    },
    
    // Clear user presence
    clearUserPresence() {
        this.userPresence.clear();
    },
    
    // Switch to a different board (update listener)
    switchToBoard(boardId) {
        // Save current board before switching
        if (typeof saveCurrentBoard === 'function') {
            Debug.liveSync.detail('Saving current board before switch');
            saveCurrentBoard();
        }
        
        // Create backup before switching
        this.createBackup();
        
        AppState.set('currentBoardId', boardId);
        this.listenToCurrentBoard();
    },

    // Manual sync trigger for after completed operations
    syncAfterUserAction(actionDescription = 'user action') {
        Debug.liveSync.detail(`Triggering sync after ${actionDescription}`);
        this.lastLocalChangeTime = Date.now();
        
        // Wait a moment for any ongoing operations to complete
        setTimeout(() => {
            if (!this.isUserCurrentlyDragging()) {
                this.scheduleSync();
            } else {
                // User is still dragging, mark for later
                this.pendingSyncWhileDragging = true;
            }
        }, 100); // Faster response for user actions
    },
    
    // Force sync local data to remote (when remote has less data)
    forceLocalSync() {
        Debug.liveSync.step('Forcing local data sync to remote');
        this.lastLocalChangeTime = Date.now() + 10000; // Set future time to ensure it's considered newer
        this.syncCurrentBoardToFirebase();
    },
    
    // Get sync status
    getSyncStatus() {
        return {
            isLive: this.listeners.size > 0,
            activeListeners: Array.from(this.listeners.keys()),
            isApplyingChanges: this.isApplyingRemoteChanges,
            userCount: this.userPresence.size,
            hasBackup: this.lastBackup !== null,
            dataProtection: this.dataProtectionEnabled
        };
    },
    
    // Manual sync trigger
    forceBoardSync() {
        Debug.liveSync.step('Forcing board sync');
        this.syncCurrentBoardToFirebase();
    },
    
    // Deserialize board (with fallback if sync service not ready)
    deserializeBoardFromFirebase(board) {
        if (window.syncService && window.syncService.deserializeBoardFromFirebase) {
            return window.syncService.deserializeBoardFromFirebase(board);
        } else {
            // Fallback deserialization
            Debug.liveSync.detail('syncService not available, using fallback deserialization');
            return this.fallbackDeserializeBoard(board);
        }
    },
    
    // Fallback deserialization method
    fallbackDeserializeBoard(board) {
        const deserialized = { ...board };
        
        // Deserialize folders with their files
        if (deserialized.folders) {
            deserialized.folders = deserialized.folders.map(folder => {
                const catCopy = { ...folder };
                // Deserialize file content (Quill Delta objects)
                if (catCopy.files) {
                    catCopy.files = catCopy.files.map(file => {
                        const fileCopy = { ...file };
                        // Parse JSON string back to Delta object
                        if (fileCopy.content && typeof fileCopy.content === 'string') {
                            try {
                                fileCopy.content = JSON.parse(fileCopy.content);
                            } catch (e) {
                                Debug.liveSync.stepError('Error parsing file content', e);
                                fileCopy.content = { ops: [] }; // Empty Quill delta
                            }
                        }
                        return fileCopy;
                    });
                }
                return catCopy;
            });
        }
        
        return deserialized;
    },
    
    // Manual folder creation (with fallback if sync service not ready)
    createFolderManually(catData, index) {
        if (window.syncService && window.syncService.createFolderManually) {
            return window.syncService.createFolderManually(catData, index);
        } else {
            // Fallback manual folder creation
            Debug.liveSync.detail('syncService not available, using fallback folder creation');
            return this.fallbackCreateFolder(catData, index);
        }
    },
    
    // Fallback folder creation
    fallbackCreateFolder(catData, index) {
        const canvas = document.getElementById('canvas');
        if (!canvas) return -1;
        
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.style.position = 'absolute';
        folderDiv.style.left = catData.position.left || (100 + index * 220) + 'px';
        folderDiv.style.top = catData.position.top || '100px';
        folderDiv.style.background = 'rgba(255, 255, 255, 0.1)';
        folderDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        folderDiv.style.borderRadius = '8px';
        folderDiv.style.padding = '16px';
        folderDiv.style.minWidth = '200px';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'folder-title';
        titleDiv.textContent = catData.title;
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.marginBottom = '12px';
        titleDiv.style.color = 'white';
        
        const filesGrid = document.createElement('div');
        filesGrid.className = 'files-grid';
        filesGrid.style.display = 'flex';
        filesGrid.style.flexDirection = 'column';
        filesGrid.style.gap = '8px';
        
        folderDiv.appendChild(titleDiv);
        folderDiv.appendChild(filesGrid);
        canvas.appendChild(folderDiv);
        
        Debug.liveSync.detail(`Fallback created folder: "${catData.title}"`);
        return index;
    }
};

// Add recovery command to window for emergency use
window.recoverBoard = function() {
    if (window.liveSyncService && window.liveSyncService.restoreFromBackup()) {
        console.log('✅ Board data recovered from backup!');
        return true;
    } else {
        console.log('❌ No backup available. Checking localStorage...');
        
        // Try to recover from localStorage
        const currentBoardId = AppState.get('currentBoardId');
        const backupKey = 'boardBackup_' + currentBoardId;
        const storedBackup = localStorage.getItem(backupKey);
        
        if (storedBackup) {
            try {
                const backup = JSON.parse(storedBackup);
                window.liveSyncService.lastBackup = backup;
                if (window.liveSyncService.restoreFromBackup()) {
                    console.log('✅ Board data recovered from localStorage!');
                    return true;
                }
            } catch (e) {
                console.error('Failed to parse backup from localStorage', e);
            }
        }
        
        console.log('❌ No backup found. Try switching boards and back.');
        return false;
    }
};

// Add toggle for data protection
window.toggleDataProtection = function(enabled) {
    if (window.liveSyncService) {
        window.liveSyncService.dataProtectionEnabled = enabled !== false;
        console.log(`Data protection is now ${window.liveSyncService.dataProtectionEnabled ? 'ENABLED' : 'DISABLED'}`);
        return window.liveSyncService.dataProtectionEnabled;
    }
    return null;
};

// LIVE SYNC DISABLED - No auto initialization
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//         liveSyncService.init();
//     });
// } else {
//     liveSyncService.init();
// }