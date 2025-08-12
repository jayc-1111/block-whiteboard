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
            if (expandedCard) {
                collapseCard(expandedCard);
                expandedCard = null;
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
    const allItems = [...document.querySelectorAll('.category'), ...document.querySelectorAll('.super-header')];
    allItems.forEach(item => {
        if (item) selectItem(item);
    });
}

function duplicateSelected() {
    if (selectedItems.length === 0) return;
    
    const newSelection = [];
    
    selectedItems.forEach(item => {
        const isCategory = item.classList.contains('category');
        const clone = item.cloneNode(true);
        
        const x = parseInt(item.style.left) + 30;
        const y = parseInt(item.style.top) + 30;
        
        clone.style.left = x + 'px';
        clone.style.top = y + 'px';
        clone.classList.remove('selected');
        
        if (isCategory) {
            setupClonedCategory(clone);
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

function setupClonedCategory(clone) {
    if (!clone) return;
    
    clone.dataset.categoryId = categories.length;
    
    const toggleBtn = clone.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.onclick = () => toggleCategory(clone);
    }
    
    const addCardBtn = clone.querySelector('.add-card-btn');
    if (addCardBtn) {
        addCardBtn.onclick = () => addCardToCategory(categories.length);
    }
    
    const deleteBtn = clone.querySelector('.delete-btn');
    const categoryTitle = clone.querySelector('.category-title');
    if (deleteBtn && categoryTitle) {
        deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove Category',
            `Are you sure you want to remove "${categoryTitle.textContent}"?`,
            () => deleteCategory(clone)
        );
        };
    }
    
    const categoryHeader = clone.querySelector('.category-header');
    categoryHeader.addEventListener('mousedown', startCategoryDrag);
    
    clone.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        highestZIndex++;
        clone.style.zIndex = highestZIndex;
    });
    
    clone.querySelectorAll('.card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        const editorContainer = card.querySelector('.quill-editor');
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
            card.quillInstance = quill;
        }
        
        const hoverOverlay = card.querySelector('.card-hover-overlay');
        if (hoverOverlay) {
            hoverOverlay.onclick = (e) => {
                e.stopPropagation();
                expandCard(card);
            };
        }
    });
    
    categories.push({
        element: clone,
        cards: []
    });
}

function setupClonedSuperHeader(clone) {
    clone.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) clearSelection();
        startSuperHeaderDrag(e);
    });
}

function updateFileStructure() {
    const structureTrigger = document.querySelector('.file-structure-trigger');
    if (!structureTrigger) return;
    
    const structureContainer = structureTrigger.parentElement;
    if (!structureContainer) return;
    
    let fileStructure = document.querySelector('.file-structure-dropdown');
    if (!fileStructure) {
        fileStructure = document.createElement('div');
        fileStructure.className = 'file-structure-dropdown';
        structureContainer.appendChild(fileStructure);
    }
    
    const list = document.createElement('ul');
    list.className = 'file-structure-list';
    
    boards.forEach(board => {
        const boardLi = document.createElement('li');
        boardLi.className = 'board-item' + (board.id === currentBoardId ? ' active' : '');
        boardLi.textContent = board.name;
        boardLi.onclick = () => loadBoard(board.id);
        list.appendChild(boardLi);
        
        if (board.id === currentBoardId) {
            document.querySelectorAll('.category').forEach(cat => {
                const catLi = document.createElement('li');
                catLi.className = 'category-item';
                const catTitle = cat.querySelector('.category-title');
                catLi.textContent = catTitle ? catTitle.textContent : 'Untitled';
                catLi.onclick = () => {
                    cat.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    highestZIndex++;
                    cat.style.zIndex = highestZIndex;
                };
                list.appendChild(catLi);
                
                cat.querySelectorAll('.card').forEach(card => {
                    const cardLi = document.createElement('li');
                    cardLi.className = 'card-item';
                    cardLi.textContent = card.querySelector('.card-title').textContent;
                    cardLi.onclick = (e) => {
                        e.stopPropagation();
                        expandCard(card);
                    };
                    list.appendChild(cardLi);
                });
            });
            
            document.querySelectorAll('.super-header').forEach(header => {
                const headerLi = document.createElement('li');
                headerLi.className = 'header-item';
                headerLi.textContent = header.textContent;
                headerLi.onclick = () => {
                    header.scrollIntoView({ behavior: 'smooth', block: 'center' });
                };
                list.appendChild(headerLi);
            });
        }
    });
    
    fileStructure.innerHTML = '';
    fileStructure.appendChild(list);
}

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
