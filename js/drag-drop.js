// Drag and drop functionality
function startCategoryDrag(e) {
    if (e.button !== 0) return;
    
    const category = e.currentTarget.parentElement;
    if (!category) return;
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
    
    const selectedItems = AppState.get('selectedItems');
    if (selectedItems.includes(category) && selectedItems.length > 1) {
        startMultiDrag(e);
    } else {
        AppState.set('currentCategory', category);
        category.classList.add('dragging');
        
        const whiteboard = document.getElementById('whiteboard');
        const grid = document.getElementById('grid');
        if (!whiteboard || !grid) return;
        const gridRect = grid.getBoundingClientRect();
        
        // Get current position - handle cases where style values might be empty
        const currentLeft = parseFloat(category.style.left) || 0;
        const currentTop = parseFloat(category.style.top) || 0;
        
        const offset = { x: 0, y: 0 };
        offset.x = e.clientX - gridRect.left + whiteboard.scrollLeft - currentLeft;
        offset.y = e.clientY - gridRect.top + whiteboard.scrollTop - currentTop;
        
        AppState.set('offset', offset);
        
        document.addEventListener('mousemove', dragCategory);
        document.addEventListener('mouseup', stopCategoryDrag);
    }
}

function dragCategory(e) {
    const currentCategory = AppState.get('currentCategory');
    if (!currentCategory) return;
    
    const grid = document.getElementById('grid');
    const whiteboard = document.getElementById('whiteboard');
    if (!grid || !whiteboard) return;
    const gridRect = grid.getBoundingClientRect();
    
    const offset = AppState.get('offset');
    const isGridSnapEnabled = AppState.get('isGridSnapEnabled');
    
    let x = e.clientX - gridRect.left - offset.x + whiteboard.scrollLeft;
    let y = e.clientY - gridRect.top - offset.y + whiteboard.scrollTop;
    
    x = Math.max(0, x);
    y = Math.max(0, y);
    
    if (isGridSnapEnabled) {
        // Snap to grid - dots are centered on grid points
        x = Math.round(x / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
        y = Math.round(y / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE;
    }
    
    // Use drag smoothing
    DragSmoothing.start(currentCategory, x, y);
    
    const categoryRect = currentCategory.getBoundingClientRect();
    updateGridSize(x, y, categoryRect.width, categoryRect.height);
}

function stopCategoryDrag() {
    const currentCategory = AppState.get('currentCategory');
    if (currentCategory) {
        currentCategory.classList.remove('dragging');
        DragSmoothing.stop(currentCategory);
        AppState.set('currentCategory', null);
        
        // Save after category drag completes
        if (window.syncService) {
            window.syncService.isDragging = false;
            window.syncService.saveAfterAction('category moved');
        }
    }
    document.removeEventListener('mousemove', dragCategory);
    document.removeEventListener('mouseup', stopCategoryDrag);
}

// Super header drag is now handled directly in super-headers.js

function dragSuperHeader(e) {
    const currentSuperHeader = AppState.get('currentSuperHeader');
    if (!currentSuperHeader) return;
    
    const grid = document.getElementById('grid');
    const whiteboard = document.getElementById('whiteboard');
    if (!grid || !whiteboard) return;
    const gridRect = grid.getBoundingClientRect();
    
    const offset = AppState.get('offset');
    let x = e.clientX - gridRect.left - offset.x + whiteboard.scrollLeft;
    let y = e.clientY - gridRect.top - offset.y + whiteboard.scrollTop;
    
    x = Math.max(0, x);
    y = Math.max(0, y);
    
    const isGridSnapEnabled = AppState.get('isGridSnapEnabled');
    if (isGridSnapEnabled) {
        // Snap to grid dots (offset by 2px to align with dot center)
        x = Math.round((x - 2) / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE + 2;
        y = Math.round((y - 2) / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE + 2;
    }
    
    // Use drag smoothing
    DragSmoothing.start(currentSuperHeader, x, y);
    
    const headerRect = currentSuperHeader.getBoundingClientRect();
    updateGridSize(x, y, headerRect.width, headerRect.height);
}

function stopSuperHeaderDrag() {
    const currentSuperHeader = AppState.get('currentSuperHeader');
    if (currentSuperHeader) {
        currentSuperHeader.classList.remove('dragging');
        DragSmoothing.stop(currentSuperHeader);
        updateSuperHeaderInState(currentSuperHeader);
        AppState.set('currentSuperHeader', null);
        
        // Save after header drag completes
        if (window.syncService) {
            window.syncService.isDragging = false;
            window.syncService.saveAfterAction('canvas header moved');
        }
    }
    document.removeEventListener('mousemove', dragSuperHeader);
    document.removeEventListener('mouseup', stopSuperHeaderDrag);
}

function handleDragStart(e) {
    AppState.set('draggedFile', e.target);
    e.target.classList.add('dragging');
    e.stopPropagation();
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    AppState.set('draggedFile', null);
    
    // Save after file drag completes
    if (window.syncService) {
        window.syncService.isDragging = false;
        window.syncService.saveAfterAction('file drag');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const draggedFile = AppState.get('draggedFile');
    if (!e.currentTarget.hasChildNodes() || 
        (e.currentTarget.firstChild && e.currentTarget.firstChild !== draggedFile)) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    slot.classList.remove('drag-over');
    
    const draggedFile = AppState.get('draggedFile');
    if (!draggedFile) return;

    // Get the source and destination categories
    const sourceCategory = draggedFile.closest('.category');
    const destCategory = slot.closest('.category');
    
    // Swap files if slot is occupied
    if (slot.hasChildNodes() && slot.firstChild !== draggedFile) {
        const existingFile = slot.firstChild;
        const draggedSlot = draggedFile.parentNode;
        draggedSlot.appendChild(existingFile);
        
        // Update the swapped file's category reference
        if (sourceCategory && existingFile) {
            existingFile.dataset.categoryId = sourceCategory.id;
        }
    }

    // Move file to new slot
    if (!slot.hasChildNodes()) {
        slot.appendChild(draggedFile);
    }
    
    // Update the dragged file's category reference
    if (destCategory && draggedFile) {
        draggedFile.dataset.categoryId = destCategory.id;
    }
    
    // Update AppState categories arrays
    const categories = AppState.get('categories');
    if (categories && sourceCategory && destCategory) {
        // Find source category in AppState
        const sourceCat = categories.find(c => c.element.id === sourceCategory.id);
        // Find destination category in AppState
        const destCat = categories.find(c => c.element.id === destCategory.id);
        
        if (sourceCat && destCat) {
            // Remove file from source category's files array
            const fileIndex = sourceCat.files.indexOf(draggedFile);
            if (fileIndex > -1) {
                sourceCat.files.splice(fileIndex, 1);
            }
            
            // Add file to destination category's files array if not already there
            if (!destCat.files.includes(draggedFile)) {
                destCat.files.push(draggedFile);
            }
            
            // Update AppState
            AppState.set('categories', categories);
        }
    }
}

function startMultiDrag(e) {
    AppState.set('isDraggingMultiple', true);
    
    // Set dragging flag in sync service
    if (window.syncService) {
        window.syncService.isDragging = true;
    }
    
    const multiDragOffsets = [];
    
    const whiteboard = document.getElementById('whiteboard');
    const grid = document.getElementById('grid');
    const gridRect = grid.getBoundingClientRect();
    
    const mouseX = e.clientX - gridRect.left + whiteboard.scrollLeft;
    const mouseY = e.clientY - gridRect.top + whiteboard.scrollTop;
    
    const selectedItems = AppState.get('selectedItems');
    selectedItems.forEach(item => {
        const itemX = parseInt(item.style.left);
        const itemY = parseInt(item.style.top);
        
        multiDragOffsets.push({
            item: item,
            offsetX: itemX - mouseX,
            offsetY: itemY - mouseY
        });
        
        item.classList.add('dragging');
    });
    
    AppState.set('multiDragOffsets', multiDragOffsets);
    document.addEventListener('mousemove', dragMultiple);
    document.addEventListener('mouseup', stopMultiDrag);
}

function dragMultiple(e) {
    if (!AppState.get('isDraggingMultiple')) return;
    
    const grid = document.getElementById('grid');
    const gridRect = grid.getBoundingClientRect();
    const whiteboard = document.getElementById('whiteboard');
    
    const mouseX = e.clientX - gridRect.left + whiteboard.scrollLeft;
    const mouseY = e.clientY - gridRect.top + whiteboard.scrollTop;
    
    const multiDragOffsets = AppState.get('multiDragOffsets');
    const isGridSnapEnabled = AppState.get('isGridSnapEnabled');
    
    multiDragOffsets.forEach(({item, offsetX, offsetY}) => {
        let x = mouseX + offsetX;
        let y = mouseY + offsetY;
        
        x = Math.max(0, x);
        y = Math.max(0, y);
        
        if (isGridSnapEnabled) {
            // Snap to grid dots (offset by 2px to align with dot center)
            x = Math.round((x - 2) / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE + 2;
            y = Math.round((y - 2) / CONSTANTS.GRID_SIZE) * CONSTANTS.GRID_SIZE + 2;
        }
        
        // Use drag smoothing
        DragSmoothing.start(item, x, y);
        
        updateGridSize(x, y, item.offsetWidth, item.offsetHeight);
    });
}

function stopMultiDrag() {
    AppState.set('isDraggingMultiple', false);
    
    const selectedItems = AppState.get('selectedItems');
    selectedItems.forEach(item => {
        item.classList.remove('dragging');
        DragSmoothing.stop(item);
        
        // Update state for canvas headers
        if (item.classList.contains('canvas-header')) {
            updateCanvasHeaderInState(item);
        }
    });
    
    AppState.set('multiDragOffsets', []);
    document.removeEventListener('mousemove', dragMultiple);
    document.removeEventListener('mouseup', stopMultiDrag);
    
    // Save after multi-drag completes
    if (window.syncService) {
        window.syncService.isDragging = false;
        window.syncService.saveAfterAction('multi-drag');
    }
}
