// File management operations (restored from old-filesjs-reference.bak)

// Create file slot for drag and drop
function createFileSlot() {
    const slot = document.createElement('div');
    slot.className = 'file-slot';
    
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragleave', handleDragLeave);
    
    return slot;
}

// Add file to first folder or create folder if none exist
function addFile() {
    const folders = AppState.get('folders');
    if (folders.length === 0) {
        createFolder();
    }
    return addFileToFolder(0);
}

// Add file to specific folder (restored from old-filesjs-reference.bak)
function addFileToFolder(folderOrIndex, title = 'New File', content = null, bookmarks = null, sections = null) {
    console.log('🔨 ADD FILE DEBUG:', {
        title: title,
        hasContent: !!content,
        hasBookmarks: !!bookmarks,
        bookmarksCount: bookmarks?.length || 0,
        hasSections: !!sections,
        sectionsCount: sections?.length || 0,
        sectionIds: sections?.map(s => s.id) || []
    });
    
    let folder;
    
    // Support both folder element and index
    if (typeof folderOrIndex === 'number') {
        const folders = AppState.get('folders');
        if (folderOrIndex < 0 || folderOrIndex >= folders.length) {
            console.error('Invalid folder index:', folderOrIndex);
            return null;
        }
        folder = folders[folderOrIndex];
    } else {
        // Find folder in AppState by element
        const folders = AppState.get('folders');
        folder = folders.find(cat => cat.element === folderOrIndex);
    }
    
    if (!folder || !folder.element) {
        console.error('Folder not found:', folderOrIndex);
        return null;
    }

    const file = document.createElement('div');
    file.className = 'file';
    file.draggable = true;

    // Generate unique ID for the file
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    file.id = fileId;
    file.dataset.fileId = fileId;

    // Use numbered name if title is the default "New File"
    let finalTitle = title;
    if (title === 'New File') {
        finalTitle = getNewFileName(folder);
        console.log(`🔢 FILE: Generated numbered name: "${finalTitle}" for folder "${folder.element.querySelector('.folder-title')?.textContent}"`);
    }

    // Create container for SVG and title
    const titleContainer = document.createElement('div');
    titleContainer.className = 'file-title-container';

    // Create file icon SVG
    const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fileIcon.className = 'file-title-icon';
    fileIcon.setAttribute('width', '16');
    fileIcon.setAttribute('height', '16');
    fileIcon.setAttribute('viewBox', '0 0 24 24');
    fileIcon.setAttribute('fill', 'currentColor');
    fileIcon.innerHTML = '<path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z" clip-rule="evenodd"/>';

    const fileTitle = document.createElement('div');
    fileTitle.className = 'file-title';
    fileTitle.contentEditable = true;
    fileTitle.autocomplete = 'off';
    fileTitle.autocorrect = 'off';
    fileTitle.autocapitalize = 'off';
    fileTitle.spellcheck = false;

    // Set placeholder directly on the editable element (like section titles)
    fileTitle.textContent = finalTitle;
    fileTitle.dataset.placeholder = finalTitle;

    // Add icon and title to container
    titleContainer.appendChild(fileIcon);
    titleContainer.appendChild(fileTitle);

    // No complex span wrapping - use simple placeholder system like section titles
    fileTitle.addEventListener('focus', function(e) {
        e.stopPropagation();
        if (this.textContent === this.dataset.placeholder) {
            this.textContent = '';
        }
    });

    // Handle paste to strip formatting
    fileTitle.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });

    fileTitle.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = this.dataset.placeholder;
        }
        // Save after editing file title
        if (window.syncService) {
            window.syncService.saveAfterAction('file title edited');
        }
    });

    const fileContent = document.createElement('div');
    fileContent.className = 'file-content';
    fileContent.style.display = 'none'; // Ensure it's hidden by default

    // Create container for Editor.js (will be initialized when expanded)
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';
    editorContainer.id = `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    fileContent.appendChild(editorContainer);
    
    // Store initial content on the file for later use
    file.initialContent = content;
    file.bookmarks = bookmarks || []; // Store bookmarks on file
    file.sections = sections || []; // Store sections on file (from Firebase)
    
    // Debug section restoration
    if (sections && sections.length > 0) {
        console.log(`📦 FILE: Restored file "${title}" with ${sections.length} sections:`);
        sections.forEach((s, i) => {
            console.log(`  📄 Section ${i}: ${s.title} (ID: ${s.id})`);
            if (s.bookmarks && s.bookmarks.length > 0) {
                console.log(`    🔖 Has ${s.bookmarks.length} bookmarks`);
            }
        });
    }
    
    // Debug bookmark restoration
    if (bookmarks && bookmarks.length > 0) {
        console.log(`📚 FILE: Restored file "${title}" with ${bookmarks.length} bookmarks:`);
        bookmarks.forEach((b, i) => console.log(`  📌 Bookmark ${i}: ${b.title}`));
    }
    
    // Store folder reference for when file is expanded
    if (folder.element.id) {
        file.dataset.folderId = folder.element.id;
    } else {
        // Generate ID if folder doesn't have one
        folder.element.id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        file.dataset.folderId = folder.element.id;
    }

    file.appendChild(titleContainer);
    file.appendChild(fileContent);

    const hoverOverlay = document.createElement('div');
    hoverOverlay.className = 'file-hover-overlay';
    hoverOverlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    `;
    hoverOverlay.onclick = (e) => {
        e.stopPropagation();
        expandFile(file);
    };
    file.appendChild(hoverOverlay);

    // Store reference to editor container
    file.editorContainer = editorContainer;

    fileTitle.addEventListener('mousedown', (e) => {
        if (e.target === fileTitle) e.stopPropagation();
    });
    
    editorContainer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    file.addEventListener('dragstart', handleDragStart);
    file.addEventListener('dragend', handleDragEnd);

    const grid = folder.element.querySelector('.files-grid');
    if (!grid) {
        console.error('Files grid not found in folder');
        return;
    }
    const slots = grid.querySelectorAll('.file-slot');
    
    console.log(`Adding file "${title}" to folder "${folder.element.querySelector('.folder-title')?.textContent}"`);
    console.log(`Files grid found:`, grid);
    console.log(`Available slots:`, slots.length);
    
    let filePlaced = false;
    for (let slot of slots) {
        if (!slot.hasChildNodes()) {
            slot.appendChild(file);
            filePlaced = true;
            console.log('File placed in existing slot');
            break;
        }
    }

    if (!filePlaced) {
        const newSlot = createFileSlot();
        grid.appendChild(newSlot);
        newSlot.appendChild(file);
        console.log('File placed in new slot');
    }
    
    // Verify file placement
    const filesInFolder = folder.element.querySelectorAll('.file');
    console.log(`Total files now in folder DOM: ${filesInFolder.length}`);
    filesInFolder.forEach((c, i) => {
        const cTitle = c.querySelector('.file-title')?.textContent;
        console.log(`  File ${i}: "${cTitle}"`);
    });

    // Track the file in the folder with its ID
    folder.files.push(file);
    
    // Store file reference in AppState for bookmark persistence
    const boards = AppState.get('boards');
    const currentBoard_id = AppState.get('currentBoard_id');
    const board = boards.find(b => b.id === currentBoard_id);
    if (board && board.folders) {
        const folderIndex = AppState.get('folders').indexOf(folder);
        if (folderIndex !== -1 && board.folders[folderIndex]) {
            const fileIndex = board.folders[folderIndex].files.length - 1;
            if (fileIndex >= 0 && board.folders[folderIndex].files[fileIndex]) {
                board.folders[folderIndex].files[fileIndex].id = fileId;
    if (!board.folders[folderIndex].files[fileIndex].bookmarks) {
        board.folders[folderIndex].files[fileIndex].bookmarks = [];
    }
            }
        }
    }
    
    // Save after adding file
    if (window.syncService) {
        window.syncService.saveAfterAction('file added');
    }
    
    // Show toggle button and collapse when 5+ files
    const toggleBtn = folder.element.querySelector('.toggle-btn');
    if (folder.files.length >= CONSTANTS.FILES_BEFORE_COLLAPSE) {
        toggleBtn.style.display = 'inline-block';
        
        // Auto-collapse on 5th file
        if (folder.files.length === CONSTANTS.FILES_BEFORE_COLLAPSE) {
            toggleFolder(folder.element);
        }
    }
    
    // Return the created file
    return file;
}

