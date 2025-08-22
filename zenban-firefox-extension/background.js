// Background script for Zenban Screenshot Extension
// Handles browser action clicks and coordinates captures

console.log('Background script loaded');

// Track extension state
let extensionActive = true;
let lastClickTime = 0;

// Listen for browser action clicks
browser.browserAction.onClicked.addListener(async (tab) => {
    const now = Date.now();
    console.log('🔵 BACKGROUND: Extension button clicked at', new Date(now).toLocaleTimeString());
    console.log('🔵 BACKGROUND: Extension active:', extensionActive);
    console.log('🔵 BACKGROUND: Time since last click:', now - lastClickTime, 'ms');
    lastClickTime = now;
    
    if (!extensionActive) {
        console.error('🔴 BACKGROUND: Extension is not active, resetting...');
        extensionActive = true;
    }
    
    console.log('🔵 BACKGROUND: Tab info:', tab.url, tab.id);
    
    try {
        // Get the active tab
        const activeTab = await browser.tabs.query({ active: true, currentWindow: true });
        console.log('🔵 BACKGROUND: Active tabs found:', activeTab.length);
        
        if (activeTab.length === 0) {
            console.error('🔴 BACKGROUND: No active tab found');
            return;
        }
        
        // Get user preference for element picker
        const settings = await browser.storage.local.get('useElementPicker');
        const useElementPicker = settings.useElementPicker || false;
        
        console.log('🔵 BACKGROUND: Preparing to send message to tab:', activeTab[0].id);
        
        // Send message to content script to activate element picker
        const response = await browser.tabs.sendMessage(activeTab[0].id, {
            action: 'activateElementPicker',
            useElementPicker: useElementPicker,
            timestamp: now
        });
        
        console.log('✅ BACKGROUND: Message sent successfully, response:', response);
        
    } catch (err) {
        console.error('🔴 BACKGROUND: Error in click handler:', err);
        console.error('🔴 BACKGROUND: Error details:', err.message, err.stack);
        
        // Try to reinject content script if it's missing
        try {
            console.log('🔵 BACKGROUND: Attempting to reinject content script...');
            await browser.tabs.executeScript(tab.id, {
                file: 'content-script.js'
            });
            console.log('✅ BACKGROUND: Content script reinjected');
        } catch (reinjectError) {
            console.error('🔴 BACKGROUND: Failed to reinject:', reinjectError);
        }
    }
});

// Listen for installation
browser.runtime.onInstalled.addListener(() => {
    console.log('Zenban Screenshot Extension installed');
});

// Optional: Add context menu item
browser.contextMenus.create({
    id: "zenban-capture",
    title: "Capture for Zenban Bookmark",
    contexts: ["page"]
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "zenban-capture") {
        // Get user preference for element picker
        const settings = await browser.storage.local.get('useElementPicker');
        const useElementPicker = settings.useElementPicker || false;
        
        browser.tabs.sendMessage(tab.id, {
            action: 'activateElementPicker',
            useElementPicker: useElementPicker
        });
    }
});

