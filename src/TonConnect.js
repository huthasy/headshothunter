// Su dung doi tuong toan cuc tu CDN (window.TON_CONNECT_UI)
// Giup tranh loi build/load man hinh den trong Vite

class TonManager {
    constructor() {
        this.tonConnectUI = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        try {
            // Doi thu vien load tu CDN xong
            if (!window.TON_CONNECT_UI) {
                console.warn('[TON] Waiting for CDN script...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (window.TON_CONNECT_UI) {
                const { TonConnectUI } = window.TON_CONNECT_UI;
                this.tonConnectUI = new TonConnectUI({
                    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
                    buttonRootId: null
                });
                this.initialized = true;
                console.log('[TON] TonConnect initialized via CDN');
            } else {
                console.error('[TON] Library not found in window.TON_CONNECT_UI');
            }
        } catch (err) {
            console.error('[TON] Init error:', err);
        }
    }

    isConnected() {
        return this.tonConnectUI && this.tonConnectUI.connected;
    }

    async connect() {
        if (!this.tonConnectUI) await this.init();
        try {
            if (this.isConnected()) return true;
            await this.tonConnectUI.openModal();
            return new Promise((resolve) => {
                const unsub = this.tonConnectUI.onStatusChange((wallet) => {
                    if (wallet) { unsub(); resolve(true); }
                });
                setTimeout(() => { resolve(false); }, 60000);
            });
        } catch (err) {
            console.error('[TON] Connect error:', err);
            return false;
        }
    }

    async sendTransaction(toAddress, amountTON, comment = '') {
        if (!this.isConnected()) {
            const connected = await this.connect();
            if (!connected) return { success: false, error: 'Wallet not connected' };
        }

        try {
            const amountNano = Math.floor(amountTON * 1e9).toString();
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [{
                    address: toAddress,
                    amount: amountNano,
                    payload: comment ? this._createCommentPayload(comment) : undefined
                }]
            };

            const result = await this.tonConnectUI.sendTransaction(transaction);
            return { success: true, boc: result.boc };
        } catch (err) {
            console.error('[TON] Transaction error:', err);
            return { success: false, error: err.message || 'Transaction failed' };
        }
    }

    _createCommentPayload(text) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        const prefix = new Uint8Array(4); 
        const payload = new Uint8Array(prefix.length + bytes.length);
        payload.set(prefix);
        payload.set(bytes, prefix.length);
        let binary = '';
        for (let i = 0; i < payload.length; i++) {
            binary += String.fromCharCode(payload[i]);
        }
        return btoa(binary);
    }

    disconnect() {
        if (this.tonConnectUI) {
            this.tonConnectUI.disconnect();
        }
    }
}

export const tonManager = new TonManager();
