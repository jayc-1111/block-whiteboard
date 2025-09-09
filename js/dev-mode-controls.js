// Dev mode control functions
function toggleDevMode() {
    const currentDevMode = AppState.get('isDevMode');
    const newDevMode = !currentDevMode;

    Debug.ui.info('DevMode', `Dev Mode: ${currentDevMode ? 'OFF' : 'ON'}`);

    AppState.set('isDevMode', newDevMode);

    // Update global variable for compatibility
    window.isDevMode = newDevMode;

    // Handle live sync during dev mode toggle
    if (newDevMode) {
        // Disable live sync when entering dev mode
        window.LIVE_SYNC_DISABLED = true;

        // Stop active live sync listeners if service is running
        if (window.liveSyncService && window.liveSyncService.stopLiveSync) {
            Debug.ui.info('DevMode', 'Stopping live sync service for dev mode');
            window.liveSyncService.stopLiveSync();
        }

        // Update dev overlay to show live sync status
        if (window.setDevInfo) {
            window.setDevInfo('liveSync', 'Disabled in Dev Mode');
        }
    } else {
        // Re-enable live sync when exiting dev mode
        window.LIVE_SYNC_DISABLED = false;

        // Restart live sync if service exists
        if (window.liveSyncService && window.liveSyncService.init) {
            Debug.ui.info('DevMode', 'Re-enabling live sync service after dev mode exit');
            window.liveSyncService.init();

            // Update dev overlay to show live sync status (will be updated by service when started)
            if (window.setDevInfo) {
                window.setDevInfo('liveSync', false); // Will be set to true by service when ready
            }
        }
    }

    // Toggle dev overlay visibility
    if (window.toggleDevOverlay) {
        window.toggleDevOverlay(newDevMode);
    }
    
    // Update the settings option text
    const devModeOption = document.getElementById('devModeOption');
    if (devModeOption) {
        const span = devModeOption.querySelector('span');
        if (span) {
            span.textContent = `Dev Mode ${newDevMode ? '(ON)' : ''}`;
        }
    }
    
    // If turning on dev mode, update dev info immediately
    if (newDevMode) {
        updateDevBoardInfo();
        
        // Initialize dev overlay if not already done
        if (window.initDevOverlay) {
            window.initDevOverlay();
        }
        
        // Set initial dev info from current auth state
        if (window.setDevInfo && window.authService) {
            const currentUser = window.authService.getCurrentUser();
            if (currentUser) {
                if (currentUser.isAnonymous) {
                    const guestId = currentUser.uid.slice(-6).toUpperCase();
                    window.setDevInfo('guestId', guestId);
                    window.setDevInfo('userEmail', null);
                    Debug.auth.detail('Dev mode init - Guest:', guestId);
                } else {
                    window.setDevInfo('guestId', null);
                    window.setDevInfo('userEmail', currentUser.email);
                    Debug.auth.detail('Dev mode init - User:', currentUser.email);
                }
            } else {
                window.setDevInfo('guestId', null);
                window.setDevInfo('userEmail', null);
                Debug.auth.detail('Dev mode init - No user');
            }
        }
        
        // Set other initial info
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const currentBoard = boards.find(b => b.id === currentBoard_id);
        
        if (window.setDevInfo) {
            window.setDevInfo('boardName', currentBoard?.name || 'Unknown');
            window.setDevInfo('liveSync', false); // Will be updated by live sync service
            window.setDevInfo('saveStatus', 'Ready');
        }
    }
}

function updateDevBoardInfo() {
    if (!AppState.get('isDevMode') || !window.setDevInfo) return;
    
    const boards = AppState.get('boards');
    const currentBoard_id = AppState.get('currentBoard_id');
    const currentBoard = boards.find(b => b.id === currentBoard_id);
    
    window.setDevInfo('boardName', currentBoard?.name || 'Unknown');
    window.setDevInfo('board_id', currentBoard_id);
    window.setDevInfo('totalBoards', boards.length);
    window.setDevInfo('foldersCount', currentBoard?.folders?.length || 0);
}

function toggleGridSnap() {
    const currentGridSnap = AppState.get('isGridSnapEnabled');
    const newGridSnap = !currentGridSnap;
    
    Debug.ui.info('Grid', `Grid Snap: ${newGridSnap ? 'ON' : 'OFF'}`);
    
    AppState.set('isGridSnapEnabled', newGridSnap);
    
    // Update global variable for compatibility
    window.isGridSnapEnabled = newGridSnap;
    
    // Update the settings option text  
    const gridSnapOption = document.getElementById('gridSnapOption');
    if (gridSnapOption) {
        const indicator = gridSnapOption.querySelector('.toggle-indicator');
        if (indicator) {
            indicator.textContent = newGridSnap ? 'ON' : 'OFF';
        }
    }
}

// Make functions globally available
window.toggleDevMode = toggleDevMode;
window.updateDevBoardInfo = updateDevBoardInfo;
window.toggleGridSnap = toggleGridSnap;

// Update dev info when board changes
if (window.AppState) {
    AppState.onChange('currentBoard_id', () => {
        if (AppState.get('isDevMode')) {
            updateDevBoardInfo();
        }
    });
    
    AppState.onChange('boards', () => {
        if (AppState.get('isDevMode')) {
            updateDevBoardInfo();
        }
    });
}

Debug.init.step('Dev mode controls initialized');
