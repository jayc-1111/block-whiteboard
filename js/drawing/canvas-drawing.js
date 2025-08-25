// Full canvas drawing layer with perfect-freehand
// Debug is already globally available from debug.js

let isDrawingMode = false;
let isDrawing = false;
let isEraserMode = false;
let currentPath = [];
let paths = [];
let drawingCanvas = null;
let ctx = null;
let getStroke = null;
let eraserSize = 20;

// Load perfect-freehand from skypack
import('https://cdn.skypack.dev/perfect-freehand@1.2.2').then(module => {
    getStroke = module.getStroke;
    Debug.drawing.log('Perfect-freehand loaded');
}).catch(err => {
    Debug.drawing.error('Failed to load perfect-freehand', err);
});

// Drawing settings
const settings = {
  size: 7,
  smoothing: 0.99,
  thinning: 0.7,
  streamline: 0.5,
  easing: (t) => t,
  start: {
    taper: 0,
    cap: true,
  },
  end: {
    taper: 0,
    cap: true,
  },
}

/**
 * Initialize the drawing layer
 */
export function initDrawingLayer() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    // Create drawing canvas if it doesn't exist
    drawingCanvas = document.getElementById('drawing-layer');
    if (!drawingCanvas) {
        drawingCanvas = document.createElement('canvas');
        drawingCanvas.id = 'drawing-layer';
        drawingCanvas.className = 'drawing-layer';
        grid.appendChild(drawingCanvas);
    }
    
    // Set canvas size to match grid
    resizeCanvas();
    
    // Get context
    ctx = drawingCanvas.getContext('2d');
    
    // Add resize observer
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
        redrawCanvas();
    });
    resizeObserver.observe(grid);
    
    // Make functions globally available
    window.toggleDrawingMode = toggleDrawingMode;
    window.toggleEraserMode = toggleEraserMode;
    window.clearDrawing = clearDrawing;
    window.getDrawingPaths = () => paths;
    window.setDrawingPaths = (newPaths) => {
        paths = newPaths;
        redrawCanvas();
    };
    
    Debug.drawing.log('Drawing layer initialized');
}

/**
 * Resize canvas to match grid size
 */
function resizeCanvas() {
    const grid = document.getElementById('grid');
    if (!grid || !drawingCanvas) return;
    
    const rect = grid.getBoundingClientRect();
    drawingCanvas.width = grid.scrollWidth;
    drawingCanvas.height = grid.scrollHeight;
    drawingCanvas.style.width = grid.scrollWidth + 'px';
    drawingCanvas.style.height = grid.scrollHeight + 'px';
}

/**
 * Toggle drawing mode on/off
 */
export function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;
    
    const drawingBtn = document.getElementById('drawingModeBtn');
    const grid = document.getElementById('grid');
    
    if (isDrawingMode) {
        // Enable drawing mode
        drawingCanvas.classList.add('active');
        if (drawingBtn) drawingBtn.classList.add('active');
        if (grid) grid.classList.add('drawing-mode');
        
        // Add event listeners
        drawingCanvas.addEventListener('mousedown', startDrawing);
        drawingCanvas.addEventListener('mousemove', draw);
        drawingCanvas.addEventListener('mouseup', stopDrawing);
        drawingCanvas.addEventListener('mouseleave', stopDrawing);
        
        // Touch support
        drawingCanvas.addEventListener('touchstart', handleTouch);
        drawingCanvas.addEventListener('touchmove', handleTouch);
        drawingCanvas.addEventListener('touchend', stopDrawing);
        
        Debug.drawing.log('Drawing mode enabled');
    } else {
        // Stop any ongoing drawing first
        if (isDrawing) {
            stopDrawing();
        }
        
        // Disable drawing mode
        drawingCanvas.classList.remove('active');
        if (drawingBtn) drawingBtn.classList.remove('active');
        if (grid) grid.classList.remove('drawing-mode');
        
        // Remove event listeners
        drawingCanvas.removeEventListener('mousedown', startDrawing);
        drawingCanvas.removeEventListener('mousemove', draw);
        drawingCanvas.removeEventListener('mouseup', stopDrawing);
        drawingCanvas.removeEventListener('mouseleave', stopDrawing);
        
        drawingCanvas.removeEventListener('touchstart', handleTouch);
        drawingCanvas.removeEventListener('touchmove', handleTouch);
        drawingCanvas.removeEventListener('touchend', stopDrawing);
        
        // Reset drawing state
        isDrawing = false;
        currentPath = [];
        
        Debug.drawing.log('Drawing mode disabled');
    }
}

/**
 * Start drawing
 */
function startDrawing(e) {
    if (!isDrawingMode) return;
    
    isDrawing = true;
    currentPath = [];
    const point = getPointFromEvent(e);
    currentPath.push(point);
}

/**
 * Draw on canvas
 */
