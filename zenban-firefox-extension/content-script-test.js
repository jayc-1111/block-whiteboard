// Test version - minimal content script
console.log('Zenban: Content script starting...');

// Test if we can capture
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Zenban: Received message:', request);
    
    if (request.action === 'captureForZenban') {
        console.log('Zenban: Capturing screenshot...');
        
        browser.runtime.sendMessage({ action: 'captureTab' })
            .then(screenshot => {
                console.log('Zenban: Got screenshot:', screenshot ? 'Yes' : 'No');
                if (screenshot) {
                    alert('Screenshot captured! Check console for details.');
                } else {
                    alert('Screenshot failed!');
                }
            })
            .catch(err => {
                console.error('Zenban: Error:', err);
                alert('Error: ' + err.message);
            });
            
        sendResponse({ status: 'capturing' });
    }
    
    return true;
});

console.log('Zenban: Content script ready');

// Test message from app
window.addEventListener('message', (event) => {
    if (event.data.type === 'REQUEST_BOOKMARK_SCREENSHOT') {
        console.log('Zenban: App requested screenshot');
        alert('Screenshot request received from app');
    }
});