// Application constants
const CONSTANTS = {
    // Grid and positioning
    GRID_SIZE: 27,
    DEFAULT_POSITION: 100,
    POSITION_OFFSET: 70,
    RANDOM_POSITION_RANGE: 280,
    DUPLICATE_OFFSET: 50,
    
    // Grid dimensions
    GRID_EXPAND_INCREMENT: 250,
    GRID_PADDING: 200,
    
    // Z-index management
    BASE_Z_INDEX: 100,
    EXPANDED_FILE_Z_INDEX: 20000,
    
    // Category defaults
    INITIAL_FILE_SLOTS: 2,
    FILES_BEFORE_COLLAPSE: 3,
    
    // Animation durations (ms)
    TRANSITION_DURATION: 200,
    
    // Drag thresholds
    DRAG_THRESHOLD: 5,
    
    // Board defaults
    DEFAULT_BOARD_NAME: 'Board',
    
    // File export
    EXPORT_INDENT_SPACES: 2,
    
    // File dimensions
    FILE_MAX_WIDTH: '182px',
    EXPANDED_FILE_WIDTH: 850,
    
    // Bullet list
    MAX_INDENT_LEVEL: 3
};

// Freeze to prevent modifications
Object.freeze(CONSTANTS);
