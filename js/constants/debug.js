// Centralized debug system for Block Whiteboard

// ============================================
// MIGRATION GUIDE (Updated with new emojis)
// ============================================
// OLD: console.log('🔍 DEBUG: Found 3 folders');
// NEW: Debug.detail('Board', 'Found 3 folders', { count: 3 });
//
// OLD: console.log('1. Starting sync...');
// NEW: Debug.sync.start();         // Shows: Sync: ⌛ Starting Sync...
//      Debug.sync.step('Starting sync');  // Shows: Sync: 1. ✅ Starting sync
//
// OLD: console.log('✅ DONE - Sync completed');
// NEW: Debug.sync.done('Sync completed');  // Shows: Sync: ✅ DONE - Sync completed
//
// OLD: console.log('❌ Error:', error);
// NEW: Debug.sync.error('Operation failed', error);  // Shows: Sync: ❌ Operation failed
//
// Event listeners and detected states use 🤖:
// Debug.ui.step('Selection event listeners attached');  // Shows: UI: 1. 🤖 Selection event listeners attached
// Debug.auth.detail('Auth state detected', data);       // Shows: Auth:    🤖 Auth state detected
//
// Element changes use ✅ (normal success):
// Debug.liveSync.detail('Element change detected', { count: 3 });  // Shows: LiveSync:    Element change detected
// ============================================

class DebugSystem {
    constructor() {
        this.contexts = new Map(); // Track step numbers per context
        this.enabled = true; // Can be toggled
        this.logHistory = [];
        this.maxHistory = 100;
        this.filters = new Set(['all']); // What types of logs to show
        
        // Important keywords for dev overlay filtering
        this.importantKeywords = [
            'Firebase', 'Saving', 'Saved', 'Error', 'Guest', 'Auth', 'Sync',
            'Board', 'Canvas', 'Folder', 'sync', 'load', 'update', 'failed'
        ];
    }
    
    // Start a new debug context (resets step counter)
    startContext(contextName, message = null) {
        this.contexts.set(contextName, { step: 0, startTime: Date.now() });
        const msg = message || `Starting ${contextName}...`;
        this.log(contextName, msg, 'context-start');
    }
    
    // End a context with success
    endContext(contextName, message = null) {
        const context = this.contexts.get(contextName);
        if (context) {
            const duration = Date.now() - context.startTime;
            const msg = message || `${contextName} completed`;
            this.log(contextName, `✅ DONE - ${msg} (${duration}ms)`, 'success');
            this.contexts.delete(contextName);
        }
    }
    
    // End a context with error
    errorContext(contextName, error) {
        const context = this.contexts.get(contextName);
        if (context) {
            const duration = Date.now() - context.startTime;
            this.log(contextName, `❌ FAILED - ${contextName}: ${error} (${duration}ms)`, 'error');
            this.contexts.delete(contextName);
        }
    }
    
    // Log a numbered step in a context
    step(contextName, message, data = null) {
        const context = this.contexts.get(contextName);
        if (context) {
            context.step++;
            // Check for specific message types
            let emoji = '✅';
            if (/listener|attached|state detected|presence/i.test(message) && !/element change detected/i.test(message)) {
                emoji = '🤖';
            }
            let logMsg = `${context.step}. ${emoji} ${message}`;
            this.log(contextName, logMsg, 'step', data);
        } else {
            // If no context, just log the message
            this.log(contextName, message, 'info', data);
        }
    }
    
    // Log a numbered step that failed
    stepError(contextName, message, error = null) {
        const context = this.contexts.get(contextName);
        if (context) {
            context.step++;
            let logMsg = `${context.step}. ❌ ${message}`;
            if (error) {
                logMsg += `: ${error.message || error}`;
            }
            this.log(contextName, logMsg, 'error', { error, stack: error?.stack });
        }
    }
    
    // Log a numbered step that was stopped/cancelled
    stepStopped(contextName, message) {
        const context = this.contexts.get(contextName);
        if (context) {
            context.step++;
            let logMsg = `${context.step}. ❌ ${message}`;
            this.log(contextName, logMsg, 'warn');
        }
    }
    
    // Log a sub-detail (indented)
    detail(contextName, message, data = null) {
        // Check for specific message types
        let prefix = '  ';
        if (/listener|attached|state detected|presence/i.test(message) && !/element change detected/i.test(message)) {
            prefix = '   🤖';
        }
        this.log(contextName, `${prefix} ${message}`, 'detail', data);
    }
    