// Delete a file (restored from old-filesjs-reference.bak)
function deleteFile(file) {
    if (!file) return;
    
    const slot = file.parentElement;
    const folderElement = file.closest('.folder');
    
    if (folderElement) {
        const folders = AppState.get('folders');
        const folderIndex = parseInt(folderElement.dataset.folderId);
        const folder = folders[folderIndex];
        
        if (folder) {
            // Remove file from folder's files array
            const fileIndex = folder.files.indexOf(file);
            if (fileIndex > -1) {
                folder.files.splice(fileIndex, 1);
            }
            
            // Check if toggle button should be hidden
            const toggleBtn = folderElement.querySelector('.toggle-btn');
            if (folder.files.length < CONSTANTS.FILES_BEFORE_COLLAPSE) {
                toggleBtn.style.display = 'none';
            }
            
            // Save after deleting file
            if (window.syncService) {
                window.syncService.saveAfterAction('file deleted');
            }
        }
    }
    
    file.remove();
    
    const folder = slot?.closest('.folder');
    if (folder) {
        updateFolderToggle(folder);
    }
}

// Expand a file to show its content (restored from old-filesjs-reference.bak)
function expandFile(file) {
    if (!file) {
        console.error('❌ EXPAND: No file provided to expandFile');
        return;
    }
    
    // When expanding a file, ensure sidebar opens as well
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (sidebarMenu && !sidebarMenu.classList.contains('open')) {
        sidebarMenu.classList.add('open');
        document.body.classList.add('sidebar-open');
    }
    
    console.log('💚 EXPAND: expandFile called');
    console.log('💚 EXPAND: File element:', file);
    console.log('💚 EXPAND: File parent:', file.parentElement);
    console.log('💚 EXPAND: File classes:', file.className);
    console.log('💚 EXPAND: File has required elements:', {
        title: !!file.querySelector('.file-title'),
        content: !!file.querySelector('.file-content'),
        editorContainer: !!(file.querySelector('.editor-container') || file.editorContainer)
    });
    
    // Ensure file is in DOM
    if (!file.parentElement) {
        console.error('❌ EXPAND: File has no parent element, cannot expand');
        return;
    }
    console.log('💚 EXPAND: File is in DOM, proceeding...');
    
    // Find file's location in AppState
    const boards = AppState.get('boards');
    const currentBoard_id = AppState.get('currentBoard_id');
    const board = boards.find(b => b.id === currentBoard_id);
    let fileLocation = null;
    
    if (board && board.folders) {
        // Find this file in the board structure
        const fileTitle = file.querySelector('.file-title')?.textContent;
        const fileId = file.dataset.fileId || file.id;
        
        console.log('🔍 DEBUG: Looking for file in AppState', { fileId, fileTitle });
        
        for (let catIndex = 0; catIndex < board.folders.length; catIndex++) {
            const folder = board.folders[catIndex];
            if (folder.files) {
                for (let fileIndex = 0; fileIndex < folder.files.length; fileIndex++) {
                    const savedFile = folder.files[fileIndex];
                    // Match by ID first, then by title as fallback
                    if ((savedFile.id && savedFile.id === fileId) || savedFile.title === fileTitle) {
                        fileLocation = { folderIndex: catIndex, fileIndex: fileIndex };
                        console.log('🔍 DEBUG: Found file in AppState', { fileLocation });
                        
                        // Restore bookmarks from AppState if missing on DOM
                        if (!file.bookmarks && savedFile.bookmarks) {
                            file.bookmarks = savedFile.bookmarks;
                            console.log(`💚 EXPAND: Restored ${savedFile.bookmarks.length} bookmarks from AppState`);
                        }
                        // Restore sections from AppState if available
                        if (savedFile.sections) {
                            file.sections = savedFile.sections;
                            console.log(`💚 EXPAND: Restored ${savedFile.sections.length} sections from AppState`, {
                                sectionIds: savedFile.sections.map(s => s.id)
                            });
                        }
                        break;
                    }
                }
                if (fileLocation) break;
            }
        }
    }
    
    // Store location for later updates
    file.appStateLocation = fileLocation;
    console.log('💚 EXPAND: File location in AppState:', fileLocation);
    
    // Remove any existing overlays first to prevent stacking
    const existingOverlays = document.querySelectorAll('.expanded-file-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    const expandedFile = AppState.get('expandedFile');
    if (expandedFile && expandedFile !== file) {
        collapseFile(expandedFile);
        AppState.set('expandedFile', null);
    }
    
    // Create overlay with 75% transparency
    const overlay = document.createElement('div');
    overlay.className = 'expanded-file-overlay';
    overlay.onclick = () => {
        // Save before closing
        if (window.syncService) {
            window.syncService.manualSave();
        }
        collapseFile(file);
        AppState.set('expandedFile', null);
    };
    document.body.appendChild(overlay);
    file.overlayElement = overlay;
    
    // Store original position BEFORE moving file
    file.originalParent = file.parentElement;
    file.originalNextSibling = file.nextSibling;
    file.originalSlotIndex = Array.from(file.originalParent.parentElement.children).indexOf(file.originalParent);
    console.log(`💚 EXPAND: File original slot index: ${file.originalSlotIndex}`);
    
    // Ensure file has all required child elements
    if (!file.querySelector('.file-title')) {
        console.error('File missing title element');
        return;
    }
    if (!file.querySelector('.file-content')) {
        console.error('File missing content element');
        return;
    }
    if (!file.editorContainer && !file.querySelector('.editor-container')) {
        console.error('File missing editor container');
        return;
    }
    
    // Clear ALL inline styles that might interfere
    console.log('💚 EXPAND: Clearing inline styles');
    file.style.cssText = '';
    
    // Move to body BEFORE adding expanded class to ensure CSS applies correctly
    console.log('💚 EXPAND: Moving file to document.body');
    document.body.appendChild(file);
    console.log('💚 EXPAND: File moved, new parent:', file.parentElement);
    
    // Force browser to recalculate styles before adding expanded class
    file.offsetHeight; // Force reflow
    console.log('💚 EXPAND: Forced reflow complete');
    
    // Use requestAnimationFrame to ensure DOM is ready before applying styles and building content
    console.log('💚 EXPAND: Calling requestAnimationFrame...');
    requestAnimationFrame(() => {
        console.log('💚 EXPAND: Inside requestAnimationFrame callback');
        console.log('💚 EXPAND: Adding expanded class');
        file.classList.add('expanded');
        if (file.darkModeEnabled) file.classList.add('dark-mode');
        file.draggable = false;
        AppState.set('expandedFile', file);
        console.log('💚 EXPAND: File classes after expansion:', file.className);
        
        console.log('💚 EXPAND: Initializing Editor.js...');
        // Initialize Editor.js in expanded mode
        initializeEditorJS(file);
        
        // Remove any existing expanded content first
        const existingWrapper = file.querySelector('.expanded-file-content');
        if (existingWrapper) {
            console.log('💚 EXPAND: Removing existing wrapper');
            existingWrapper.remove();
        }
        
        console.log('💚 EXPAND: Creating new wrapper');
        const wrapper = document.createElement('div');
        wrapper.className = 'expanded-file-content';
        if (file.darkModeEnabled) wrapper.classList.add('dark-mode');
        
        console.log('💚 EXPAND: Building button row...');
        
        // Restore sections from file data when expanding
        if (file.sections && file.sections.length > 0) {
            console.log('💚 EXPAND: Restoring sections from file data', {
                sectionsCount: file.sections.length,
                sectionIds: file.sections.map(s => s.id)
            });
        }
    // Create button row at top
    const buttonRow = document.createElement('div');
    buttonRow.className = 'expanded-file-buttons';
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'header-buttons';
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-file-btn';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = async (e) => {
        e.stopPropagation();
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Saving...
        `;
        
        // Save Quill content to file's initialContent
        if (file.quillEditor) {
            file.initialContent = {
                content: file.quillEditor.root.innerHTML
            };
        }
        
        if (window.syncService) {
            window.syncService.isManualSave = true;
            await window.syncService.manualSave();
        }
        
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save
            `;
        }, 1000);
    };
    
    // Dark mode toggle button (moon icon)
    const darkModeBtn = document.createElement('button');
    darkModeBtn.className = 'dark-mode-toggle';
    darkModeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    darkModeBtn.title = 'Toggle dark mode';
    
    darkModeBtn.onclick = (e) => {
        e.stopPropagation();
        const containers = file.querySelectorAll('.editor-container');
        const toolbars = file.querySelectorAll('.ql-toolbar');
        const editors = file.querySelectorAll('.ql-editor');
        const expandedContent = file.querySelector('.expanded-file-content');
        const expandedHeader = file.querySelector('.expanded-file-header');
        const expandedMain = file.querySelector('.expanded-file-main');
        
        if (file.darkModeEnabled) {
            // Disable dark mode
            containers.forEach(c => c.classList.remove('dark-mode'));
            toolbars.forEach(t => t.classList.remove('dark-mode'));
            editors.forEach(e => e.classList.remove('dark-mode'));
            file.classList.remove('dark-mode');
            if (expandedContent) expandedContent.classList.remove('dark-mode');
            if (expandedHeader) expandedHeader.classList.remove('dark-mode');
            if (expandedMain) expandedMain.classList.remove('dark-mode');
            file.darkModeEnabled = false;
            darkModeBtn.classList.remove('active');
        } else {
            // Enable dark mode
            containers.forEach(c => c.classList.add('dark-mode'));
            toolbars.forEach(t => t.classList.add('dark-mode'));
            editors.forEach(e => e.classList.add('dark-mode'));
            file.classList.add('dark-mode');
            if (expandedContent) expandedContent.classList.add('dark-mode');
            if (expandedHeader) expandedHeader.classList.add('dark-mode');
            if (expandedMain) expandedMain.classList.add('dark-mode');
            file.darkModeEnabled = true;
            darkModeBtn.classList.add('active');
        }
    };
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-file-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog(
            'Remove File',
            `Are you sure you want to remove "${getFileTitleText(file)}"?`,
            () => {
                collapseFile(file);
                deleteFile(file);
            }
        );
    };
    
    buttonContainer.appendChild(darkModeBtn);
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(deleteBtn);
    buttonRow.appendChild(buttonContainer);
    
        // Create header section with title and featured image
        const header = document.createElement('div');
        header.className = 'expanded-file-header';
        if (file.darkModeEnabled) header.classList.add('dark-mode');
        
        // Create featured image container
        const featuredImageContainer = document.createElement('div');
        featuredImageContainer.className = 'featured-image-container';
        
        // Check if file has bookmarks and extract first image
        let firstBookmarkImage = null;
        if (file.sections && file.sections.length > 0) {
            // Look through sections for the first bookmark with an image
            for (const section of file.sections) {
                if (section.bookmarks && section.bookmarks.length > 0) {
                    const firstBookmarkWithImage = section.bookmarks.find(bookmark => 
                        bookmark.screenshot || bookmark.image
                    );
                    if (firstBookmarkWithImage) {
                        firstBookmarkImage = firstBookmarkWithImage.screenshot || firstBookmarkWithImage.image;
                        break;
                    }
                }
            }
        }
        
        // Create featured image element if we found one
        if (firstBookmarkImage) {
            const featuredImage = document.createElement('div');
            featuredImage.className = 'featured-image';
            featuredImage.style.backgroundImage = `url('${firstBookmarkImage}')`;
            featuredImageContainer.appendChild(featuredImage);
        }
        
        // Create a container for the title and image to align them properly
        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';
        headerContent.style.display = 'flex';
        headerContent.style.alignItems = 'center';
        
        // Move title to header
        const fileTitle = file.querySelector('.file-title');
        if (fileTitle) {
            // Ensure autocorrect is disabled on expanded title as well
            fileTitle.autocomplete = 'off';
            fileTitle.autocorrect = 'off';
            fileTitle.autocapitalize = 'off';
            fileTitle.spellcheck = false;
            headerContent.appendChild(featuredImageContainer);
            headerContent.appendChild(fileTitle);
            header.appendChild(headerContent);
        }
    
    // Add empty spacer div (25% width)
    const spacer = document.createElement('div');
    spacer.className = 'header-spacer';
    header.appendChild(spacer);
    
    // Create main content area with flex layout
    const mainContent = document.createElement('div');
    mainContent.className = 'expanded-file-main';
    mainContent.setAttribute('data-lenis-prevent', '');
    if (file.darkModeEnabled) mainContent.classList.add('dark-mode');
    
    console.log('🔍 DEBUG: Checking for existing sections in DOM', { 
        existingSectionsCount: file.querySelectorAll('.file-section').length 
    });
    
    // Check if sections already exist in the DOM to prevent duplicates
    const existingSections = file.querySelectorAll('.file-section');
    if (existingSections.length > 0) {
        console.log('🔍 DEBUG: Found existing sections in DOM, moving them to main content');
        // Sections already exist in DOM, move them to main content
        existingSections.forEach(section => {
            mainContent.appendChild(section);
        });
    } else {
        console.log('🔍 DEBUG: No existing sections in DOM, creating from file data', {
            fileSectionsCount: file.sections ? file.sections.length : 0
        });
        // Create sections from file data, but first check if sections already exist in DOM
        // to prevent duplication from Firebase sync
        if (file.sections && file.sections.length > 0) {
            console.log('🔍 DEBUG: Creating sections from saved data', {
                savedSectionsCount: file.sections.length,
                sectionIds: file.sections.map(s => s.id)
            });
        // Create sections from saved data
        file.sections.forEach((sectionData, index) => {
            console.log('🔍 DEBUG: Processing saved section data', { 
                index, 
                sectionId: sectionData.id,
                sectionTitle: sectionData.title,
                bookmarksCount: sectionData.bookmarks?.length || 0
            });
            
            // Check if a section with this ID already exists in DOM
            const existingSection = Array.from(mainContent.querySelectorAll('.file-section')).find(section => {
                return section.sectionData && section.sectionData.id === sectionData.id;
            });
            
            if (!existingSection) {
                // Check if this section already exists in the file's sections array with an element
                const sectionInFileArray = file.sections.find(s => s.id === sectionData.id && s.element);
                if (sectionInFileArray) {
                    console.log('🔍 DEBUG: Section already exists in file array with element, adding to DOM', { sectionId: sectionData.id });
                    mainContent.appendChild(sectionInFileArray.element);
                } else {
                    console.log('🔍 DEBUG: Creating new section from saved data', { sectionId: sectionData.id });
                    // Pass the existing section ID to createSection to prevent duplication
                    const section = createSection(file, sectionData.bookmarks, sectionData.id);
                    // Update section title
                    const sectionTitle = section.querySelector('.section-title');
                    if (sectionTitle) {
                        sectionTitle.textContent = sectionData.title;
                    }
                    // Update section content if it exists
                    if (sectionData.content && sectionData.content.content) {
                        // Initialize editor first
                        setTimeout(() => {
                            if (section.sectionData && section.sectionData.element) {
                                const editorContainer = section.sectionData.element.querySelector('.editor-container');
                                if (editorContainer && section.sectionData.element.quillEditor) {
                                    section.sectionData.element.quillEditor.root.innerHTML = sectionData.content.content;
                                }
                            }
                        }, 0);
                    }
                    mainContent.appendChild(section);
                }
            } else {
                console.log('🔍 DEBUG: Section already exists in DOM, skipping creation', { sectionId: sectionData.id });
                mainContent.appendChild(existingSection);
            }
        });
        } else {
            console.log('🔍 DEBUG: Creating first section with editor and bookmarks', {
                bookmarksCount: file.bookmarks?.length || 0
            });
            // Check if first section already exists
            const firstSectionExists = mainContent.querySelector('.file-section') || 
                                     (file.sections && file.sections.length > 0 && file.sections[0].element);
            if (!firstSectionExists) {
                // Create first section with editor and bookmarks
                const firstSection = createSection(file, file.bookmarks);
                mainContent.appendChild(firstSection);
            } else {
                console.log('🔍 DEBUG: First section already exists, skipping creation');
            }
        }
    }
    
    // Create add section button container
    const addSectionContainer = document.createElement('div');
    addSectionContainer.className = 'add-section-container';
    
    // Create add section button
    const addSectionBtn = document.createElement('button');
    addSectionBtn.className = 'add-section-btn';
    addSectionBtn.textContent = 'Add Section';
    
    // Add click handler to create new section
    addSectionBtn.onclick = () => {
        console.log('🔍 DEBUG: Add section button clicked');
        const newSection = createSection(file, []);
        mainContent.insertBefore(newSection, addSectionContainer);
        console.log('🔍 DEBUG: New section added to DOM', { 
            sectionId: newSection.sectionData?.id,
            sectionsInFile: file.sections?.length
        });
        
        // Save to Firebase before reinitializing Lenis
        if (window.syncService) {
            window.syncService.saveAfterAction('section added').then(() => {
                // Reinitialize modal Lenis to account for new content after save
                reinitializeModalLenis(file);
            });
        } else {
            // Reinitialize modal Lenis to account for new content
            reinitializeModalLenis(file);
        }
    };
    
    // Add the button to container and container to main content
    addSectionContainer.appendChild(addSectionBtn);
    mainContent.appendChild(addSectionContainer);
    
    console.log('💚 EXPAND: Assembling wrapper components...');
    wrapper.appendChild(buttonRow);
    // Move header inside main content so it scrolls with the page
    mainContent.insertBefore(header, mainContent.firstChild);
    wrapper.appendChild(mainContent);
    console.log('💚 EXPAND: Appending wrapper to file');
    file.appendChild(wrapper);

    // Initialize Lenis smooth scroll specifically for this modal
    const modalWrapper = file.querySelector('.expanded-file-main');
    const modalContent = file.querySelector('.expanded-file-content');
    if (modalWrapper && modalContent) {
        // Ensure the wrapper has the correct CSS properties for scrolling
        modalWrapper.style.overflow = 'auto';
        modalWrapper.style.height = '100%';
        
        const modalLenis = new Lenis({
            wrapper: modalWrapper,
            content: modalContent,
            lerp: 0.1,
            duration: 1.2,
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.2,
        });
        
        // Force an initial scroll update
        modalLenis.resize();
        
        function rafModal(time) {
            if (!modalWrapper.isConnected) return; // stop when modal closed
            modalLenis.raf(time);
            requestAnimationFrame(rafModal);
        }
        requestAnimationFrame(rafModal);
        file.modalLenis = modalLenis;
        
        // Add classes to indicate smooth scrolling is active
        modalWrapper.classList.add('lenis', 'lenis-smooth');
    }

    console.log('💚 EXPAND: ✅ File expansion complete!');
    console.log('💚 EXPAND: Final file structure:', {
        hasWrapper: !!file.querySelector('.expanded-file-content'),
        hasButtons: !!file.querySelector('.expanded-file-buttons'),
        hasHeader: !!file.querySelector('.expanded-file-header'),
        hasMain: !!file.querySelector('.expanded-file-main'),
        fileClasses: file.className,
        fileParent: file.parentElement?.tagName
    });
    });
}

