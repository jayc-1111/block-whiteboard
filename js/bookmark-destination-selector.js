// Bookmark Destination Selector Modal
(function() {
    let pendingBookmarkData = null;
    let selectedFile = null;
    let selectedSectionId = null;
    
    // Initialize modal when DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('bookmarkDestinationModal');
        const cancelBtn = modal.querySelector('.bookmark-destination-cancel');
        const addBtn = modal.querySelector('.bookmark-destination-add');
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            closeModal();
        });
        
        // Add button
        addBtn.addEventListener('click', async () => {
            if (selectedFile && pendingBookmarkData) {
                await addBookmarkToFile(selectedFile, pendingBookmarkData);
                closeModal();
            }
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    });
    
    function closeModal() {
        console.log('🎯 BOOKMARK DEST: Closing modal');
        const modal = document.getElementById('bookmarkDestinationModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Clean up localStorage bookmark keys on cancel
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('zenban_bookmark_')) {
                console.log('🎯 BOOKMARK DEST: Removing canceled bookmark from localStorage:', key);
                localStorage.removeItem(key);
            }
        }
        
        pendingBookmarkData = null;
        selectedFile = null;
        
        // Reset any state that might block next bookmark
        const addBtn = document.querySelector('.bookmark-destination-add');
        if (addBtn) {
            addBtn.disabled = false;
        }
        console.log('🎯 BOOKMARK DEST: Modal closed and state reset');
    }
    
    function showBookmarkDestination(bookmarkData) {
        console.log('🎯 BOOKMARK DEST: Showing destination selector', bookmarkData);
        
        pendingBookmarkData = bookmarkData;
        selectedFile = null;
        
        const modal = document.getElementById('bookmarkDestinationModal');
        const preview = modal.querySelector('.bookmark-preview');
        const tree = modal.querySelector('.bookmark-destination-tree');
        const addBtn = modal.querySelector('.bookmark-destination-add');
        
        // Update preview
        preview.querySelector('.bookmark-preview-title').textContent = bookmarkData.title || 'Untitled';
        preview.querySelector('.bookmark-preview-url').textContent = bookmarkData.url || '';
        
        // Build tree
        buildFileTree(tree);
        
        // Disable add button until selection
        addBtn.disabled = true;
        
        // Show modal
        modal.classList.add('active');
    }
    
    function buildFileTree(container) {
        const canvas = document.getElementById('canvas');
        const folders = canvas ? Array.from(canvas.querySelectorAll('.folder')) : [];
        
        let html = '<div class="file-tree"><ul>';
        
        // Add "Create New File" option at the top
        html += `<li class="create-new-option">
            <button class="create-new-file-btn" style="width: 100%; text-align: left; padding: 8px; background: #5353ff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 8px;">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Create New File
            </button>
        </li>`;
        
        if (folders.length === 0) {
            html += '<li style="color: #666; padding: 10px;">No folders yet. A new folder will be created.</li>';
        } else {
            const boardName = document.getElementById('boardName')?.textContent || 'Board 1';
            html += `<li>
                <details open>
                    <summary>
                        <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                        </svg>
                        ${boardName}
                        <span class="item-count">${folders.length} folders</span>
                    </summary>
                    <ul>`;
            
            folders.forEach((folder, folderIndex) => {
                const folderTitle = folder.querySelector('.folder-title');
                const title = folderTitle ? folderTitle.textContent.trim() || 'Untitled' : 'Untitled';
                const files = Array.from(folder.querySelectorAll('.file'));
                
                if (files.length === 0) {
                    // No files in folder - can't select
                    html += `<li>
                        <details>
                            <summary style="opacity: 0.5;">
                                <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>${title}</span>
                                <span class="item-count">No files</span>
                            </summary>
                        </details>
                    </li>`;
                } else {
                    html += `<li>
                        <details open>
                            <summary>
                                <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>${title}</span>
                                <span class="item-count">${files.length} files</span>
                            </summary>
                            <ul>`;
                    
                    files.forEach(file => {
                        const fileTitle = file.querySelector('.file-title');
                        const fileName = fileTitle ? fileTitle.textContent.trim() || 'Untitled File' : 'Untitled File';
                        const fileId = file.id || `file-${Date.now()}-${Math.random()}`;
                        
                        // Ensure file has ID
                        if (!file.id) file.id = fileId;
                        
                        // Count existing bookmarks
                        const bookmarkCount = file.bookmarks ? file.bookmarks.length : 0;
                        
                        html += `<li class="file-item" data-file-id="${fileId}">
                            <svg class="file-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                            </svg>
                            ${fileName}
                            ${bookmarkCount > 0 ? `<span class="item-count">${bookmarkCount} bookmarks</span>` : ''}
                        </li>`;
                        
                        // If file has sections, add them as nested items
                        if (file.sections && file.sections.length > 0) {
                            html += `<li class="section-container" style="margin-left: 20px;">
                                <details open>
                                    <summary style="padding-left: 10px;">
                                        <svg class="folder-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        <span>Sections</span>
                                        <span class="item-count">${file.sections.length} sections</span>
                                    </summary>
                                    <ul>`;
                            
                            file.sections.forEach(section => {
                                const sectionTitle = section.title || 'Untitled Section';
                                const sectionId = section.id;
                                
                                html += `<li class="section-item" data-file-id="${fileId}" data-section-id="${sectionId}">
                                    <svg class="file-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                                        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
                                    </svg>
                                    ${sectionTitle}
                                </li>`;
                            });
                            
                            html += `</ul>
                                </details>
                            </li>`;
                        }
                    });
                    
                    html += '</ul></details></li>';
                }
            });
            
            html += '</ul></details></li>';
        }
        
        html += '</ul></div>';
        container.innerHTML = html;
        
        // Add click handlers for existing files
        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', function() {
                // Remove previous selection
                container.querySelectorAll('.file-item, .section-item').forEach(i => i.classList.remove('selected'));
                
                // Select this file
                this.classList.add('selected');
                const fileId = this.dataset.fileId;
                selectedFile = document.getElementById(fileId);
                
                // Enable add button
                const addBtn = document.querySelector('.bookmark-destination-add');
                addBtn.disabled = false;
                
                console.log('🎯 BOOKMARK DEST: Selected file:', selectedFile);
            });
        });
        
        // Add click handlers for sections
        container.querySelectorAll('.section-item').forEach(item => {
            item.addEventListener('click', function() {
                // Remove previous selection
                container.querySelectorAll('.file-item, .section-item').forEach(i => i.classList.remove('selected'));
                
                // Select this section
                this.classList.add('selected');
                const fileId = this.dataset.fileId;
                const sectionId = this.dataset.sectionId;
                const file = document.getElementById(fileId);
                
                // Store selection
                selectedFile = file;
                selectedSectionId = sectionId;
                
                // Enable add button
                const addBtn = document.querySelector('.bookmark-destination-add');
                addBtn.disabled = false;
                
                console.log('🎯 BOOKMARK DEST: Selected section:', sectionId, 'in file:', file);
            });
        });
        
        // Add handler for "Create New File" button
        const createNewBtn = container.querySelector('.create-new-file-btn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', function() {
                console.log('🎯 BOOKMARK DEST: Creating new file for bookmark');
                
                // Get or create a folder
                let targetFolder = null;
                const canvas = document.getElementById('canvas');
                const folders = canvas ? Array.from(canvas.querySelectorAll('.folder')) : [];
                
                if (folders.length === 0) {
                    // Create a new folder
                    console.log('🎯 BOOKMARK DEST: Creating new folder');
                    if (window.addFolder) {
                        targetFolder = window.addFolder(200, 200, 'Bookmarks');
                    }
                } else {
                    // Use the first folder
                    targetFolder = folders[0];
                }
                
                if (targetFolder) {
                    // Create a new file
                    console.log('🎯 BOOKMARK DEST: Adding new file to folder');
                    if (window.addFileToFolder) {
                        const newFile = window.addFileToFolder(targetFolder, 'New Bookmark File');
                        if (newFile) {
                            // Select the new file
                            selectedFile = newFile;
                            
                            // Add the bookmark and close modal
                            if (pendingBookmarkData) {
                                addBookmarkToFile(selectedFile, pendingBookmarkData);
                                closeModal();
                                
                                // Optionally expand the file to show the bookmark
                                if (window.expandFile) {
                                    setTimeout(() => {
                                        window.expandFile(selectedFile);
                                    }, 100);
                                }
                            }
                        }
                    }
                } else {
                    console.error('🎯 BOOKMARK DEST: Failed to create or find folder');
                }
            });
        }
    }
    
    async function addBookmarkToFile(file, bookmarkData) {
        console.log('🎯 BOOKMARK DEST: Adding bookmark to file', file, bookmarkData);
        
        // Add the bookmark
        const bookmark = {
            title: bookmarkData.title || 'Untitled',
            url: bookmarkData.url || '',
            description: bookmarkData.description || bookmarkData.url || '',
            screenshot: bookmarkData.screenshotData || bookmarkData.screenshot || bookmarkData.image || null,
            timestamp: bookmarkData.timestamp || new Date().toISOString(),
            id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        
        // If a section is selected, add to that section
        if (selectedSectionId && file.sections) {
            const section = file.sections.find(s => s.id === selectedSectionId);
            if (section) {
                // Initialize bookmarks array if doesn't exist
                if (!section.bookmarks) {
                    section.bookmarks = [];
                }
                
                // Add the bookmark to the section
                section.bookmarks.push(bookmark);
                console.log('🎯 BOOKMARK DEST: Bookmark added to section, total now:', section.bookmarks.length);
                
                // Update the bookmarks section in the UI if this section is visible
                if (file.classList.contains('expanded')) {
                    const sectionElement = section.element;
                    if (sectionElement) {
                        const bookmarksSection = sectionElement.querySelector('.bookmarks-section');
                        if (bookmarksSection) {
                            // Remove placeholder
                            const placeholders = bookmarksSection.querySelectorAll('.bookmark-file');
                            placeholders.forEach(p => {
                                if (p.textContent.includes('Example Bookmark')) {
                                    p.remove();
                                }
                            });
                            
                            // Add the new bookmark file
                            if (window.createBookmarkFile) {
                                const bookmarkFile = window.createBookmarkFile(
                                    bookmark.title,
                                    bookmark.description,
                                    bookmark.url,
                                    bookmark.timestamp,
                                    bookmark.screenshot,
                                    section.bookmarks.length - 1,
                                    file
                                );
                                bookmarksSection.appendChild(bookmarkFile);
                            }
                        }
                    }
                }
            }
        } else {
            // Initialize bookmarks array if doesn't exist
            if (!file.bookmarks) {
                file.bookmarks = [];
            }
            
            // Add the bookmark to the file
            file.bookmarks.push(bookmark);
            console.log('🎯 BOOKMARK DEST: Bookmark added to file, total now:', file.bookmarks.length);
        }
        
        // Update AppState immediately to ensure persistence
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const board = boards.find(b => b.id === currentBoard_id);
        
        if (board && board.folders) {
            // Find this file in the board structure
            const fileTitle = file.querySelector('.file-title')?.textContent;
            const fileId = file.dataset.fileId || file.id;
            
            for (let catIndex = 0; catIndex < board.folders.length; catIndex++) {
                const folder = board.folders[catIndex];
                if (folder.files) {
                    for (let fileIndex = 0; fileIndex < folder.files.length; fileIndex++) {
                        const savedFile = folder.files[fileIndex];
                        // Match by ID first, then by title as fallback
                        if ((savedFile.id && savedFile.id === fileId) || savedFile.title === fileTitle) {
                            // Update bookmarks in AppState
                            if (selectedSectionId && savedFile.sections) {
                                // Find the section and update its bookmarks
                                const section = savedFile.sections.find(s => s.id === selectedSectionId);
                                if (section) {
                                    const sectionIndex = savedFile.sections.findIndex(s => s.id === selectedSectionId);
                                    // Create a new section object with updated bookmarks
                                    const updatedSection = {
                                        ...section,
                                        bookmarks: section.bookmarks ? [...section.bookmarks] : []
                                    };
                                    // Update the section in the file
                                    savedFile.sections[sectionIndex] = updatedSection;
                                }
                            } else {
                                // Update file-level bookmarks
                                board.folders[catIndex].files[fileIndex].bookmarks = [...file.bookmarks];
                            }
                            
                            AppState.set('boards', boards);
                            console.log('🎯 BOOKMARK DEST: Updated AppState with new bookmark');
                            break;
                        }
                    }
                }
            }
        }
        
        // If file is currently expanded, update its display
        const expandedFile = AppState.get('expandedFile');
        if (expandedFile === file) {
            const bookmarksSection = file.querySelector('.bookmarks-section');
            if (bookmarksSection) {
                // Remove placeholder
                const placeholders = bookmarksSection.querySelectorAll('.bookmark-file');
                placeholders.forEach(p => {
                    if (p.textContent.includes('Example Bookmark')) {
                        p.remove();
                    }
                });
                
                // Refresh all bookmarks to update indices
                bookmarksSection.innerHTML = '';
                file.bookmarks.forEach((bm, index) => {
                    if (window.createBookmarkFile) {
                        const bookmarkFile = window.createBookmarkFile(
                            bm.title,
                            bm.description,
                            bm.url,
                            bm.timestamp,
                            bm.screenshot,
                            index,
                            file
                        );
                        bookmarksSection.appendChild(bookmarkFile);
                    }
                });
            }
        }
        
        // Wait for DOM update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force save board state to capture bookmark
        if (typeof saveCurrentBoard === 'function') {
            console.log('🔖 BOOKMARK: Calling saveCurrentBoard for regular file');
            await saveCurrentBoard();
        }
        
        // Expand the file to show the new bookmark
        if (window.expandFile) {
            console.log('🎯 BOOKMARK DEST: Expanding file to show new bookmark');
            window.expandFile(file);
        }
        
        // Save to Firebase with notification
        if (window.syncService && window.syncService.saveAfterAction) {
            console.log('🔖 BOOKMARK: Triggering sync for regular file');
            window.syncService.saveAfterAction('bookmark added to file');
            
            // Show Firebase save notification
            if (window.simpleNotifications) {
                window.simpleNotifications.showSaveNotification('saving');
                setTimeout(() => {
                    window.simpleNotifications.showSaveNotification('saved');
                }, 1000);
            }
        } else {
            console.error('🔖 BOOKMARK: Sync service not available');
        }
        
        // Show notification
        try {
            if (window.showNotification) {
                const fileTitle = file.querySelector('.file-title')?.textContent || 'file';
                window.showNotification(`Bookmark added to "${fileTitle}"`, 'success');
            } else {
                console.log('🎯 BOOKMARK DEST: Notification system not available');
            }
        } catch (e) {
            console.log('🎯 BOOKMARK DEST: Could not show notification:', e);
        }
    }
    
    // Create and add the expanded file choice modal
    function createExpandedFileModal() {
        const modalHTML = `
            <div id="expandedFileChoiceModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000001; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; margin: auto; margin-top: 100px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); position: relative; z-index: 10000002;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px;">Where would you like to add this bookmark?</h3>
                    <p style="color: #666; margin-bottom: 20px; font-size: 14px;">You currently have a file open.</p>
                    
                    <!-- Bookmark title editing -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">Bookmark Title:</label>
                        <input type="text" id="bookmarkTitleInput" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;" placeholder="Enter bookmark title">
                    </div>
                    
                    <!-- Section selection will be added here -->
                    <div id="sectionSelection" style="display: none; margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">Select a section:</label>
                        <div id="sectionsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 6px; padding: 8px;">
                            <!-- Sections will be populated here -->
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <button id="addToOpenFile" style="flex: 1; padding: 10px 16px; background: #5353ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Add to Open File</button>
                        <button id="addElsewhere" style="flex: 1; padding: 10px 16px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Choose Another File</button>
                    </div>
                    <button id="cancelExpandedModal" style="width: 100%; padding: 10px 16px; background: #f0f0f0; color: #666; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Cancel</button>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('expandedFileChoiceModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    // Initialize the expanded file modal on DOM ready
    document.addEventListener('DOMContentLoaded', createExpandedFileModal);
    
    // Show expanded file choice modal
    function showExpandedFileChoice(bookmarkData, expandedFile) {
        const modal = document.getElementById('expandedFileChoiceModal');
        if (!modal) {
            createExpandedFileModal();
            setTimeout(() => showExpandedFileChoice(bookmarkData, expandedFile), 100);
            return;
        }
        
        modal.style.display = 'flex';
        
        // Prevent any clicks on modal content from bubbling
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.onclick = (e) => e.stopPropagation();
        }
        
        // Get the actual DOM element for the expanded file
        const expandedFileDOM = document.querySelector('.file.expanded') || expandedFile;
        
        // Pre-fill the bookmark title input
        const titleInput = document.getElementById('bookmarkTitleInput');
        if (titleInput && bookmarkData) {
            titleInput.value = bookmarkData.title || '';
        }
        
        // Find all sections in the expanded file
        const sections = expandedFileDOM.querySelectorAll('.file-section');
        const sectionSelection = document.getElementById('sectionSelection');
        const sectionsList = document.getElementById('sectionsList');
        
        // Variables to track selected section
        let selectedSectionElement = null;
        let selectedSectionData = null;
        
        if (sections && sections.length > 0) {
            // Show section selection if there are sections
            sectionSelection.style.display = 'block';
            sectionsList.innerHTML = '';
            
            sections.forEach((section, index) => {
                const sectionTitle = section.querySelector('.section-title')?.textContent || `Section ${index + 1}`;
                const sectionItem = document.createElement('div');
                sectionItem.style.cssText = 'padding: 8px 12px; margin: 4px 0; border-radius: 4px; cursor: pointer; transition: background 0.2s;';
                sectionItem.style.background = index === 0 ? '#e8e8ff' : '#f5f5f5';
                sectionItem.innerHTML = `
                    <div style="font-weight: 500; margin-bottom: 4px;">${sectionTitle}</div>
                    <div style="font-size: 12px; color: #666;">
                        ${section.sectionData?.bookmarks?.length || 0} bookmarks
                    </div>
                `;
                
                // Select first section by default
                if (index === 0) {
                    selectedSectionElement = section;
                    selectedSectionData = section.sectionData;
                }
                
                sectionItem.addEventListener('click', () => {
                    // Update selection
                    sectionsList.querySelectorAll('div').forEach(item => {
                        if (item.style.padding) item.style.background = '#f5f5f5';
                    });
                    sectionItem.style.background = '#e8e8ff';
                    selectedSectionElement = section;
                    selectedSectionData = section.sectionData;
                });
                
                sectionItem.addEventListener('mouseenter', () => {
                    if (selectedSectionElement !== section) {
                        sectionItem.style.background = '#ebebeb';
                    }
                });
                
                sectionItem.addEventListener('mouseleave', () => {
                    if (selectedSectionElement !== section) {
                        sectionItem.style.background = '#f5f5f5';
                    }
                });
                
                sectionsList.appendChild(sectionItem);
            });
        } else {
            // Hide section selection if no sections
            sectionSelection.style.display = 'none';
        }
        
        const addToOpenBtn = document.getElementById('addToOpenFile');
        const addElsewhereBtn = document.getElementById('addElsewhere');
        const cancelBtn = document.getElementById('cancelExpandedModal');
        
        // Function to close modal and clean up
        const closeExpandedModal = () => {
            modal.style.display = 'none';
            // Clean up localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('zenban_bookmark_')) {
                    console.log('🔖 Expanded modal: Removing canceled bookmark from localStorage:', key);
                    localStorage.removeItem(key);
                }
            }
        };
        
        // Clean up old listeners
        const newAddToOpen = addToOpenBtn.cloneNode(true);
        const newAddElsewhere = addElsewhereBtn.cloneNode(true);
        const newCancelBtn = cancelBtn ? cancelBtn.cloneNode(true) : null;
        addToOpenBtn.replaceWith(newAddToOpen);
        addElsewhereBtn.replaceWith(newAddElsewhere);
        if (cancelBtn && newCancelBtn) {
            cancelBtn.replaceWith(newCancelBtn);
        }
        
        // Add to open file
        newAddToOpen.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent click from reaching overlay
            modal.style.display = 'none';
            
            // Get the edited title from the input field
            const titleInput = document.getElementById('bookmarkTitleInput');
            const editedTitle = titleInput ? titleInput.value : (bookmarkData.title || 'Untitled');
            
            // Use selected section or fall back to first section
            if (expandedFileDOM && bookmarkData) {
                let targetSection = selectedSectionElement;
                let targetSectionData = selectedSectionData;
                
                // If no section selected, try to find the first section
                if (!targetSection) {
                    targetSection = expandedFileDOM.querySelector('.file-section');
                    targetSectionData = targetSection?.sectionData;
                }
                
                if (!targetSection || !targetSectionData) {
                    console.error('❌ BOOKMARK: No section available to add bookmark');
                    return;
                }
                
                // Initialize bookmarks array for this section if it doesn't exist
                if (!targetSectionData.bookmarks) {
                    targetSectionData.bookmarks = [];
                }
                
                // Add the new bookmark with enhanced debugging
                console.log('🔍 DEBUG: Raw bookmark data received:', {
                    timestamp: bookmarkData.timestamp,
                    timestampType: typeof bookmarkData.timestamp,
                    screenshot: bookmarkData.screenshot ? `${bookmarkData.screenshot.substring(0, 50)}...` : 'null',
                    screenshotData: bookmarkData.screenshotData ? `${bookmarkData.screenshotData.substring(0, 50)}...` : 'null'
                });
                
                // Fix timestamp if it's a number (Unix timestamp)
                let fixedTimestamp = bookmarkData.timestamp;
                if (typeof fixedTimestamp === 'number') {
                    // Check if it's in milliseconds and looks wrong (year 2525)
                    if (fixedTimestamp > 10000000000000) {
                        console.log('🔍 DEBUG: Timestamp seems incorrect, using current time');
                        fixedTimestamp = new Date().toISOString();
                    } else if (fixedTimestamp < 10000000000) {
                        // Unix timestamp in seconds, convert to milliseconds
                        fixedTimestamp = new Date(fixedTimestamp * 1000).toISOString();
                    } else {
                        // Unix timestamp in milliseconds
                        fixedTimestamp = new Date(fixedTimestamp).toISOString();
                    }
                }
                
                const bookmark = {
                    title: editedTitle,
                    url: bookmarkData.url || '',
                    description: bookmarkData.description || bookmarkData.url || '',
                    screenshot: bookmarkData.screenshotData || bookmarkData.screenshot || bookmarkData.image || null,
                    timestamp: fixedTimestamp || new Date().toISOString(),
                    id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                console.log('🔍 DEBUG: Processed bookmark:', {
                    title: bookmark.title,
                    timestamp: bookmark.timestamp,
                    hasScreenshot: !!bookmark.screenshot
                });
                
                targetSectionData.bookmarks.push(bookmark);
                console.log('🔖 BOOKMARK MODAL: Added bookmark to section:', targetSection.querySelector('.section-title')?.textContent);
                
                // Update AppState immediately to ensure persistence
                if (expandedFileDOM.appStateLocation) {
                    const boards = AppState.get('boards');
                    const currentBoard_id = AppState.get('currentBoard_id');
                    const board = boards.find(b => b.id === currentBoard_id);
                    
                    if (board && board.folders) {
                        const { folderIndex, fileIndex } = expandedFileDOM.appStateLocation;
                        if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                            // Find the section in the board data
                            if (!board.folders[folderIndex].files[fileIndex].sections) {
                                board.folders[folderIndex].files[fileIndex].sections = [];
                            }
                            
                            const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === targetSectionData.id);
                            if (sectionIndex !== -1) {
                                board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...targetSectionData.bookmarks];
                            } else {
                                board.folders[folderIndex].files[fileIndex].sections.push({
                                    id: targetSectionData.id,
                                    title: targetSectionData.title,
                                    content: targetSectionData.content,
                                    bookmarks: [...targetSectionData.bookmarks]
                                });
                            }
                            
                            AppState.set('boards', boards);
                            console.log('🔖 BOOKMARK MODAL: Updated AppState with new bookmark in section');
                        }
                    }
                }
                
                // Update the bookmarks section UI without collapsing
                const bookmarksSection = targetSection.querySelector('.section-bookmarks');
                if (bookmarksSection) {
                    // Remove placeholder if it exists
                    const placeholders = bookmarksSection.querySelectorAll('.bookmark-file');
                    placeholders.forEach(p => {
                        if (p.textContent.includes('Example Bookmark')) {
                            p.remove();
                        }
                    });
                    
                    // Add the new bookmark file
                    if (window.createBookmarkFile) {
                        const bookmarkFile = window.createBookmarkFile(
                            bookmark.title,
                            bookmark.description,
                            bookmark.url,
                            bookmark.timestamp,
                            bookmark.screenshot,
                            targetSectionData.bookmarks.length - 1,
                            expandedFileDOM
                        );
                        bookmarksSection.appendChild(bookmarkFile);
                    }
                }
                
                // Wait a moment to ensure DOM is updated
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Force save of the board to capture the bookmark
                if (typeof saveCurrentBoard === 'function') {
                    console.log('🔖 BOOKMARK: Calling saveCurrentBoard after adding bookmark');
                    await saveCurrentBoard();
                }
                
                // Trigger Firebase sync with notification
                if (window.syncService && window.syncService.saveAfterAction) {
                    console.log('🔖 BOOKMARK: Triggering sync service save');
                    window.syncService.saveAfterAction('bookmark added to expanded file');
                    
                    // Show Firebase save notification
                    if (window.simpleNotifications) {
                        window.simpleNotifications.showSaveNotification('saving');
                        setTimeout(() => {
                            window.simpleNotifications.showSaveNotification('saved');
                        }, 1000);
                    }
                } else {
                    console.error('🔖 BOOKMARK: Sync service not available or missing saveAfterAction');
                }
                
                // Show notification
                if (window.simpleNotifications) {
                    window.simpleNotifications.showSaveNotification('saved');
                }
            } else {
                console.error('Expanded file or bookmark data not available');
            }
        });
        
        // Choose elsewhere
        newAddElsewhere.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from reaching overlay
            modal.style.display = 'none';
            
            // Get the edited title from the input field
            const titleInput = document.getElementById('bookmarkTitleInput');
            const editedTitle = titleInput ? titleInput.value : (bookmarkData.title || 'Untitled');
            
            // Update the bookmark data with the edited title
            const updatedBookmarkData = {
                ...bookmarkData,
                title: editedTitle
            };
            
            // Don't clean up localStorage here - we're passing bookmark to destination selector
            showBookmarkDestination(updatedBookmarkData);
        });
        
        // Cancel button
        if (newCancelBtn) {
            newCancelBtn.addEventListener('click', closeExpandedModal);
        }
        
        // Click outside modal to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.stopPropagation(); // Prevent click from reaching overlay
                closeExpandedModal();
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeExpandedModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Override the global handleBookmarkData to show selector
    const originalHandler = window.handleBookmarkData;
    window.originalHandleBookmarkData = originalHandler; // Store for later use
    window.handleBookmarkData = function(data) {
        console.log('🔖 BOOKMARK: Intercepted bookmark data', data);
        
        // Check if there's an expanded file
        const expandedFile = AppState.get('expandedFile');
        if (expandedFile) {
            // Show choice modal
            showExpandedFileChoice(data, expandedFile);
        } else {
            // Show destination selector
            showBookmarkDestination(data);
        }
    };
    

    
    // Update the section selection in the expanded file
    function selectSectionInExpandedFile(sectionElement) {
        // Remove active class from all sections
        const allSections = document.querySelectorAll('.file-section');
        allSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Add active class to selected section
        if (sectionElement) {
            sectionElement.classList.add('active');
        }
    }
    
    // Make selectSectionInExpandedFile available globally
    window.selectSectionInExpandedFile = selectSectionInExpandedFile;
    
    // Expose for testing
    window.showBookmarkDestination = showBookmarkDestination;
})();
