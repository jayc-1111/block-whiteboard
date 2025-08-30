// Lenis smooth scrolling integration
let lenis = null;
let lenisInitialized = false;

function initSmoothScroll() {
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) return;
    
    // Initialize Lenis
    lenis = new Lenis({
        wrapper: whiteboard,
        content: document.getElementById('grid'),
        lerp: 0.1,
        duration: 1.2,
        orientation: 'both', // Enable both horizontal and vertical
        gestureOrientation: 'both',
        smoothWheel: true,
        wheelMultiplier: 0.5,
        touchMultiplier: 1.5,
        infinite: false,
        autoResize: true,
    });
    
    // Animation loop
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    
    // Enable arrow key smooth scrolling
    enableArrowKeyScrolling();
    
    // Enable smooth wheel scrolling for both directions
    enable2DWheelScrolling(whiteboard);
    
    lenisInitialized = true;
}

// Function to reinitialize Lenis for modals/expanded cards
function reinitializeModalLenis(card) {
    // Destroy existing modal Lenis instance if it exists
    if (card.modalLenis) {
        card.modalLenis.destroy();
        card.modalLenis = null;
    }
    
    // Initialize new Lenis instance for the modal
    const modalWrapper = card.querySelector('.expanded-card-main');
    const modalContent = card.querySelector('.expanded-card-content');
    
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
        card.modalLenis = modalLenis;
        
        // Add classes to indicate smooth scrolling is active
        modalWrapper.classList.add('lenis', 'lenis-smooth');
    }
}

function enableArrowKeyScrolling() {
    document.addEventListener('keydown', (e) => {
        // Skip if typing in input fields
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.contentEditable === 'true') return;
        
        const scrollDistance = 150; // pixels
        const duration = 400; // ms
        
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                scrollBy(0, -scrollDistance, duration);
                break;
            case 'ArrowDown':
                e.preventDefault();
                scrollBy(0, scrollDistance, duration);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                scrollBy(-scrollDistance, 0, duration);
                break;
            case 'ArrowRight':
                e.preventDefault();
                scrollBy(scrollDistance, 0, duration);
                break;
            case 'Home':
                e.preventDefault();
                scrollToPosition(0, 0, 800);
                break;
            case 'End':
                e.preventDefault();
                const canvas = document.getElementById('canvas');
                scrollToPosition(canvas.scrollWidth, canvas.scrollHeight, 800);
                break;
        }
    });
}

function enable2DWheelScrolling(whiteboard) {
    // Override wheel behavior for 2D smooth scrolling
    whiteboard.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return; // Don't interfere with zoom
        
        e.preventDefault();
        
        const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
        const deltaY = e.shiftKey ? 0 : e.deltaY;
        
        scrollBy(deltaX * 0.5, deltaY * 0.5, 0); // Instant for wheel
    }, { passive: false });
}

// Smooth scroll utilities
function scrollBy(deltaX, deltaY, duration = 0) {
    if (!lenis) return;
    
    const whiteboard = document.getElementById('whiteboard');
    const currentX = whiteboard.scrollLeft;
    const currentY = whiteboard.scrollTop;
    
    scrollToPosition(currentX + deltaX, currentY + deltaY, duration);
}

function scrollToPosition(x, y, duration = 600) {
    if (!lenis) return;
    
    const whiteboard = document.getElementById('whiteboard');
    const startX = whiteboard.scrollLeft;
    const startY = whiteboard.scrollTop;
    
    if (duration === 0) {
        whiteboard.scrollLeft = x;
        whiteboard.scrollTop = y;
        return;
    }
    
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing functions
        const easings = {
            // Smooth deceleration (current)
            easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
            // Even smoother deceleration
            easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
            // Very gradual deceleration
            easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
            // Extremely gradual deceleration
            easeOutSext: (t) => 1 - Math.pow(1 - t, 6),
            // Bouncy finish
            easeOutElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
            // Slight overshoot
            easeOutBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
            // Linear (no easing)
            linear: (t) => t
        };
        
        // Choose your easing here
        const eased = easings.easeOutQuint(progress);
        
        whiteboard.scrollLeft = startX + (x - startX) * eased;
        whiteboard.scrollTop = startY + (y - startY) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// API for other modules
window.smoothScroll = {
    scrollTo: scrollToPosition,
    scrollBy: scrollBy,
    stop: () => lenis && lenis.stop(),
    start: () => lenis && lenis.start(),
    destroy: () => lenis && lenis.destroy()
};
