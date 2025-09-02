// Utility functions
// Note: This function appears to be duplicated in init.js
function setupZoomAndPan() {
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) {
        console.error('Whiteboard element not found');
        return;
    }
    let zoom = 1;
    
    whiteboard.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            zoom *= delta;
            zoom = Math.min(Math.max(0.5, zoom), 3);
            
            const canvas = document.getElementById('canvas');
            if (canvas) {
                canvas.style.transform = `scale(${zoom})`;
                canvas.style.transformOrigin = '0 0';
            }
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea, [contenteditable]') || 
            e.target.closest('.ql-editor')) return;
        
        if (e.key === 'Delete' && selectedItems.length > 0) {
            deleteSelectedItems();
        }
        
        if (e.key === 'Escape') {
            if (expandedFile) {
                collapseFile(expandedFile);
                expandedFile = null;
            } else {
                clearSelection();
            }
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'a':
                    e.preventDefault();
                    selectAll();
                    break;
                case 'd':
                    e.preventDefault();
                    duplicateSelected();
                    break;
            }
        }
    });
}

function selectAll() {
    clearSelection();
    const allItems = [...document.querySelectorAll('.folder'), ...document.querySelectorAll('.super-header')];
    allItems.forEach(item => {
        if (item) selectItem(item);
    });
}

function duplicateSelected() {
    if (selectedItems.length === 0) return;
    
    const newSelection = [];
    
    selectedItems.forEach(item => {
        const isFolder = item.classList.contains('folder');
        const clone = item.cloneNode(true);
        
        const x = parseInt(item.style.left) + 30;
        const y = parseInt(item.style.top) + 30;
        
        clone.style.left = x + 'px';
        clone.style.top = y + 'px';
        clone.classList.remove('selected');
        
        if (isFolder) {
            setupClonedFolder(clone);
        } else {
            setupClonedSuperHeader(clone);
        }
        
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.appendChild(clone);
            newSelection.push(clone);
        }
    });
    
    clearSelection();
    newSelection.forEach(item => selectItem(item));
}

function setupClonedFolder(clone) {
    if (!clone) return;
    
    clone.dataset.folderId = folders.length;
    
    const toggleBtn = clone.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.onclick = () => toggleFolder(clone);
    }
    
    const addFileBtn = clone.querySelector('.add-file-btn');
    if (addFileBtn) {
        addFileBtn.onclick = () => addFileToFolder(folders.length);
    }
    
    const deleteBtn = clone.querySelector('.delete-btn');
    const folderTitle = clone.querySelector('.folder-title');
    if (deleteBtn && folderTitle) {
        deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove Folder',
            `Are you sure you want to remove "${folderTitle.textContent}"?`,
            () => deleteFolder(clone)
        );
        };
    }
    
    const folderHeader = clone.querySelector('.folder-header');
    folderHeader.addEventListener('mousedown', startFolderDrag);
    
    clone.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        highestZIndex++;
        clone.style.zIndex = highestZIndex;
    });
    
    clone.querySelectorAll('.file').forEach(file => {
        file.addEventListener('dragstart', handleDragStart);
        file.addEventListener('dragend', handleDragEnd);
        
        const editorContainer = file.querySelector('.quill-editor');
        if (editorContainer) {
            const quill = new Quill(editorContainer, {
                theme: 'snow',
                placeholder: 'Start typing...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        [{ 'font': [] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'bullet'}, { 'list': 'ordered' }],
                        [{ 'align': [] }],
                        ['link', 'image', 'video'],
                        ['blockquote'],
                        ['formula'],
                        ['code-block'],
                        [{ 'color': [] }]
                    ]
                }
            });
            file.quillInstance = quill;
        }
        
        const hoverOverlay = file.querySelector('.file-hover-overlay');
        if (hoverOverlay) {
            hoverOverlay.onclick = (e) => {
                e.stopPropagation();
                expandFile(file);
            };
        }
    });
    
    folders.push({
        element: clone,
        files: []
    });
}

function setupClonedSuperHeader(clone) {
    clone.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        startSuperHeaderDrag(e);
    });
}

/**
 * Deprecated: updateFileStructure (duplicate from utils.js) has been removed.
 * Use updateFileTree() in sidebar-menu.js as the only maintained implementation.
 */

// Note: This function appears to be duplicated in pan.js
function setupMiddleMousePan() {
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let scrollStart = { x: 0, y: 0 };

    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) {
        console.error('Whiteboard element not found for pan controls');
        return;
    }
    
    whiteboard.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
            e.preventDefault();
            isPanning = true;
            panStart.x = e.clientX;
            panStart.y = e.clientY;
            scrollStart.x = whiteboard.scrollLeft;
            scrollStart.y = whiteboard.scrollTop;
            whiteboard.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            whiteboard.scrollLeft = scrollStart.x - dx;
            whiteboard.scrollTop = scrollStart.y - dy;
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 1 && isPanning) {
            isPanning = false;
            whiteboard.style.cursor = '';
        }
    });

    whiteboard.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    });
}

// Hardware acceleration detection and warning
function checkHardwareAcceleration() {
    // Create a test canvas to check WebGL support (good indicator of hardware acceleration)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    // Check if WebGL is available and functioning
    if (!gl) {
        console.warn('WebGL not available - hardware acceleration may be disabled');
        return false;
    }
    
    // Additional check: measure performance of a simple GPU operation
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 256;
    testCanvas.height = 256;
    const ctx = testCanvas.getContext('2d');
    
    if (ctx) {
        const startTime = performance.now();
        
        // Perform a GPU-accelerated operation
        ctx.filter = 'blur(10px)';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(0, 0, 256, 256);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // If this takes too long, hardware acceleration is likely off
        if (renderTime > 50) {
            console.warn(`GPU operation took ${renderTime}ms - hardware acceleration may be disabled`);
            return false;
        }
    }
    
    return true;
}

// Show hardware acceleration warning if needed
function showHardwareAccelerationWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'hardware-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            <h3>Performance Notice</h3>
            <p>Hardware acceleration appears to be disabled in your browser.</p>
            <p>For best performance with glass effects, enable it in:</p>
            <ul>
                <li><strong>Chrome/Edge:</strong> Settings → System → Use hardware acceleration</li>
                <li><strong>Firefox:</strong> Settings → General → Performance → Use hardware acceleration</li>
            </ul>
            <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
        </div>
    `;
    
    // Add CSS for the warning
    const style = document.createElement('style');
    style.textContent = `
        .hardware-warning {
            position: fixed;
            top: 60px;
            right: 20px;
            background: rgba(255, 200, 0, 0.95);
            color: #333;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 350px;
            font-size: 14px;
        }
        .hardware-warning h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .hardware-warning ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .hardware-warning button {
            background: #333;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        .hardware-warning button:hover {
            background: #555;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(warningDiv);
}