// Collapse an expanded file (restored from old-filesjs-reference.bak)
function collapseFile(file) {
    if (!file || !file.classList.contains('expanded')) return;
    
    console.log('🔍 DEBUG: collapseFile called', { fileId: file.id });
    
    // Clean up any sections from file-content to prevent them showing in minimized state
    const fileContent = file.querySelector('.file-content');
    if (fileContent) {
        // Remove any sections that might have been added
        const sections = fileContent.querySelectorAll('.file-section');
        sections.forEach(section => section.remove());
        
        // Ensure file-content is empty and hidden
        fileContent.innerHTML = '';
        fileContent.style.display = 'none';
    }
    
    // Save sections data before collapsing
    if (file.sections && file.appStateLocation) {
        console.log('🔍 DEBUG: Saving sections data before collapse', { 
            sectionsCount: file.sections.length,
            sectionIds: file.sections.map(s => s.id)
        });
        const boards = AppState.get('boards');
        const currentBoard_id = AppState.get('currentBoard_id');
        const board = boards.find(b => b.id === currentBoard_id);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = file.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                // Initialize sections array if it doesn't exist
                if (!board.folders[folderIndex].files[fileIndex].sections) {
                    board.folders[folderIndex].files[fileIndex].sections = [];
                    console.log('🔍 DEBUG: Initialized sections array in AppState');
                }
                
                console.log('🔍 DEBUG: Before updating board sections', {
                    boardSectionsCount: board.folders[folderIndex].files[fileIndex].sections.length,
                    sectionIds: board.folders[folderIndex].files[fileIndex].sections.map(s => s.id)
                });
                
                // Update sections in board data
                file.sections.forEach(sectionData => {
                    console.log('🔍 DEBUG: Processing section for board save', { sectionId: sectionData.id });
                    // Find existing section or add new one
                    const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                    if (sectionIndex !== -1) {
                        // Update existing section
                        board.folders[folderIndex].files[fileIndex].sections[sectionIndex] = {
                            id: sectionData.id,
                            title: sectionData.title,
                            content: sectionData.content,
                            bookmarks: sectionData.bookmarks
                        };
                        console.log('🔍 DEBUG: Updated existing section in board data', { sectionId: sectionData.id });
                    } else {
                        // Add new section
                        board.folders[folderIndex].files[fileIndex].sections.push({
                            id: sectionData.id,
                            title: sectionData.title,
                            content: sectionData.content,
                            bookmarks: sectionData.bookmarks
                        });
                        console.log('🔍 DEBUG: Added new section to board data', { sectionId: sectionData.id });
                    }
                });
                
                console.log('🔍 DEBUG: After updating board sections', {
                    boardSectionsCount: board.folders[folderIndex].files[fileIndex].sections.length,
                    sectionIds: board.folders[folderIndex].files[fileIndex].sections.map(s => s.id)
                });
                
                AppState.set('boards', boards);
                console.log('🔖 SECTION: Saved sections to AppState before collapse', {
                    totalBoardSections: board.folders[folderIndex].files[fileIndex].sections.length
                });
            }
        }
    }
    
    // Wait for any pending saves
    if (window.syncService && window.syncService.isSaving) {
        setTimeout(() => collapseFile(file), 100);
        return;
    }
    
    // Remove overlay
    if (file.overlayElement) {
        file.overlayElement.remove();
        file.overlayElement = null;
    }
    
    // Remove any orphaned overlays
    const overlays = document.querySelectorAll('.expanded-file-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    file.classList.remove('expanded');
    file.draggable = true;
    file.style.position = '';
    file.style.width = '';
    file.style.height = '';
    file.style.left = '';
    file.style.top = '';
    file.style.transform = '';
    file.style.zIndex = '';
    
    // Destroy Quill instance when collapsing
    if (file.quillEditor) {
        file.quillEditor = null;
    }
    
    // Restore original file structure
    const expandedWrapper = file.querySelector('.expanded-file-content');
    if (expandedWrapper) {
        // Get the title from header and restore it to file
        const titleInHeader = expandedWrapper.querySelector('.expanded-file-header .file-title');
        if (titleInHeader) {
            // Find or recreate the title container to maintain flex column layout
            let titleContainer = file.querySelector('.file-title-container');
            
            if (!titleContainer) {
                // Recreate the title container if it's missing
                titleContainer = document.createElement('div');
                titleContainer.className = 'file-title-container';
                
                // Recreate the file icon SVG
                const fileIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                fileIcon.className = 'file-title-icon';
                fileIcon.setAttribute('width', '16');
                fileIcon.setAttribute('height', '16');
                fileIcon.setAttribute('viewBox', '0 0 24 24');
                fileIcon.setAttribute('fill', 'currentColor');
                fileIcon.innerHTML = '<path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-7Z" clip-rule="evenodd"/>';
                
                titleContainer.appendChild(fileIcon);
                
                // Find where to insert the container (before file-content and hover-overlay)
                const fileContent = file.querySelector('.file-content');
                const hoverOverlay = file.querySelector('.file-hover-overlay');
                
                if (hoverOverlay) {
                    file.insertBefore(titleContainer, hoverOverlay);
                } else if (fileContent) {
                    file.insertBefore(titleContainer, fileContent);
                } else {
                    file.appendChild(titleContainer);
                }
            }
            
            // Add the title back to the container (after the icon)
            titleContainer.appendChild(titleInHeader);
        }
        
        // Remove the entire expanded wrapper and its contents
        expandedWrapper.remove();
    }
    
    // Don't set maxWidth inline - let CSS handle it
    // file.style.maxWidth = CONSTANTS.FILE_MAX_WIDTH;
    
    // Ensure original parent still exists and is in the DOM
    if (file.originalParent && file.originalParent.isConnected) {
        try {
            if (file.originalNextSibling && file.originalNextSibling.parentElement === file.originalParent) {
                file.originalParent.insertBefore(file, file.originalNextSibling);
            } else {
                file.originalParent.appendChild(file);
            }
        } catch (error) {
            console.error('Error restoring file position:', error);
            // Find a safe place for the file
            const folders = document.querySelectorAll('.folder');
            if (folders.length > 0) {
                const firstFolderGrid = folders[0].querySelector('.files-grid');
                const emptySlot = firstFolderGrid.querySelector('.file-slot:empty');
                if (emptySlot) {
                    emptySlot.appendChild(file);
                } else {
                    const newSlot = createFileSlot();
                    firstFolderGrid.appendChild(newSlot);
                    newSlot.appendChild(file);
                }
            }
        }
    } else {
        // File has no valid original parent - find first empty slot
        const emptySlot = document.querySelector('.file-slot:empty');
        if (emptySlot) {
            emptySlot.appendChild(file);
        } else {
            // Create new slot in first folder
            const firstFolder = document.querySelector('.folder');
            if (firstFolder) {
                const grid = firstFolder.querySelector('.files-grid');
                const newSlot = createFileSlot();
                grid.appendChild(newSlot);
                newSlot.appendChild(file);
            } else {
                // No folders exist - remove file from DOM
                file.remove();
            }
        }
    }
    
    // Destroy modal Lenis instance if exists
    if (file.modalLenis) {
        file.modalLenis.destroy();
        file.modalLenis = null;
    }

    // Clear original parent references
    file.originalParent = null;
    file.originalNextSibling = null;
}

// Export functions for use in other modules
window.createFileSlot = createFileSlot;
window.addFile = addFile;
window.addFileToFolder = addFileToFolder;
window.deleteFile = deleteFile;
window.collapseFile = collapseFile;
window.expandFile = expandFile;
