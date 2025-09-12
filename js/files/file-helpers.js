// Helper functions for file operations

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

// Function to create bullet item for lists
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

// Function to handle bullet keydown events
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

// Function to get current indent level for bullet lists
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

// Make functions globally available
window.getFileTitleText = getFileTitleText;
window.getNewSectionNumber = getNewSectionNumber;
window.getNewFileName = getNewFileName;
window.createBulletItem = createBulletItem;
window.handleBulletKeydown = handleBulletKeydown;
window.getCurrentIndent = getCurrentIndent;
window.reinitializeModalLenis = reinitializeModalLenis;
