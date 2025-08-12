/**
 * File Viewer Modal - A clean file management interface
 * Displays all cards as files for easy access
 */

// File viewer data structure - will be populated from all boards
let fileViewerData = {
    recentFiles: [],
    allFiles: [],
    folders: []
};

/**
 * Initialize the file viewer modal
 */
function initializeFileViewer() {
    console.log('Initializing File Viewer');
    
    // Load saved boards from AppState
    const boards = AppState.get('boards') || [];
    
    // Collect all cards from all boards
    fileViewerData.allFiles = [];
    
    boards.forEach(board => {
        if (board.categories && board.categories.length > 0) {
            board.categories.forEach(category => {
                if (category.cards && category.cards.length > 0) {
                    category.cards.forEach(card => {
                        // Create file entry for each card
                        fileViewerData.allFiles.push({
                            id: `${board.id}-${category.title}-${card.title}`,
                            title: card.title,
                            content: card.content,
                            boardId: board.id,
                            boardName: board.name,
                            categoryTitle: category.title,
                            type: 'card',
                            lastModified: card.lastModified || new Date().toISOString(),
                            size: calculateCardSize(card),
                            thumbnail: null
                        });
                    });
                }
            });
        }
    });
    
    // Sort by last modified for recent files
    fileViewerData.recentFiles = [...fileViewerData.allFiles]
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, 5);
    
    // Render the file viewer
    renderFileViewer();
}

/**
 * Calculate approximate size of a card
 */
function calculateCardSize(card) {
    const content = card.content?.content || card.content || '';
    const sizeInBytes = new Blob([content]).size;
    return formatFileSize(sizeInBytes);
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Render the file viewer interface
 */
function renderFileViewer() {
    const fileList = document.getElementById('fileViewerList');
    if (!fileList) return;
    
    // Clear existing content
    fileList.innerHTML = '';
    
    // Add section headers and files
    if (fileViewerData.recentFiles.length > 0) {
        // Recent files section
        const recentSection = createSection('Recent Files', fileViewerData.recentFiles);
        fileList.appendChild(recentSection);
    }
    
    if (fileViewerData.allFiles.length > 0) {
        // All files section
        const allSection = createSection('All Cards', fileViewerData.allFiles);
        fileList.appendChild(allSection);
    }
    
    if (fileViewerData.allFiles.length === 0) {
        // Empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'file-viewer-empty';
        emptyState.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <h3>No Cards Yet</h3>
            <p>Create categories and add cards to get started</p>
            <button class="file-viewer-create-btn" onclick="closeFileViewerModal(); document.getElementById('addCategoryBtn').click();">
                Create Category
            </button>
        `;
        fileList.appendChild(emptyState);
    }
}

/**
 * Create a section with files
 */
function createSection(title, files) {
    const section = document.createElement('div');
    section.className = 'file-viewer-section';
    
    const header = document.createElement('h3');
    header.className = 'file-viewer-section-header';
    header.textContent = title;
    section.appendChild(header);
    
    const grid = document.createElement('div');
    grid.className = 'file-viewer-grid';
    
    files.forEach(file => {
        const fileCard = createFileCard(file);
        grid.appendChild(fileCard);
    });
    
    section.appendChild(grid);
    return section;
}

/**
 * Create a file card element
 */
function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-viewer-card';
    
    // Thumbnail or icon
    const thumbnail = document.createElement('div');
    thumbnail.className = 'file-viewer-thumbnail';
    if (file.thumbnail) {
        thumbnail.style.backgroundImage = `url(${file.thumbnail})`;
    } else {
        thumbnail.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <rect x="7" y="7" width="3" height="3"/>
                <rect x="14" y="7" width="3" height="3"/>
                <rect x="7" y="14" width="3" height="3"/>
                <rect x="14" y="14" width="3" height="3"/>
            </svg>
        `;
    }
    card.appendChild(thumbnail);
    
    // File info
    const info = document.createElement('div');
    info.className = 'file-viewer-info';
    
    const name = document.createElement('div');
    name.className = 'file-viewer-name';
    name.textContent = file.title;
    info.appendChild(name);
    
    const meta = document.createElement('div');
    meta.className = 'file-viewer-meta';
    meta.textContent = `${file.boardName} • ${file.categoryTitle} • ${file.size}`;
    info.appendChild(meta);
    
    card.appendChild(info);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'file-viewer-actions';
    
    // Open button
    const openBtn = document.createElement('button');
    openBtn.className = 'file-viewer-action-btn';
    openBtn.title = 'Open';
    openBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
    `;
    openBtn.onclick = () => openFile(file);
    actions.appendChild(openBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'file-viewer-action-btn delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
    `;
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFile(file);
    };
    actions.appendChild(deleteBtn);
    
    card.appendChild(actions);
    
    // Click handler for the card
    card.addEventListener('click', () => openFile(file));
    
    return card;
}

/**
 * Open a file (expand the card)
 */
function openFile(file) {
    console.log('Opening card:', file.title);
    
    // Close the modal
    const modal = document.getElementById('fileViewerModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // First, load the board that contains this card
    if (window.loadBoard) {
        window.loadBoard(file.boardId);
    }
    
    // Then find and expand the card
    setTimeout(() => {
        const canvas = document.getElementById('canvas');
        if (canvas) {
            const categories = canvas.querySelectorAll('.category');
            categories.forEach(category => {
                const categoryTitle = category.querySelector('.category-title');
                if (categoryTitle && categoryTitle.textContent === file.categoryTitle) {
                    const cards = category.querySelectorAll('.card');
                    cards.forEach(card => {
                        const cardTitle = card.querySelector('.card-title');
                        if (cardTitle && cardTitle.textContent === file.title) {
                            // Expand the card
                            card.click();
                        }
                    });
                }
            });
        }
    }, 500);
    
    // Show notification
    showNotification(`Opening ${file.title}...`);
}

/**
 * Delete a file (remove the card)
 */
function deleteFile(file) {
    if (confirm(`Are you sure you want to delete "${file.title}"?`)) {
        // Load the board first
        const boards = AppState.get('boards') || [];
        const board = boards.find(b => b.id === file.boardId);
        
        if (board && board.categories) {
            // Find and remove the card from the board data
            board.categories.forEach(category => {
                if (category.title === file.categoryTitle && category.cards) {
                    const cardIndex = category.cards.findIndex(card => card.title === file.title);
                    if (cardIndex !== -1) {
                        category.cards.splice(cardIndex, 1);
                    }
                }
            });
            
            // Update AppState
            AppState.set('boards', boards);
            
            // Save to Firebase if available
            if (window.syncService && window.syncService.saveCurrentBoard) {
                window.syncService.saveCurrentBoard();
            }
        }
        
        // Refresh the file viewer
        initializeFileViewer();
        
        // Show notification
        showNotification(`Deleted ${file.title}`);
    }
}

/**
 * Show a notification
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'file-viewer-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #5353ff;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 10000000;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

/**
 * Close file viewer modal
 */
function closeFileViewerModal() {
    const modal = document.getElementById('fileViewerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export functions for global use
window.initializeFileViewer = initializeFileViewer;
window.closeFileViewerModal = closeFileViewerModal;
