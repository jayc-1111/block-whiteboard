// Helper function to get file title text
function getFileTitleText(file) {
    const fileTitle = file.querySelector('.file-title');
    if (!fileTitle) return '';

    // Use the text content based on placeholder logic
    const textContent = fileTitle.textContent;
    if (textContent && fileTitle.dataset.placeholder) {
        // If content matches placeholder, return it as is
        // Otherwise return the current text content
        return textContent === fileTitle.dataset.placeholder && textContent.trim() === '' ? '' : textContent;
    }

    return textContent;
}

// Helper function to get the next section number for a file
function getNewSectionNumber(file) {
    // Count existing sections with titles starting with "New Section"
    const existingSections = file.querySelectorAll('.section-title');
    let maxNumber = 0;

    existingSections.forEach(section => {
        const text = section.textContent || section.dataset.placeholder;
        if (text && text.startsWith('New Section')) {
            if (text === 'New Section') {
                // This is the first section
                maxNumber = Math.max(maxNumber, 1);
            } else {
                // Extract number from "New Section X"
                const match = text.match(/^New Section (\d+)$/);
                if (match) {
                    const number = parseInt(match[1]);
                    maxNumber = Math.max(maxNumber, number);
                }
            }
        }
    });

    // Return the next number
    return maxNumber + 1;
}

// Helper function to generate unique numbered file name for a folder
function getNewFileName(folder) {
    const baseName = 'New File';

    // Get all existing files in this folder
    const existingFiles = folder.files || [];

    // Extract titles from existing files and find numeric variants
    let maxNumber = 0;

    existingFiles.forEach(file => {
        if (file.element) {
            // Get title from DOM element
            const fileTitle = file.element.querySelector('.file-title');
            let title = '';
            if (fileTitle) {
                // Use the direct text content like the new implementation
                title = fileTitle.textContent.trim();
            }

            if (title) {
                if (title === baseName) {
                    // Exact match - this is the first numbered file
                    maxNumber = Math.max(maxNumber, 1);
                } else {
                    // Check for numbered variants like "New File 2", "New File 3", etc.
                    const match = title.match(new RegExp(`^${baseName} (\\d+)$`));
                    if (match) {
                        const number = parseInt(match[1]);
                        maxNumber = Math.max(maxNumber, number);
                    }
                }
            }
        }
    });

    // Return the appropriate file name
    if (maxNumber === 0) {
        return baseName; // First file: "New File"
    } else {
        return `${baseName} ${maxNumber + 1}`; // Subsequent files: "New File 2", etc.
    }
}

// File management
function createFileSlot() {
    const slot = document.createElement('div');
    slot.className = 'file-slot';
    
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragleave', handleDragLeave);
    
    return slot;
}

function addFile() {
    const folders = AppState.get('folders');
    if (folders.length === 0) {
        createFolder();
    }
    addFileToFolder(0);
}

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
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards.find(b => b.id === currentBoardId);
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
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards.find(b => b.id === currentBoardId);
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

    // Create bookmark file element
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
                        const currentBoardId = AppState.get('currentBoardId');
                        const board = boards.find(b => b.id === currentBoardId);

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

// Function to remove a bookmark
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
                const currentBoardId = AppState.get('currentBoardId');
                const board = boards.find(b => b.id === currentBoardId);
                
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

// Function to reorder bookmarks
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
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
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
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
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

function createBulletItem(list, text = '', indent = 0) {
    const li = document.createElement('li');
    li.className = `bullet-item indent-${Math.min(indent, CONSTANTS.MAX_INDENT_LEVEL)}`;
    
    const content = document.createElement('div');
    content.className = 'bullet-content';
    content.contentEditable = true;
    content.textContent = text;
    content.autocomplete = 'off';
    content.autocorrect = 'off';
    content.autocapitalize = 'off';
    content.spellcheck = false;
    
    if (text) {
        content.dataset.placeholder = text;
        content.dataset.isPlaceholder = 'true';
    }
    
    content.addEventListener('focus', function() {
        if (this.dataset.isPlaceholder === 'true' && this.textContent === this.dataset.placeholder) {
            this.textContent = '';
            this.dataset.isPlaceholder = 'false';
        }
    });
    
    content.addEventListener('blur', function() {
        if (this.textContent.trim() === '' && this.dataset.placeholder) {
            this.textContent = this.dataset.placeholder;
            this.dataset.isPlaceholder = 'true';
        }
    });
    
    li.appendChild(content);
    list.appendChild(li);
    
    return li;
}

