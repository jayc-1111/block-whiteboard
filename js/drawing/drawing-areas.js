// Drawing areas management - uses perfect-freehand for smooth strokes
import { createDrawingArea } from './drawing-area-factory.js';
import { AppState } from '../state.js';
import { makeDraggable } from '../drag-drop.js';
import { Debug } from '../debug.js';

let drawingAreaIdCounter = 1;

/**
 * Creates a new drawing area on the canvas
 * @param {number} left - X position
 * @param {number} top - Y position
 * @param {number} width - Width of drawing area
 * @param {number} height - Height of drawing area
 */
export function createDrawingAreaElement(left = 100, top = 100, width = 400, height = 300) {
    const grid = document.getElementById('grid');
    if (!grid) {
        Debug.drawing.error('Grid element not found');
        return null;
    }

    const drawingArea = document.createElement('div');
    drawingArea.className = 'drawing-area';
    drawingArea.id = `drawing-area-${drawingAreaIdCounter++}`;
    
    // Set position and size
    drawingArea.style.left = `${left}px`;
    drawingArea.style.top = `${top}px`;
    drawingArea.style.width = `${width}px`;
    drawingArea.style.height = `${height}px`;

    // Create header for dragging
    const header = document.createElement('div');
    header.className = 'drawing-area-header';
    header.innerHTML = `
        <span class="drawing-area-title">Drawing</span>
        <div class="drawing-area-controls">
            <button class="drawing-clear-btn" title="Clear">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
                </svg>
            </button>
            <button class="drawing-close-btn" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'drawing-canvas-container';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.className = 'drawing-canvas';
    canvas.width = width;
    canvas.height = height - 40; // Account for header height
    
    canvasContainer.appendChild(canvas);
    drawingArea.appendChild(header);
    drawingArea.appendChild(canvasContainer);
    
    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'drawing-resize-handle';
    drawingArea.appendChild(resizeHandle);
    
    // Initialize drawing functionality
    createDrawingArea(canvas, drawingArea);
    
    // Make draggable
    makeDraggable(drawingArea, header);
    
    // Add event listeners
    header.querySelector('.drawing-clear-btn').addEventListener('click', () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Clear stored paths
        const drawingData = drawingArea._drawingData;
        if (drawingData) {
            drawingData.paths = [];
            saveDrawingAreaState();
        }
    });
    
    header.querySelector('.drawing-close-btn').addEventListener('click', () => {
        deleteDrawingArea(drawingArea);
    });
    
    // Add resize functionality
    setupResize(drawingArea, resizeHandle, canvas);
    
    grid.appendChild(drawingArea);
    
    // Save to state
    saveDrawingAreaState();
    
    Debug.drawing.log('Created drawing area', drawingArea.id);
    return drawingArea;
}

/**
 * Sets up resize functionality for a drawing area
 */
function setupResize(drawingArea, handle, canvas) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(drawingArea.style.width, 10);
        startHeight = parseInt(drawingArea.style.height, 10);
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const newWidth = Math.max(200, startWidth + e.clientX - startX);
        const newHeight = Math.max(150, startHeight + e.clientY - startY);
        
        drawingArea.style.width = `${newWidth}px`;
        drawingArea.style.height = `${newHeight}px`;
        
        // Resize canvas
        canvas.width = newWidth;
        canvas.height = newHeight - 40;
        
        // Redraw content
        if (drawingArea._drawingData) {
            drawingArea._drawingData.redraw();
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            saveDrawingAreaState();
        }
    });
}

/**
 * Deletes a drawing area
 */
function deleteDrawingArea(drawingArea) {
    drawingArea.remove();
    saveDrawingAreaState();
    Debug.drawing.log('Deleted drawing area', drawingArea.id);
}

/**
 * Saves current drawing areas to AppState
 */
export function saveDrawingAreaState() {
    const drawingAreas = Array.from(document.querySelectorAll('.drawing-area')).map(area => {
        const canvas = area.querySelector('canvas');
        const drawingData = area._drawingData;
        
        return {
            id: area.id,
            position: {
                left: parseInt(area.style.left, 10),
                top: parseInt(area.style.top, 10)
            },
            size: {
                width: parseInt(area.style.width, 10),
                height: parseInt(area.style.height, 10)
            },
            paths: drawingData ? drawingData.paths : [],
            title: area.querySelector('.drawing-area-title').textContent
        };
    });
    
    const boards = AppState.get('boards');
    const currentBoardIndex = AppState.get('currentBoardIndex');
    
    if (boards && boards[currentBoardIndex]) {
        boards[currentBoardIndex].drawingAreas = drawingAreas;
        AppState.set('boards', boards);
        
        Debug.drawing.log('Saved drawing areas to state', drawingAreas.length);
    }
}

// Make globally available for drawing-area-factory
window.saveDrawingAreaState = saveDrawingAreaState;

/**
 * Loads drawing areas from state
 */
export function loadDrawingAreas(boardData) {
    if (!boardData.drawingAreas) return;
    
    boardData.drawingAreas.forEach(areaData => {
        const area = createDrawingAreaElement(
            areaData.position.left,
            areaData.position.top,
            areaData.size.width,
            areaData.size.height
        );
        
        if (area && areaData.paths && areaData.paths.length > 0) {
            // Restore drawing paths
            const drawingData = area._drawingData;
            if (drawingData) {
                drawingData.paths = areaData.paths;
                drawingData.redraw();
            }
        }
        
        if (area && areaData.title) {
            area.querySelector('.drawing-area-title').textContent = areaData.title;
        }
    });
    
    Debug.drawing.log('Loaded drawing areas', boardData.drawingAreas.length);
}

/**
 * Clear all drawing areas from the current board
 */
export function clearDrawingAreas() {
    document.querySelectorAll('.drawing-area').forEach(area => area.remove());
}
