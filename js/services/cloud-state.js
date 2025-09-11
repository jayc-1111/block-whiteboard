import { AppState } from '../state.js';
import * as dbService from './db-service.js';

/**
 * CloudState is the canonical interface for loading and modifying boards
 * in the Appwrite backend while keeping AppState in sync.
 */

/**
 * Dev Mode Management - Cloud-First Implementation
 */
const DevModeManager = {
    /**
     * Get dev_mode from cloud settings database
     * @returns {Promise<boolean>} - Current dev_mode value
     */
    async getDevMode() {
        try {
            // Try to get from AppState first (loaded from cloud)
            const devModeFromState = AppState.get('dev_mode');
            if (devModeFromState !== undefined) {
                return devModeFromState;
            }
            
            // Load from cloud database
            if (window.appwriteUtils && window.appwriteUtils.getUserSettings) {
                const cloudSettings = await window.appwriteUtils.getUserSettings();
                const devMode = cloudSettings?.dev_mode || false;
                
                // Update AppState for future access
                AppState.set('dev_mode', devMode);
                return devMode;
            }
            
            // Fallback to localStorage for compatibility (will be removed later)
            const stored = localStorage.getItem('dev_mode');
            return stored !== null ? JSON.parse(stored) : false;
        } catch (error) {
            console.warn('Failed to read dev_mode from cloud, falling back to localStorage:', error);
            // Fallback to localStorage
            const stored = localStorage.getItem('dev_mode');
            return stored !== null ? JSON.parse(stored) : false;
        }
    },

    /**
     * Set dev_mode to cloud settings database
     * @param {boolean} value - The dev_mode value to set
     * @returns {Promise<void>}
     */
    async setDevMode(value) {
        try {
            // Update AppState immediately for UI responsiveness
            AppState.set('dev_mode', value);

            // Save to cloud using appwriteUtils
            if (window.appwriteUtils && window.appwriteUtils.saveUserSettings) {
                await window.appwriteUtils.saveUserSettings({ dev_mode: value });
                console.log('✅ Dev mode saved to cloud:', value);
            } else {
                console.warn('⚠️ appwriteUtils.saveUserSettings not available, using localStorage');
                // Fallback to localStorage
                localStorage.setItem('dev_mode', JSON.stringify(value));
            }
        } catch (error) {
            console.error('Failed to save dev_mode to cloud, falling back to localStorage:', error);
            // Fallback to localStorage
            localStorage.setItem('dev_mode', JSON.stringify(value));
        }
    },

    /**
     * Initialize settings from cloud database on app start
     * @returns {Promise<void>}
     */
    async initializeSettings() {
        try {
            console.log('🔄 Loading user settings from cloud...');

            // Try to load from cloud first
            let cloudSettings = null;
            if (window.appwriteUtils && window.appwriteUtils.getUserSettings) {
                cloudSettings = await window.appwriteUtils.getUserSettings();
                console.log('✅ Loaded cloud settings:', cloudSettings);

                // Apply cloud settings to AppState
                if (cloudSettings && typeof cloudSettings.dev_mode === 'boolean') {
                    AppState.set('dev_mode', cloudSettings.dev_mode);
                }
            }

        } catch (error) {
            console.error('❌ Failed to load cloud settings, falling back to localStorage:', error);
            console.log('🔄 Falling back to localStorage settings...');

            // Fallback to localStorage
            const dev_mode = await this.getDevMode();
            AppState.set('dev_mode', dev_mode);
        }
    }
};

/**
 * Board Management Functions
 */
const CloudState = {
  async loadBoards() {
    const result = await dbService.listBoards();
    const boards = result.documents.map((b, idx) => ({
      dbId: b.$id,
      stateId: idx,
      name: b.board_name,
      folders: [],
      canvasHeaders: [],
      drawingPaths: [],
      onboardingShown: b.onboarding_supported || false
    }));
    AppState.set('boards', boards);
    window.dispatchEvent(new CustomEvent('cloud-state-changed', { detail: { boards }}));
    return boards;
  },

  async createBoard(name) {
    const result = await dbService.createBoard({ name });
    const newBoard = {
      dbId: result.$id,
      stateId: AppState.get('boards').length,
      name: result.board_name || name,
      folders: [],
      canvasHeaders: [],
      drawingPaths: []
    };
    const boards = [...AppState.get('boards'), newBoard];
    AppState.set('boards', boards);
    window.dispatchEvent(new CustomEvent('cloud-state-changed', { detail: { boards }}));
    return newBoard;
  },

  async updateBoardName(dbId, newName) {
    await dbService.updateBoard(dbId, { board_name: newName });
    const boards = AppState.get('boards').map(b =>
      b.dbId === dbId ? { ...b, name: newName } : b
    );
    AppState.set('boards', boards);
    window.dispatchEvent(new CustomEvent('cloud-state-changed', { detail: { boards }}));
  },

  async deleteBoard(dbId) {
    await dbService.deleteBoard(dbId);
    let boards = AppState.get('boards').filter(b => b.dbId !== dbId);
    boards = boards.map((b, i) => ({ ...b, stateId: i })); // reindex
    AppState.set('boards', boards);
    window.dispatchEvent(new CustomEvent('cloud-state-changed', { detail: { boards }}));
  },

  async loadBoardContent(dbId) {
    const board = AppState.get('boards').find(b => b.dbId === dbId);
    if (!board) return null;

    try {
      if (dbService.getFoldersByBoard) {
        board.folders = await dbService.getFoldersByBoard(dbId);
      }
      if (dbService.getCanvasHeadersByBoard) {
        board.canvasHeaders = await dbService.getCanvasHeadersByBoard(dbId);
      }
      if (dbService.getDrawingPathsByBoard) {
        board.drawingPaths = await dbService.getDrawingPathsByBoard(dbId);
      }
    } catch (err) {
      console.error('❌ Failed to load board content from cloud:', err);
    }

    const boards = AppState.get('boards').map(b => b.dbId === dbId ? board : b);
    AppState.set('boards', boards);
    window.dispatchEvent(new CustomEvent('cloud-board-loaded', { detail: { board }}));
    return board;
  }
};

// Export enhanced cloud-state with both board management and dev_mode management
const enhancedCloudState = {
  ...CloudState,
  ...DevModeManager,
  
  // Legacy compatibility - keep old function names for transition
  getdev_mode: DevModeManager.getDevMode,
  setdev_mode: DevModeManager.setDevMode,
  initializeFromLocalStorage: DevModeManager.initializeSettings
};

export default enhancedCloudState;
