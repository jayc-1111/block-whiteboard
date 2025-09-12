// Drawing area factory - handles canvas drawing with perfect-freehand
import { Debug } from '../constants/debug.js';

// We'll load perfect-freehand from CDN in index.html
// This function creates the drawing functionality for a canvas

/**
 * Creates drawing functionality for a canvas element
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {HTMLElement} container - The drawing area container
 */
export function createDrawingArea(canvas, container) {
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentPath = [];
    let paths = [];
    
    // Drawing settings
    const settings = {
  size: 5,
  smoothing: 0.99,
  thinning: 0.5,
  streamline: 0.5,
  easing: (t) => t,
  start: {
    taper: 0,
    cap: true,
  },
  end: {
    taper: 87,
    cap: true,
  },
}
    
    // Store drawing data on container
    container._drawingData = {
        paths: paths,
        redraw: redrawCanvas,
        settings: settings
    };
    
    // Mouse/touch event handlers
    function startDrawing(e) {
        isDrawing = true;
        currentPath = [];
        const point = getPointFromEvent(e, canvas);
        currentPath.push(point);
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const point = getPointFromEvent(e, canvas);
        currentPath.push(point);
        
        // Redraw everything
        redrawCanvas();
        
        // Draw current stroke
        if (window.PerfectFreehand && currentPath.length > 1) {
            const stroke = window.PerfectFreehand.getStroke(currentPath, settings);
            drawPath(ctx, stroke);
        }
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        
        if (currentPath.length > 1) {
            paths.push([...currentPath]);
            saveDrawingAreaState();
        }
        
        currentPath = [];
    }
    
    // Get point from mouse/touch event
    function getPointFromEvent(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        const pressure = e.pressure || 0.5;
        
        return [x, y, pressure];
    }
    
    // Draw a path on the canvas
    function drawPath(ctx, points) {
        if (points.length < 2) return;
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        
        ctx.closePath();
        ctx.fill();
    }
    
    // Redraw all paths
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw all saved paths
        paths.forEach(pathPoints => {
            if (window.PerfectFreehand && pathPoints.length > 1) {
                const stroke = window.PerfectFreehand.getStroke(pathPoints, settings);
                drawPath(ctx, stroke);
            }
        });
    }
    
    // Add event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    canvas.addEventListener('touchend', stopDrawing);
    
    // Prevent context menu on canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    Debug.drawing.log('Initialized drawing area');
}

// Global reference for saveDrawingAreaState - will be set by drawing-areas.js
let saveDrawingAreaState = () => {
    if (window.saveDrawingAreaState) {
        window.saveDrawingAreaState();
    }
};
