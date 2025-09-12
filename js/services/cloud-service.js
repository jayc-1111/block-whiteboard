// cloud-service.js
// Assumes AppState and dbService are already on window (loaded before this)

(function (global) {
  /**
   * CloudService is a thin layer over Appwrite that
   * hydrates AppState with cloud data and persists changes back.
   * AppState remains the single source of truth for the UI.
   */
  const CloudService = {
    /**
     * User Settings
     */
    async getDevMode() {
      try {
        // Check AppState first
        const devModeFromState = AppState.get('dev_mode');
        if (devModeFromState !== undefined) {
          return devModeFromState;
        }

        // Fetch from cloud
        if (global.appwriteUtils?.getUserSettings) {
          const cloudSettings = await global.appwriteUtils.getUserSettings();
          const devMode = cloudSettings?.dev_mode ?? false;

          // Hydrate AppState
          AppState.set('dev_mode', devMode);
          return devMode;
        }

        // Fallback
        const stored = localStorage.getItem('dev_mode');
        return stored !== null ? JSON.parse(stored) : false;
      } catch (error) {
        console.warn('Failed to fetch dev_mode from cloud, falling back:', error);
        const stored = localStorage.getItem('dev_mode');
        return stored !== null ? JSON.parse(stored) : false;
      }
    },

    async setDevMode(value) {
      try {
        // Update AppState immediately
        AppState.set('dev_mode', value);

        // Persist to cloud
        if (global.appwriteUtils?.saveUserSettings) {
          await global.appwriteUtils.saveUserSettings({ dev_mode: value });
          console.log('✅ Dev mode saved to cloud:', value);
        } else {
          console.warn('⚠️ saveUserSettings not available, using localStorage');
          localStorage.setItem('dev_mode', JSON.stringify(value));
        }
      } catch (error) {
        console.error('❌ Failed to save dev_mode, falling back:', error);
        localStorage.setItem('dev_mode', JSON.stringify(value));
      }
    },

    async initializeSettings() {
      try {
        console.log('🔄 Loading user settings from cloud...');
        if (global.appwriteUtils?.getUserSettings) {
          const cloudSettings = await global.appwriteUtils.getUserSettings();
          console.log('✅ Loaded cloud settings:', cloudSettings);

          if (cloudSettings && typeof cloudSettings.dev_mode === 'boolean') {
            AppState.set('dev_mode', cloudSettings.dev_mode);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load cloud settings, falling back:', error);
        const dev_mode = await this.getDevMode();
        AppState.set('dev_mode', dev_mode);
      }
    },

    /**
     * Board Management
     */
    async loadBoards() {
      const result = await dbService.listBoards();
      const boards = result.documents.map((b, idx) => ({
        dbId: b.$id,
        stateId: idx,
        name: b.board_name,
        folders: [],
        canvasHeaders: [],
        drawingPaths: [],
        onboardingShown: b.onboarding_supported || false,
      }));

      AppState.set('boards', boards);
      global.dispatchEvent(new CustomEvent('boards-loaded', { detail: { boards }}));
      return boards;
    },

    async createBoard(name) {
      const result = await dbService.createBoard({ name });
      const newBoard = {
        dbId: result.$id,
        stateId: (AppState.get('boards') || []).length,
        name: result.board_name || name,
        folders: [],
        canvasHeaders: [],
        drawingPaths: [],
      };

      const boards = [...(AppState.get('boards') || []), newBoard];
      AppState.set('boards', boards);
      global.dispatchEvent(new CustomEvent('board-created', { detail: { newBoard }}));
      return newBoard;
    },

    async updateBoardName(dbId, newName) {
      await dbService.updateBoard(dbId, { board_name: newName });
      const boards = (AppState.get('boards') || []).map(b =>
        b.dbId === dbId ? { ...b, name: newName } : b
      );
      AppState.set('boards', boards);
      global.dispatchEvent(new CustomEvent('board-updated', { detail: { dbId, newName }}));
    },

    async deleteBoard(dbId) {
      await dbService.deleteBoard(dbId);
      let boards = (AppState.get('boards') || []).filter(b => b.dbId !== dbId);
      boards = boards.map((b, i) => ({ ...b, stateId: i })); // reindex
      AppState.set('boards', boards);
      global.dispatchEvent(new CustomEvent('board-deleted', { detail: { dbId }}));
    },

    async loadBoardContent(dbId) {
      const board = (AppState.get('boards') || []).find(b => b.dbId === dbId);
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
        console.error('❌ Failed to load board content:', err);
      }

      const boards = (AppState.get('boards') || []).map(b =>
        b.dbId === dbId ? board : b
      );
      AppState.set('boards', boards);
      global.dispatchEvent(new CustomEvent('board-content-loaded', { detail: { board }}));
      return board;
    },
  };

  // Expose globally
  global.CloudService = CloudService;
})(window);