function handleBulletKeydown(e) {
    const content = e.target;
    if (!content.classList.contains('bullet-content')) return;

    const li = content.parentElement;
    const list = li.parentElement;

    if (e.key === 'Enter') {
        e.preventDefault();
        const newLi = createBulletItem(list, '', getCurrentIndent(li));
        li.after(newLi);
        newLi.querySelector('.bullet-content').focus();
    } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            const currentIndent = getCurrentIndent(li);
            if (currentIndent > 0) {
                li.className = `bullet-item indent-${currentIndent - 1}`;
            }
        } else {
            const currentIndent = getCurrentIndent(li);
            if (currentIndent < CONSTANTS.MAX_INDENT_LEVEL) {
                li.className = `bullet-item indent-${currentIndent + 1}`;
            }
        }
    } else if (e.key === 'Backspace' && content.textContent === '') {
        e.preventDefault();
        const prevLi = li.previousElementSibling;
        if (prevLi) {
            li.remove();
            prevLi.querySelector('.bullet-content').focus();
        }
    }
}

function getCurrentIndent(li) {
    const match = li.className.match(/indent-(\d)/);
    return match ? parseInt(match[1]) : 0;
}

// Function to reinitialize modal Lenis for smooth scrolling
function reinitializeModalLenis(file) {
    console.log('🔄 LENIS DEBUG: reinitializeModalLenis called', {
        fileId: file.id,
        hasSections: !!file.sections,
        sectionsCount: file.sections?.length || 0,
        timestamp: new Date().toISOString()
    });
    
    // CRITICAL: Store sections before destroying Lenis
    const sectionsBackup = file.sections ? JSON.parse(JSON.stringify(file.sections)) : null;
    console.log('🔄 LENIS DEBUG: Backed up sections', {
        backedUp: !!sectionsBackup,
        count: sectionsBackup?.length || 0
    });
    
    // Destroy existing modal Lenis instance if it exists
    if (file.modalLenis) {
        file.modalLenis.destroy();
        file.modalLenis = null;
    }
    
    // CRITICAL: Restore sections after destroying Lenis
    if (sectionsBackup && (!file.sections || file.sections.length === 0)) {
        file.sections = sectionsBackup;
        console.log('🔄 LENIS DEBUG: Restored sections after Lenis destroy', {
            count: file.sections.length
        });
    }
    
    // Initialize new Lenis instance for the modal
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
        
        console.log('🔄 LENIS DEBUG: Lenis reinitialized', {
            fileId: file.id,
            sectionsAfter: file.sections?.length || 0
        });
    }
}

