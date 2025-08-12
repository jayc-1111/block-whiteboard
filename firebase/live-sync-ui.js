/**
 * MARKED FOR REMOVAL: Live sync UI component (feature disabled)
 * This is the Firebase version. There's a duplicate in js/live-sync-ui.js
 * Safe to delete - live sync is disabled
 */

// Simplified Live Sync UI Controller - Dev Mode Only
export const liveSyncUI = {
    statusElement: null,
    presenceElement: null,
    activeNotifications: [], // Track active notifications
    
    init() {
        this.statusElement = document.getElementById('liveSyncStatus');
        this.presenceElement = document.getElementById('userPresence');
        
        // Initially hide live sync controls
        this.updateVisibility();
        
        // Monitor dev mode changes
        if (typeof AppState !== 'undefined') {
            AppState.onChange('isDevMode', () => {
                this.updateVisibility();
            });
        }
        
        // Set up click handler for status element
        if (this.statusElement) {
            this.statusElement.addEventListener('click', this.toggleLiveSync.bind(this));
            this.statusElement.style.cursor = 'pointer';
            this.statusElement.title = 'Click to toggle live sync';
        }
        
        // Start status monitoring
        this.startStatusMonitoring();
        
        Debug.liveSync.step('Live sync UI controller initialized (dev mode only)');
    },
    
    // Update visibility based on dev mode
    updateVisibility() {
        // Live sync controls are now permanently hidden in toolbar
        // They're displayed in the dev overlay instead
        const liveSyncControls = document.querySelector('.live-sync-controls');
        if (liveSyncControls) {
            liveSyncControls.style.display = 'none';
        }
        
        // If hiding live sync in non-dev mode, also stop the service
        const isDevMode = AppState && AppState.get('isDevMode');
        if (!isDevMode && window.liveSyncService) {
            window.liveSyncService.stopLiveSync();
        }
    },
    
    // Update live sync status display
    updateStatus(isLive, details = {}) {
        if (!this.statusElement) return;
        
        const span = this.statusElement.querySelector('span');
        if (!span) return;
        
        if (isLive) {
            span.textContent = `Live Sync: ON${details.userCount > 1 ? ` (${details.userCount} users)` : ''}`;
            this.statusElement.className = 'live-sync-status';
            this.statusElement.title = 'Live sync active - changes are synced in real-time';
            window.setDevInfo?.('liveSync', true);
        } else {
            span.textContent = 'Live Sync: OFF';
            this.statusElement.className = 'live-sync-status offline';
            this.statusElement.title = 'Live sync disabled - click to enable';
            window.setDevInfo?.('liveSync', false);
        }
    },
    
    // Update syncing status
    updateSyncingStatus(isSyncing) {
        if (!this.statusElement) return;
        
        if (isSyncing) {
            this.statusElement.classList.add('syncing');
            const span = this.statusElement.querySelector('span');
            if (span) span.textContent = 'Syncing...';
        } else {
            this.statusElement.classList.remove('syncing');
        }
    },
    
    // Show live update notification
    showUpdateNotification(message) {
        // Calculate position based on existing notifications
        const baseTop = 60;
        const spacing = 10;
        const notificationHeight = 40;
        const topPosition = baseTop + (this.activeNotifications.length * (notificationHeight + spacing));
        
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'live-update-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: ${topPosition}px;
            right: 20px;
            background: rgba(59, 130, 246, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.875rem;
            z-index: 10000;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 150px;
            text-align: center;
        `;
        
        document.body.appendChild(notification);
        this.activeNotifications.push(notification);
        
        // Animate in from bottom
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                // Remove from active notifications and update positions
                const index = this.activeNotifications.indexOf(notification);
                if (index > -1) {
                    this.activeNotifications.splice(index, 1);
                    this.updateNotificationPositions();
                }
            }, 300);
        }, 2500);
    },
    
    // Update positions of remaining notifications
    updateNotificationPositions() {
        const baseTop = 60;
        const spacing = 10;
        const notificationHeight = 40;
        
        this.activeNotifications.forEach((notification, index) => {
            const newTop = baseTop + (index * (notificationHeight + spacing));
            notification.style.transition = 'top 0.3s ease';
            notification.style.top = `${newTop}px`;
        });
    },
    
    // Update user presence
    updateUserPresence(users) {
        if (!this.presenceElement) return;
        
        this.presenceElement.innerHTML = '';
        
        users.forEach(user => {
            const avatar = document.createElement('div');
            avatar.className = 'user-avatar online';
            avatar.title = user.email;
            
            // Create initials from email
            const initials = user.email
                .split('@')[0]
                .split('.')
                .map(part => part.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
            
            avatar.textContent = initials;
            avatar.style.background = this.generateUserColor(user.email);
            
            this.presenceElement.appendChild(avatar);
        });
    },
    
    // Generate consistent color for user
    generateUserColor(email) {
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 60%)`;
    },
    
    // Toggle live sync on/off
    toggleLiveSync() {
        // Only allow in dev mode
        if (!AppState || !AppState.get('isDevMode')) {
            console.warn('Live sync is only available in dev mode');
            return;
        }
        
        if (!window.liveSyncService) {
            console.warn('Live sync service not available');
            return;
        }
        
        const status = window.liveSyncService.getSyncStatus();
        
        if (status.isLive) {
            // Turn off live sync
            window.liveSyncService.stopLiveSync();
            this.updateStatus(false);
            this.showUpdateNotification('Live sync disabled');
        } else {
            // Turn on live sync
            const user = window.authService?.getCurrentUser();
            if (user) {
                window.liveSyncService.startLiveSync();
                this.updateStatus(true);
                this.showUpdateNotification('Live sync enabled');
            } else {
                this.showUpdateNotification('Please sign in to enable live sync');
            }
        }
    },
    
    // Start monitoring sync status
    startStatusMonitoring() {
        // Update immediately
        this.checkAndUpdateStatus();
        
        // Then monitor periodically
        setInterval(() => {
            this.checkAndUpdateStatus();
        }, 1000); // Check every second
    },
    
    // Check and update status
    checkAndUpdateStatus() {
        // Only update if in dev mode
        if (!AppState || !AppState.get('isDevMode')) return;
        
        if (window.liveSyncService) {
            const status = window.liveSyncService.getSyncStatus();
            this.updateStatus(status.isLive, {
                userCount: status.userCount,
                listeners: status.activeListeners
            });
            
            this.updateSyncingStatus(status.isApplyingChanges);
        }
    },
    
    // Show debug panel (for development)
    showDebugPanel() {
        // Only show in dev mode
        if (!AppState || !AppState.get('isDevMode')) return;
        
        let debugPanel = document.getElementById('liveSyncDebugPanel');
        
        if (!debugPanel) {
            debugPanel = document.createElement('div');
            debugPanel.id = 'liveSyncDebugPanel';
            debugPanel.className = 'live-sync-debug show';
            document.body.appendChild(debugPanel);
        }
        
        const updateDebugInfo = () => {
            if (window.liveSyncService) {
                const status = window.liveSyncService.getSyncStatus();
                debugPanel.innerHTML = `
                    <h4>🔴 Live Sync Debug</h4>
                    <ul>
                        <li>Status: ${status.isLive ? 'ACTIVE' : 'INACTIVE'}</li>
                        <li>Listeners: ${status.activeListeners.join(', ') || 'none'}</li>
                        <li>Processing: ${status.isApplyingChanges ? 'YES' : 'NO'}</li>
                        <li>Users: ${status.userCount}</li>
                        <li>Auth: ${window.authService?.getCurrentUser()?.email || 'none'}</li>
                    </ul>
                `;
            }
        };
        
        updateDebugInfo();
        setInterval(updateDebugInfo, 1000);
        
        // Hide after 10 seconds
        setTimeout(() => {
            debugPanel.classList.remove('show');
        }, 10000);
    },
    
    // Highlight element with live change animation
    highlightLiveChange(element) {
        if (!element) return;
        
        element.classList.add('live-change-highlight');
        setTimeout(() => {
            element.classList.remove('live-change-highlight');
        }, 1500);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        liveSyncUI.init();
    });
} else {
    liveSyncUI.init();
}

// Global access for debugging
window.liveSyncUI = liveSyncUI;

// Keyboard shortcut for debug panel (Ctrl+Shift+L) - only in dev mode
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        liveSyncUI.showDebugPanel();
    }
});