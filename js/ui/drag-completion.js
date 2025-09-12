/**
 * Drag Completion Service
 * 
 * A centralized service to handle drag operation completion with proper timing
 * and integration with smooth scrolling systems. This replaces arbitrary setTimeout delays
 * with proper transition detection and debounced saves.
 */

class DragCompletionService {
    constructor() {
        this.isDragging = false;
        this.pendingSaves = new Map(); // Track pending saves by drag type
        this.saveDebounceTimers = new Map(); // Track debounce timers
        this.transitionTimers = new Map(); // Track CSS transition timers
        
        // Configuration
        this.config = {
            // Maximum time to wait for CSS transitions to complete
            maxTransitionWait: 1000,
            // Debounce delay for rapid successive saves
            saveDebounceDelay: 200,
            // Time to wait after scroll completes before saving
            scrollBufferTime: 50,
            // Visual feedback duration
            feedbackDuration: 1000
        };
        
        // Bind methods
        this.handleTransitionEnd = this.handleTransitionEnd.bind(this);
        this.handleScrollEnd = this.handleScrollEnd.bind(this);
    }
    
    /**
     * Initialize the service and bind to smooth scroll system
     */
    initialize() {
        console.log('🎯 Initializing DragCompletionService');
        
        // Bind to Lenis scroll events if available
        if (window.smoothScroll && window.smoothScroll.lenis) {
            this.lenis = window.smoothScroll.lenis;
            this.setupScrollListeners();
        }
        
        // Monitor CSS transitions
        this.setupTransitionListeners();
    }
    
    /**
     * Setup scroll listeners for Lenis integration
     */
    setupScrollListeners() {
        if (!this.lenis) return;
        
        // Store original scroll method to detect when scrolling stops
        const originalScroll = this.lenis.scrollTo;
        let scrollTimeout = null;
        
        this.lenis.scrollTo = (x, y, duration = 0, options = {}) => {
            // Clear any existing timeout
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            // Call original scroll
            const result = originalScroll.call(this.lenis, x, y, duration, options);
            
            // Set timeout to detect scroll end
            scrollTimeout = setTimeout(() => {
                this.handleScrollEnd();
            }, duration + this.config.scrollBufferTime);
            
            return result;
        };
    }
    
    /**
     * Setup CSS transition listeners
     */
    setupTransitionListeners() {
        // Use passive event listener for better performance
        document.addEventListener('transitionend', this.handleTransitionEnd, { passive: true });
    }
    
    /**
     * Start a drag operation
     */
    startDrag(dragType, element) {
        console.log(`🚀 Starting drag: ${dragType}`, element);
        
        this.isDragging = true;
        this.currentDragType = dragType;
        this.currentDragElement = element;
        
        // Clear any pending saves for this type
        this.cancelPendingSave(dragType);
        
        // Add CSS transition tracking to the element
        if (element) {
            this.trackElementTransitions(element);
        }
    }
    
    /**
     * Track CSS transitions for an element
     */
    trackElementTransitions(element) {
        // Store the element for transition tracking
        if (!this.trackedElements) {
            this.trackedElements = new Set();
        }
        
        this.trackedElements.add(element);
        
        // Add CSS transition to ensure smooth movement
        if (!element.style.transition) {
            element.style.transition = 'transform 0.1s ease-out, left 0.1s ease-out, top 0.1s ease-out';
        }
    }
    
    /**
     * Handle transition end events
     */
    handleTransitionEnd(event) {
        if (!this.isDragging) return;
        
        const element = event.target;
        if (!this.trackedElements || !this.trackedElements.has(element)) return;
        
        // Check if this is a property we're interested in
        const relevantProperties = ['transform', 'left', 'top'];
        if (!relevantProperties.includes(event.propertyName)) return;
        
        console.log(`✨ Transition ended: ${event.propertyName} on element`, element);
        
        // Check if all tracked elements have completed transitions
        if (this.allTransitionsComplete()) {
            this.scheduleSave();
        }
    }
    
    /**
     * Handle scroll completion
     */
    handleScrollEnd() {
        if (!this.isDragging) return;
        
        console.log('📜 Scroll completed');
        
        // Schedule save after scroll buffer time
        this.scheduleSave();
    }
    
