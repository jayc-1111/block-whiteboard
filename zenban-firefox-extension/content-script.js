// Enhanced content script with element picker support
const scriptInstanceId = Math.random().toString(36).substr(2, 9);
console.log('🔷 CONTENT: Zenban content script loaded on:', window.location.href);
console.log('🔷 CONTENT: Script loaded at:', new Date().toLocaleTimeString());
console.log('🔷 CONTENT: Script instance ID:', scriptInstanceId);

let isCapturing = false;
let captureCount = 0;
let lastCaptureTime = 0;
let useElementPicker = false; // Toggle for element picker mode
let messageCount = 0;

// Heartbeat to track if script is alive
setInterval(() => {
    console.log('💓 CONTENT: Heartbeat', scriptInstanceId, 'at', new Date().toLocaleTimeString(), 'captures:', captureCount);
}, 5000);

// Load element picker script if not already loaded
if (!window.zenbanPicker) {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('element-picker.js');
    document.head.appendChild(script);
    console.log('Element picker script loaded');
}

async function captureForBlockWhiteboard(elementBounds = null) {
    const now = Date.now();
    captureCount++;
    
    console.log('📦 CONTENT: Starting capture #' + captureCount);
    console.log('📦 CONTENT: Time since last capture:', now - lastCaptureTime, 'ms');
    lastCaptureTime = now;
    
    // Prevent duplicate captures
    if (isCapturing) {
        console.log('⚠️ CONTENT: Already capturing, skipping duplicate request');
        return;
    }
    
    console.log('📦 CONTENT: Setting isCapturing = true');
    isCapturing = true;
    
    try {
        // Get page metadata
        const pageData = {
            title: document.title,
            url: window.location.href,
            description: document.querySelector('meta[name="description"]')?.content || '',
            timestamp: new Date().toISOString(),
            elementBounds: elementBounds // Include element bounds if provided
        };
        
        console.log('Page data:', pageData);
        
        // If element bounds provided, add visual context
        if (elementBounds) {
            pageData.captureType = 'element';
            console.log('Capturing specific element with bounds:', elementBounds);
        } else {
            pageData.captureType = 'fullpage';
        }
        
        // Take screenshot
        console.log('📦 CONTENT: Requesting screenshot from background...');
        const screenshot = await browser.runtime.sendMessage({ action: 'captureTab' });
        
        if (screenshot) {
            console.log('✅ CONTENT: Screenshot captured, size:', screenshot.length);
            
            // Prepare bookmark data
            const bookmarkData = {
                ...pageData,
                screenshot: screenshot,
                image: screenshot
            };
            
            console.log('📦 CONTENT: Sending to Block Whiteboard...');
            // Send to Block Whiteboard
            await browser.runtime.sendMessage({
                action: 'sendToBlockWhiteboard',
                data: bookmarkData
            });
            console.log('✅ CONTENT: Bookmark sent to Block Whiteboard');
        } else {
            console.error('🔴 CONTENT: Failed to capture screenshot');
        }
    } catch (error) {
        console.error('Capture failed:', error);
    } finally {
        // Always reset capturing flag
        isCapturing = false;
        console.log('Capture process completed');
    }
}

// Listen for screenshot requests from app
window.addEventListener('message', async function(event) {
    if (event.data.type === 'REQUEST_BOOKMARK_SCREENSHOT') {
        // Store app origin for response
        browser.storage.local.set({
            appRequest: {
                appOrigin: event.origin,
                timestamp: Date.now()
            }
        });
        
        // Capture immediately
        captureAndSend(event.origin);
    }
});

