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
    
    console.log('Capturing screenshot...');
    
    try {
        // Use browser's built-in screenshot API
        const screenshot = await browser.runtime.sendMessage({ action: 'captureTab' });
        if (screenshot) {
            console.log('Screenshot captured successfully');
            // Show crop interface instead of sending immediately
            if (window.showCropInterface) {
                window.showCropInterface(screenshot, targetOrigin, elementBounds);
            } else {
                sendScreenshotData(screenshot, targetOrigin);
            }
        } else {
            console.error('No screenshot data received');
            sendError(targetOrigin, 'Failed to capture screenshot');
        }
    } catch (error) {
        console.error('Screenshot capture failed:', error);
        sendError(targetOrigin, error.message);
    } finally {
        isCapturing = false;
    }
}

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
        
        // Check if we should use element picker or direct capture
        if (request.useElementPicker || useElementPicker) {
            console.log('Activating element picker mode');
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
        } else {
            console.log('Direct capture mode - capturing immediately');
            captureForBlockWhiteboard().catch(err => {
                console.error('Direct capture failed:', err);
            });
        }
        
        // Send response immediately
        sendResponse({ status: 'processing' });
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