function draw(e) {
    if (!isDrawing || !isDrawingMode) return;
    
    const point = getPointFromEvent(e);
    
    if (isEraserMode) {
        // Erase paths that intersect with eraser
        eraseAtPoint(point);
    } else {
        currentPath.push(point);
        
        // Redraw everything
        redrawCanvas();
        
        // Draw current stroke
        if (getStroke && currentPath.length > 1) {
            const stroke = getStroke(currentPath, settings);
            drawPath(stroke);
        }
    }
}

/**
 * Stop drawing
 */
function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (!isEraserMode && currentPath.length > 1) {
        paths.push([...currentPath]);
        saveDrawingState();
    }
    
    currentPath = [];
    
    // If in eraser mode, automatically turn it off when drag ends
    if (isEraserMode) {
        toggleEraserMode();
    }
    
    // Don't stop propagation to allow other handlers to work
    // This ensures header dragging can properly detect mouseup
    if (e && e.stopPropagation) {
        // Don't call stopPropagation
    }
}

/**
 * Handle touch events
 */
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    
    if (e.type === 'touchstart') startDrawing(mouseEvent);
    else if (e.type === 'touchmove') draw(mouseEvent);
}

/**
 * Get point from mouse/touch event
 */
function getPointFromEvent(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left + document.getElementById('whiteboard').scrollLeft;
    const y = e.clientY - rect.top + document.getElementById('whiteboard').scrollTop;
    const pressure = e.pressure || 0.5;
    
    return [x, y, pressure];
}

/**
 * Draw a path on the canvas
 */
function drawPath(points) {
    if (!ctx || points.length < 2) return;
    
    ctx.fillStyle = '#1e3a8a'; // Deep blue color
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
    }
    
    ctx.closePath();
    ctx.fill();
}

/**
 * Redraw all paths
 */
function redrawCanvas() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    // Draw all saved paths
    paths.forEach(pathPoints => {
        if (getStroke && pathPoints.length > 1) {
            const stroke = getStroke(pathPoints, settings);
            drawPath(stroke);
        }
    });
}

/**
 * Clear all drawings
 */
export function clearDrawing() {
    paths = [];
    if (ctx) {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    saveDrawingState();
    Debug.drawing.log('Drawing cleared');
}

/**
 * Save drawing state to AppState
 */
function saveDrawingState() {
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards.find(b => b.id === currentBoardId);
    
    if (board) {
        board.drawingPaths = paths;
        AppState.set('boards', boards);
        
        // Trigger save if sync service is available
        if (window.syncService && window.syncService.saveAfterAction) {
            window.syncService.saveAfterAction('drawing updated');
        }
    }
}

/**
 * Load drawing paths for current board
 */
export function loadDrawingPaths(newPaths) {
    if (!newPaths || !Array.isArray(newPaths)) return;
    
    paths = newPaths;
    redrawCanvas();
    Debug.drawing.log('Loaded drawing paths', paths.length);
}

/**
 * Toggle eraser mode
 */
export function toggleEraserMode() {
    isEraserMode = !isEraserMode;
    
    const eraserBtn = document.getElementById('eraserModeBtn');
    const drawingBtn = document.getElementById('drawingModeBtn');
    const whiteboard = document.getElementById('whiteboard');
    
    if (isEraserMode) {
        if (eraserBtn) eraserBtn.classList.add('active');
        if (whiteboard) whiteboard.style.cursor = 'crosshair';
        
        // Enable drawing mode if not already
        if (!isDrawingMode) {
            toggleDrawingMode();
        }
        
        Debug.drawing.log('Eraser mode enabled');
    } else {
        // Stop any ongoing drawing/erasing first (but avoid recursion)
        if (isDrawing) {
            isDrawing = false;
            currentPath = [];
        }
        
        if (eraserBtn) eraserBtn.classList.remove('active');
        if (whiteboard) whiteboard.style.cursor = '';
        
        // Always disable drawing mode when eraser is turned off
        if (isDrawingMode) {
            toggleDrawingMode();
        }
        
        Debug.drawing.log('Eraser mode disabled');
    }
}

/**
 * Erase paths at given point
 */
function eraseAtPoint(point) {
    const [x, y] = point;
    const eraserRadius = eraserSize / 2;
    
    // Filter out paths that intersect with eraser
    paths = paths.filter(pathPoints => {
        if (!getStroke || pathPoints.length < 2) return true;
        
        const stroke = getStroke(pathPoints, settings);
        
        // Check if any point in the stroke is within eraser radius
        for (let i = 0; i < stroke.length; i++) {
            const [px, py] = stroke[i];
            const distance = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
            
            if (distance < eraserRadius) {
                return false; // Remove this path
            }
        }
        
        return true; // Keep this path
    });
    
    // Redraw canvas
    redrawCanvas();
    
    // Draw eraser cursor
    if (ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x, y, eraserRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    saveDrawingState();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDrawingLayer);
} else {
    initDrawingLayer();
}
