// Theme management

// Current theme state
let currentTheme = 'none';

// Grid dot colors for each theme
const gridDotColors = {
    none: 'rgba(233, 11, 11, 0.04)',      // Default dark theme
    night: 'rgba(255,255,255,0.025)',     // Even more subtle for night
    light: 'rgba(100,100,100,0.15)',      // Dark gray for light theme
    frutiger: 'rgba(255,255,255,0.3)',    // Bright white for glass effect
    picnic: 'rgba(255,255,255,0.2)',      // White for picnic
    lollipop: 'rgba(255,255,255,0.2)'     // White for lollipop
};

// Function to generate grid SVG with custom color
function generateGridSVG(color) {
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='27' height='27' viewBox='0 0 27 27'%3E%3Cpath d='M13.5 11.5a2 2 0 1 1 -1.998 2.087l-.002 -.087l.002 -.087a2 2 0 0 1 1.998 -1.913z' fill='${encodeURIComponent(color)}'/%3E%3C/svg%3E")`;
}

const backgrounds = {
    none: 'none',
    night: 'none',
    light: 'none',
    lollipop: 'url("https://images.unsplash.com/photo-1654358101344-b58696575d26?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    frutiger: 'url("https://images.unsplash.com/photo-1743220879914-14adc4afdaa3?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    picnic: 'none'
};

function setBackground(theme) {
    if (theme === 'none') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
    } else if (theme === 'night') {
        document.body.classList.remove('light-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('night-mode');
    } else if (theme === 'light') {
        document.body.classList.remove('night-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('light-mode');
    } else if (theme === 'frutiger') {
        document.body.classList.remove('light-mode', 'night-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('frutiger-mode');
        // Check hardware acceleration for glass-heavy theme
        if (typeof checkHardwareAcceleration === 'function' && !checkHardwareAcceleration()) {
            setTimeout(() => showHardwareAccelerationWarning(), 500);
        }
    } else if (theme === 'picnic') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'with-background');
        document.body.classList.add('picnic-mode');
        // Check hardware acceleration for glass-heavy theme
        if (typeof checkHardwareAcceleration === 'function' && !checkHardwareAcceleration()) {
            setTimeout(() => showHardwareAccelerationWarning(), 500);
        }
    } else if (theme === 'lollipop') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'picnic-mode');
        document.body.classList.add('with-background');
    }
    
    // Direct background setting - no CSS variables
    const whiteboard = document.getElementById('whiteboard');
    if (whiteboard) {
        const bgImage = backgrounds[theme] || backgrounds.none;
        if (bgImage === 'none') {
            whiteboard.style.backgroundImage = '';
        } else {
            whiteboard.style.backgroundImage = bgImage;
        }
    }
    
    // Update grid dot color
    const grid = document.getElementById('grid');
    if (grid) {
        const dotColor = gridDotColors[theme] || gridDotColors.none;
        
        // Special handling for picnic mode with multiple backgrounds
        if (theme === 'picnic') {
            grid.style.background = `
                ${generateGridSVG(dotColor)},
                repeating-linear-gradient(
                    45deg,
                    transparent 0,
                    transparent 35px,
                    rgba(255, 255, 255, 0.15) 35px,
                    rgba(255, 255, 255, 0.15) 70px
                ),
                repeating-linear-gradient(
                    -45deg,
                    transparent 0,
                    transparent 35px,
                    rgba(255, 255, 255, 0.15) 35px,
                    rgba(255, 255, 255, 0.15) 70px
                ),
                linear-gradient(90deg, #009ffd, #2a2a72)
            `;
            grid.style.backgroundSize = '27px 27px, auto, auto, auto';
            grid.style.backgroundAttachment = 'local';
        } else {
            grid.style.backgroundImage = generateGridSVG(dotColor);
        }
    }
    
    const bgOptions = document.querySelectorAll('.bg-option');
    bgOptions.forEach(opt => opt.classList.remove('active'));
    const activeOption = [...bgOptions].find(opt => 
        opt.textContent.toLowerCase().includes(theme === 'none' ? 'default' : theme)
    );
    if (activeOption) activeOption.classList.add('active');
}

// Theme module exports
const Theme = {
    // Get current theme
    getCurrentTheme: function() {
        return currentTheme;
    },
    
    // Set theme
    setTheme: function(theme) {
        if (theme && typeof theme === 'string') {
            currentTheme = theme;
            setBackground(theme);
            // Save to localStorage
            localStorage.setItem('currentTheme', theme);
            console.log(`Theme set to: ${theme}`);
        } else {
            console.error('Invalid theme provided:', theme);
        }
    },
    
    // Initialize theme (called when DOM is ready)
    init: function() {
        // Restore saved theme or use default
        const savedTheme = localStorage.getItem('currentTheme');
        if (savedTheme && savedTheme in gridDotColors) {
            currentTheme = savedTheme;
        } else {
            currentTheme = 'none';
        }
        
        // Apply the theme
        setBackground(currentTheme);
        
        console.log(`Theme initialized: ${currentTheme}`);
    }
};

// Export the Theme object
window.Theme = Theme;
