// Bookmark Move Modal
(function() {
    let bookmarkToMove = null;
    let sourceFile = null;
    let sourceSectionId = null;
    let fileTree = null;
    
    // Initialize modal when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('bookmarkMoveModal');
        if (!modal) {
            createMoveModal();
        }
        
        // Add event listeners
        const cancelBtn = document.getElementById('bookmarkMoveCancel');
        const moveBtn = document.getElementById('bookmarkMoveBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        if (moveBtn) {
            moveBtn.addEventListener('click', moveBookmark);
        }
        
        // Close on overlay click
        const moveModal = document.getElementById('bookmarkMoveModal');
        if (moveModal) {
            moveModal.addEventListener('click', (e) => {
                if (e.target === moveModal) {
                    closeModal();
                }
            });
        }
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && moveModal && moveModal.classList.contains('active')) {
                closeModal();
            }
        });
    });
    
    // Create the move modal HTML
    function createMoveModal() {
        const modalHTML = `
            <div id="bookmarkMoveModal" class="bookmark-move-modal">
                <div class="bookmark-move-content">
                    <div class="bookmark-move-header">
                        <h3>Move Bookmark</h3>
                    </div>
                    <div class="bookmark-move-preview">
                        <div class="bookmark-move-preview-title">Loading...</div>
                        <div class="bookmark-move-preview-url"></div>
                    </div>
                    <div class="bookmark-move-tree">
                        <!-- Tree will be populated here -->
                    </div>
                    <div class="bookmark-move-footer">
                        <button id="bookmarkMoveCancel">Cancel</button>
                        <button id="bookmarkMoveBtn" disabled>Move Bookmark</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body if it doesn't exist
        if (!document.getElementById('bookmarkMoveModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    // Show move modal
    function showMoveModal(bookmark, file, sectionId = null) {
        bookmarkToMove = bookmark;
        sourceFile = file;
        sourceSectionId = sectionId;
        
        const modal = document.getElementById('bookmarkMoveModal');
        if (!modal) {
            createMoveModal();
        }
        
        const preview = modal.querySelector('.bookmark-move-preview');
        const treeContainer = modal.querySelector('.bookmark-move-tree');
        const moveBtn = document.getElementById('bookmarkMoveBtn');
        
        // Update preview
        if (preview) {
            preview.querySelector('.bookmark-move-preview-title').textContent = bookmark.title || 'Untitled';
            preview.querySelector('.bookmark-move-preview-url').textContent = bookmark.url || '';
        }
        
        // Initialize file tree
        fileTree = new window.FileTree({
            showSections: true,
            showCreateNew: true,
            onSelect: (file) => {
                // Enable move button when a file is selected
                if (moveBtn) {
                    moveBtn.disabled = false;
                }
            },
            onSectionSelect: (file, sectionId) => {
                // Enable move button when a section is selected
                if (moveBtn) {
                    moveBtn.disabled = false;
                }
            },
            onCreateNew: () => {
                createNewFileForBookmark();
            }
        });
        
        // Generate tree
        if (treeContainer) {
            fileTree.generateTree(treeContainer);
        }
        
        // Disable move button until selection
        if (moveBtn) {
            moveBtn.disabled = true;
        }
        
        // Show modal
        modal.classList.add('active');
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('bookmarkMoveModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Clear selections
        if (fileTree) {
            fileTree.clearSelection();
        }
        
        bookmarkToMove = null;
        sourceFile = null;
        sourceSectionId = null;
    }
    
    // Move bookmark to selected destination
    function moveBookmark() {
        if (!bookmarkToMove || !fileTree) return;
        
        const targetFile = fileTree.getSelectedFile();
        const targetSectionId = fileTree.getSelectedSectionId();
        
        if (!targetFile) {
            console.error('No target file selected');
            return;
        }
        
        // Remove bookmark from source
        removeBookmarkFromSource();
        
        // Add bookmark to target
        addBookmarkToTarget(targetFile, targetSectionId);
        
        // Close modal
        closeModal();
        
        // Show success notification
        if (window.simpleNotifications) {
            window.simpleNotifications.showNotification('Bookmark moved successfully');
        }
        
        // Expand the target file
        expandTargetFile(targetFile);
    }
    
    // Expand the target file after moving a bookmark
    function expandTargetFile(targetFile) {
        // Check if targetFile is a string ID or DOM element
        let fileElement = targetFile;
        
        // If it's a string ID, find the file element
        if (typeof targetFile === 'string') {
            fileElement = document.getElementById(targetFile);
        }
        
        // If we found the file element, expand it
        if (fileElement && typeof window.expandFile === 'function') {
            // Use setTimeout to ensure the UI has updated before expanding
            setTimeout(() => {
                window.expandFile(fileElement);
            }, 100);
        } else {
            console.warn('Could not find target file element to expand');
        }
    }
    
    // Remove bookmark from source
    function removeBookmarkFromSource() {
        // If there's no source file, this bookmark is from the bookmarks modal
        // In this case, we just need to remove it from localStorage
        if (!sourceFile || !bookmarkToMove) {
            // Remove from localStorage if it exists there
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('zenban_saved_bookmark_')) {
                    try {
                        const bookmark = JSON.parse(localStorage.getItem(key));
                        if (bookmark.id === bookmarkToMove.id || bookmark.url === bookmarkToMove.url) {
                            localStorage.removeItem(key);
                        }
                    } catch (e) {
                        console.error('Error parsing bookmark from localStorage:', e);
                    }
                }
            }
            return;
        }
        
        // Find source section
        let sourceSection = null;
        if (sourceSectionId && sourceFile.sections) {
            sourceSection = sourceFile.sections.find(s => s.id === sourceSectionId);
        }
        
        // Remove from source section or file
        if (sourceSection) {
            // Remove from section
            const index = sourceSection.bookmarks.findIndex(b => b.id === bookmarkToMove.id);
            if (index !== -1) {
                sourceSection.bookmarks.splice(index, 1);
            }
        } else {
            // Remove from file
            const index = sourceFile.bookmarks.findIndex(b => b.id === bookmarkToMove.id);
            if (index !== -1) {
                sourceFile.bookmarks.splice(index, 1);
            }
        }
        
        // Update UI in source file if it's expanded
        if (sourceFile.classList && sourceFile.classList.contains('expanded')) {
            updateSourceFileUI();
        }
        
        // Update AppState
        updateAppState(sourceFile, sourceSection, false);
    }
    
    // Add bookmark to target
    function addBookmarkToTarget(targetFile, targetSectionId) {
        if (!targetFile || !bookmarkToMove) return;
        
        // Find target section
        let targetSection = null;
        if (targetSectionId && targetFile.sections) {
            targetSection = targetFile.sections.find(s => s.id === targetSectionId);
        }
        
        // Add to target section or file
        if (targetSection) {
            // Add to section
            if (!targetSection.bookmarks) {
                targetSection.bookmarks = [];
            }
            targetSection.bookmarks.push(bookmarkToMove);
        } else {
            // Add to file
            if (!targetFile.bookmarks) {
                targetFile.bookmarks = [];
            }
            targetFile.bookmarks.push(bookmarkToMove);
        }
        
        // Update UI in target file if it's expanded
        if (targetFile.classList && targetFile.classList.contains('expanded')) {
            updateTargetFileUI(targetFile, targetSection, targetSectionId);
        }
        
        // Update AppState
        updateAppState(targetFile, targetSection, true);
    }
    
    // Update source file UI
    function updateSourceFileUI() {
        // Find the section element in the source file
        let sectionElement = null;
        if (sourceSectionId) {
            const sections = sourceFile.querySelectorAll('.file-section');
            for (const section of sections) {
                if (section.sectionData && section.sectionData.id === sourceSectionId) {
                    sectionElement = section;
                    break;
                }
            }
        }
        
        // Update bookmarks section UI
        const bookmarksContainer = sectionElement ? 
            sectionElement.querySelector('.section-bookmarks') : 
            sourceFile.querySelector('.bookmarks-section');
        
        if (bookmarksContainer) {
            // Refresh all bookmarks to update indices
            refreshBookmarksUI(bookmarksContainer, sectionElement || sourceFile);
        }
    }
    
    // Update target file UI
    function updateTargetFileUI(targetFile, targetSection, targetSectionId) {
        // Find the section element in the target file
        let sectionElement = null;
        if (targetSection && targetSectionId) {
            const sections = targetFile.querySelectorAll('.file-section');
            for (const section of sections) {
                if (section.sectionData && section.sectionData.id === targetSectionId) {
                    sectionElement = section;
                    break;
                }
            }
        }
        
        // Update bookmarks section UI
        const bookmarksContainer = sectionElement ? 
            sectionElement.querySelector('.section-bookmarks') : 
            targetFile.querySelector('.bookmarks-section');
        
        if (bookmarksContainer) {
            // Add the moved bookmark to the UI
            const bookmarkFile = window.createBookmarkFile(
                bookmarkToMove.title,
                bookmarkToMove.description || bookmarkToMove.url,
                bookmarkToMove.url,
                bookmarkToMove.timestamp || new Date(),
                bookmarkToMove.screenshot || bookmarkToMove.image,
                targetSection ? targetSection.bookmarks.length - 1 : targetFile.bookmarks.length - 1,
                targetFile,
                sectionElement
            );
            bookmarksContainer.appendChild(bookmarkFile);
        }
    }
    
    // Refresh bookmarks UI
    function refreshBookmarksUI(container, fileOrSection) {
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get bookmarks from file or section
        let bookmarks = [];
        if (fileOrSection.sectionData) {
            // Section
            bookmarks = fileOrSection.sectionData.bookmarks || [];
        } else {
            // File
            bookmarks = fileOrSection.bookmarks || [];
        }
        
        // Re-create all bookmark files
        if (bookmarks.length > 0) {
            bookmarks.forEach((bookmark, index) => {
                const bookmarkFile = window.createBookmarkFile(
                    bookmark.title,
                    bookmark.description || bookmark.url,
                    bookmark.url,
                    bookmark.timestamp || new Date(),
                    bookmark.screenshot || bookmark.image,
                    index,
                    fileOrSection,
                    fileOrSection.sectionData ? fileOrSection : null
                );
                container.appendChild(bookmarkFile);
            });
        } else {
            // Show placeholder when no bookmarks remain
            const bookmarkFile = window.createBookmarkFile(
                'Example Bookmark', 
                'This is a sample bookmark description that shows how bookmarks will appear.', 
                'https://example.com', 
                new Date(), 
                null, 
                0, 
                fileOrSection,
                fileOrSection.sectionData ? fileOrSection : null
            );
            container.appendChild(bookmarkFile);
        }
    }
    
    // Update AppState
    function updateAppState(file, section, isAdding) {
        if (!file.appStateLocation) return;
        
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = file.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                if (section) {
                    // Update section bookmarks
                    if (!board.folders[folderIndex].files[fileIndex].sections) {
                        board.folders[folderIndex].files[fileIndex].sections = [];
                    }
                    
                    const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === section.id);
                    if (sectionIndex !== -1) {
                        board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = 
                            isAdding ? [...section.bookmarks] : section.bookmarks.filter(b => b.id !== bookmarkToMove.id);
                    } else if (section.id) {
                        // Add new section if it doesn't exist
                        board.folders[folderIndex].files[fileIndex].sections.push({
                            id: section.id,
                            title: section.title || 'New Section',
                            content: section.content || null,
                            bookmarks: isAdding ? [...section.bookmarks] : section.bookmarks.filter(b => b.id !== bookmarkToMove.id)
                        });
                    }
                } else {
                    // Update file bookmarks
                    board.folders[folderIndex].files[fileIndex].bookmarks = 
                        isAdding ? [...file.bookmarks] : file.bookmarks.filter(b => b.id !== bookmarkToMove.id);
                }
                
                AppState.set('boards', boards);
                
                // Save to Firebase
                if (window.syncService) {
                    window.syncService.saveAfterAction(isAdding ? 'bookmark moved to file' : 'bookmark removed from file');
                }
            }
        }
    }
    
    // Create new file for bookmark with folder selection
    function createNewFileForBookmark() {
        // Get all folders
        const canvas = document.getElementById('canvas');
        const folders = canvas ? Array.from(canvas.querySelectorAll('.folder')) : [];
        
        // If no folders exist, create a new one
        if (folders.length === 0) {
            if (window.createFolder) {
                const newFolder = window.createFolder('Bookmarks', 200, 200);
                if (newFolder >= 0) {
                    const folders = AppState.get('folders');
                    const folder = folders[newFolder];
                    if (folder && window.addFileToFolder) {
                        const newFile = window.addFileToFolder(newFolder, 'New Bookmark File');
                        if (newFile) {
                            // Select the new file in the file tree
                            if (fileTree) {
                                // Simulate selection of the new file
                                fileTree.selectedFile = newFile;
                                
                                // Move the bookmark
                                moveBookmark();
                            }
                        }
                    }
                }
            }
            return;
        }
        
        // Show folder selection dialog
        showFolderSelectionDialog(folders);
    }
    
    // Show folder selection dialog
    function showFolderSelectionDialog(folders) {
        // Create dialog HTML
        let dialogHTML = `
            <div id="folderSelectionDialog" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000001; display: flex; align-items: center; justify-content: center;">
                <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; width: 400px; max-width: 90%;">
                    <h3 style="margin: 0 0 16px 0; color: #fff;">Select Folder</h3>
                    <p style="color: #999; margin-bottom: 20px;">Choose where to create the new file:</p>
                    
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 20px;">
        `;
        
        // Add existing folders
        folders.forEach((folder, index) => {
            const titleElement = folder.querySelector('.folder-title');
            const title = titleElement ? titleElement.textContent : `Folder ${index + 1}`;
            dialogHTML += `
                <div style="padding: 10px; margin: 5px 0; background: #2d2d2d; border-radius: 6px; cursor: pointer; transition: background 0.2s;" 
                     data-folder-index="${index}">
                    <div style="font-weight: 500; color: #fff;">${title}</div>
                    <div style="font-size: 12px; color: #999;">${folder.querySelectorAll('.file').length} files</div>
                </div>
            `;
        });
        
        dialogHTML += `
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="createNewFolderBtn" style="flex: 1; padding: 10px; background: #5353ff; color: white; border: none; border-radius: 6px; cursor: pointer;">Create New Folder</button>
                        <button id="cancelFolderDialog" style="flex: 1; padding: 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add dialog to body
        const dialog = document.createElement('div');
        dialog.innerHTML = dialogHTML;
        document.body.appendChild(dialog);
        
        // Add event listeners
        folders.forEach((folder, index) => {
            const folderElement = dialog.querySelector(`[data-folder-index="${index}"]`);
            if (folderElement) {
                folderElement.addEventListener('click', () => {
                    // Remove dialog
                    dialog.remove();
                    
                    // Create new file in selected folder
                    if (window.addFileToFolder) {
                        const newFile = window.addFileToFolder(index, 'New Bookmark File');
                        if (newFile) {
                            // Select the new file in the file tree
                            if (fileTree) {
                                // Simulate selection of the new file
                                fileTree.selectedFile = newFile;
                                
                                // Move the bookmark
                                moveBookmark();
                            }
                        }
                    }
                });
            }
        });
        
        const createNewFolderBtn = dialog.querySelector('#createNewFolderBtn');
        if (createNewFolderBtn) {
            createNewFolderBtn.addEventListener('click', () => {
                // Remove dialog
                dialog.remove();
                
                // Ask for folder name
                const folderName = prompt('Enter a name for the new folder:', 'New Folder');
                if (folderName !== null) {
                    // Create new folder
                    if (window.createFolder) {
                        const newFolderIndex = window.createFolder(folderName, 200, 200);
                        if (newFolderIndex >= 0) {
                            // Create new file in the new folder
                            if (window.addFileToFolder) {
                                const newFile = window.addFileToFolder(newFolderIndex, 'New Bookmark File');
                                if (newFile) {
                                    // Select the new file in the file tree
                                    if (fileTree) {
                                        // Simulate selection of the new file
                                        fileTree.selectedFile = newFile;
                                        
                                        // Move the bookmark
                                        moveBookmark();
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
        
        const cancelBtn = dialog.querySelector('#cancelFolderDialog');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Remove dialog
                dialog.remove();
            });
        }
        
        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }
    
    // Expose function globally
    window.showBookmarkMoveModal = showMoveModal;
})();
