// Dev mode control functions
function toggleDevMode() {
    const currentDevMode = AppState.get('isDevMode');
    const newDevMode = !currentDevMode;
    
    Debug.ui.info('DevMode', `Dev Mode: ${currentDevMode ? 'OFF' : 'ON'}`);
    
    AppState.set('isDevMode', newDevMode);
    
    // Update global variable for compatibility
    window.isDevMode = newDevMode;
    
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
        const currentBoardId = AppState.get('currentBoardId');
        const currentBoard = boards.find(b => b.id === currentBoardId);
        
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
    const currentBoardId = AppState.get('currentBoardId');
    const currentBoard = boards.find(b => b.id === currentBoardId);
    
    window.setDevInfo('boardName', currentBoard?.name || 'Unknown');
    window.setDevInfo('boardId', currentBoardId);
    window.setDevInfo('totalBoards', boards.length);
    window.setDevInfo('categoriesCount', currentBoard?.categories?.length || 0);
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
    AppState.onChange('currentBoardId', () => {
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
