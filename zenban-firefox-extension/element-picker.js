// Element picker for visual selection
let pickerActive = false;
let highlightBox = null;
let selectedElement = null;

function createHighlightBox() {
    const box = document.createElement('div');
    box.id = 'zenban-highlight-box';
    box.style.cssText = `
        position: absolute;
        pointer-events: none;
        border: 3px solid #ff1493;
        background: rgba(255, 20, 147, 0.2);
        box-shadow: 0 0 10px rgba(255, 20, 147, 0.5);
        z-index: 999999;
        transition: all 0.1s ease;
        display: none;
    `;
    document.body.appendChild(box);
    return box;
}

function updateHighlightBox(element) {
    if (!highlightBox) return;
    
    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    highlightBox.style.left = (rect.left + scrollLeft) + 'px';
    highlightBox.style.top = (rect.top + scrollTop) + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';
    highlightBox.style.display = 'block';
}

function hideHighlightBox() {
    if (highlightBox) {
        highlightBox.style.display = 'none';
    }
}

function handleMouseMove(e) {
    if (!pickerActive) return;
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element && element.id !== 'zenban-highlight-box') {
        updateHighlightBox(element);
        selectedElement = element;
    }
}

function handleClick(e) {
    if (!pickerActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedElement) {
        deactivatePicker();
        
        // Get element bounds relative to viewport and page
        const rect = selectedElement.getBoundingClientRect();
        const bounds = {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            viewportLeft: rect.left,
            viewportTop: rect.top
        };
        
        console.log('Element selected with bounds:', bounds);
        
        // Capture with bounds data
        if (typeof captureAndSend === 'function') {
            captureAndSend(window.location.origin, bounds);
        }
    }
}

function generateSelector(element) {
    // Try ID first
    if (element.id) {
        return '#' + CSS.escape(element.id);
    }
    
    // Try unique class combination
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/);
        if (classes.length > 0) {
            const selector = '.' + classes.map(c => CSS.escape(c)).join('.');
            if (document.querySelectorAll(selector).length === 1) {
                return selector;
            }
        }
    }
    
    // Fall back to nth-child selector
    const parent = element.parentElement;
    if (!parent) return element.tagName.toLowerCase();
    
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element) + 1;
    
    const parentSelector = parent === document.body ? 'body' : generateSelector(parent);
    return `${parentSelector} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
}

function activatePicker() {
    console.log('Activating element picker...');
    pickerActive = true;
    
    if (!highlightBox) {
        highlightBox = createHighlightBox();
    }
    
    // Change cursor
    document.body.style.cursor = 'crosshair';
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEscape, true);
    
    // Show instruction tooltip
    showPickerTooltip();
}

function deactivatePicker() {
    console.log('Deactivating element picker...');
    pickerActive = false;
    
    // Reset cursor
    document.body.style.cursor = '';
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleEscape, true);
    
    // Hide highlight box
    hideHighlightBox();
    hidePickerTooltip();
}

function handleEscape(e) {
    if (e.key === 'Escape' && pickerActive) {
        deactivatePicker();
    }
}

function showPickerTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'zenban-picker-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4285f4;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
    `;
    tooltip.textContent = 'Click an element to capture it (ESC to cancel)';
    document.body.appendChild(tooltip);
}

function hidePickerTooltip() {
    const tooltip = document.getElementById('zenban-picker-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Export functions for use in content-script.js
window.zenbanPicker = {
    activate: activatePicker,
    deactivate: deactivatePicker,
    isActive: () => pickerActive
};