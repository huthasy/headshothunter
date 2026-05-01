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
            
            // CACH MOI: Su dung comment duoi dang payload chuẩn
            // Neu SDK bao loi payload, co the do format binary bi sai
            // Chung ta se thu gui duoi dang text comment format (0x00000000 + text)
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300, // Toi da 5 phut
                messages: [{
                    address: toAddress,
                    amount: amountNano,
                    payload: comment ? this._createCommentPayload(comment) : undefined
                }]
            };

            console.log('[TON] Final TX object:', JSON.stringify(transaction));
            const result = await this.tonConnectUI.sendTransaction(transaction);
            return { success: true, boc: result.boc };
        } catch (err) {
            console.error('[TON] Transaction error:', err);
            return { success: false, error: err.message || 'Transaction failed' };
        }
    }

    _createCommentPayload(text) {
        // Thu dung format Hex neu Base64 bi tu choi
        // Op code 0x00000000 (4 bytes 0) + UTF-8 bytes
        const buffer = new TextEncoder().encode(text);
        const payload = new Uint8Array(4 + buffer.length);
        payload.set([0, 0, 0, 0]);
        payload.set(buffer, 4);
        
        // Convert Uint8Array sang Hex string (mot so vi TON thich Hex hon)
        // Neu SDK van loi, chung ta se bo qua comment de dam bao giao dich chay duoc
        return Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    disconnect() {
        if (this.tonConnectUI) {
            this.tonConnectUI.disconnect();
        }
    }
}

export const tonManager = new TonManager();