    /**
     * Check if all tracked transitions are complete
     */
    allTransitionsComplete() {
        if (!this.trackedElements || this.trackedElements.size === 0) {
            return true;
        }
        
        // Check if any elements are still transitioning
        for (const element of this.trackedElements) {
            const style = window.getComputedStyle(element);
            if (style.transitionProperty !== 'none' && 
                style.transitionDuration !== '0s' &&
                style.transitionTimingFunction !== 'linear 0s') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Schedule a save operation with debouncing
     */
    scheduleSave() {
        const dragType = this.currentDragType;
        
        // Cancel any existing debounce timer for this type
        if (this.saveDebounceTimers.has(dragType)) {
            clearTimeout(this.saveDebounceTimers.get(dragType));
        }
        
        // Set new debounce timer
        const timer = setTimeout(() => {
            this.executeSave(dragType);
        }, this.config.saveDebounceDelay);
        
        this.saveDebounceTimers.set(dragType, timer);
    }
    
    /**
     * Execute the actual save operation
     */
    async executeSave(dragType) {
        console.log(`💾 Executing save for: ${dragType}`);
        
        // Cancel any pending saves
        this.cancelPendingSave(dragType);
        
        // Show visual feedback
        this.showSaveFeedback();
        
        try {
            // Check if save function is available
            if (typeof window.saveCurrentBoard !== 'function') {
                console.warn('⚠️ Save function not available');
                return;
            }
            
            // Execute save
            const result = await window.saveCurrentBoard();
            
            console.log(`✅ Save completed for: ${dragType}`, result);
            
            // Clear tracked elements
            this.clearTrackedElements();
            
        } catch (error) {
            console.error(`❌ Save failed for: ${dragType}`, error);
            
            // Show error feedback
            this.showSaveFeedback('error');
        }
    }
    
    /**
     * Cancel a pending save operation
     */
    cancelPendingSave(dragType) {
        // Cancel debounce timer
        if (this.saveDebounceTimers.has(dragType)) {
            clearTimeout(this.saveDebounceTimers.get(dragType));
            this.saveDebounceTimers.delete(dragType);
        }
        
        // Clear pending save state
        this.pendingSaves.delete(dragType);
    }
    
    /**
     * Show visual feedback for save operations
     */
    showSaveFeedback(type = 'success') {
        // Create or update feedback element
        let feedbackEl = document.getElementById('drag-save-feedback');
        
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.id = 'drag-save-feedback';
            feedbackEl.className = 'drag-save-feedback';
            feedbackEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 9999;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                pointer-events: none;
            `;
            document.body.appendChild(feedbackEl);
        }
        
        // Set content and style based on type
        if (type === 'success') {
            feedbackEl.textContent = '✅ Position saved';
            feedbackEl.style.backgroundColor = '#10b981';
            feedbackEl.style.color = 'white';
        } else if (type === 'error') {
            feedbackEl.textContent = '❌ Save failed';
            feedbackEl.style.backgroundColor = '#ef4444';
            feedbackEl.style.color = 'white';
        }
        
        // Show feedback
        feedbackEl.style.opacity = '1';
        feedbackEl.style.transform = 'translateY(0)';
        
        // Hide after duration
        setTimeout(() => {
            feedbackEl.style.opacity = '0';
            feedbackEl.style.transform = 'translateY(-10px)';
        }, this.config.feedbackDuration);
    }
    
    /**
     * Clear tracked elements
     */
    clearTrackedElements() {
        if (this.trackedElements) {
            this.trackedElements.clear();
        }
    }
    
    /**
     * Stop drag operation
     */
    stopDrag() {
        console.log(`🏁 Stopping drag: ${this.currentDragType}`);
        
        this.isDragging = false;
        this.currentDragType = null;
        this.currentDragElement = null;
        
        // Clear all debounce timers
        this.saveDebounceTimers.forEach(timer => clearTimeout(timer));
        this.saveDebounceTimers.clear();
        
        // Clear tracked elements
        this.clearTrackedElements();
    }
    
    /**
     * Get current drag state
     */
    getDragState() {
        return {
            isDragging: this.isDragging,
            currentDragType: this.currentDragType,
            pendingSaves: Array.from(this.pendingSaves.keys()),
            trackedElementsCount: this.trackedElements ? this.trackedElements.size : 0
        };
    }
}

// Create global instance
const dragCompletionService = new DragCompletionService();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dragCompletionService.initialize();
    });
} else {
    dragCompletionService.initialize();
}

// Export for use in other modules
window.dragCompletionService = dragCompletionService;

// Debug helper
window.debugDragCompletion = () => {
    console.log('🔍 Drag Completion Service State:', dragCompletionService.getDragState());
};
