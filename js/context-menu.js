// Context menu functionality
let contextItem = null;
let contextType = null;

function showContextMenu(e, element, type) {
    // Check if dev mode is active - if so, don't show custom menu
    if (window.isDevMode || AppState.get('isDevMode')) {
        return; // Let browser's native context menu show
    }
    
    e.preventDefault();
    contextItem = element;
    contextType = type;
    
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.classList.add('active');
}

function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.remove('active');
}

function showWhiteboardContextMenu(e) {
    // Check if dev mode is active - if so, don't show custom menu
    if (window.isDevMode || AppState.get('isDevMode')) {
        return; // Let browser's native context menu show
    }
    
    e.preventDefault();
    
    // Create custom whiteboard context menu
    let whiteboardMenu = document.getElementById('whiteboardContextMenu');
    if (!whiteboardMenu) {
        whiteboardMenu = document.createElement('div');
        whiteboardMenu.id = 'whiteboardContextMenu';
        whiteboardMenu.className = 'context-menu';
        whiteboardMenu.innerHTML = `
            <ul class="list">
                <li class="element" data-action="add-header-here">
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#7e8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
                        <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
                        <path d="M12 3v6"></path>
                    </svg>
                    <p class="label">Add Header</p>
                </li>
                <li class="element" data-action="add-folder-here">
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#7e8590" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <p class="label">Add Folder</p>
                </li>
            </ul>
        `;
        document.body.appendChild(whiteboardMenu);
    }
    
    // Position menu at mouse location
    whiteboardMenu.style.left = e.clientX + 'px';
    whiteboardMenu.style.top = e.clientY + 'px';
    whiteboardMenu.classList.add('active');
    
    // Store mouse position for adding elements
    whiteboardMenu.dataset.x = e.clientX;
    whiteboardMenu.dataset.y = e.clientY;
    
    // Hide regular context menu
    hideContextMenu();
}

function setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
        // Check if dev mode is active - if so, allow browser's native context menu
        if (window.isDevMode || AppState.get('isDevMode')) {
            return; // Don't prevent default, let browser menu show
        }
        
        const folder = e.target.closest('.folder');
        const superHeader = e.target.closest('.super-header');
        const canvasHeader = e.target.closest('.canvas-header');
        const file = e.target.closest('.file');
        const canvas = e.target.id === 'grid' || e.target.id === 'whiteboard' || e.target.id === 'canvas';
        const expandedFile = AppState.get('expandedFile');
        
        // Check if we're clicking on an expanded file - if so, allow default context menu
        if (file && file.classList.contains('expanded')) {
            hideContextMenu();
            return; // Allow default browser context menu
        }
        
        // Check if there's an expanded file and we're clicking elsewhere - allow default menu
        if (expandedFile && !folder && !superHeader && !canvasHeader && !canvas) {
            hideContextMenu();
            return; // Allow default browser context menu
        }
        
        // For all other cases, prevent default and show our custom menu
        e.preventDefault();
        
        if (folder && !expandedFile) {
            showContextMenu(e, folder, 'element');
        } else if (superHeader) {
            showContextMenu(e, superHeader, 'element');
        } else if (canvasHeader) {
            showContextMenu(e, canvasHeader, 'element');
        } else if (file && !file.classList.contains('expanded')) {
            // Only show context menu for non-expanded files
            showContextMenu(e, file, 'element');
        } else if (canvas && !expandedFile) {
            // Don't show whiteboard context menu if there's an expanded file
            showWhiteboardContextMenu(e);
        } else {
            hideContextMenu();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
            // Also hide whiteboard menu
            const whiteboardMenu = document.getElementById('whiteboardContextMenu');
            if (whiteboardMenu) whiteboardMenu.classList.remove('active');
        }
        
        const menuItem = e.target.closest('.context-menu .element');
        if (menuItem) {
            const action = menuItem.dataset.action;
            switch (action) {
                case 'rename': renameItem(); break;
                case 'duplicate': duplicateItem(); break;
                case 'export': exportItem(); break;
                case 'delete': deleteContextItem(); break;
                case 'add-folder-here': addFolderAtPosition(); break;
                case 'add-header-here': addSuperHeaderAtPosition(); break;
            }
        }
    });
    
    const addFolderAtPosition = () => {
        const whiteboardMenu = document.getElementById('whiteboardContextMenu');
        if (!whiteboardMenu) return;
        
        const x = parseInt(whiteboardMenu.dataset.x);
        const y = parseInt(whiteboardMenu.dataset.y);
        const whiteboard = document.getElementById('whiteboard');
        const canvas = document.getElementById('canvas') || document.getElementById('grid');
        
        // Convert client coordinates to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const canvasX = x - rect.left + whiteboard.scrollLeft;
        const canvasY = y - rect.top + whiteboard.scrollTop;
        
        // Create folder at position
        createFolder('New Folder', canvasX, canvasY);
        whiteboardMenu.classList.remove('active');
    };
    
    const addSuperHeaderAtPosition = () => {
        const whiteboardMenu = document.getElementById('whiteboardContextMenu');
        if (!whiteboardMenu) return;
        
        const x = parseInt(whiteboardMenu.dataset.x);
        const y = parseInt(whiteboardMenu.dataset.y);
        const whiteboard = document.getElementById('whiteboard');
        const canvas = document.getElementById('canvas') || document.getElementById('grid');
        
        // Convert client coordinates to canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const canvasX = x - rect.left + whiteboard.scrollLeft;
        const canvasY = y - rect.top + whiteboard.scrollTop;
        
        // Create canvas header at position
        if (typeof addCanvasHeader === 'function') {
            addCanvasHeader(canvasX, canvasY);
        }
        whiteboardMenu.classList.remove('active');
    };
    
    const renameItem = () => {
        if (!contextItem) return;
        
        const titleElement = contextItem.querySelector('.folder-title') || contextItem;
        if (!titleElement) return;
        
        titleElement.focus();
        
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        contextMenu.classList.remove('active');
    };
    
    const duplicateItem = () => {
        if (!contextItem) return;
        
        const isFolder = contextItem.classList.contains('folder');
        const clone = contextItem.cloneNode(true);
        
        const x = parseInt(contextItem.style.left) + CONSTANTS.DUPLICATE_OFFSET;
        const y = parseInt(contextItem.style.top) + CONSTANTS.DUPLICATE_OFFSET;
        
        clone.style.left = x + 'px';
        clone.style.top = y + 'px';
        
        if (isFolder) {
            clone.dataset.folderId = folders.length;
            
            const folderTitle = clone.querySelector('.folder-title');
            if (folderTitle) {
                folderTitle.textContent += ' (Copy)';
            }
            
            const toggleBtn = clone.querySelector('.toggle-btn');
            toggleBtn.removeEventListener('click', toggleBtn._clickHandler);
            toggleBtn.addEventListener('click', () => toggleFolder(clone));
            
            const addFileBtn = clone.querySelector('.add-file-btn');
            addFileBtn.removeEventListener('click', addFileBtn._clickHandler);
            addFileBtn.addEventListener('click', () => addFileToFolder(folders.length));
            
            const deleteBtn = clone.querySelector('.delete-btn');
            deleteBtn.removeEventListener('click', deleteBtn._clickHandler);
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showConfirmDialog(
                    'Remove Folder',
                    `Are you sure you want to remove "${folderTitle.textContent}"?`,
                    () => deleteFolder(clone)
                );
            });
            
            const folderHeader = clone.querySelector('.folder-header');
            folderHeader.addEventListener('mousedown', startFolderDrag);
            
            clone.addEventListener('mousedown', (e) => {
                if (!e.shiftKey) clearSelection();
                highestZIndex++;
                clone.style.zIndex = highestZIndex;
            });
            
            document.getElementById('grid').appendChild(clone);
            
            folders.push({
                element: clone,
                files: []
            });
        } else {
            // Duplicate super header
            clone.textContent += ' (Copy)';
            clone.dataset.headerId = Date.now() + Math.random();
            setupSuperHeaderEventHandlers(clone);
            document.getElementById('grid').appendChild(clone);
            
            // Update state
            const boards = AppState.get('boards');
            const currentBoard_id = AppState.get('currentBoard_id');
            const currentBoard = boards.find(b => b.id === currentBoard_id);
            
            if (currentBoard && currentBoard.superHeaders) {
                currentBoard.superHeaders.push({
                    id: clone.dataset.headerId,
                    text: clone.textContent,
                    position: {
                        left: clone.style.left,
                        top: clone.style.top
                    }
                });
                AppState.set('boards', boards);
            }
        }
        
        contextMenu.classList.remove('active');
    };
    
    const exportItem = () => {
        if (!contextItem) return;
        
        let exportData = {};
        
        if (contextItem.classList.contains('folder')) {
            const folderTitle = contextItem.querySelector('.folder-title').textContent;
            const files = [];
            
            contextItem.querySelectorAll('.file').forEach(file => {
                const title = file.querySelector('.file-title').textContent;
                const quill = file.quillInstance;
                const content = quill ? quill.getContents() : {};
                
                files.push({ title, content });
            });
            
            exportData = {
                type: 'folder',
                title: folderTitle,
                files: files,
                position: {
                    left: contextItem.style.left,
                    top: contextItem.style.top
                }
            };
        } else {
            exportData = {
                type: 'super-header',
                text: contextItem.textContent,
                position: {
                    left: contextItem.style.left,
                    top: contextItem.style.top
                }
            };
        }
        
        const dataStr = JSON.stringify(exportData, null, CONSTANTS.EXPORT_INDENT_SPACES);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportName = contextItem.classList.contains('folder') 
            ? `folder-${exportData.title}.json`
            : `header-${exportData.text}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
        
        contextMenu.classList.remove('active');
    };
    
    const deleteContextItem = () => {
        if (!contextItem) return;
        
        if (contextItem.classList.contains('folder')) {
            showConfirmDialog(
                'Remove Folder',
                `Are you sure you want to remove "${contextItem.querySelector('.folder-title').textContent}"?`,
                () => deleteFolder(contextItem)
            );
        } else if (contextItem.classList.contains('canvas-header')) {
            showConfirmDialog(
                'Remove Header',
                `Are you sure you want to remove "${contextItem.textContent}"?`,
                () => deleteCanvasHeader(contextItem)
            );
        } else {
            showConfirmDialog(
                'Remove Super Header',
                `Are you sure you want to remove "${contextItem.textContent}"?`,
                () => deleteSuperHeader(contextItem)
            );
        }
        
        contextMenu.classList.remove('active');
    };
}
