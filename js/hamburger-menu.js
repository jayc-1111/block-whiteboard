// Hamburger Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const yourFilesItem = document.getElementById('yourFilesItem');
    const settingsItem = document.getElementById('settingsItem');
    
    // File tree dropdown now handled by pure CSS hover
    if (yourFilesItem) {
        // Update on hover for fresh data
        yourFilesItem.addEventListener('mouseenter', function() {
            updateFileTree();
        });
        
        // Initial population
        updateFileTree();
    }
    
    // Your Bookmarks click handler is now managed by bookmarks-modal.js
    // Removed duplicate handler to avoid conflicts
    
    // Settings menu now handled by pure CSS hover
});

// Update file tree with current board structure
function updateFileTree() {
    const fileList = document.querySelector('.file-structure-list');
    if (!fileList) return;
    
    const boards = AppState.get('boards') || [];
    const currentBoardId = AppState.get('currentBoardId');
    
    let html = '';
    
    boards.forEach(board => {
        // Check board content
        const categories = board.categories || [];
        const cardCount = categories.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0);
        
        if (categories.length > 0) {
            html += `<li><details ${board.id === currentBoardId ? 'open' : ''}>
                <summary>
                    <svg class="folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
                    </svg>
                    <span>${board.name}</span>
                    <span class="item-count">${cardCount}</span>
                </summary>
                <ul>`;
            
            categories.forEach(cat => {
                if (cat.cards?.length > 0) {
                    html += `<li><details>
                        <summary>
                            <span>${cat.title}</span>
                            <span class="item-count">${cat.cards.length}</span>
                        </summary>
                        <ul>`;
                    
                    cat.cards.forEach(card => {
                        html += `<li class="file-item" onclick="openCard(${board.id}, '${cat.title}', '${card.title.replace(/'/g, "\\'")}')">                            
                            <svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span>${card.title}</span>
                        </li>`;
                    });
                    
                    html += '</ul></details></li>';
                }
            });
            
            html += '</ul></details></li>';
        }
    });
    
    fileList.innerHTML = html || '<li class="file-tree-empty">No cards yet</li>';
}

// Open specific card
window.openCard = function(boardId, categoryTitle, cardTitle) {
    // Switch board if needed
    if (boardId !== AppState.get('currentBoardId')) {
        loadBoard(boardId);
    }
    
    // Find and expand card
    setTimeout(() => {
        const categories = document.querySelectorAll('.category');
        for (const cat of categories) {
            const title = cat.querySelector('.category-title');
            if (title?.textContent === categoryTitle) {
                const cards = cat.querySelectorAll('.card');
                for (const card of cards) {
                    if (getCardTitleText(card) === cardTitle) {
                        const overlay = card.querySelector('.card-hover-overlay');
                        if (overlay) overlay.click();
                        break;
                    }
                }
                break;
            }
        }
    }, 500);
};