// Middle mouse button pan functionality
let isPanning = false;
let panStart = { x: 0, y: 0 };
let scrollStart = { x: 0, y: 0 };
let lastPanPosition = { x: 0, y: 0 };
let panVelocity = { x: 0, y: 0 };
let lastPanTime = 0;

function initPanControls() {
    const whiteboard = document.getElementById('whiteboard');
    if (!whiteboard) {
        console.error('Whiteboard element not found for pan controls');
        return;
    }
    
    whiteboard.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            isPanning = true;
            panStart.x = e.clientX;
            panStart.y = e.clientY;
            scrollStart.x = whiteboard.scrollLeft;
            scrollStart.y = whiteboard.scrollTop;
            lastPanPosition.x = e.clientX;
            lastPanPosition.y = e.clientY;
            lastPanTime = Date.now();
            whiteboard.style.cursor = 'grabbing';
            
            // Stop smooth scroll if active
            if (window.smoothScroll) {
                window.smoothScroll.stop();
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isPanning && whiteboard) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            whiteboard.scrollLeft = scrollStart.x - dx;
            whiteboard.scrollTop = scrollStart.y - dy;
            
            // Track velocity for momentum
            const currentTime = Date.now();
            const dt = currentTime - lastPanTime;
            if (dt > 0) {
                panVelocity.x = (e.clientX - lastPanPosition.x) / dt;
                panVelocity.y = (e.clientY - lastPanPosition.y) / dt;
            }
            lastPanPosition.x = e.clientX;
            lastPanPosition.y = e.clientY;
            lastPanTime = currentTime;
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 1 && isPanning) {
            isPanning = false;
            if (whiteboard) {
                whiteboard.style.cursor = '';
            }
            
            // Resume smooth scroll
            if (window.smoothScroll) {
                window.smoothScroll.start();
                
                // Apply momentum if velocity is significant
                const velocityThreshold = 0.5;
                if (Math.abs(panVelocity.x) > velocityThreshold || Math.abs(panVelocity.y) > velocityThreshold) {
                    const momentumDistance = {
                        x: panVelocity.x * 200, // Adjust multiplier for momentum strength
                        y: panVelocity.y * 200
                    };
                    
                    window.smoothScroll.scrollBy(-momentumDistance.x, -momentumDistance.y, 1000);
                }
            }
        }
    });

    // Prevent middle click default behavior
    whiteboard.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    });
}