    // Log an info message (no numbering)
    info(contextName, message, data = null) {
        // Check for specific message types
        let finalMessage = message;
        if (/listener|attached|state detected|presence/i.test(message) && !/element change detected/i.test(message)) {
            finalMessage = `🤖 ${message}`;
        }
        this.log(contextName, finalMessage, 'info', data);
    }
    
    // Log a warning
    warn(contextName, message, data = null) {
        this.log(contextName, `⚠️ ${message}`, 'warn', data);
    }
    
    // Log an error (standalone, not a step)
    error(contextName, message, error = null) {
        let errorMsg = `❌ ${message}`;
        if (error) {
            errorMsg += `: ${error.message || error}`;
        }
        this.log(contextName, errorMsg, 'error', { error, stack: error?.stack });
    }
    
    // Log a stopped/cancelled operation
    stopped(contextName, message) {
        this.log(contextName, `❌ ${message}`, 'warn');
    }
    
    // Core logging function
    log(context, message, type = 'info', data = null) {
        if (!this.enabled) return;
        
        // Check filters
        if (!this.filters.has('all') && !this.filters.has(type) && !this.filters.has(context)) {
            return;
        }
        
        // Create log entry
        const entry = {
            time: new Date().toISOString(),
            context,
            message,
            type,
            data
        };
        
        // Add to history
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistory) {
            this.logHistory.shift();
        }
        
        // Output to console
        const prefix = context ? `${context}: ` : '';
        const fullMessage = prefix + message;
        
        switch (type) {
            case 'error':
                console.error(fullMessage, data || '');
                break;
            case 'warn':
                console.warn(fullMessage, data || '');
                break;
            default:
                console.log(fullMessage, data || '');
        }
        
