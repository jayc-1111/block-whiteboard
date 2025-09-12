// === SIMPLE NOTIFICATIONS SERVICE ===
// Lightweight notification system for Appwrite database operations
// Replaces Firebase notifications with minimal user feedback

(function() {
    'use strict';

    // Create notification container
    const notificationsContainer = document.createElement('div');
    notificationsContainer.id = 'notifications-container';
    notificationsContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
    `;

    // Add to DOM when ready
    function initializeNotifications() {
        if (document.body) {
            document.body.appendChild(notificationsContainer);
        } else {
            setTimeout(initializeNotifications, 100);
        }
    }

    // Notification system
    const notifications = {
        showNotification: function(message, type = 'info', duration = 5000) {
            // Create notification element
            const notification = document.createElement('div');
            const notificationId = 'notification-' + Date.now();

            notification.id = notificationId;
            notification.style.cssText = `
                margin-bottom: 10px;
                padding: 12px 16px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                pointer-events: auto;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                position: relative;
            `;

            // Set colors based on type
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            notification.style.backgroundColor = colors[type] || colors.info;

            // Add message
            notification.textContent = message;

            // Add close button
            const closeBtn = document.createElement('span');
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                margin-left: 10px;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                opacity: 0.8;
            `;
            closeBtn.onclick = () => this.hideNotification(notificationId);

            notification.appendChild(closeBtn);

            // Add to container
            notificationsContainer.appendChild(notification);

            // Animate in
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 10);

            // Auto-hide after duration
            if (duration > 0) {
                setTimeout(() => {
                    this.hideNotification(notificationId);
                }, duration);
            }

            return notificationId;
        },

        hideNotification: function(notificationId) {
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';

                // Remove from DOM after animation
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        },

        // Shorthand methods for common types
        success: function(message, duration) {
            return this.showNotification(message, 'success', duration);
        },

        error: function(message, duration = 7000) { // Longer duration for errors
            return this.showNotification(message, 'error', duration);
        },

        warning: function(message, duration) {
            return this.showNotification(message, 'warning', duration);
        },

        info: function(message, duration) {
            return this.showNotification(message, 'info', duration);
        },

        // Clear all notifications
        clear: function() {
            notificationsContainer.innerHTML = '';
        }
    };

    // Export globally
    window.simpleNotifications = notifications;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeNotifications);
    } else {
        initializeNotifications();
    }

    // Console log for debugging
    console.log('🔧 Simple notifications service initialized');
})();
