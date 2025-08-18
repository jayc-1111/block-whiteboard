// Simple grid dots generator using currentColor
(function() {
    function initGridDots() {
        const grid = document.getElementById('grid');
        if (!grid) return;
        
        // Create container div for the SVG
        let dotsContainer = document.getElementById('grid-dots');
        if (!dotsContainer) {
            dotsContainer = document.createElement('div');
            dotsContainer.id = 'grid-dots';
            grid.insertBefore(dotsContainer, grid.firstChild);
        }
        
        // Create inline SVG with pattern using currentColor
        const svgHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                <defs>
                    <pattern id="dot-pattern" x="0" y="0" width="27" height="27" patternUnits="userSpaceOnUse">
                        <circle cx="13.5" cy="13.5" r="2" fill="currentColor"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dot-pattern)"/>
            </svg>
        `;
        
        dotsContainer.innerHTML = svgHTML;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGridDots);
    } else {
        initGridDots();
    }
})();
