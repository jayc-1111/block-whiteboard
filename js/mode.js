// Mode Management

function toggleDevMode() {
    isDevMode = !isDevMode;
    AppState.set('isDevMode', isDevMode);
    const devModeOption = document.getElementById('devModeOption');
    
    if (isDevMode) {
        devModeOption.textContent = 'Free Mode';
        // Initialize and show dev overlay
        if (window.toggleDevOverlay) {
            window.toggleDevOverlay(true);
        }
        // Update guest info
        const user = window.syncService?.authService?.getCurrentUser();
        if (user) {
            if (user.isAnonymous) {
                window.setDevInfo?.('guestId', user.uid.slice(-6).toUpperCase());
            } else {
                window.setDevInfo?.('userEmail', user.email);
            }
        }
        // Update board info
        updateDevBoardInfo();
        
        // Save dev mode state
        if (window.syncService) {
            window.syncService.markPendingChanges();
        }
    } else {
        devModeOption.textContent = 'Dev Mode';
        if (window.toggleDevOverlay) {
            window.toggleDevOverlay(false);
        }
    }
}

// Update board info in dev overlay
function updateDevBoardInfo() {
    const boards = AppState.get('boards');
    const currentBoardId = AppState.get('currentBoardId');
    const board = boards?.find(b => b.id === currentBoardId);
    
    if (board) {
        window.setDevInfo?.('boardName', board.name);
        window.setDevInfo?.('categories', board.categories?.length || 0);
        const cardCount = board.categories?.reduce((sum, cat) => sum + (cat.cards?.length || 0), 0) || 0;
        window.setDevInfo?.('cards', cardCount);
    }
}

// Payment Modal
function showPaymentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content payment-modal">
            <div class="modal-header">
                <h2>Upgrade to Pro</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="payment-feature">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Unlimited whiteboards</span>
                </div>
                <div class="payment-feature">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>All customization options</span>
                </div>
                <div class="payment-feature">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Priority support</span>
                </div>
                <div class="payment-price">
                    <div class="price-amount">$9.99</div>
                    <div class="price-period">per month</div>
                </div>
                <button class="payment-button">Upgrade Now</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Payment button handler
    const paymentBtn = modal.querySelector('.payment-button');
    paymentBtn.addEventListener('click', () => {
        alert('Payment integration coming soon!');
        modal.remove();
    });
}

// Modified addWhiteboard function for free mode
function addWhiteboardWithPaymentCheck() {
    if (!isDevMode) {
        // Always show payment modal in free mode
        showPaymentModal();
        return;
    }
    // In dev mode, add whiteboard normally
    addWhiteboard();
}