        // Update dev overlay if it exists
        if (window.addDevLog && this.isImportantLog(message)) {
            window.addDevLog(type, `${context}: ${message}`);
        }
    }
    
    // Check if a log is important for dev overlay
    isImportantLog(message) {
        return this.importantKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }
    
    // Enable/disable debugging
    setEnabled(enabled) {
        this.enabled = enabled;
        this.info('Debug', `Debugging ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Set filters
    setFilters(filters) {
        this.filters = new Set(filters);
        this.info('Debug', `Filters set to: ${Array.from(this.filters).join(', ')}`);
    }
    
    // Get recent logs
    getRecentLogs(count = 20) {
        return this.logHistory.slice(-count);
    }
    
    // Clear log history
    clearHistory() {
        this.logHistory = [];
        this.info('Debug', 'Log history cleared');
    }
    
    // Export logs for bug reports
    exportLogs() {
        return {
            timestamp: new Date().toISOString(),
            logs: this.logHistory,
            browser: navigator.userAgent,
            url: window.location.href,
            appState: this.getAppStateSnapshot()
        };
    }
    
    // Get current app state for debugging
    getAppStateSnapshot() {
        if (!window.AppState) return null;
        
        try {
            return {
                currentBoard_id: AppState.get('currentBoard_id'),
                boardCount: AppState.get('boards')?.length || 0,
                dev_mode: AppState.get('dev_mode'),
                currentUser: window.authService?.getCurrentUser ? {
                    uid: window.authService.getCurrentUser()?.uid,
                    email: window.authService.getCurrentUser()?.email,
                    isAnonymous: window.authService.getCurrentUser()?.isAnonymous
                } : null
            };
        } catch (e) {
            return { error: 'Failed to capture app state' };
        }
    }
}

// Create global debug instance
window.Debug = new DebugSystem();

// Add special sync context starter that shows hourglass
window.Debug.startSyncContext = (contextName, message = null) => {
    Debug.contexts.set(contextName, { step: 0, startTime: Date.now() });
    const msg = message || `⌛ Starting ${contextName}...`;
    Debug.log(contextName, msg, 'context-start');
};

// Convenience functions for common operations
window.Debug.auth = {
    start: () => Debug.startContext('Auth'),
    step: (msg, data) => Debug.step('Auth', msg, data),
    stepError: (msg, err) => Debug.stepError('Auth', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Auth', msg),
    detail: (msg, data) => Debug.detail('Auth', msg, data),
    info: (msg, data) => Debug.info('Auth', msg, data),
    warn: (msg, data) => Debug.warn('Auth', msg, data),
    error: (msg, err) => Debug.error('Auth', msg, err),
    stopped: (msg) => Debug.stopped('Auth', msg),
    done: (msg) => Debug.endContext('Auth', msg)
};

window.Debug.sync = {
    start: () => Debug.startSyncContext('Sync', '⌛ Starting Sync...'),
    step: (msg, data) => Debug.step('Sync', msg, data),
    stepError: (msg, err) => Debug.stepError('Sync', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Sync', msg),
    detail: (msg, data) => Debug.detail('Sync', msg, data),
    info: (msg, data) => Debug.info('Sync', msg, data),
    warn: (msg, data) => Debug.warn('Sync', msg, data),
    error: (msg, err) => Debug.error('Sync', msg, err),
    stopped: (msg) => Debug.stopped('Sync', msg),
    done: (msg) => Debug.endContext('Sync', msg)
};

window.Debug.firebase = {
    start: () => Debug.startContext('Firebase'),
    step: (msg, data) => Debug.step('Firebase', msg, data),
    stepError: (msg, err) => Debug.stepError('Firebase', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Firebase', msg),
    detail: (msg, data) => Debug.detail('Firebase', msg, data),
    info: (msg, data) => Debug.info('Firebase', msg, data),
    warn: (msg, data) => Debug.warn('Firebase', msg, data),
    error: (msg, err) => Debug.error('Firebase', msg, err),
    stopped: (msg) => Debug.stopped('Firebase', msg),
    done: (msg) => Debug.endContext('Firebase', msg)
};

window.Debug.ui = {
    start: () => Debug.startContext('UI'),
    step: (msg, data) => Debug.step('UI', msg, data),
    stepError: (msg, err) => Debug.stepError('UI', msg, err),
    stepStopped: (msg) => Debug.stepStopped('UI', msg),
    detail: (msg, data) => Debug.detail('UI', msg, data),
    info: (msg, data) => Debug.info('UI', msg, data),
    warn: (msg, data) => Debug.warn('UI', msg, data),
    error: (msg, err) => Debug.error('UI', msg, err),
    stopped: (msg) => Debug.stopped('UI', msg),
    done: (msg) => Debug.endContext('UI', msg)
};

window.Debug.board = {
    start: () => Debug.startContext('Board'),
    step: (msg, data) => Debug.step('Board', msg, data),
    stepError: (msg, err) => Debug.stepError('Board', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Board', msg),
    detail: (msg, data) => Debug.detail('Board', msg, data),
    info: (msg, data) => Debug.info('Board', msg, data),
    warn: (msg, data) => Debug.warn('Board', msg, data),
    error: (msg, err) => Debug.error('Board', msg, err),
    stopped: (msg) => Debug.stopped('Board', msg),
    done: (msg) => Debug.endContext('Board', msg)
};

window.Debug.init = {
    start: () => Debug.startContext('Init'),
    step: (msg, data) => Debug.step('Init', msg, data),
    stepError: (msg, err) => Debug.stepError('Init', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Init', msg),
    detail: (msg, data) => Debug.detail('Init', msg, data),
    info: (msg, data) => Debug.info('Init', msg, data),
    warn: (msg, data) => Debug.warn('Init', msg, data),
    error: (msg, err) => Debug.error('Init', msg, err),
    stopped: (msg) => Debug.stopped('Init', msg),
    done: (msg) => Debug.endContext('Init', msg)
};

window.Debug.liveSync = {
    start: () => Debug.startSyncContext('LiveSync', '⌛ Starting LiveSync...'),
    step: (msg, data) => Debug.step('LiveSync', msg, data),
    stepError: (msg, err) => Debug.stepError('LiveSync', msg, err),
    stepStopped: (msg) => Debug.stepStopped('LiveSync', msg),
    detail: (msg, data) => Debug.detail('LiveSync', msg, data),
    info: (msg, data) => Debug.info('LiveSync', msg, data),
    warn: (msg, data) => Debug.warn('LiveSync', msg, data),
    error: (msg, err) => Debug.error('LiveSync', msg, err),
    stopped: (msg) => Debug.stopped('LiveSync', msg),
    done: (msg) => Debug.endContext('LiveSync', msg)
};

window.Debug.drawing = {
    start: () => Debug.startContext('Drawing'),
    step: (msg, data) => Debug.step('Drawing', msg, data),
    stepError: (msg, err) => Debug.stepError('Drawing', msg, err),
    stepStopped: (msg) => Debug.stepStopped('Drawing', msg),
    detail: (msg, data) => Debug.detail('Drawing', msg, data),
    info: (msg, data) => Debug.info('Drawing', msg, data),
    log: (msg, data) => Debug.info('Drawing', msg, data),
    warn: (msg, data) => Debug.warn('Drawing', msg, data),
    error: (msg, err) => Debug.error('Drawing', msg, err),
    stopped: (msg) => Debug.stopped('Drawing', msg),
    done: (msg) => Debug.endContext('Drawing', msg)
};

// ============================================
// COMPREHENSIVE EMOJI MIGRATION PATTERNS
// ============================================
// Based on console output analysis, here are ALL the patterns found:
//
// INITIALIZATION & SETUP:
// console.log('✅ Dev mode controls initialized') → Debug.init.step('Dev mode controls initialized')
// console.log('🔧 Auth reset utility loaded...') → Debug.init.step('Auth reset utility loaded')
// console.log('🚀 Initializing...') → Debug.startContext('Context', 'Initializing...')
// console.log('🎛️ Live sync UI initialized') → Debug.liveSync.step('UI controller initialized')
//
// AUTHENTICATION:
// console.log('🔍 DEBUG: updateUIForUser...') → Debug.detail('Auth', 'updateUIForUser', data)
// console.log('👤 No user - showing sign in') → Debug.auth.detail('No user - showing sign in')
// console.log('📧 Email element updated') → Debug.auth.step('Email element updated')
// console.log('👥 Initializing user presence') → Debug.auth.step('Initializing user presence')
// console.log('🔐 Checking auth status') → Debug.auth.step('Checking authentication status')
// console.log('👋 User signed out') → Debug.auth.info('User signed out')
// console.log('🎆 Real user authenticated') → Debug.auth.step('Real user authenticated')
//
// SYNC OPERATIONS:
// console.log('🔄 Syncing...') → Debug.sync.step('Syncing...')
// console.log('📥 Found boards in Firebase') → Debug.firebase.step('Found boards in Firebase')
// console.log('📤 Syncing local changes') → Debug.sync.step('Syncing local changes')
// console.log('💾 Updated AppState') → Debug.sync.step('Updated AppState with Firebase data')
// console.log('📝 Local change detected') → Debug.sync.detail('Local change detected')
// console.log('⏭️ Ignoring own change') → Debug.sync.detail('Ignoring very recent own change')
// console.log('⏳ Waiting for dependencies') → Debug.detail('Context', 'Waiting for dependencies')
//
// UI UPDATES:
// console.log('🎨 Updating UI...') → Debug.ui.step('Updating UI with remote changes')
// console.log('🗗️ Element change detected') → Debug.ui.detail('Element change detected', { count })  // Shows ✅ or no emoji
// console.log('📌 Saved header') → Debug.board.detail('Saved header', { text, position })
// console.log('✍️ Quill text change') → Debug.ui.detail('Text editor change detected')
// console.log('🔔 Notification') → Debug.ui.info('Notification', message)
//
// BOARD OPERATIONS:
// console.log('📊 Board comparison') → Debug.board.detail('Board comparison', data)
// console.log('📁 Loading folders') → Debug.board.step('Loading folders')
// console.log('📂 Created folder') → Debug.board.step('Created folder')
// console.log('📄 Added file') → Debug.board.detail('Added file')
// console.log('🏷️ Tagged as') → Debug.board.detail('Tagged', data)
// console.log('🎯 Target found') → Debug.board.detail('Target', data)
//
// WARNINGS & ERRORS:
// console.log('⚠️ Warning...') → Debug.warn('Context', 'Warning...')
// console.log('❌ Error...') → Debug.error('Context', 'Error...', error)
// console.log('💥 Critical error') → Debug.error('Context', 'Critical error', error)
// console.log('🔥 Firebase error') → Debug.firebase.error('Operation failed', error)
//
// STOP/CANCEL OPERATIONS:
// console.log('🔴 Stopping...') → Debug.stopped('Context', 'Stopping...')
// console.log('❌ User signed out - stopping') → Debug.auth.stepStopped('User signed out - stopping sync')
// console.log('👆 User dragging - postponing') → Debug.sync.detail('User is dragging - postponing update')
// console.log('🕰️ Timeout reached') → Debug.stepStopped('Context', 'Timeout reached')
//
// UTILITY & DEBUG:
// console.log('🔍 DEBUG: ...') → Debug.detail('Context', '...', data)
// console.log('🧠 Smart detection') → Debug.step('Context', 'Setting up smart change detection')
// console.log('🧹 Cleaning up') → Debug.step('Context', 'Cleaning up')
// console.log('🔥 Firestore operation') → Debug.firebase.step('Firestore operation')
//
// EMOJI USAGE:
// ✅ Success messages and steps (including element changes)
// ❌ Errors and stopped operations
// ⌛ Sync operations (shown in start messages)
// 🤖 Event listeners and state detection (except element changes)
//
// NUMBERING: Regular numbers (1. 2. 3.) for steps
// ============================================