async function captureAndSend(targetOrigin, elementBounds = null) {
    if (isCapturing) return;
    isCapturing = true;
    
    console.log('🎯 Capturing screenshot with element bounds:', elementBounds);
    
    try {
        // Use browser's built-in screenshot API
        const screenshot = await browser.runtime.sendMessage({ action: 'captureTab' });
        if (screenshot) {
            console.log('📸 Screenshot captured successfully, showing crop interface');
            // Show crop interface if element bounds provided
            if (elementBounds && window.showCropInterface) {
                console.log('🖼️ Showing crop interface with element bounds');
                window.showCropInterface(screenshot, targetOrigin, elementBounds);
            } else {
                console.log('📤 Sending full screenshot directly');
                // Send full screenshot directly to Block Whiteboard
                await sendToBlockWhiteboard(screenshot, elementBounds);
            }
        } else {
            console.error('No screenshot data received');
        }
    } catch (error) {
        console.error('Screenshot capture failed:', error);
    } finally {
        isCapturing = false;
    }
}

// Send cropped or full screenshot to Block Whiteboard
async function sendToBlockWhiteboard(screenshot, elementBounds = null) {
    const pageData = {
        title: document.title || 'Untitled',
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.content || '',
        screenshot: screenshot,
        image: screenshot,
        timestamp: new Date().toISOString(),
        elementBounds: elementBounds,
        captureType: elementBounds ? 'element' : 'fullpage'
    };
    
    console.log('📤 Sending bookmark to Block Whiteboard:', pageData.captureType);
    
    // Send to Block Whiteboard via background script
    await browser.runtime.sendMessage({
        action: 'sendToBlockWhiteboard',
        data: pageData
    });
    console.log('✅ Bookmark sent to Block Whiteboard');
}

// Function for crop tool to use
window.sendScreenshotData = function(screenshot, targetOrigin) {
    console.log('🎨 Crop tool sending cropped screenshot');
    sendToBlockWhiteboard(screenshot, null).catch(err => {
        console.error('Failed to send cropped screenshot:', err);
    });
};

function sendScreenshotData(screenshot, targetOrigin) {
    const screenshotData = {
        screenshotData: screenshot,  // Changed from 'screenshot' to 'screenshotData'
        title: document.title || 'Untitled',
        url: window.location.href,
        favicon: getFaviconUrl(),
        timestamp: Date.now()
    };
    
    // TEST MODE: Open in new tab
    const testMode = false; // Toggle this for testing
    
    if (testMode) {
        // Send to test viewer
        browser.runtime.sendMessage({
            action: 'openTestViewer',
            data: screenshotData
        }).catch(err => {
            console.error('Failed to open test viewer:', err);
        });
        return;
    }
    
    // Normal flow
    window.postMessage({
        type: 'BOOKMARK_SCREENSHOT_READY',
        payload: screenshotData
    }, targetOrigin || '*');
    
    browser.runtime.sendMessage({
        action: 'sendToBlockWhiteboard',
        data: screenshotData
    }).catch(err => {
        console.log('Background script not available, using direct postMessage only');
    });
}

function sendError(targetOrigin, errorMessage) {
    window.postMessage({
        type: 'BOOKMARK_SCREENSHOT_ERROR',
        payload: {
            error: errorMessage,
            title: document.title || 'Untitled',
            url: window.location.href
        }
    }, targetOrigin);
}

function getFaviconUrl() {
    const links = document.getElementsByTagName('link');
    for (let link of links) {
        if (link.rel && link.rel.includes('icon')) {
            return link.href;
        }
    }
    return window.location.origin + '/favicon.ico';
}

window.sendScreenshotData = sendScreenshotData;

// Override captureAndSend for element picker integration
window.captureAndSend = async function(targetOrigin, elementBounds = null) {
    console.log('captureAndSend called with bounds:', elementBounds);
    try {
        await captureForBlockWhiteboard(elementBounds);
    } catch (error) {
        console.error('captureAndSend error:', error);
        // Ensure isCapturing is reset even on error
        isCapturing = false;
    }
};

