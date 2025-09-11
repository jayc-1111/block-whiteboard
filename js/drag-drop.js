// Drag and drop functionality
function startFolderDrag(e) {
    if (e.button !== 0) return;
    
    const folder = e.currentTarget.parentElement;
    if (!folder) return;
    
    // Use drag completion service instead of sync service
    if (window.dragCompletionService) {
        window.dragCompletionService.startDrag('folder', folder);
    }
    
    const selectedItems = AppState.get('selectedItems');
    if (selectedItems.includes(folder) && selectedItems.length > 1) {
        startMultiDrag(e);
    } else {
        AppState.set('currentFolder', folder);
        folder.classList.add('dragging');
        
        const whiteboard = document.getElementById('whiteboard');
        const grid = document.getElementById('grid');
        if (!whiteboard || !grid) return;
        const gridRect = grid.getBoundingClientRect();
        
        // Get current position - handle cases where style values might be empty
        const currentLeft = parseFloat(folder.style.left) || 0;
        const currentTop = parseFloat(folder.style.top) || 0;
        
        const offset = { x: 0, y: 0 };
        offset.x = e.clientX - gridRect.left + whiteboard.scrollLeft - currentLeft;
        offset.y = e.clientY - gridRect.top + whiteboard.scrollTop - currentTop;
        
        AppState.set('offset', offset);
        
        document.addEventListener('mousemove', dragFolder);
        document.addEventListener('mouseup', stopFolderDrag);
    }
}

function dragFolder(e) {
    const currentFolder = AppState.get('currentFolder');
    if (!currentFolder) return;
    
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
    DragSmoothing.start(currentFolder, x, y);
    
    const folderRect = currentFolder.getBoundingClientRect();
    updateGridSize(x, y, folderRect.width, folderRect.height);
}

function stopFolderDrag() {
    const currentFolder = AppState.get('currentFolder');
    if (currentFolder) {
        currentFolder.classList.remove('dragging');
        DragSmoothing.stop(currentFolder);
        AppState.set('currentFolder', null);

        // Use drag completion service instead of sync service
        if (window.dragCompletionService) {
            window.dragCompletionService.stopDrag();
        }
    }
    document.removeEventListener('mousemove', dragFolder);
    document.removeEventListener('mouseup', stopFolderDrag);
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
        
        // Use drag completion service instead of sync service
        if (window.dragCompletionService) {
            window.dragCompletionService.stopDrag();
        }
    }
    document.removeEventListener('mousemove', dragSuperHeader);
    document.removeEventListener('mouseup', stopSuperHeaderDrag);
}

function handleDragStart(e) {
    AppState.set('draggedFile', e.target);
    e.target.classList.add('dragging');
    e.stopPropagation();
    
    // Use drag completion service instead of sync service
    if (window.dragCompletionService) {
        window.dragCompletionService.startDrag('file', e.target);
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    AppState.set('draggedFile', null);
    
    // Use drag completion service instead of sync service
    if (window.dragCompletionService) {
        window.dragCompletionService.stopDrag();
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

    // Get the source and destination folders
    const sourceFolder = draggedFile.closest('.folder');
    const destFolder = slot.closest('.folder');
    
    // Swap files if slot is occupied
    if (slot.hasChildNodes() && slot.firstChild !== draggedFile) {
        const existingFile = slot.firstChild;
        const draggedSlot = draggedFile.parentNode;
        draggedSlot.appendChild(existingFile);
        
        // Update the swapped file's folder reference
        if (sourceFolder && existingFile) {
            existingFile.dataset.folderId = sourceFolder.id;
        }
    }

    // Move file to new slot
    if (!slot.hasChildNodes()) {
        slot.appendChild(draggedFile);
    }
    
    // Update the dragged file's folder reference
    if (destFolder && draggedFile) {
        draggedFile.dataset.folderId = destFolder.id;
    }
    
    // Update AppState folders arrays
    const folders = AppState.get('folders');
    if (folders && sourceFolder && destFolder) {
        // Find source folder in AppState
        const sourceCat = folders.find(c => c.element.id === sourceFolder.id);
        // Find destination folder in AppState
        const destCat = folders.find(c => c.element.id === destFolder.id);
        
        if (sourceCat && destCat) {
            // Remove file from source folder's files array
            const fileIndex = sourceCat.files.indexOf(draggedFile);
            if (fileIndex > -1) {
                sourceCat.files.splice(fileIndex, 1);
            }
            
            // Add file to destination folder's files array if not already there
            if (!destCat.files.includes(draggedFile)) {
                destCat.files.push(draggedFile);
            }
            
            // Update AppState
            AppState.set('folders', folders);
        }
    }
}

function startMultiDrag(e) {
    AppState.set('isDraggingMultiple', true);
    
    // Use drag completion service instead of sync service
    if (window.dragCompletionService) {
        window.dragCompletionService.startDrag('multi', null);
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
    
    // Use drag completion service instead of sync service
    if (window.dragCompletionService) {
        window.dragCompletionService.stopDrag();
    }
}