// Handle captureTab requests from content script
browser.runtime.onMessage.addListener((request, sender) => {
    try {
        if (request.action === 'captureTab') {
            // Return a Promise for async operations
            return browser.tabs.captureVisibleTab(null, {
                format: 'jpeg',
                quality: 92  // Increased from 80 - still safe for 1MB Firestore limit
            }).then(screenshot => {
                console.log('Background: Screenshot captured, type:', typeof screenshot, 'length:', screenshot ? screenshot.length : 0);
                return screenshot;
            }).catch(error => {
                console.error('Tab capture failed:', error);
                // Don't let the error propagate and crash the extension
                return null;
            });
    } else if (request.action === 'sendToBlockWhiteboard') {
        console.log('📨 BACKGROUND: sendToBlockWhiteboard received at', new Date().toLocaleTimeString());
        console.log('📨 BACKGROUND: Sender tab ID:', sender.tab?.id);
        console.log('📨 BACKGROUND: Data size:', JSON.stringify(request.data).length, 'bytes');
        
        // Find Block Whiteboard tab and send data via localStorage
        browser.tabs.query({}).then(tabs => {
            console.log('🔍 BACKGROUND: Found tabs:', tabs.length);
            console.log('🔍 BACKGROUND: Tab URLs:', tabs.map(t => t.url));
            
            const blockWhiteboardTab = tabs.find(tab => 
                tab.url && (
                    tab.url.includes('127.0.0.1') ||
                    tab.url.includes('localhost') ||
                    tab.url.includes('file:///') ||
                    tab.url.includes('zenban.app') ||
                    tab.url.includes('block-whiteboard')
                )
            );
            
            console.log('🎯 BACKGROUND: Found Block Whiteboard tab:', blockWhiteboardTab?.id, blockWhiteboardTab?.url);
            
            if (blockWhiteboardTab) {
                // First focus the tab
                browser.tabs.update(blockWhiteboardTab.id, { active: true });
                browser.windows.update(blockWhiteboardTab.windowId, { focused: true });
                
                // Use localStorage bridge instead of script injection
                const storageKey = 'zenban_bookmark_' + Date.now();
                console.log('📦 BACKGROUND: Using localStorage bridge with key:', storageKey);
                console.log('📦 BACKGROUND: Tab active:', blockWhiteboardTab.active);
                console.log('📦 BACKGROUND: Tab status:', blockWhiteboardTab.status);
                
                // Execute script to write to localStorage
                browser.tabs.executeScript(blockWhiteboardTab.id, {
                    code: `
                        (function() {
                            console.log('🎯 EXTENSION: Writing bookmark to localStorage at', new Date().toLocaleTimeString());
                            console.log('🎯 EXTENSION: Page URL:', window.location.href);
                            console.log('🎯 EXTENSION: Document ready state:', document.readyState);
                            
                            const bookmarkData = ${JSON.stringify(request.data)};
                            const storageKey = '${storageKey}';
                            
                            try {
                                // Check if localStorage is available
                                if (typeof localStorage === 'undefined') {
                                    throw new Error('localStorage is not available');
                                }
                                
                                console.log('🎯 EXTENSION: localStorage available, writing...');
                                localStorage.setItem(storageKey, JSON.stringify(bookmarkData));
                                console.log('🎯 EXTENSION: Bookmark saved to localStorage with key:', storageKey);
                                console.log('🎯 EXTENSION: Data size written:', JSON.stringify(bookmarkData).length, 'bytes');
                                
                                // Trigger storage event for same-tab detection
                                console.log('🎯 EXTENSION: Dispatching storage event...');
                                window.dispatchEvent(new StorageEvent('storage', {
                                    key: storageKey,
                                    newValue: JSON.stringify(bookmarkData),
                                    url: window.location.href,
                                    storageArea: localStorage
                                }));
                                
                                console.log('🎯 EXTENSION: Storage event dispatched successfully');
                                return true; // Return value for executeScript
                            } catch (error) {
                                console.error('🎯 EXTENSION: Failed to save bookmark:', error);
                                console.error('🎯 EXTENSION: Error details:', error.message, error.stack);
                                return false; // Return value for executeScript
                            }
                        })();
                    `
                }).then((result) => {
                    console.log('✅ BACKGROUND: localStorage write script executed, result:', result);
                    return true;
                }).catch(err => {
                    console.error('❌ BACKGROUND: Failed to write to localStorage:', err);
                    console.error('❌ BACKGROUND: Error details:', err.message);
                    
                    // Try alternative method - inject content script first
                    console.log('🔄 BACKGROUND: Attempting to reinject content script...');
                    return browser.tabs.executeScript(blockWhiteboardTab.id, {
                        file: 'content-script.js'
                    }).then(() => {
                        console.log('✅ BACKGROUND: Content script reinjected, retrying localStorage write...');
                        return browser.tabs.executeScript(blockWhiteboardTab.id, {
                            code: `(function() { localStorage.setItem('${storageKey}', ${JSON.stringify(JSON.stringify(request.data))}); })();`
                        });
                    }).catch(reinjectErr => {
                        console.error('❌ BACKGROUND: Reinject also failed:', reinjectErr);
                        return false;
                    });
                });
            } else {
                // No Block Whiteboard tab found, open it
                console.log('Background: No Block Whiteboard tab found, opening new one');
                const appUrl = request.appUrl || 'http://localhost:5500';
                browser.tabs.create({ url: appUrl }, (tab) => {
                    // Wait for tab to load then send via localStorage
                    setTimeout(() => {
                        const storageKey = 'zenban_bookmark_' + Date.now();
                        browser.tabs.executeScript(tab.id, {
                            code: `
                                console.log('🎯 EXTENSION: New tab - writing bookmark to localStorage');
                                const bookmarkData = ${JSON.stringify(request.data)};
                                localStorage.setItem('${storageKey}', JSON.stringify(bookmarkData));
                                
                                // Trigger storage event
                                window.dispatchEvent(new StorageEvent('storage', {
                                    key: '${storageKey}',
                                    newValue: JSON.stringify(bookmarkData),
                                    url: window.location.href,
                                    storageArea: localStorage
                                }));
                            `
                        });
                    }, 3000);
                });
            }
        });
        return true;
    } else if (request.action === 'openTestViewer') {
        // Open test viewer with data
        const viewerUrl = browser.runtime.getURL('test-viewer.html');
        browser.tabs.create({ url: viewerUrl }, (tab) => {
            setTimeout(() => {
                browser.tabs.executeScript(tab.id, {
                    code: `
                        window.postMessage({
                            type: 'BOOKMARK_SCREENSHOT_READY',
                            payload: ${JSON.stringify(request.data)}
                        }, window.location.origin);
                    `
                });
            }, 500);
        });
        return true;
    } else if (request.action === 'focusBlockWhiteboard') {
        // Find and focus Block Whiteboard tab
        browser.tabs.query({}).then(tabs => {
            const blockWhiteboardTab = tabs.find(tab => 
                tab.url && (
                    tab.url.includes('127.0.0.1') ||
                    tab.url.includes('localhost') ||
                    tab.url.includes('file:///') ||
                    tab.url.includes('zenban.app')
                )
            );
            
            if (blockWhiteboardTab) {
                browser.tabs.update(blockWhiteboardTab.id, { active: true });
                browser.windows.update(blockWhiteboardTab.windowId, { focused: true });
            }
        });
        return true;
    }
    } catch (error) {
        console.error('Background script error:', error);
        // Prevent extension from crashing
        return false;
    }
});