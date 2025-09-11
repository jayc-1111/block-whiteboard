// Dev mode overlay management

let devOverlay = null;
let devInfo = {};
let devLogs = [];
const MAX_LOGS = 10;

// Initialize dev overlay
function initDevOverlay() {
    if (!devOverlay) {
        devOverlay = document.createElement('div');
        devOverlay.id = 'devOverlay';
        devOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 12px;
            border-radius: 4px;
            z-index: 100000;
            min-width: 250px;
            max-width: 400px;
            line-height: 1.6;
            border: 1px solid #0f0;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
            display: none;
        `;
        document.body.appendChild(devOverlay);
    }
}

// Add log to dev overlay
function addDevLog(type, message) {
    devLogs.push({ type, message, time: new Date().toLocaleTimeString() });
    if (devLogs.length > MAX_LOGS) devLogs.shift();
    
    if (AppState.get('dev_mode')) {
        updateDevOverlay();
    }
}

// Make addDevLog available globally for the debug system
window.addDevLog = addDevLog;

// Update dev overlay
function updateDevOverlay() {
    if (!devOverlay) return;
    
    // Check if dev mode is enabled with fallback
    const dev_modeEnabled = (window.AppState && AppState.get('dev_mode')) || window.dev_mode || false;
    
    if (!dev_modeEnabled) {
        devOverlay.style.display = 'none';
        return;
    }
    
    let html = '<div style="font-weight: bold; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #0f0; padding-bottom: 4px;">Dev Mode</div>';
    
    // Status info
    html += '<div style="margin-bottom: 8px;">';
    
    // Guest ID or User
    if (devInfo.guestId) {
        html += `<div>Guest: ${devInfo.guestId}</div>`;
    } else if (devInfo.userEmail) {
        html += `<div>User: ${devInfo.userEmail}</div>`;
    } else {
        html += '<div>User: Loading...</div>';
    }
    
    // Board info
    if (devInfo.boardName) {
        html += `<div>Board: ${devInfo.boardName}</div>`;
    } else if (window.AppState) {
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const currentBoard = boards?.find(b => b.id === currentBoard_id);
        html += `<div>Board: ${currentBoard?.name || 'Unknown'}</div>`;
    }
    
    // Live sync status
    if (devInfo.liveSync !== undefined) {
        html += `<div>Live Sync: ${devInfo.liveSync ? '<span style="color: #0f0">ON</span>' : '<span style="color: #f00">OFF</span>'}</div>`;
    } else {
        html += '<div>Live Sync: <span style="color: #888">Unknown</span></div>';
    }
    
    // Save status
    if (devInfo.saveStatus) {
        html += `<div>Save: ${devInfo.saveStatus}</div>`;
    } else {
        html += '<div>Save: Ready</div>';
    }
    
    html += '</div>';
    
    // Console logs
    if (devLogs.length > 0) {
        html += '<div style="border-top: 1px solid #0f0; padding-top: 8px; margin-top: 8px;">';
        html += '<div style="font-weight: bold; margin-bottom: 4px;">Console:</div>';
        html += '<div style="max-height: 200px; overflow-y: auto; font-size: 10px;">';
        
        devLogs.forEach(log => {
            const color = log.type === 'error' ? '#f00' : log.type === 'warn' ? '#ff0' : '#0f0';
            html += `<div style="color: ${color}; margin-bottom: 2px; word-wrap: break-word;">[${log.time}] ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}</div>`;
        });
        
        html += '</div></div>';
    } else {
        html += '<div style="border-top: 1px solid #0f0; padding-top: 8px; margin-top: 8px;">';
        html += '<div style="color: #888; font-size: 10px;">No logs yet...</div>';
        html += '</div>';
    }
    
    devOverlay.innerHTML = html;
    devOverlay.style.display = 'block';
}

// Show/hide overlay based on dev mode
function toggleDevOverlay(show) {
    if (!devOverlay) initDevOverlay();
    
    // If show parameter is provided, use it; otherwise check AppState
    const shouldShow = show !== undefined ? show : 
                      (window.AppState && AppState.get('dev_mode')) || 
                      window.dev_mode || false;
    
    if (shouldShow) {
        console.log('🔧 Showing dev overlay');
        updateDevOverlay();
        devOverlay.style.display = 'block';
    } else {
        console.log('🔧 Hiding dev overlay');
        devOverlay.style.display = 'none';
    }
}

// Update specific dev info
function setDevInfo(key, value) {
    devInfo[key] = value;
    
    // Check if dev mode is enabled with fallback
    const dev_modeEnabled = (window.AppState && AppState.get('dev_mode')) || window.dev_mode || false;
    
    if (dev_modeEnabled) {
        updateDevOverlay();
    }
}

// Export functions
window.initDevOverlay = initDevOverlay;
window.updateDevOverlay = updateDevOverlay;
window.toggleDevOverlay = toggleDevOverlay;
window.setDevInfo = setDevInfo;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initDevOverlay();
    
    // Listen for state changes to update dev info
    if (window.AppState) {
        AppState.onChange('boards', () => {
            if (AppState.get('dev_mode') && window.updateDevBoardInfo) {
                window.updateDevBoardInfo();
            }
        });
    }
});
