// Selection functionality
function startSelection(e) {
    if (e.target.id !== 'canvas') return;
    if (e.button !== 0) return;
    
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) return;
    
    const selectionStart = { x: 0, y: 0 };
    selectionStart.x = e.clientX + whiteboard.scrollLeft;
    selectionStart.y = e.clientY + whiteboard.scrollTop;
    AppState.set('selectionStart', selectionStart);
    AppState.set('isSelecting', true);
    
    clearSelection();
}

function updateSelection(e) {
    if (!AppState.get('isSelecting')) return;
    
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) return;
    
    const currentX = e.clientX + whiteboard.scrollLeft;
    const currentY = e.clientY + whiteboard.scrollTop;
    
    const selectionStart = AppState.get('selectionStart');
    const dragDistance = Math.sqrt(
        Math.pow(currentX - selectionStart.x, 2) + 
        Math.pow(currentY - selectionStart.y, 2)
    );
    
    if (dragDistance < 5) return;
    
    let selectionRectangle = AppState.get('selectionRectangle');
    if (!selectionRectangle) {
        selectionRectangle = document.createElement('div');
        selectionRectangle.className = 'selection-rectangle';
        const canvas = document.getElementById('canvas');
        if (canvas) {
            canvas.appendChild(selectionRectangle);
        }
        AppState.set('selectionRectangle', selectionRectangle);
    }
    
    const left = Math.min(selectionStart.x, currentX);
    const top = Math.min(selectionStart.y, currentY);
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);
    
    selectionRectangle.style.left = left + 'px';
    selectionRectangle.style.top = top + 'px';
    selectionRectangle.style.width = width + 'px';
    selectionRectangle.style.height = height + 'px';
}

function endSelection(e) {
    if (!e || e.button === 2) return;
    
    AppState.set('isSelecting', false);
    
    const selectionRectangle = AppState.get('selectionRectangle');
    if (selectionRectangle) {
        const rect = {
            left: parseInt(selectionRectangle.style.left) || 0,
            top: parseInt(selectionRectangle.style.top) || 0,
            right: (parseInt(selectionRectangle.style.left) || 0) + (parseInt(selectionRectangle.style.width) || 0),
            bottom: (parseInt(selectionRectangle.style.top) || 0) + (parseInt(selectionRectangle.style.height) || 0)
        };
        
        selectItemsInRectangle(rect);
        
        selectionRectangle.remove();
        AppState.set('selectionRectangle', null);
    }
}

function selectItemsInRectangle(rect) {
    clearSelection();
    
    const allItems = [...document.querySelectorAll('.category'), ...document.querySelectorAll('.super-header')];
    
    allItems.forEach(item => {
        const itemRect = {
            left: parseInt(item.style.left),
            top: parseInt(item.style.top),
            right: parseInt(item.style.left) + item.offsetWidth,
            bottom: parseInt(item.style.top) + item.offsetHeight
        };
        
        if (itemRect.left < rect.right && 
            itemRect.right > rect.left && 
            itemRect.top < rect.bottom && 
            itemRect.bottom > rect.top) {
            selectItem(item);
        }
    });
}

function selectItem(item) {
    const selectedItems = AppState.get('selectedItems');
    if (!selectedItems.includes(item)) {
        AppState.set('selectedItems', [...selectedItems, item]);
        item.classList.add('selected');
    }
}

function clearSelection() {
    const selectedItems = AppState.get('selectedItems');
    if (Array.isArray(selectedItems)) {
        selectedItems.forEach(item => {
            if (item && item.classList) {
                item.classList.remove('selected');
            }
        });
    }
    AppState.set('selectedItems', []);
}

function deleteSelectedItems() {
    const selectedItems = AppState.get('selectedItems');
    if (selectedItems.length === 0) return;
    
    const itemCount = selectedItems.length;
    const itemType = itemCount === 1 ? 'item' : 'items';
    
    showConfirmDialog(
        'Remove Selected Items',
        `Are you sure you want to remove ${itemCount} ${itemType}?`,
        () => {
            selectedItems.forEach(item => {
                if (item.classList.contains('category')) {
                    deleteCategory(item);
                } else if (item.classList.contains('super-header')) {
                    deleteSuperHeader(item);
                }
            });
            clearSelection();
        }
    );
}

// Setup selection event listeners - call this after canvas is created
function setupSelectionListeners() {
    const canvas = document.getElementById('canvas');
    if (canvas && !canvas.hasAttribute('data-selection-listeners')) {
        canvas.addEventListener('mousedown', startSelection);
        document.addEventListener('mousemove', updateSelection);
        document.addEventListener('mouseup', endSelection);
        canvas.setAttribute('data-selection-listeners', 'true');
        Debug.ui.info('Selection event listeners attached');
    } else if (!canvas) {
        Debug.ui.error('Canvas element not found for selection setup');
    }
}
