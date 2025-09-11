// Document features for files (bookmarks, sections, editor)

// Create bookmark file element (restored from old-filesjs-reference.bak)
function createBookmarkFile(title, description, url, date, imageData, bookmarkIndex, expandedFile, sectionElement) {
    console.log('🔍 DEBUG: Creating bookmark file', {
        title,
        hasImageData: !!imageData,
        imageDataPreview: imageData ? imageData.substring(0, 50) + '...' : 'null',
        dateType: typeof date,
        date: date
    });
    
    const file = document.createElement('div');
    file.className = 'bookmark-file';
    file.dataset.bookmarkIndex = bookmarkIndex;
    file.dataset.index = bookmarkIndex; // For demo styling compatibility
    
    // Match the demo structure exactly with image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    
    // Image overlay
    const imageOverlay = document.createElement('div');
    imageOverlay.className = 'image-overlay';
    if (imageData) {
        imageOverlay.style.backgroundImage = `url('${imageData}')`;
        // Also set on file for blurred background
        file.style.setProperty('--bookmark-bg-image', `url('${imageData}')`);
    }
    imageContainer.appendChild(imageOverlay);
    
    // Delete button in image container
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-button';
    deleteBtn.setAttribute('aria-label', 'Delete bookmark');
    deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007h16zm-9.489 5.14a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z"/>
            <path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005h4z"/>
        </svg>
    `;
    deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeBookmark(expandedFile, bookmarkIndex, sectionElement);
    };
    imageContainer.appendChild(deleteBtn);
    
    // External link button
    const externalLink = document.createElement('a');
    externalLink.href = url;
    externalLink.target = '_blank';
    externalLink.className = 'external-link-button';
    externalLink.setAttribute('aria-label', 'Open bookmark');
    externalLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"/>
            <path d="M11 13l9 -9"/>
            <path d="M15 4h5v5"/>
        </svg>
    `;
    externalLink.onclick = (e) => e.stopPropagation();
    imageContainer.appendChild(externalLink);
    
    file.appendChild(imageContainer);
    
    // Up/Down buttons outside image container
    const upBtn = document.createElement('button');
    upBtn.className = 'up-button';
    upBtn.setAttribute('aria-label', 'Move file up');
    upBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
    `;
    upBtn.disabled = bookmarkIndex === 0;
    upBtn.onclick = () => {
        reorderBookmark(expandedFile, bookmarkIndex, bookmarkIndex - 1, sectionElement);
    };
    file.appendChild(upBtn);
    
    const downBtn = document.createElement('button');
    downBtn.className = 'down-button';
    downBtn.setAttribute('aria-label', 'Move file down');
    downBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
    `;
    const totalBookmarks = sectionElement?.sectionData?.bookmarks?.length || 1;
    downBtn.disabled = bookmarkIndex >= totalBookmarks - 1;
    downBtn.onclick = () => {
        reorderBookmark(expandedFile, bookmarkIndex, bookmarkIndex + 1, sectionElement);
    };
    file.appendChild(downBtn);
    
    // Move button
    const moveBtn = document.createElement('button');
    moveBtn.className = 'move-button';
    moveBtn.setAttribute('aria-label', 'Move bookmark');
    moveBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8c0-1.1.9-2 2-2h5"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
    `;
    moveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Get the bookmark data from the section
        const sectionData = sectionElement?.sectionData;
        if (sectionData && sectionData.bookmarks && sectionData.bookmarks[bookmarkIndex]) {
            const bookmark = sectionData.bookmarks[bookmarkIndex];
            // Show move modal
            if (window.showBookmarkMoveModal) {
                window.showBookmarkMoveModal(bookmark, expandedFile, sectionData.id);
            }
        }
    };
    file.appendChild(moveBtn);
    
    // File content section - use bookmark-specific classes to avoid conflicts
    const fileContent = document.createElement('div');
    fileContent.className = 'bookmark-content';
    
    const fileTitle = document.createElement('h3');
    fileTitle.className = 'bookmark-file-title';
    fileTitle.contentEditable = true;
    fileTitle.autocomplete = 'off';
    fileTitle.autocorrect = 'off';
    fileTitle.autocapitalize = 'off';
    fileTitle.spellcheck = false;
    fileTitle.textContent = title;
    fileTitle.title = title; // Tooltip for long titles

    // Add event listeners to handle focus/blur behavior similar to other editable titles
    fileTitle.addEventListener('focus', function(e) {
        e.stopPropagation();
        if (this.dataset.placeholder && this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });

    fileTitle.addEventListener('blur', function(e) {
        e.stopPropagation();
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder || title;
        }
        // Update the bookmark data with the new title
        const bookmarkIndex = this.closest('.bookmark-file').dataset.bookmarkIndex;
        if (bookmarkIndex !== undefined && sectionElement && sectionElement.sectionData) {
            const bookmarks = sectionElement.sectionData.bookmarks;
            if (bookmarks && bookmarks[bookmarkIndex]) {
                const newTitle = this.textContent.trim();
                bookmarks[bookmarkIndex].title = newTitle;
                this.title = newTitle; // Update tooltip
                console.log(`📝 BOOKMARK: Updated title to "${newTitle}"`);

                // Update AppState
                if (expandedFile.appStateLocation) {
                    const boards = AppState.get('boards');
                    const currentBoard_id = AppState.get('currentBoard_id');
                    const board = boards.find(b => b.id === currentBoard_id);

                    if (board && board.folders) {
                        const { folderIndex, fileIndex } = expandedFile.appStateLocation;
                        if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                            if (!board.folders[folderIndex].files[fileIndex].sections) {
                                board.folders[folderIndex].files[fileIndex].sections = [];
                            }

                            const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionElement.sectionData.id);
                            if (sectionIndex !== -1) {
                                board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...bookmarks];
                            }

                            AppState.set('boards', boards);
                            console.log('📝 BOOKMARK: Updated AppState with new bookmark title');
                        }
                    }
                }

                // Save to Firebase
                if (window.syncService) {
                    window.syncService.saveAfterAction('bookmark title edited');
                }
            }
        }
    });

    // Prevent event bubbling that might interfere with caret
    fileTitle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    fileTitle.addEventListener('keydown', (e) => {
        e.stopPropagation(); // Prevent other keyboard handlers from interfering
    });

    const dateAdded = document.createElement('p');
    dateAdded.className = 'bookmark-date-added';
    // Format date consistently
    let displayDate = date;
    if (typeof date === 'string') {
        try {
            const dateObj = new Date(date);
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            displayDate = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
        } catch (e) {
            displayDate = date;
        }
    } else if (date && date.toLocaleDateString) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
        displayDate = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    dateAdded.textContent = `Added: ${displayDate}`;
    
    fileContent.appendChild(fileTitle);
    fileContent.appendChild(dateAdded);
    file.appendChild(fileContent);
    
    // Add no-image class if no image data
    if (!imageData) {
        file.classList.add('no-image');
    }
    
    return file;
}

// Remove bookmark (restored from old-filesjs-reference.bak)
function removeBookmark(expandedFile, bookmarkIndex, sectionElement) {
    // Find the section that contains this bookmark
    if (!sectionElement) {
        const bookmarkFile = document.querySelector(`[data-bookmark-index="${bookmarkIndex}"]`);
        if (bookmarkFile) {
            sectionElement = bookmarkFile.closest('.file-section');
        }
    }
    
    if (!sectionElement || !sectionElement.sectionData) {
        console.error('Cannot find section for bookmark removal');
        return;
    }
    
    const sectionData = sectionElement.sectionData;
    const bookmarks = sectionData.bookmarks;
    
    if (!bookmarks || bookmarkIndex < 0 || bookmarkIndex >= bookmarks.length) return;
    
    // Get the bookmark being removed for potential confirmation
    const removedBookmark = bookmarks[bookmarkIndex];
    
    // Show confirmation dialog
    showConfirmDialog(
        'Remove Bookmark',
        `Are you sure you want to remove "${removedBookmark.title}"?`,
        () => {
            // Remove the bookmark from the array
            bookmarks.splice(bookmarkIndex, 1);
            
            // Update AppState immediately
            if (expandedFile.appStateLocation) {
                const boards = AppState.get('boards');
                const currentBoard_id = AppState.get('currentBoard_id');
                const board = boards.find(b => b.id === currentBoard_id);
                
                if (board && board.folders) {
                    const { folderIndex, fileIndex } = expandedFile.appStateLocation;
                    if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                        // Find and update the specific section
                        if (!board.folders[folderIndex].files[fileIndex].sections) {
                            board.folders[folderIndex].files[fileIndex].sections = [];
                        }
                        
                        const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                        if (sectionIndex !== -1) {
                            board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...bookmarks];
                        }
                        
                        AppState.set('boards', boards);
                        console.log('🗑️ BOOKMARK: Updated AppState after removing bookmark from section');
                    }
                }
            }
            
            // Remove any existing dialogs first to prevent stacking
            const existingDialogs = document.querySelectorAll('.dialog-overlay, .confirm-dialog');
            existingDialogs.forEach(dialog => dialog.remove());
            
            // Refresh the bookmarks display for this specific section
            const bookmarksContainer = sectionElement.querySelector('.section-bookmarks');
            if (bookmarksContainer) {
                // Clear container first
                bookmarksContainer.innerHTML = '';
                
                // Create a copy of bookmarks array to prevent concurrent modification
                const bookmarksCopy = [...bookmarks];
                
                // Re-create all bookmark files with updated indices
                if (bookmarksCopy.length > 0) {
                    bookmarksCopy.forEach((bookmark, index) => {
                        const bookmarkFile = createBookmarkFile(
                            bookmark.title,
                            bookmark.description || bookmark.url,
                            bookmark.url,
                            bookmark.timestamp || new Date(),
                            bookmark.screenshot || bookmark.image,
                            index,
                            expandedFile,
                            sectionElement
                        );
                        bookmarksContainer.appendChild(bookmarkFile);
                    });
                } else {
                    // Show placeholder when no bookmarks remain
                    const bookmarkFile = createBookmarkFile('Example Bookmark', 'This is a sample bookmark description that shows how bookmarks will appear.', 'https://example.com', new Date(), null, 0, expandedFile, sectionElement);
                    bookmarksContainer.appendChild(bookmarkFile);
                }
                
                // Save the updated bookmarks before reinitializing Lenis
                if (window.syncService) {
                    const expandedBeforeSync = AppState.get('expandedFile');
                    console.log('🔧 SYNC DEBUG: Before sync - expandedFile:', expandedBeforeSync);
                    window.syncService.saveAfterAction('bookmark removed').then(() => {
                        console.log('🔧 SYNC DEBUG: Sync complete - restoring expandedFile:', expandedBeforeSync);
                        AppState.set('expandedFile', expandedBeforeSync);
                        // Reinitialize modal Lenis to account for new content after save
                        reinitializeModalLenis(expandedFile);
                    }).catch(err => {
                        console.error('🔧 SYNC DEBUG: Sync failed:', err);
                        // Still reinitialize Lenis even if save fails
                        reinitializeModalLenis(expandedFile);
                    });
                } else {
                    // Reinitialize modal Lenis to account for new content
                    reinitializeModalLenis(expandedFile);
                }
            }
            
            // Show success notification
            if (window.simpleNotifications) {
                window.simpleNotifications.showNotification(`Bookmark removed: ${removedBookmark.title}`);
            }
        }
    );
}

// Reorder bookmark (restored from old-filesjs-reference.bak)
function reorderBookmark(expandedFile, fromIndex, toIndex, sectionElement) {
    // Find the section that contains this bookmark
    if (!sectionElement) {
        // Try to find section from the bookmark file that was clicked
        const bookmarkFile = document.querySelector(`[data-bookmark-index="${fromIndex}"]`);
        if (bookmarkFile) {
            sectionElement = bookmarkFile.closest('.file-section');
        }
    }
    
    if (!sectionElement || !sectionElement.sectionData) {
        console.error('Cannot find section for bookmark reorder');
        return;
    }
    
    const sectionData = sectionElement.sectionData;
    const bookmarks = sectionData.bookmarks;
    
    if (!bookmarks || toIndex < 0 || toIndex >= bookmarks.length) return;

    const wasExpanded = expandedFile.classList.contains('expanded');
    let fileContentToRestore = null;

    if (wasExpanded && expandedFile.quillEditor) {
        fileContentToRestore = {
            content: expandedFile.quillEditor.root.innerHTML
        };
        console.log('🔖 BOOKMARK: Storing Quill content before reorder.');
    }

    // Reorder the bookmarks array
    const [movedBookmark] = bookmarks.splice(fromIndex, 1);
    bookmarks.splice(toIndex, 0, movedBookmark);
    
    // Update AppState immediately
    if (expandedFile.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const board = boards.find(b => b.id === currentBoard_id);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = expandedFile.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                // Find and update the specific section
                if (!board.folders[folderIndex].files[fileIndex].sections) {
                    board.folders[folderIndex].files[fileIndex].sections = [];
                }
                
                const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                if (sectionIndex !== -1) {
                    board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...bookmarks];
                }
                
                AppState.set('boards', boards);
                console.log('🔖 BOOKMARK: Updated AppState with reordered bookmarks in section');
            }
        }
    }
    
    // Refresh the bookmarks display for this specific section
    const bookmarksContainer = sectionElement.querySelector('.section-bookmarks');
    if (bookmarksContainer) {
        bookmarksContainer.innerHTML = '';
        
        // Re-create all bookmark files with updated indices
        bookmarks.forEach((bookmark, index) => {
            const bookmarkFile = createBookmarkFile(
                bookmark.title,
                bookmark.description || bookmark.url,
                bookmark.url,
                bookmark.timestamp || new Date(),
                bookmark.screenshot || bookmark.image,
                index,
                expandedFile,
                sectionElement  // Pass section element
            );
            bookmarksContainer.appendChild(bookmarkFile);
        });
        
        // Save the reordered bookmarks before reinitializing Lenis
        if (window.syncService) {
            console.log('🔧 SYNC DEBUG: Initiating saveAfterAction for bookmarks reordered.');
            window.syncService.saveAfterAction('bookmarks reordered').then(() => {
                console.log('🔧 SYNC DEBUG: Sync complete.');
                
                // Only attempt to restore expanded state if it was expanded before
                if (wasExpanded) {
                    console.log('🔖 BOOKMARK: File was expanded before sync, ensuring it remains expanded.');
                    
                    // Use requestAnimationFrame to ensure DOM is stable before re-expanding
                    requestAnimationFrame(() => {
                        // Check if file is still in DOM and needs re-expansion
                        if (document.body.contains(expandedFile) && !expandedFile.classList.contains('expanded')) {
                            console.log('🔖 BOOKMARK: Re-expanding file after sync to maintain state.');
                            expandFile(expandedFile);
                            
                            // Restore editor content after re-expansion
                            if (fileContentToRestore && expandedFile.quillEditor) {
                                console.log('🔖 BOOKMARK: Restoring Quill content after re-expansion.');
                                expandedFile.quillEditor.root.innerHTML = fileContentToRestore.content;
                                expandedFile.initialContent = fileContentToRestore;
                            }
                        }
                    });
                }
                
                // Reinitialize modal Lenis to account for new content after save
                reinitializeModalLenis(expandedFile);
            }).catch(err => {
                console.error('🔧 SYNC DEBUG: Sync failed:', err);
                // Still reinitialize Lenis even if save fails
                reinitializeModalLenis(expandedFile);
            });
        } else {
            // Reinitialize modal Lenis to account for new content
            reinitializeModalLenis(expandedFile);
        }
    }
}

// Create a section with editor and bookmarks (restored from old-filesjs-reference.bak)
function createSection(file, bookmarks = [], existingSectionId = null) {
    console.log('🔍 DEBUG: createSection called', { 
        fileId: file.id, 
        bookmarksCount: bookmarks.length,
        existingSectionsCount: file.sections ? file.sections.length : 0,
        existingSectionId: existingSectionId
    });
    
    // Create section container
    const section = document.createElement('div');
    section.className = 'file-section';
    
    // Create section title with automatic numbering
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.contentEditable = true;
    sectionTitle.autocomplete = 'off';
    sectionTitle.autocorrect = 'off';
    sectionTitle.autocapitalize = 'off';
    sectionTitle.spellcheck = false;
    
    // Generate numbered section title
    const sectionNumber = getNewSectionNumber(file);
    const titleText = sectionNumber === 1 ? 'New Section' : `New Section ${sectionNumber}`;
    sectionTitle.textContent = titleText;
    sectionTitle.dataset.placeholder = titleText;
    
    sectionTitle.addEventListener('focus', function() {
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });
    
    sectionTitle.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
    });
    
    // Create content container for editor and bookmarks
    const contentContainer = document.createElement('div');
    contentContainer.className = 'section-content';
    
    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container section-editor';
    
    // Create bookmarks container
    const bookmarksSection = document.createElement('div');
    bookmarksSection.className = 'bookmarks-section section-bookmarks';
    
    // Add title to section
    section.appendChild(sectionTitle);
    
    // Add editor to content container
    contentContainer.appendChild(editorContainer);
    
    // Add bookmarks to content container
    contentContainer.appendChild(bookmarksSection);
    
    // Add content container to section
    section.appendChild(contentContainer);
    
    // Create section data object - use existing ID if provided, otherwise generate new one
    const sectionData = {
        id: existingSectionId || `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: sectionTitle.textContent,
        content: null,
        bookmarks: bookmarks || []
    };
    
    console.log('🔍 DEBUG: Created section data', { sectionId: sectionData.id });
    
    // Store section data on the section element
    section.sectionData = sectionData;
    
    // Add section to file's sections array ONLY if it doesn't already exist
    if (!file.sections) {
        file.sections = [];
    }
    
    // Check if section with this ID already exists in file.sections
    const existingSectionIndex = file.sections.findIndex(s => s.id === sectionData.id);
    console.log('🔍 DEBUG: Checking for existing section in file.sections', { 
        existingSectionIndex, 
        totalFileSections: file.sections.length 
    });
    
    if (existingSectionIndex === -1) {
        file.sections.push(sectionData);
        console.log('🔍 DEBUG: Added new section to file.sections', { 
            sectionId: sectionData.id,
            totalFileSections: file.sections.length 
        });
    } else {
        // Update existing section data
        file.sections[existingSectionIndex] = sectionData;
        console.log('🔍 DEBUG: Updated existing section in file.sections', { 
            sectionId: sectionData.id,
            index: existingSectionIndex 
        });
    }
    
    // Store a reference to the section element on the section data
    sectionData.element = section;
    
    // Save to AppState
    if (file.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const board = boards.find(b => b.id === currentBoard_id);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = file.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                // Initialize sections array if it doesn't exist
                if (!board.folders[folderIndex].files[fileIndex].sections) {
                    board.folders[folderIndex].files[fileIndex].sections = [];
                }
                
                console.log('🔍 DEBUG: Board sections before processing', { 
                    boardSectionsCount: board.folders[folderIndex].files[fileIndex].sections.length,
                    sectionIds: board.folders[folderIndex].files[fileIndex].sections.map(s => s.id)
                });
                
                // Check if section with this ID already exists in board data
                const boardSectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                console.log('🔍 DEBUG: Checking for existing section in board data', { boardSectionIndex });
                
                if (boardSectionIndex === -1) {
                    // Add the new section to the board data
                    board.folders[folderIndex].files[fileIndex].sections.push({
                        id: sectionData.id,
                        title: sectionData.title,
                        content: null,
                        bookmarks: sectionData.bookmarks || []
                    });
                    console.log('🔍 DEBUG: Added new section to board data', { sectionId: sectionData.id });
                } else {
                    // Update existing section in board data
                    board.folders[folderIndex].files[fileIndex].sections[boardSectionIndex] = {
                        id: sectionData.id,
                        title: sectionData.title,
                        content: null,
                        bookmarks: sectionData.bookmarks || []
                    };
                    console.log('🔍 DEBUG: Updated existing section in board data', { 
                        sectionId: sectionData.id,
                        index: boardSectionIndex 
                    });
                }
                
                AppState.set('boards', boards);
                console.log('🔖 SECTION: Updated AppState with section', {
                    totalBoardSections: board.folders[folderIndex].files[fileIndex].sections.length
                });
            }
        }
    }
    
    // Initialize editor in this section
    console.log('🔍 DEBUG: Initializing editor for section', { sectionId: sectionData.id });
    initializeEditorJS(file, editorContainer);
    
    // Add bookmarks to section
    if (bookmarks && bookmarks.length > 0) {
        console.log('🔍 DEBUG: Adding bookmarks to section', { 
            sectionId: sectionData.id, 
            bookmarksCount: bookmarks.length 
        });
        bookmarks.forEach((bookmark, index) => {
            const bookmarkFile = createBookmarkFile(
                bookmark.title,
                bookmark.description || bookmark.url,
                bookmark.url,
                bookmark.timestamp || new Date(),
                bookmark.screenshot || bookmark.image,
                index,
                file,
                section  // Pass the section element
            );
            bookmarksSection.appendChild(bookmarkFile);
        });
    } else {
        console.log('🔍 DEBUG: Adding sample bookmark to section', { sectionId: sectionData.id });
        // Create sample bookmark file
        const bookmarkFile = createBookmarkFile('Example Bookmark', 'This is a sample bookmark description that shows how bookmarks will appear.', 'https://example.com', new Date(), null, 0, file, section);
        bookmarksSection.appendChild(bookmarkFile);
    }
    
    // Update section title listener to save changes
    sectionTitle.addEventListener('blur', function() {
        if (file.appStateLocation) {
            const boards = AppState.get('boards');
            const currentBoard_id = AppState.get('currentBoard_id');
            const board = boards.find(b => b.id === currentBoard_id);
            
            if (board && board.folders) {
                const { folderIndex, fileIndex } = file.appStateLocation;
                if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                    // Find and update this section in the board data
                    if (!board.folders[folderIndex].files[fileIndex].sections) {
                        board.folders[folderIndex].files[fileIndex].sections = [];
                    }
                    
                    // Update or add section
                    const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                    if (sectionIndex !== -1) {
                        board.folders[folderIndex].files[fileIndex].sections[sectionIndex].title = this.textContent;
                        console.log('🔍 DEBUG: Updated section title in board data', { 
                            sectionId: sectionData.id, 
                            newTitle: this.textContent 
                        });
                    } else {
                        board.folders[folderIndex].files[fileIndex].sections.push({
                            id: sectionData.id,
                            title: this.textContent,
                            content: null,
                            bookmarks: sectionData.bookmarks || []
                        });
                        console.log('🔍 DEBUG: Added new section with title to board data', { 
                            sectionId: sectionData.id, 
                            title: this.textContent 
                        });
                    }
                    
                    AppState.set('boards', boards);
                    console.log('🔖 SECTION: Updated AppState with section title');
                    
                    // Save to Firebase
                    if (window.syncService) {
                        window.syncService.saveAfterAction('section title edited');
                    }
                }
            }
        }
    });
    
    console.log('🔍 DEBUG: createSection completed', { sectionId: sectionData.id });
    return section;
}

