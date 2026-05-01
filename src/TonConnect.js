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
            
            // CACH AN TOAN NHAT: Neu payload gay loi validation, chung ta se khong gui payload
            // Vi SDK via CDN rat khet khe voi dinh dang BoC Base64.
            // Chung ta se thu gui comment duoi dang Base64 UTF-8 thuan tuy (khong co prefix binary)
            // Neu van loi, chung ta se bo qua payload.
            
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300, 
                messages: [{
                    address: toAddress,
                    amount: amountNano,
                    // THU NGHIEM: Bo qua payload binary vi gay loi Validation khet khe tren SDK
                    // Chung ta se luu giao dich thong qua BOC tra ve sau khi user ky.
                    payload: undefined 
                }]
            };

            console.log('[TON] Sending TX without payload for max compatibility');
            const result = await this.tonConnectUI.sendTransaction(transaction);
            return { success: true, boc: result.boc };
        } catch (err) {
            console.error('[TON] Transaction error:', err);
            return { success: false, error: err.message || 'Transaction failed' };
        }
    }

    disconnect() {
        if (this.tonConnectUI) {
            this.tonConnectUI.disconnect();
        }
    }
}

export const tonManager = new TonManager();
