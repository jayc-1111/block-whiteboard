// Payment modal handler - CSP compliant
const paymentModal = {
    modal: null,

    init() {
        this.modal = document.getElementById('paymentModal');
        if (!this.modal) {
            Debug.ui.warn('Payment modal element not found');
            return;
        }

        this.setupEventListeners();
        Debug.init.step('Payment modal initialized');
    },

    setupEventListeners() {
        // Upgrade Now button
        const upgradeBtn = this.modal.querySelector('.btn-primary');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.handleUpgrade());
        }

        // Maybe Later button
        const laterBtn = this.modal.querySelector('.btn-secondary');
        if (laterBtn) {
            laterBtn.addEventListener('click', () => this.close());
        }

        // Click outside to close
        this.modal.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    },

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
        }
    },

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    },

    isOpen() {
        return this.modal && this.modal.style.display === 'flex';
    },

    handleUpgrade() {
        // Placeholder for payment processing
        alert('Payment feature coming soon!');
        // In a real implementation, this would redirect to a payment processor
        // or open a more sophisticated payment flow
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    paymentModal.init();
});

// Make globally available for backward compatibility
window.paymentModal = paymentModal;
window.closePaymentModal = () => paymentModal.close();