// Initialize Quill Editor in expanded file (restored from old-filesjs-reference.bak)
async function initializeEditorJS(file, container = null) {
    // Use provided container or default to file's editorContainer
    const editorContainer = container || file.editorContainer;
    
    if (!editorContainer) {
        console.error('No editor container found on file');
        return;
    }
    
    console.log('Initializing Quill in container:', editorContainer.id || 'dynamic');
    
    // Wait for Quill to be available
    let attempts = 0;
    while (!window.Quill && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.Quill) {
        console.error('Quill not loaded');
        editorContainer.innerHTML = '<div class="editor-error">Editor not available. Please refresh the page.</div>';
        return;
    }
    
    // Clear the container first
    editorContainer.innerHTML = '';
    
    // Create editor div inside the container
    const editorDiv = document.createElement('div');
    editorDiv.id = `quill-${Date.now()}`;
    editorDiv.style.height = '100%';
    editorDiv.style.minHeight = '200px';
    editorContainer.appendChild(editorDiv);
    
    // Initialize Quill according to documentation
    const quill = new Quill(editorDiv, {
        theme: 'snow',
        placeholder: 'Type here...',
        modules: {
            syntax: true,  // Enable syntax highlighting
            clipboard: {
                matchVisual: false  // Strip formatting on paste
            },
            toolbar: {
                container: [
                    // Media and formulas
                    ['link', 'image', 'video', 'formula'],
                    
                    // Headers and blocks
                    [{ 'header': 1 }, { 'header': 2 }, 'blockquote', 'code-block'],
                    
                    // Text formatting
                    ['bold', 'italic', 'underline', 'strike'],
                    
                    // Script
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    
                    // Lists
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    
                    // Alignment
                    [{ 'align': [] }]
                ]
            }
        }
    });
    
    // Restore dark mode state if it was previously enabled
    if (file.darkModeEnabled) {
        const toolbar = file.querySelector('.ql-toolbar');
        const container = file.querySelector('.editor-container');
        const editor = file.querySelector('.ql-editor');
        const expandedContent = file.querySelector('.expanded-file-content');
        const expandedHeader = file.querySelector('.expanded-file-header');
        const expandedMain = file.querySelector('.expanded-file-main');
        
        if (container) container.classList.add('dark-mode');
        if (toolbar) toolbar.classList.add('dark-mode');
        if (editor) editor.classList.add('dark-mode');
        file.classList.add('dark-mode');
        if (expandedContent) expandedContent.classList.add('dark-mode');
        if (expandedHeader) expandedHeader.classList.add('dark-mode');
        if (expandedMain) expandedMain.classList.add('dark-mode');
    }
    
    // Set initial content
    if (file.initialContent?.content) {
        quill.root.innerHTML = file.initialContent.content;
    }
    
    // Store reference
    file.quillEditor = quill;
    
    // Save content on changes
    quill.on('text-change', () => {
        // Check if this editor is in a section
        const section = editorContainer.closest('.file-section');
        
        if (section && section.sectionData) {
            // Update the section data
            section.sectionData.content = {
                content: quill.root.innerHTML
            };
            
            // Save to AppState
            if (file.appStateLocation) {
                const boards = AppState.get('boards');
                const currentBoard_id = AppState.get('currentBoard_id');
                const board = boards.find(b => b.id === currentBoard_id);
                
                if (board && board.folders) {
                    const { folderIndex, fileIndex } = file.appStateLocation;
                    if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                        if (!board.folders[folderIndex].files[fileIndex].sections) {
                            board.folders[folderIndex].files[fileIndex].sections = [];
                        }
                        
                        const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === section.sectionData.id);
                        if (sectionIndex !== -1) {
                            board.folders[folderIndex].files[fileIndex].sections[sectionIndex].content = {
                                content: quill.root.innerHTML
                            };
                        } else {
                            board.folders[folderIndex].files[fileIndex].sections.push({
                                id: section.sectionData.id,
                                title: section.sectionData.title,
                                content: {
                                    content: quill.root.innerHTML
                                },
                                bookmarks: section.sectionData.bookmarks || []
                            });
                        }
                        
                        AppState.set('boards', boards);
                        console.log('🔖 SECTION: Updated AppState with editor content');
                    }
                }
            }
            
            // Save to Firebase
            if (window.syncService) {
                window.syncService.saveAfterAction('section content edited');
            }
        } else {
            // This is the main file editor
            file.initialContent = {
                content: quill.root.innerHTML
            };
        }
    });
    
    console.log('Quill initialized successfully');
}

// Export functions for use in other modules
window.createBookmarkFile = createBookmarkFile;
window.removeBookmark = removeBookmark;
window.reorderBookmark = reorderBookmark;
window.createSection = createSection;
window.initializeEditorJS = initializeEditorJS;
