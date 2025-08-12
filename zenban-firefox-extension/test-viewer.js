// Listen for screenshot data
window.addEventListener('message', function(event) {
    console.log('Message received:', event.data);
    
    if (event.data.type === 'BOOKMARK_SCREENSHOT_READY') {
        const data = event.data.payload;
        
        document.getElementById('output').innerHTML = `
            <div class="data-field">
                <strong>Title:</strong> ${data.title}
            </div>
            <div class="data-field">
                <strong>URL:</strong> <a href="${data.url}" target="_blank">${data.url}</a>
            </div>
            <div class="data-field">
                <strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}
            </div>
            <div class="data-field">
                <strong>Favicon:</strong> <img src="${data.favicon}" style="width: 16px; height: 16px; vertical-align: middle;">
            </div>
            <div class="data-field">
                <strong>Screenshot:</strong><br>
                <img src="${data.screenshotData}" alt="Screenshot">
            </div>
            <div class="data-field">
                <strong>Data URL Length:</strong> ${data.screenshotData.length} characters
            </div>
        `;
    }
});

// For testing - simulate bookmark data
function testData() {
    window.postMessage({
        type: 'BOOKMARK_SCREENSHOT_READY',
        payload: {
            title: 'Test Page',
            url: 'https://example.com',
            favicon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            screenshotData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            timestamp: Date.now()
        }
    }, '*');
}
