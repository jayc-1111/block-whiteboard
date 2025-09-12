// Dialog functionality
function showConfirmDialog(title, message, onConfirm) {
    // Remove any existing dialogs first to prevent stacking
    const existingDialogs = document.querySelectorAll('.dialog-overlay, .confirm-dialog');
    existingDialogs.forEach(dialog => dialog.remove());
    
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-buttons">
            <button class="confirm-btn confirm-yes">Yes</button>
            <button class="confirm-btn">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    const removeDialog = () => {
        overlay.remove();
        dialog.remove();
    };
    
    dialog.querySelector('.confirm-yes').onclick = () => {
        try {
            onConfirm();
        } catch (error) {
            console.error('Error in confirm dialog callback:', error);
        } finally {
            removeDialog();
        }
    };
    
    dialog.querySelector('.confirm-btn:not(.confirm-yes)').onclick = removeDialog;
    overlay.onclick = removeDialog;
    
    // Prevent dialog from closing when clicking inside it
    dialog.onclick = (e) => {
        e.stopPropagation();
    };
}