// Create selection dialog
function showCaptureDialog() {
    // Remove any existing dialog
    const existingDialog = document.getElementById('zenban-capture-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.id = 'zenban-capture-dialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create dialog box
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 90%;
    `;
    
    dialog.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1f2937;">Capture Screenshot for Zenban</h2>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            Choose how you want to capture this page for your bookmark:
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="zenban-fullpage" style="
                padding: 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                Full Page Screenshot
            </button>
            <button id="zenban-element" style="
                padding: 16px;
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                </svg>
                Select Specific Element
            </button>
            <button id="zenban-cancel" style="
                padding: 12px;
                background: #f3f4f6;
                color: #6b7280;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            ">
                Cancel
            </button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Add hover effects
    const fullpageBtn = dialog.querySelector('#zenban-fullpage');
    const elementBtn = dialog.querySelector('#zenban-element');
    const cancelBtn = dialog.querySelector('#zenban-cancel');
    
    fullpageBtn.onmouseenter = () => fullpageBtn.style.background = '#5a67d8';
    fullpageBtn.onmouseleave = () => fullpageBtn.style.background = '#667eea';
    
    elementBtn.onmouseenter = () => elementBtn.style.background = '#16a34a';
    elementBtn.onmouseleave = () => elementBtn.style.background = '#22c55e';
    
    cancelBtn.onmouseenter = () => {
        cancelBtn.style.background = '#e5e7eb';
        cancelBtn.style.color = '#374151';
    };
    cancelBtn.onmouseleave = () => {
        cancelBtn.style.background = '#f3f4f6';
        cancelBtn.style.color = '#6b7280';
    };
    
    // Handle button clicks
    fullpageBtn.onclick = () => {
        overlay.remove();
        console.log('📸 CONTENT: User selected full page capture');
        captureForBlockWhiteboard();
    };
    
    elementBtn.onclick = () => {
        overlay.remove();
        console.log('🎯 CONTENT: User selected element picker');
        // Wait for element picker to load
        setTimeout(() => {
            if (window.zenbanPicker && window.zenbanPicker.activate) {
                window.zenbanPicker.activate();
                console.log('Element picker activated');
            } else {
                console.error('Element picker not available, falling back to full page capture');
                // Fallback to full page capture
                captureForBlockWhiteboard().catch(err => {
                    console.error('Fallback capture failed:', err);
                });
            }
        }, 100);
    };
    
    cancelBtn.onclick = () => {
        overlay.remove();
        console.log('❌ CONTENT: User cancelled capture');
    };
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Handle browser action click - single message listener
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    messageCount++;
    console.log('🔉 CONTENT: Message #' + messageCount + ' received at', new Date().toLocaleTimeString());
    console.log('🔉 CONTENT: Script instance:', scriptInstanceId);
    console.log('🔉 CONTENT: Message action:', request.action);
    console.log('🔉 CONTENT: Message source:', request.source || 'unknown');
    console.log('🔉 CONTENT: isCapturing:', isCapturing);
    console.log('🔉 CONTENT: captureCount:', captureCount);
    console.log('🔉 CONTENT: Full request:', JSON.stringify(request));
    
    if (request.action === 'activateElementPicker') {
        console.log('🎆 CONTENT: Received activateElementPicker command');
        console.log('🎆 CONTENT: Always showing capture dialog now');
        
        // Always show the selection dialog regardless of settings
        showCaptureDialog();
        
        // Send response immediately
        sendResponse({ status: 'dialog_shown' });
        return false; // Synchronous response
        
    } else if (request.action === 'captureForZenban') {
        console.log('Capturing for Zenban');
        captureForBlockWhiteboard().catch(err => {
            console.error('Capture failed:', err);
        });
        sendResponse({ status: 'capturing' });
        return false;
        
    } else if (request.action === 'toggleElementPicker') {
        useElementPicker = !useElementPicker;
        console.log('Element picker mode:', useElementPicker ? 'ON' : 'OFF');
        sendResponse({ status: 'toggled', elementPicker: useElementPicker });
        return false;
    }
    
    // Return false for unhandled messages
    return false;
});