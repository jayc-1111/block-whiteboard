// Screenshot cropper using CropperJS

// CropperJS is now loaded via manifest.json

function showCropInterface(screenshotData, targetOrigin, elementBounds = null) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'zenban-crop-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    // Create container
    const container = document.createElement('div');
    container.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        gap: 20px;
    `;
    
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
    `;
    toolbar.innerHTML = `
        <button id="zenban-crop-done" style="padding: 8px 16px; background: #9f7aea; color: white; border: none; border-radius: 4px; cursor: pointer;">Crop & Use</button>
        <button id="zenban-crop-reset" style="padding: 8px 16px; background: #718096; color: white; border: none; border-radius: 4px; cursor: pointer;">Reset</button>
        <button id="zenban-crop-full" style="padding: 8px 16px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer;">Use Full Image</button>
        <button id="zenban-crop-cancel" style="padding: 8px 16px; background: #e53e3e; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
    `;
    
    // Create image container
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
        max-width: 80vw;
        max-height: 70vh;
        overflow: hidden;
    `;
    
    // Create image
    const img = document.createElement('img');
    img.src = screenshotData;
    img.style.cssText = `
        max-width: 100%;
        display: block;
    `;
    
    // Add CropperJS CSS
    if (!document.getElementById('cropper-css')) {
        const style = document.createElement('style');
        style.id = 'cropper-css';
        style.textContent = `
            .cropper-container{direction:ltr;font-size:0;line-height:0;position:relative;-ms-touch-action:none;touch-action:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.cropper-container img{display:block;height:100%;image-orientation:0deg;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;width:100%}.cropper-canvas,.cropper-crop-box,.cropper-drag-box,.cropper-modal,.cropper-wrap-box{bottom:0;left:0;position:absolute;right:0;top:0}.cropper-canvas,.cropper-wrap-box{overflow:hidden}.cropper-drag-box{background-color:#fff;opacity:0}.cropper-modal{background-color:#000;opacity:.5}.cropper-view-box{display:block;height:100%;outline:1px solid #39f;outline-color:rgba(51,153,255,.75);overflow:hidden;width:100%}.cropper-dashed{border:0 dashed #eee;display:block;opacity:.5;position:absolute}.cropper-dashed.dashed-h{border-bottom-width:1px;border-top-width:1px;height:calc(100% / 3);left:0;top:calc(100% / 3);width:100%}.cropper-dashed.dashed-v{border-left-width:1px;border-right-width:1px;height:100%;left:calc(100% / 3);top:0;width:calc(100% / 3)}.cropper-center{display:block;height:0;left:50%;opacity:.75;position:absolute;top:50%;width:0}.cropper-center:after,.cropper-center:before{background-color:#eee;content:" ";display:block;position:absolute}.cropper-center:before{height:1px;left:-3px;top:0;width:7px}.cropper-center:after{height:7px;left:0;top:-3px;width:1px}.cropper-face,.cropper-line,.cropper-point{display:block;height:100%;opacity:.1;position:absolute;width:100%}.cropper-face{background-color:#fff;left:0;top:0}.cropper-line{background-color:#39f}.cropper-line.line-e{cursor:ew-resize;right:-3px;top:0;width:5px}.cropper-line.line-n{cursor:ns-resize;height:5px;left:0;top:-3px}.cropper-line.line-w{cursor:ew-resize;left:-3px;top:0;width:5px}.cropper-line.line-s{bottom:-3px;cursor:ns-resize;height:5px;left:0}.cropper-point{background-color:#39f;height:5px;opacity:.75;width:5px}.cropper-point.point-e{cursor:ew-resize;margin-top:-3px;right:-3px;top:50%}.cropper-point.point-n{cursor:ns-resize;left:50%;margin-left:-3px;top:-3px}.cropper-point.point-w{cursor:ew-resize;left:-3px;margin-top:-3px;top:50%}.cropper-point.point-s{bottom:-3px;cursor:ns-resize;left:50%;margin-left:-3px}.cropper-point.point-ne{cursor:nesw-resize;right:-3px;top:-3px}.cropper-point.point-nw{cursor:nwse-resize;left:-3px;top:-3px}.cropper-point.point-sw{bottom:-3px;cursor:nesw-resize;left:-3px}.cropper-point.point-se{bottom:-3px;cursor:nwse-resize;height:20px;opacity:1;right:-3px;width:20px}@media (min-width:768px){.cropper-point.point-se{height:15px;width:15px}}@media (min-width:992px){.cropper-point.point-se{height:10px;width:10px}}@media (min-width:1200px){.cropper-point.point-se{height:5px;opacity:.75;width:5px}}.cropper-point.point-se:before{background-color:#39f;bottom:-50%;content:" ";display:block;height:200%;opacity:0;position:absolute;right:-50%;width:200%}.cropper-invisible{opacity:0}.cropper-bg{background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC")}.cropper-hide{display:block;height:0;position:absolute;width:0}.cropper-hidden{display:none!important}.cropper-move{cursor:move}.cropper-crop{cursor:crosshair}.cropper-disabled .cropper-drag-box,.cropper-disabled .cropper-face,.cropper-disabled .cropper-line,.cropper-disabled .cropper-point{cursor:not-allowed}
        `;
        document.head.appendChild(style);
    }
    
    imgContainer.appendChild(img);
    container.appendChild(imgContainer);
    container.appendChild(toolbar);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Initialize Cropper
    let cropper = null;
    
    // Debug: Check what's available
    console.log('Cropper available:', typeof Cropper);
    console.log('Window.Cropper:', typeof window.Cropper);
    
    img.onload = () => {
        // CropperJS should be available from manifest.json
        if (typeof Cropper !== 'undefined') {
            cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 1,
                dragMode: 'crop',
                responsive: true,
                restore: true,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: true,
                ready: function() {
                    // If element bounds provided, set initial crop area
                    if (elementBounds && this.cropper) {
                        const imageData = this.cropper.getImageData();
                        const canvasData = this.cropper.getCanvasData();
                        
                        // Account for device pixel ratio (important for 4K displays)
                        const dpr = window.devicePixelRatio || 1;
                        
                        // Calculate scale factors
                        const scaleX = canvasData.width / canvasData.naturalWidth;
                        const scaleY = canvasData.height / canvasData.naturalHeight;
                        
                        // Convert element bounds to crop box coordinates
                        // Element bounds are in CSS pixels, screenshot is in device pixels
                        const cropData = {
                            left: canvasData.left + (elementBounds.viewportLeft * dpr * scaleX),
                            top: canvasData.top + (elementBounds.viewportTop * dpr * scaleY),
                            width: elementBounds.width * dpr * scaleX,
                            height: elementBounds.height * dpr * scaleY
                        };
                        
                        this.cropper.setCropBoxData(cropData);
                    }
                }
            });
        } else {
            console.error('CropperJS not available');
            // Use simple fallback cropper
            setupFallbackCropper(img, screenshotData, targetOrigin, elementBounds, overlay);
        }
    };
    
    // Button handlers
    document.getElementById('zenban-crop-done').onclick = () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 4096,
                maxHeight: 4096,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            const croppedData = canvas.toDataURL('image/jpeg', 0.8);
            if (window.sendScreenshotData) {
                window.sendScreenshotData(croppedData, targetOrigin);
            } else {
                // Fallback: send directly
                window.postMessage({
                    type: 'BOOKMARK_SCREENSHOT_READY',
                    payload: {
                        screenshotData: croppedData,
                        title: document.title || 'Untitled',
                        url: window.location.href,
                        favicon: window.location.origin + '/favicon.ico',
                        timestamp: Date.now()
                    }
                }, targetOrigin || '*');
            }
        }
        overlay.remove();
    };
    
    document.getElementById('zenban-crop-reset').onclick = () => {
        if (cropper) {
            cropper.reset();
        }
    };
    
    document.getElementById('zenban-crop-full').onclick = () => {
        if (window.sendScreenshotData) {
            window.sendScreenshotData(screenshotData, targetOrigin);
        } else {
            // Fallback: send directly
            window.postMessage({
                type: 'BOOKMARK_SCREENSHOT_READY',
                payload: {
                    screenshotData: screenshotData,
                    title: document.title || 'Untitled',
                    url: window.location.href,
                    favicon: window.location.origin + '/favicon.ico',
                    timestamp: Date.now()
                }
            }, targetOrigin || '*');
        }
        overlay.remove();
    };
    
    document.getElementById('zenban-crop-cancel').onclick = () => {
        overlay.remove();
    };
}

// Export for use
window.showCropInterface = showCropInterface;

// Simple fallback cropper without CropperJS
function setupFallbackCropper(img, screenshotData, targetOrigin, elementBounds, overlay) {
    console.log('Using fallback cropper');
    
    // If element bounds provided, crop immediately
    if (elementBounds) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
            // Account for device pixel ratio
            const dpr = window.devicePixelRatio || 1;
            
            // Set canvas size to element bounds
            canvas.width = elementBounds.width * dpr;
            canvas.height = elementBounds.height * dpr;
            
            // Draw the cropped area (element bounds in CSS pixels, image in device pixels)
            ctx.drawImage(img, 
                elementBounds.viewportLeft * dpr, elementBounds.viewportTop * dpr, // source x,y
                elementBounds.width * dpr, elementBounds.height * dpr, // source width,height
                0, 0, // dest x,y
                canvas.width, canvas.height // dest width,height
            );
            
            // Convert to data URL
            const croppedData = canvas.toDataURL('image/jpeg', 0.8);
            sendScreenshotData(croppedData, targetOrigin);
            overlay.remove();
        };
        
        img.src = screenshotData;
    } else {
        // No bounds, send full image
        sendScreenshotData(screenshotData, targetOrigin);
        overlay.remove();
    }
}