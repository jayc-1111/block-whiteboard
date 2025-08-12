// Simple blue notification system for save status
window.simpleNotifications = {
    showSaveNotification(status) {
        // Remove any existing notifications
        const existing = document.querySelector('.save-notification');
        if (existing) {
            existing.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        
        // Set content and style based on status
        switch(status) {
            case 'saving':
                notification.textContent = 'Saving...';
                notification.style.background = '#3b82f6'; // Blue
                break;
            case 'saved':
                notification.textContent = 'Saved';
                notification.style.background = '#3b82f6'; // Blue
                break;
            case 'error':
                notification.textContent = 'Save failed';
                notification.style.background = '#ef4444'; // Red
                break;
            default:
                notification.textContent = status;
                notification.style.background = '#3b82f6';
        }
        
        // Common styles
        notification.style.position = 'fixed';
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.color = 'white';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '1000001';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        notification.style.transition = 'all 0.3s ease';
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-hide after 2 seconds (except for saving status)
        if (status !== 'saving') {
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100px)';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Debug.ui.step('Notification system restored');
    });
} else {
    Debug.ui.step('Notification system restored');
}
