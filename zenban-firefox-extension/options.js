// Options page script for Zenban Extension

// Load saved settings
browser.storage.local.get(['useElementPicker', 'autoCleanup']).then(result => {
    document.getElementById('elementPicker').checked = result.useElementPicker || false;
    document.getElementById('autoCleanup').checked = result.autoCleanup !== false; // Default to true
});

// Save settings when changed
document.getElementById('elementPicker').addEventListener('change', (e) => {
    const useElementPicker = e.target.checked;
    browser.storage.local.set({ useElementPicker }).then(() => {
        showStatus('Element picker ' + (useElementPicker ? 'enabled' : 'disabled'));
        
        // Notify all tabs about the change
        browser.tabs.query({}).then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab.id, {
                    action: 'toggleElementPicker',
                    enabled: useElementPicker
                }).catch(() => {
                    // Tab might not have content script
                });
            });
        });
    });
});

document.getElementById('autoCleanup').addEventListener('change', (e) => {
    const autoCleanup = e.target.checked;
    browser.storage.local.set({ autoCleanup }).then(() => {
        showStatus('Auto-cleanup ' + (autoCleanup ? 'enabled' : 'disabled'));
    });
});

// Test capture button
document.getElementById('testCapture').addEventListener('click', () => {
    // Get the active tab
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs.length > 0) {
            const tab = tabs[0];
            
            // Get current element picker setting
            browser.storage.local.get('useElementPicker').then(result => {
                // Send message to content script
                browser.tabs.sendMessage(tab.id, {
                    action: 'activateElementPicker',
                    useElementPicker: result.useElementPicker || false
                }).then(response => {
                    showStatus('Test capture initiated: ' + response.status);
                }).catch(err => {
                    showStatus('Error: Content script not loaded on this page', 'error');
                    console.error(err);
                });
            });
        }
    });
});

function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'status show';
    
    if (type === 'error') {
        status.style.background = '#f8d7da';
        status.style.color = '#721c24';
    } else {
        status.style.background = '#d4edda';
        status.style.color = '#155724';
    }
    
    setTimeout(() => {
        status.className = 'status';
    }, 3000);
}
