// Drag smoothing functionality
const DragSmoothing = (() => {
    const smoothingFactor = 0.15; // Adjust for more/less smoothing
    const activeElements = new Map();
    let animationId = null;
    
    function startSmoothing(element, targetX, targetY) {
        if (!activeElements.has(element)) {
            activeElements.set(element, {
                currentX: parseFloat(element.style.left) || 0,
                currentY: parseFloat(element.style.top) || 0,
                targetX: targetX,
                targetY: targetY
            });
        } else {
            const data = activeElements.get(element);
            data.targetX = targetX;
            data.targetY = targetY;
        }
        
        if (!animationId) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    function animate() {
        let hasActiveElements = false;
        
        activeElements.forEach((data, element) => {
            // Interpolate positions
            data.currentX += (data.targetX - data.currentX) * smoothingFactor;
            data.currentY += (data.targetY - data.currentY) * smoothingFactor;
            
            // Apply positions
            element.style.left = data.currentX + 'px';
            element.style.top = data.currentY + 'px';
            
            // Check if close enough to target
            const deltaX = Math.abs(data.targetX - data.currentX);
            const deltaY = Math.abs(data.targetY - data.currentY);
            
            if (deltaX < 0.5 && deltaY < 0.5) {
                // Snap to final position
                element.style.left = data.targetX + 'px';
                element.style.top = data.targetY + 'px';
                activeElements.delete(element);
            } else {
                hasActiveElements = true;
            }
        });
        
        if (hasActiveElements) {
            animationId = requestAnimationFrame(animate);
        } else {
            animationId = null;
        }
    }
    
    function stopSmoothing(element) {
        if (activeElements.has(element)) {
            const data = activeElements.get(element);
            // Snap to final position
            element.style.left = data.targetX + 'px';
            element.style.top = data.targetY + 'px';
            activeElements.delete(element);
        }
    }
    
    return {
        start: startSmoothing,
        stop: stopSmoothing
    };
})();
