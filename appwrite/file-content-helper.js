// === APPWRITE FILE CONTENT HELPER ===
// This script helps with file content handling for Appwrite storage

// Function to compress large content by removing redundant data
function compressContent(content, maxSize) {
    if (!content) return '';
    
    // If content is already a string, use it directly
    if (typeof content === 'string') {
        // If content is already small enough, return it as is
        if (content.length <= maxSize) {
            return content;
        }
        
        // Simple truncation with warning message
        return content.substring(0, maxSize - 100) + 
            '\n\n[Content truncated due to size limitations. Original size: ' + 
            content.length + ' chars]';
    }
    
    // If content is an object, stringify it
    try {
        const jsonStr = JSON.stringify(content);
        
        // If JSON string is small enough, return it
        if (jsonStr.length <= maxSize) {
            return jsonStr;
        }
        
        // Try to reduce size by removing some properties
        const reduced = {...content};
        
        // List of properties to try removing (in order of importance)
        const propsToRemove = ['metadata', 'history', 'revisions', 'comments'];
        
        // Remove properties until size is under limit
        for (const prop of propsToRemove) {
            if (reduced[prop]) {
                delete reduced[prop];
                const newStr = JSON.stringify(reduced);
                if (newStr.length <= maxSize) {
                    return newStr + '\n\n[Some properties removed due to size limitations]';
                }
            }
        }
        
        // If still too large, truncate
        return jsonStr.substring(0, maxSize - 100) + 
            '\n\n[Content truncated due to size limitations. Original size: ' + 
            jsonStr.length + ' chars]';
    } catch (error) {
        console.error('Error stringifying content:', error);
        return String(content).substring(0, maxSize);
    }
}

// Function to estimate total size of board data
function estimateBoardSize(board) {
    if (!board) return 0;
    
    try {
        const foldersStr = JSON.stringify(board.folders || []);
        const headersStr = JSON.stringify(board.canvasHeaders || []);
        const pathsStr = JSON.stringify(board.drawingPaths || []);
        
        return {
            total: foldersStr.length + headersStr.length + pathsStr.length,
            folders: foldersStr.length,
            canvasHeaders: headersStr.length,
            drawingPaths: pathsStr.length
        };
    } catch (error) {
        console.error('Error estimating board size:', error);
        return {
            total: 0,
            folders: 0,
            canvasHeaders: 0,
            drawingPaths: 0,
            error: error.message
        };
    }
}

// Function to safely parse JSON with error handling
function safeParseJSON(jsonString, defaultValue = []) {
    if (!jsonString) return defaultValue;
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error parsing JSON:', error);
        console.log('Problematic JSON string:', jsonString.substring(0, 100) + '...');
        return defaultValue;
    }
}

// Expose functions globally
window.appwriteContentHelper = {
    compressContent,
    estimateBoardSize,
    safeParseJSON
};