// Handle bookmark data from Firefox extension
window.handleBookmarkData = function(data) {
    console.log('🔖 BOOKMARK: Received bookmark data from extension:', data);
    
    // NOTE: This function is now overridden in bookmark-destination-selector.js
    // to show the modal with section selection. This is kept as a fallback.
    
    // Get the currently expanded file
    const expandedFile = AppState.get('expandedFile');
    if (!expandedFile) {
        console.error('❌ BOOKMARK: No expanded file to add bookmark to');
        // Show destination selector instead
        if (window.showBookmarkDestination) {
            window.showBookmarkDestination(data);
        } else {
            // Could show a notification to user
            if (window.simpleNotifications) {
                window.simpleNotifications.showNotification('Please open a file first to add bookmarks', 'error');
            }
        }
        return;
    }
    
    // Get the first section by default (modal should override this)
    const activeSection = expandedFile.querySelector('.file-section:first-child');
    
    if (!activeSection) {
        console.error('❌ BOOKMARK: No section found');
        return;
    }
    
    // Get the section data
    const sectionData = activeSection.sectionData;
    if (!sectionData) {
        console.error('❌ BOOKMARK: No section data found');
        return;
    }
    
    // Initialize bookmarks array for this section if it doesn't exist
    if (!sectionData.bookmarks) {
        sectionData.bookmarks = [];
    }
    
    // Add the new bookmark
    const bookmark = {
        title: data.title || 'Untitled',
        url: data.url || '',
        description: data.description || data.url || '',
        screenshot: data.screenshot || data.image || null,
        timestamp: data.timestamp || new Date().toISOString(),
        id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    sectionData.bookmarks.push(bookmark);
    console.log('🔖 BOOKMARK: Added bookmark to section:', bookmark.title);
    
    // Update AppState immediately
    if (expandedFile.appStateLocation) {
        const boards = AppState.get('boards');
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
        if (board && board.folders) {
            const { folderIndex, fileIndex } = expandedFile.appStateLocation;
            if (board.folders[folderIndex] && board.folders[folderIndex].files[fileIndex]) {
                // Find the section in the board data
                if (!board.folders[folderIndex].files[fileIndex].sections) {
                    board.folders[folderIndex].files[fileIndex].sections = [];
                }
                
                const sectionIndex = board.folders[folderIndex].files[fileIndex].sections.findIndex(s => s.id === sectionData.id);
                if (sectionIndex !== -1) {
                    board.folders[folderIndex].files[fileIndex].sections[sectionIndex].bookmarks = [...sectionData.bookmarks];
                } else {
                    board.folders[folderIndex].files[fileIndex].sections.push({
                        id: sectionData.id,
                        title: sectionData.title,
                        content: sectionData.content,
                        bookmarks: [...sectionData.bookmarks]
                    });
                }
                
                AppState.set('boards', boards);
                console.log('🔖 BOOKMARK: Updated AppState with new bookmark');
            }
        }
    }
    
    // Update the bookmarks section if file is expanded
    const bookmarksSection = activeSection.querySelector('.section-bookmarks');
    if (bookmarksSection) {
        // Remove placeholder if it exists
        const placeholders = bookmarksSection.querySelectorAll('.bookmark-file');
        placeholders.forEach(p => {
            if (p.textContent.includes('Example Bookmark')) {
                p.remove();
            }
        });
        
        // Add the new bookmark file with proper index
        const bookmarkFile = createBookmarkFile(
            bookmark.title,
            bookmark.description,
            bookmark.url,
            bookmark.timestamp,
            bookmark.screenshot,
            sectionData.bookmarks.length - 1,  // New bookmark is at the end
            expandedFile,
            activeSection  // Pass the section element
        );
        bookmarksSection.appendChild(bookmarkFile);
        console.log('🔖 BOOKMARK: Updated UI with new bookmark');
        
        // Reinitialize modal Lenis to account for new content
        reinitializeModalLenis(expandedFile);
    }
    
// Save to Firebase
    if (window.syncService) {
        window.syncService.saveAfterAction('bookmark added');
    }
    
    // Show success notification
    if (window.simpleNotifications) {
        window.simpleNotifications.showNotification(`Bookmark added: ${bookmark.title}`);
    }
};

// Ensure processBookmarkOnce exists
window.processBookmarkOnce = function(data) {
    console.log('🔌 EXTENSION: processBookmarkOnce called with:', data);
    if (window.handleBookmarkData) {
        window.handleBookmarkData(data);
    } else {
        console.error('🔌 EXTENSION: handleBookmarkData not found!');
    }
};

// Listen for direct postMessage as backup
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'BOOKMARK_SCREENSHOT_READY') {
        console.log('🔌 EXTENSION: Received bookmark via postMessage:', event.data.payload);
        if (window.handleBookmarkData) {
            window.handleBookmarkData(event.data.payload);
        }
    }
});

// Expose functions globally for file tree integration
window.expandFile = expandFile;
window.addFileToFolder = addFileToFolder;
// window.createFolder is exposed in folders.js

// Debug injection for extension
window.extensionDebug = true;
console.log('🔌 EXTENSION: Block Whiteboard ready for bookmarks');
console.log('🔌 EXTENSION: processBookmarkOnce available:', typeof window.processBookmarkOnce);
console.log('🔌 EXTENSION: handleBookmarkData available:', typeof window.handleBookmarkData);

// Create a section with editor and bookmarks
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
        const currentBoardId = AppState.get('currentBoardId');
        const board = boards.find(b => b.id === currentBoardId);
        
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
            const currentBoardId = AppState.get('currentBoardId');
            const board = boards.find(b => b.id === currentBoardId);
            
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

// Initialize Quill Editor in expanded file
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
                const currentBoardId = AppState.get('currentBoardId');
                const board = boards.find(b => b.id === currentBoardId);
                
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
