// Dialog functionality
function showConfirmDialog(title, message, onConfirm) {
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
        onConfirm();
        removeDialog();
    };
    
    dialog.querySelector('.confirm-btn:not(.confirm-yes)').onclick = removeDialog;
    overlay.onclick = removeDialog;
}
