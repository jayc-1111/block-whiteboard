// Bookmarks Modal Handler with Card Grid
document.addEventListener('DOMContentLoaded', function() {
    const bookmarksTrigger = document.querySelector('#yourBookmarksItem');
    
    // Function to format date
    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    
    // Load bookmarks from localStorage (saved by extension bridge)
    function loadBookmarks() {
        const bookmarks = [];
        
        // Check for bookmarks saved from extension
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('zenban_saved_bookmark_')) {
                try {
                    const bookmark = JSON.parse(localStorage.getItem(key));
                    // Ensure bookmark has an ID
                    if (!bookmark.id) {
                        bookmark.id = `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    }
                    bookmarks.push(bookmark);
                } catch (e) {
                    console.error('Error parsing bookmark:', e);
                }
            }
        }
        
        // If no saved bookmarks, use sample data
        if (bookmarks.length === 0) {
            return [
                { 
                    id: `bookmark-${Date.now()}-1`,
                    title: "GitHub", 
                    url: "https://github.com", 
                    timestamp: new Date('2025-08-21').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-2`,
                    title: "Stack Overflow", 
                    url: "https://stackoverflow.com", 
                    timestamp: new Date('2025-08-20').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-3`,
                    title: "MDN Web Docs", 
                    url: "https://developer.mozilla.org", 
                    timestamp: new Date('2025-08-19').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-4`,
                    title: "Google", 
                    url: "https://google.com", 
                    timestamp: new Date('2025-08-18').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-5`,
                    title: "YouTube", 
                    url: "https://youtube.com", 
                    timestamp: new Date('2025-08-17').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-6`,
                    title: "Twitter", 
                    url: "https://twitter.com", 
                    timestamp: new Date('2025-08-16').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-7`,
                    title: "Reddit", 
                    url: "https://reddit.com", 
                    timestamp: new Date('2025-08-15').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-8`,
                    title: "LinkedIn", 
                    url: "https://linkedin.com", 
                    timestamp: new Date('2025-08-14').toISOString() 
                },
                { 
                    id: `bookmark-${Date.now()}-9`,
                    title: "Wikipedia", 
                    url: "https://wikipedia.org", 
                    timestamp: new Date('2025-08-13').toISOString() 
                }
            ];
        }
        
        // Ensure all bookmarks have IDs
        bookmarks.forEach(bookmark => {
            if (!bookmark.id) {
                bookmark.id = `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
        });
        
        // Sort by timestamp (newest first)
        return bookmarks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    // Create bookmark cards
    function createBookmarkCards() {
        const bookmarkGrid = document.querySelector('.bookmark-grid');
        if (!bookmarkGrid) return;
        
        const bookmarks = loadBookmarks();
        
        // Clear existing content and styles
        bookmarkGrid.innerHTML = '';
        const existingStyles = document.querySelectorAll('#bookmark-card-styles');
        existingStyles.forEach(s => s.remove());
        
        // Create style element for dynamic backgrounds
        const styleElement = document.createElement('style');
        styleElement.id = 'bookmark-card-styles';
        // Ensure CSS file takes precedence by inserting before it
        const firstStyleSheet = document.querySelector('link[href*="bookmarks-modal.css"]');
        if (firstStyleSheet) {
            firstStyleSheet.parentNode.insertBefore(styleElement, firstStyleSheet);
        } else {
            document.head.appendChild(styleElement);
        }
        let styles = '';
        
        // Create cards (limit to 9 for 3x3 grid)
        bookmarks.slice(0, 9).forEach((bookmark, index) => {
            const card = document.createElement('div');
            card.className = 'bookmark-card';
            card.dataset.index = index;
            
            // Check if bookmark has screenshot/image
            const imageUrl = bookmark.screenshot || bookmark.image || bookmark.screenshotData;
            
            if (!imageUrl) {
                card.classList.add('no-image');
            } else {
                // Add dynamic style for this card's background with !important to ensure it applies
                styles += `
                    .bookmark-card[data-index="${index}"]::before {
                        background-image: url('${imageUrl}') !important;
                    }
                    .bookmark-card[data-index="${index}"] .image-overlay {
                        background-image: url('${imageUrl}') !important;
                    }
                `;
            }
            
            card.innerHTML = `
                <div class="image-container">
                    <div class="image-overlay"></div>
                    <button class="delete-button" aria-label="Delete bookmark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007h16zm-9.489 5.14a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z"/>
                            <path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005h4z"/>
                        </svg>
                    </button>
                    <a href="${bookmark.url}" target="_blank" class="external-link-button" aria-label="Open bookmark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/>
                            <path d="M11 13l9 -9"/>
                            <path d="M15 4h5v5"/>
                        </svg>
                    </a>
                </div>
                <button class="up-button" aria-label="Move card up">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                </button>
                <button class="down-button" aria-label="Move card down">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                </button>
                <button class="move-button" aria-label="Move bookmark">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </button>
                <div class="card-content">
                    <h3 class="card-title" title="${bookmark.title}">${bookmark.title}</h3>
                    <p class="date-added">Added: ${formatDate(bookmark.timestamp)}</p>
                </div>
            `;
            
            // Add event listeners
            const deleteBtn = card.querySelector('.delete-button');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                card.remove();
                updateIndices();
            });
            
            const upBtn = card.querySelector('.up-button');
            upBtn.addEventListener('click', () => moveCard(index, -1));
            
            const downBtn = card.querySelector('.down-button');
            downBtn.addEventListener('click', () => moveCard(index, 1));
            
            const moveBtn = card.querySelector('.move-button');
            moveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Get the bookmark data
                const bookmark = bookmarks[index];
                // Show move modal
                if (window.showBookmarkMoveModal) {
                    // For bookmarks in the modal, we don't have a source card/section
                    // so we'll pass null for those parameters
                    window.showBookmarkMoveModal(bookmark, null, null);
                }
            });
            
            bookmarkGrid.appendChild(card);
        });
        
        // Apply all dynamic styles
        styleElement.textContent = styles;
    }
    
    // Function to move cards
    function moveCard(currentIndex, direction) {
        const cards = Array.from(document.querySelectorAll('.bookmark-card'));
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < cards.length) {
            const currentCard = cards[currentIndex];
            const targetCard = cards[newIndex];
            const parent = currentCard.parentNode;
            
            if (direction === -1) {
                parent.insertBefore(currentCard, targetCard);
            } else {
                parent.insertBefore(targetCard, currentCard);
            }
            
            updateIndices();
        }
    }
    
    // Update indices after reorder
    function updateIndices() {
        const cards = document.querySelectorAll('.bookmark-card');
        cards.forEach((card, index) => {
            card.dataset.index = index;
            const upBtn = card.querySelector('.up-button');
            const downBtn = card.querySelector('.down-button');
            if (upBtn) upBtn.onclick = () => moveCard(index, -1);
            if (downBtn) downBtn.onclick = () => moveCard(index, 1);
        });
    }
    
    // Create or update modal structure
    function initializeModal() {
        let modal = document.getElementById('bookmarksModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bookmarksModal';
            modal.className = 'bookmarks-modal';
            modal.innerHTML = `
                <div class="bookmarks-modal-content">
                    <div class="bookmarks-modal-header">
                        <h2>Your Bookmarks</h2>
                        <div class="bookmarks-modal-controls">
                            <button class="bookmarks-modal-close" id="bookmarksModalClose">&times;</button>
                        </div>
                    </div>
                    <div class="bookmarks-modal-body">
                        <div class="bookmark-grid"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        return modal;
    }
    
    // Initialize modal
    const modal = initializeModal();
    
    // Open modal on trigger click
    if (bookmarksTrigger) {
        bookmarksTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.add('active');
            createBookmarkCards();
        });
    }
    
    // Close modal on close button click
    const closeBtn = modal.querySelector('#bookmarksModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close modal on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
    
    // Listen for new bookmarks from extension
    window.addEventListener('storage', function(event) {
        if (event.key && event.key.startsWith('zenban_bookmark_')) {
            try {
                const bookmarkData = JSON.parse(event.newValue);
                
                // Save to persistent storage
                const savedKey = 'zenban_saved_bookmark_' + Date.now();
                localStorage.setItem(savedKey, JSON.stringify(bookmarkData));
                
                // Refresh display if modal is open
                if (modal.classList.contains('active')) {
                    createBookmarkCards();
                }
            } catch (e) {
                console.error('Error processing bookmark:', e);
            }
        }
    });
});
