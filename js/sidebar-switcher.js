/**
 * Sidebar Switcher Functionality
 * Handles switching between different sidebar views (Files, Bookmarks, etc.)
 */

// Sidebar switcher class to manage view switching
class SidebarSwitcher {
    constructor() {
        this.dropdown = document.querySelector('.dropdown-selector');
        this.filesView = document.getElementById('files-view');
        this.bookmarksView = document.getElementById('bookmarks-view');
        this.init();
    }

    init() {
        if (!this.dropdown) {
            console.warn('Sidebar switcher dropdown not found');
            return;
        }

        // Bind the change event
        this.dropdown.addEventListener('change', (event) => {
            this.switchView(event.target.value);
        });

        // Initialize with default view (files)
        this.switchView('files');
    }

    switchView(viewType) {
        // Remove active class from all views
        const allViews = [this.filesView, this.bookmarksView];
        allViews.forEach(view => {
            if (view) {
                view.classList.remove('active');
            }
        });

        // Add active class to the selected view
        switch (viewType) {
            case 'files':
                if (this.filesView) {
                    this.filesView.classList.add('active');
                }
                break;
            case 'bookmarks':
                if (this.bookmarksView) {
                    this.bookmarksView.classList.add('active');
                }
                break;
            default:
                console.warn(`Unknown view type: ${viewType}`);
                break;
        }

        // Store the current view preference (optional - for persistence)
        this.saveViewPreference(viewType);

        console.log(`Switched to ${viewType} view`);
    }

    // Save the user's view preference (for future persistence if needed)
    saveViewPreference(viewType) {
        try {
            localStorage.setItem('sidebar-view-preference', viewType);
        } catch (error) {
            console.warn('Could not save view preference:', error);
        }
    }

    // Get the saved view preference (for future use with persistence)
    getSavedViewPreference() {
        try {
            return localStorage.getItem('sidebar-view-preference') || 'files';
        } catch (error) {
            console.warn('Could not retrieve view preference:', error);
            return 'files';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create sidebar switcher instance
    const sidebarSwitcher = new SidebarSwitcher();

    // If you want to restore the last selected view:
    // const savedView = sidebarSwitcher.getSavedViewPreference();
    // sidebarSwitcher.switchView(savedView);

    console.log('Sidebar switcher initialized');
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarSwitcher;
}
