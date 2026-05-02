import Phaser from 'phaser';
import { Player } from '../classes/Player.js';
import { Enemy } from '../classes/Enemy.js';
import { GlobalState } from '../GlobalState.js';
import { tonManager } from '../TonConnect.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // Load audio from public CDN
    this.load.audio('bgm', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_73229b19e2.mp3?filename=cyberpunk-2099-10701.mp3');
    this.load.audio('shoot', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_2d0ed848f3.mp3?filename=pistol-shot-230554.mp3');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.platforms = this.physics.add.staticGroup();
    this.stairs = [];
    this.bgStairs = [];
    this.activeBullets = [];
    this.enemyBullets = [];
    
    this.centerX = this.scale.width / 2;
    this.playerSide = 'left';
    this.currentY = this.scale.height - 200;
    this.currentFloorSteps = 5;
    this.nextFloorSteps = Phaser.Math.Between(3, 7);
    this.isBossChasing = false; // Flag de duy tri boss khi duoi theo

    // Audio - handle browser audio unlock policies
    if (!this.registry.get('bgm_playing')) {
        const playBgm = () => {
            if (this.cache.audio.exists('bgm')) {
                this.bgm = this.sound.add('bgm', { loop: true, volume: 0.3 });
                this.bgm.play();
                this.registry.set('bgm_playing', true);
            }
        };
        if (this.sound.locked) {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, playBgm);
        } else {
            playBgm();
        }
    }

    this.playerHP = GlobalState.getMaxHP();

    const startX = this.scale.width * 0.25; 
    this.player = new Player(this, startX, this.currentY);
    this.spawnEnemy();

    this.input.on('pointerdown', (pointer) => {
        if (this.popupOpen) return;
        if (!this.isTransitioning && this.player && !this.player.isShooting) {
            const bullets = this.player.fire();
            if (bullets && bullets.length > 0) {
                this.activeBullets.push(...bullets);
            }
        }
    });

    this.isTransitioning = false;
    this.popupOpen = false;

    // ===== UI =====
    this.createUI();
  }

  createUI() {
    // --- Top Resource Bar ---
    const topBg = this.add.rectangle(this.scale.width/2, 40, this.scale.width - 20, 70, 0x000000, 0.5).setScrollFactor(0).setDepth(90);
    
    // GOLD
    this.goldIcon = this.add.text(20, 20, '💰', { fontSize: '18px' }).setScrollFactor(0).setDepth(100);
    this.goldText = this.add.text(45, 20, `${GlobalState.gold}`, { fontSize: '18px', color: '#FFD700', fontFamily: 'Arial Black' }).setScrollFactor(0).setDepth(100);
    
    // HHT COIN
    this.hhtIcon = this.add.text(120, 20, '🪙', { fontSize: '18px' }).setScrollFactor(0).setDepth(100);
    this.hhtText = this.add.text(145, 20, `${GlobalState.hhtCoin}`, { fontSize: '18px', color: '#00FFFF', fontFamily: 'Arial Black' }).setScrollFactor(0).setDepth(100);

    // TON (Dưới ô Gold, ngang hàng HP)
    this.tonIcon = this.add.text(120, 50, '💎', { fontSize: '18px' }).setScrollFactor(0).setDepth(100);
    this.tonText = this.add.text(145, 50, `${GlobalState.totalTonDeposited.toFixed(2)}`, { fontSize: '18px', color: '#0088CC', fontFamily: 'Arial Black' }).setScrollFactor(0).setDepth(100);

    // STAGE & FLOOR
    this.stageText = this.add.text(this.scale.width - 20, 20, `STAGE ${GlobalState.currentStage} - FLOOR ${GlobalState.currentFloor}`, { 
        fontSize: '14px', color: '#FFFFFF', fontFamily: 'Arial Black' 
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.hpText = this.add.text(20, 50, `HP: ${this.playerHP}`, { fontSize: '20px', color: '#00FF00', fontFamily: 'Arial Black' }).setScrollFactor(0).setDepth(100);

    // SWAP ICON - Neon Green
    const swapBg = this.add.rectangle(30, this.scale.height - 360, 50, 50, 0x002010, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x00FF00);
    this.add.text(30, this.scale.height - 360, '💱', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    swapBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openSwap('swap'); });
    this.tweens.add({ targets: swapBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    // MISSION ICON - Neon Orange
    const missionBg = this.add.rectangle(30, this.scale.height - 300, 50, 50, 0x1a0d00, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xFF8800);
    this.add.text(30, this.scale.height - 300, '📋', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    missionBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openMissions(); });
    this.tweens.add({ targets: missionBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1, delay: 100 });

    // RANKING ICON - Neon Gold
    const rankBg = this.add.rectangle(30, this.scale.height - 240, 50, 50, 0x1a1500, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xFFD700);
    this.add.text(30, this.scale.height - 240, '🏆', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    rankBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openRanking(); });
    this.tweens.add({ targets: rankBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1, delay: 200 });

    // WALLET ICON - Neon Blue/Green
    const walletColor = tonManager.isConnected() ? 0x00FF88 : 0x00BFFF;
    this.walletBg = this.add.rectangle(30, this.scale.height - 180, 50, 50, 0x001020, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, walletColor);
    this.walletIcon = this.add.text(30, this.scale.height - 180, tonManager.isConnected() ? '🔗' : '🔌', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.walletBg.on('pointerdown', async (p, x, y, e) => { 
        e.stopPropagation(); 
        if (tonManager.isConnected()) {
            if (confirm("Disconnect Wallet?")) {
                tonManager.disconnect();
                this.updateWalletUI();
            }
        } else {
            await tonManager.connect();
            this.updateWalletUI();
        }
    });
    this.walletPulse = this.tweens.add({ targets: this.walletBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    // SHOP ICON - Neon Magenta
    const shopBg = this.add.rectangle(30, this.scale.height - 120, 50, 50, 0x1a0020, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xFF00FF);
    const shopIcon = this.add.text(30, this.scale.height - 120, '🛒', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    shopBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openShop(); });
    this.tweens.add({ targets: shopBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    // HERO ICON - Neon Cyan
    const heroBg = this.add.rectangle(30, this.scale.height - 60, 50, 50, 0x001a20, 0.9).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x00FFFF);
    this.add.text(30, this.scale.height - 60, '🦸', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    heroBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openHero(); });
    this.tweens.add({ targets: heroBg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1, delay: 400 });

    this.popupGroup = [];
  }

  updateWalletUI() {
    const connected = tonManager.isConnected();
    const color = connected ? 0x00FF88 : 0x00BFFF;
    if (this.walletBg) this.walletBg.setStrokeStyle(2, color);
    if (this.walletIcon) this.walletIcon.setText(connected ? '🔗' : '🔌');
  }

  clearPopup() {
    this.popupGroup.forEach(el => { if (el && el.destroy) el.destroy(); });
    this.popupGroup = [];
    this.popupOpen = false;
    this.isCheckingMissions = false; // Reset trang thai check
  }

  async autoCheckMissions() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check Daily Missions
    for (const m of GlobalState.dailyMissions) {
        const key = `${m.id}_${todayStr}`;
        if (!GlobalState.completedDailyMissions.includes(key) && !this[`verified_${key}`]) {
            const success = await GlobalState.checkTelegramJoin(m.id);
            if (success) {
                this[`verified_${key}`] = true;
                if (this.popupOpen) this.openMissions('missions'); // Refresh UI neu popup van mo
            }
        }
    }

    // Check One-time Missions
    for (const m of GlobalState.onetimeMissions) {
        if (!GlobalState.completedOnetimeMissions.includes(m.id) && !this[`verified_onetime_${m.id}`]) {
            const success = await GlobalState.checkTelegramJoin(m.id);
            if (success) {
                this[`verified_onetime_${m.id}`] = true;
                if (this.popupOpen) this.openMissions('missions');
            }
        }
    }
    
    this.isCheckingMissions = false;
  }

  // ========== SWAP / EXCHANGE POPUP ==========
  openSwap(tab = 'swap') {
    const accent = 0x00FF00;
    const { startY, centerX, w } = this.createPopupBase('💱 EXCHANGE', accent);
    let y = startY;

    // Tabs
    const tabY = y;
    const tabW = w / 3;

    const createTab = (label, id, idx) => {
        const isActive = tab === id;
        const color = isActive ? '#00FF00' : '#ffffff';
        const bg = isActive ? 0x002a10 : 0x0a0a1a;
        const tabX = centerX - w/2 + tabW/2 + idx * tabW;
        
        const tabBg = this.add.rectangle(tabX, tabY, tabW - 4, 30, bg).setScrollFactor(0).setDepth(202).setInteractive({ useHandCursor: true }).setStrokeStyle(1, isActive ? 0x00FF00 : 0x333333);
        const tabText = this.add.text(tabX, tabY, label, { fontSize: '12px', color: color, fontFamily: 'Arial Black' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        
        tabBg.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.openSwap(id); });
        this.popupGroup.push(tabBg, tabText);
    };

    createTab('SWAP', 'swap', 0);
    createTab('DEPOSIT', 'deposit', 1);
    createTab('WITHDRAW', 'withdraw', 2);

    y += 40;

    if (tab === 'swap') {
        this.addNeonSection(centerX, y, '▸ SWAP HHT TO TON ◂', accent);
        y += 25;
        
        const rate = GlobalState.exchangeConfig.hhtToTonRate;
        const info = this.add.text(centerX, y, `Rate: ${rate} HHT = 1 TON`, { fontSize: '14px', color: '#00FFFF' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(info);
        y += 30;

        const currentHht = this.add.text(centerX, y, `Your HHT: ${GlobalState.hhtCoin} 🪙`, { fontSize: '16px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(currentHht);
        y += 40;

        // Simulate swap amount buttons
        const addBtn = (label, amount, px) => {
            const btn = this.add.text(px, y, label, {
                fontSize: '12px', color: '#00FF00', backgroundColor: '#002210', padding: { x: 8, y: 5 }, fontFamily: 'Arial Black'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
            
            btn.on('pointerdown', (p, lx, ly, e) => {
                e.stopPropagation();
                const actualAmount = amount === 'ALL' ? GlobalState.hhtCoin : amount;
                if (actualAmount <= 0) {
                    this.showBlinkingText("Not enough HHT!", centerX, this.scale.height/2, '#FF0000', 16);
                    return;
                }
                const res = GlobalState.swapHhtToTon(actualAmount);
                if (res.success) {
                    this.updateResourcesDisplay();
                    this.showBlinkingText(res.msg, centerX, this.scale.height/2, '#00FF00', 16);
                    this.openSwap('swap');
                } else {
                    this.showBlinkingText(res.msg, centerX, this.scale.height/2, '#FF0000', 16);
                }
            });
            this.popupGroup.push(btn);
        };
        
        addBtn('Swap 1000', 1000, centerX - 90);
        addBtn('Swap 5000', 5000, centerX);
        addBtn('Swap ALL', 'ALL', centerX + 90);

    } else if (tab === 'deposit') {
        this.addNeonSection(centerX, y, '▸ DEPOSIT TON ◂', 0x00BFFF);
        y += 25;

        const currentTon = this.add.text(centerX, y, `In-Game Balance: ${GlobalState.totalTonDeposited.toFixed(2)} 💎`, { fontSize: '16px', color: '#00BFFF' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(currentTon);
        y += 40;

        const options = GlobalState.exchangeConfig.depositOptions || [1, 5, 10];
        const numOptions = options.length;
        const totalW = numOptions * 80;
        let startX = centerX - totalW/2 + 40;

        const addDepositBtn = (amount, px) => {
            const btn = this.add.text(px, y, `+${amount} TON`, {
                fontSize: '14px', color: '#00BFFF', backgroundColor: '#001a30', padding: { x: 10, y: 5 }, fontFamily: 'Arial Black'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
            
            btn.on('pointerdown', async (p, lx, ly, e) => {
                e.stopPropagation();
                btn.setText('⏳...');
                try {
                    await tonManager.init();
                    const result = await tonManager.sendTransaction(
                        GlobalState.tonReceiveAddress,
                        amount,
                        `Deposit:${GlobalState.playerId}`
                    );
                    if (result.success) {
                        const res = GlobalState.depositTon(amount);
                        this.updateResourcesDisplay();
                        this.showBlinkingText(res.msg, centerX, this.scale.height/2, '#00FF00', 16);
                        this.openSwap('deposit');
                    } else {
                        btn.setText(`+${amount} TON`);
                        this.showBlinkingText(result.error || 'FAILED', centerX, this.scale.height/2, '#FF3366', 24);
                    }
                } catch (err) {
                    btn.setText(`+${amount} TON`);
                    console.error('[TON] Deposit error:', err);
                }
            });
            this.popupGroup.push(btn);
        };

        options.forEach((opt, idx) => {
            addDepositBtn(opt, startX + idx * 80);
        });

        y += 50;
        const note = this.add.text(centerX, y, "Requires TonConnect. Top-up TON\nto use in Shop and Game.", { fontSize: '11px', color: '#888888', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(note);

    } else if (tab === 'withdraw') {
        this.addNeonSection(centerX, y, '▸ WITHDRAW TON ◂', 0xFF3366);
        y += 25;

        const currentTon = this.add.text(centerX, y, `In-Game Balance: ${GlobalState.totalTonDeposited.toFixed(2)} 💎`, { fontSize: '16px', color: '#00BFFF' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(currentTon);
        y += 30;

        // Calculate highest milestone
        let highestMilestone = null;
        for (const m of GlobalState.referralConfig.milestones) {
            if (GlobalState.referralCount >= m.count && GlobalState.totalTonDeposited >= (m.required_ton || 0)) {
                highestMilestone = m;
            }
        }

        const limit = highestMilestone ? highestMilestone.daily_withdraw_limit : 0;
        const availableLimit = Math.max(0, limit - GlobalState.dailyTonWithdrawn);

        const limitInfo = this.add.text(centerX, y, `Daily Limit: ${availableLimit.toFixed(2)} / ${limit.toFixed(2)} TON`, { fontSize: '14px', color: availableLimit > 0 ? '#00FF00' : '#FF0000' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(limitInfo);
        y += 25;

        const reqInfo = this.add.text(centerX, y, `Unlocked by: ${highestMilestone ? highestMilestone.count + ' F1 & ' + highestMilestone.required_ton + ' TON Dep.' : 'None'}`, { fontSize: '11px', color: '#FFE082' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(reqInfo);
        y += 25;

        const feeInfo = this.add.text(centerX, y, `Withdraw Fee: ${GlobalState.exchangeConfig.withdrawFeePercent}%`, { fontSize: '12px', color: '#FF3366' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(feeInfo);
        y += 40;

        // Withdraw buttons
        const addWithdrawBtn = (amount, px) => {
            const btn = this.add.text(px, y, `${amount} TON`, {
                fontSize: '14px', color: '#FF3366', backgroundColor: '#300010', padding: { x: 10, y: 5 }, fontFamily: 'Arial Black'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
            
            btn.on('pointerdown', (p, lx, ly, e) => {
                e.stopPropagation();
                if (amount > availableLimit) {
                    this.showBlinkingText("Exceeds daily limit!", centerX, this.scale.height/2, '#FF0000', 16);
                    return;
                }
                const res = GlobalState.withdrawTon(amount);
                if (res.success) {
                    this.tonText.setText(`${GlobalState.totalTonDeposited.toFixed(2)}`);
                    this.showBlinkingText(res.msg, centerX, this.scale.height/2, '#00FF00', 14);
                    this.openSwap('withdraw');
                } else {
                    this.showBlinkingText(res.msg, centerX, this.scale.height/2, '#FF0000', 16);
                }
            });
            this.popupGroup.push(btn);
        };

        if (limit > 0) {
            addWithdrawBtn(0.1, centerX - 80);
            addWithdrawBtn(0.5, centerX);
            addWithdrawBtn(1.0, centerX + 80);
        } else {
            const msg = this.add.text(centerX, y, "You need at least 1 F1 and 1 TON deposited\nto unlock withdrawals.", { fontSize: '11px', color: '#666666', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
            this.popupGroup.push(msg);
        }
    }
  }

  // ========== NEON POPUP BASE ==========
  createPopupBase(title, accentColor = 0xFF00FF) {
    this.clearPopup();
    this.popupOpen = true;
    const sw = this.scale.width, sh = this.scale.height;
    const w = sw - 40, h = sh - 80;

    // Dark overlay
    const overlay = this.add.rectangle(sw/2, sh/2, sw, sh, 0x000000, 0.75).setScrollFactor(0).setDepth(200).setInteractive();
    overlay.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); });

    // Outer glow border
    const outerGlow = this.add.rectangle(sw/2, sh/2, w + 6, h + 6, accentColor, 0.15).setScrollFactor(0).setDepth(200);
    // Main panel - dark glassmorphism
    const bg = this.add.rectangle(sw/2, sh/2, w, h, 0x0a0a1a, 0.95).setScrollFactor(0).setDepth(201).setStrokeStyle(2, accentColor);
    // Inner line decoration
    const topLine = this.add.rectangle(sw/2, 55, w - 20, 2, accentColor, 0.5).setScrollFactor(0).setDepth(202);

    // Title with neon glow effect
    const accentHex = '#' + accentColor.toString(16).padStart(6, '0');
    const titleText = this.add.text(sw/2, 40, title, {
        fontSize: '26px', color: accentHex, fontFamily: 'Arial',
        stroke: accentHex, strokeThickness: 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    // Title pulse animation
    this.tweens.add({ targets: titleText, alpha: 0.7, duration: 1000, yoyo: true, repeat: -1 });

    // Close button - neon red X
    const closeBtn = this.add.text(sw - 35, 40, '✕', {
        fontSize: '24px', color: '#FF3366', stroke: '#FF3366', strokeThickness: 1
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.clearPopup(); });

    // Gold display in popup header
    const goldDisplay = this.add.text(30, 40, `💰 ${GlobalState.gold}G`, {
        fontSize: '18px', color: '#FFD700'
    }).setScrollFactor(0).setDepth(203);

    this.popupGroup.push(overlay, outerGlow, bg, topLine, titleText, closeBtn, goldDisplay);
    return { startY: 75, w, centerX: sw/2 };
  }

  // ========== NEON POPUP ITEM ==========
  addNeonItem(x, y, icon, text, subText, btnText, onClick, accentColor = 0x00FFFF, isActive = false) {
    const itemW = this.scale.width - 80;
    const itemH = 52;

    // Item background with subtle neon border
    const borderColor = isActive ? 0x00FF88 : accentColor;
    const bgColor = isActive ? 0x002210 : 0x0d0d20;
    const itemBg = this.add.rectangle(x, y, itemW, itemH, bgColor, 0.8).setScrollFactor(0).setDepth(202).setStrokeStyle(1, borderColor);

    // Left accent bar
    const bar = this.add.rectangle(x - itemW/2 + 3, y, 3, itemH - 8, borderColor).setScrollFactor(0).setDepth(203);

    // Icon
    const iconTxt = this.add.text(x - itemW/2 + 18, y - 8, icon, { fontSize: '18px' }).setScrollFactor(0).setDepth(203);

    // Label
    const accentHex = '#' + borderColor.toString(16).padStart(6, '0');
    const label = this.add.text(x - itemW/2 + 42, y - 12, text, {
        fontSize: '14px', color: isActive ? '#00FF88' : '#ffffff', fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(203);

    // Sub label
    const sub = this.add.text(x - itemW/2 + 42, y + 6, subText, {
        fontSize: '11px', color: '#FFE082'
    }).setScrollFactor(0).setDepth(203);

    let btn = null;
    if (btnText) {
        const isBuy = btnText.includes('Mua') || btnText.includes('Nâng cấp') || btnText.includes('Chọn');
        const btnColor = isBuy ? '#FF00FF' : '#00FF88';
        const btnBgColor = isBuy ? '#2a0030' : '#002a10';
        btn = this.add.text(x + itemW/2 - 12, y, btnText, {
            fontSize: '12px', color: btnColor, backgroundColor: btnBgColor,
            padding: { x: 8, y: 4 }, fontFamily: 'Arial'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', (p, lx, ly, e) => { e.stopPropagation(); onClick(); });
    }

    this.popupGroup.push(itemBg, bar, iconTxt, label, sub);
    if (btn) this.popupGroup.push(btn);
  }

  // ========== NEON SECTION TITLE ==========
  addNeonSection(x, y, text, color = 0xFF00FF) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const lineW = 60;
    const l1 = this.add.rectangle(x - lineW - 10, y, lineW, 1, color, 0.4).setScrollFactor(0).setDepth(203);
    const l2 = this.add.rectangle(x + lineW + 10, y, lineW, 1, color, 0.4).setScrollFactor(0).setDepth(203);
    const t = this.add.text(x, y, text, { fontSize: '13px', color: hex, fontFamily: 'Arial' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    this.popupGroup.push(l1, l2, t);
  }

  // ========== SHOP POPUP (NEON MAGENTA) ==========
  openShop() {
    const accent = 0xFF00FF;
    const { startY, centerX } = this.createPopupBase('⚡ WEAPON SHOP', accent);
    let y = startY;

    // SECTION: VU KHI
    this.addNeonSection(centerX, y, '▸ WEAPONS ◂', accent);
    y += 25;

    const weaponIcons = { sweep2x: '🎯', sweep3x: '🎯', sweep4x: '🎯', shotgun: '💥', laser: '🔴' };
    const weaponList = ['sweep2x','sweep3x','sweep4x','shotgun','laser'];
    weaponList.forEach(id => {
        const w = GlobalState.weapons[id];
        if (!w) return;
        const owned = w.owned;
        const btnText = owned ? '✓ OWNED' : `${w.price || 0}G BUY`;
        this.addNeonItem(centerX, y, weaponIcons[id] || '🔫', w.name, w.desc, btnText, () => {
            if (!owned && GlobalState.buyWeapon(id)) {
                this.goldText.setText(`${GlobalState.gold}`);
                this.openShop();
            }
        }, accent, owned);
        y += 57;
    });

    // SECTION: TRANG BI
    y += 8;
    this.addNeonSection(centerX, y, '▸ ARMOR ◂', accent);
    y += 25;

    // Non
    const helmetOwned = GlobalState.helmetOwned;
    this.addNeonItem(centerX, y, '🪖', 'Helmet', '+1 HP when equipped', helmetOwned ? '✓ OWNED' : `${GlobalState.helmetPrice}G BUY`, () => {
        if (!helmetOwned && GlobalState.buyHelmet()) {
            this.playerHP = GlobalState.getMaxHP();
            this.hpText.setText(`HP: ${this.playerHP}`);
            this.goldText.setText(`${GlobalState.gold}`);
            this.openShop();
        }
    }, accent, helmetOwned);
    y += 57;

    // Ao giap
    const armorOwned = GlobalState.armorOwned;
    this.addNeonItem(centerX, y, '🛡️', 'Body Armor', '+1 HP when equipped', armorOwned ? '✓ OWNED' : `${GlobalState.armorPrice}G BUY`, () => {
        if (!armorOwned && GlobalState.buyArmor()) {
            this.playerHP = GlobalState.getMaxHP();
            this.hpText.setText(`HP: ${this.playerHP}`);
            this.goldText.setText(`${GlobalState.gold}`);
            this.openShop();
        }
    }, accent, armorOwned);

    // ========== SECTION: BUY GOLD WITH TON ==========
    y += 35;
    this.addNeonSection(centerX, y, '▸ BUY GOLD 💎 ◂', 0xFFD700);
    y += 25;

    const packages = GlobalState.goldPackages;
    if (packages && packages.length > 0) {
        packages.forEach(pkg => {
            const itemW = this.scale.width - 80;
            const itemH = 58;

            // Card background - gold neon
            const cardBg = this.add.rectangle(centerX, y, itemW, itemH, 0x1a1500, 0.85).setScrollFactor(0).setDepth(202).setStrokeStyle(1, 0xFFD700);
            // Left gold bar
            const goldBar = this.add.rectangle(centerX - itemW/2 + 3, y, 3, itemH - 8, 0xFFD700).setScrollFactor(0).setDepth(203);
            // Coin icon
            const coinIcon = this.add.text(centerX - itemW/2 + 18, y - 10, '💰', { fontSize: '20px' }).setScrollFactor(0).setDepth(203);
            // Gold amount
            const goldLabel = this.add.text(centerX - itemW/2 + 45, y - 14, pkg.label, {
                fontSize: '16px', color: '#FFD700', fontFamily: 'Arial'
            }).setScrollFactor(0).setDepth(203);
            // Bonus tag
            let bonusTag = null;
            if (pkg.bonus) {
                bonusTag = this.add.text(centerX - itemW/2 + 45, y + 6, pkg.bonus, {
                    fontSize: '10px', color: '#00FF88', backgroundColor: '#002a10',
                    padding: { x: 4, y: 2 }
                }).setScrollFactor(0).setDepth(203);
            }
            // TON price button
            const buyBtn = this.add.text(centerX + itemW/2 - 12, y, `${pkg.price_ton} TON`, {
                fontSize: '13px', color: '#00BFFF', backgroundColor: '#001a30',
                padding: { x: 10, y: 6 }, fontFamily: 'Arial'
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });

            buyBtn.on('pointerdown', async (p, lx, ly, e) => {
                e.stopPropagation();
                buyBtn.setText('⏳...');

                const processPurchase = async () => {
                    GlobalState.gold += pkg.gold;
                    await GlobalState.saveToSupabase();
                    this.goldText.setText(`${GlobalState.gold}`);
                    this.tonText.setText(`${GlobalState.totalTonDeposited.toFixed(2)}`);
                    this.showBlinkingText(`+${pkg.gold} GOLD!`, this.scale.width/2, this.scale.height/2, '#FFD700', 32);
                    this.openShop();
                };

                // Truc tiep tru vao so du in-game neu du
                if (GlobalState.deductTon(pkg.price_ton)) {
                    await processPurchase();
                    return;
                }

                // Neu khong du, tinh so con thieu
                const missingAmount = pkg.price_ton - GlobalState.totalTonDeposited;

                try {
                    await tonManager.init();
                    const result = await tonManager.sendTransaction(
                        GlobalState.tonReceiveAddress,
                        missingAmount,
                        `BuyGoldMissing:${pkg.id}:${GlobalState.playerId}`
                    );
                    if (result.success) {
                        // Ghi nhan so TON nap vao
                        GlobalState.depositTon(missingAmount);
                        // Log transaction neu can
                        await GlobalState.logTonTransaction(pkg.id + '_missing', pkg.gold, missingAmount, result.boc);
                        // Bay gio chac chan du TON de mua
                        GlobalState.deductTon(pkg.price_ton);
                        await processPurchase();
                    } else {
                        buyBtn.setText(`${pkg.price_ton} TON`);
                        this.updateWalletUI();
                        this.showBlinkingText(result.error || 'FAILED', this.scale.width/2, this.scale.height/2, '#FF3366', 24);
                    }
                } catch (err) {
                    buyBtn.setText(`${pkg.price_ton} TON`);
                    console.error('[TON] Purchase error:', err);
                }
            });

            const items = [cardBg, goldBar, coinIcon, goldLabel, buyBtn];
            if (bonusTag) items.push(bonusTag);
            this.popupGroup.push(...items);
            y += 63;
        });
    } else {
        const noPackages = this.add.text(centerX, y, 'No packages available', {
            fontSize: '12px', color: '#667788'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(noPackages);
    }
  }

  // ========== HERO POPUP (NEON CYAN) ==========
  openHero() {
    const accent = 0x00FFFF;
    const { startY, centerX } = this.createPopupBase('🦸 HERO LOADOUT', accent);
    let y = startY;

    // SECTION: EQUIPMENT
    this.addNeonSection(centerX, y, '▸ EQUIPMENT ◂', accent);
    y += 25;

    // NON
    const hLvl = GlobalState.helmetLevel;
    const hMax = hLvl >= 3;
    const hName = GlobalState.helmetOwned ? `Helmet Lv.${hLvl}` : 'Helmet (Locked)';
    const hSub = GlobalState.helmetOwned ? `+${hLvl} HP | ${hMax ? '★ MAX LEVEL' : 'Upgrade for +1 HP'}` : 'Buy from Shop first';
    const hBtn = GlobalState.helmetOwned && !hMax ? `${GlobalState.upgradePrice}G UPGRADE` : (hMax ? '★ MAX' : null);
    this.addNeonItem(centerX, y, '🪖', hName, hSub, hBtn, () => {
        if (GlobalState.upgradeHelmet()) {
            this.playerHP = GlobalState.getMaxHP();
            this.hpText.setText(`HP: ${this.playerHP}`);
            this.goldText.setText(`${GlobalState.gold}`);
            this.openHero();
        }
    }, accent, hMax);
    y += 57;

    // AO GIAP
    const aLvl = GlobalState.armorLevel;
    const aMax = aLvl >= 3;
    const aName = GlobalState.armorOwned ? `Armor Lv.${aLvl}` : 'Armor (Locked)';
    const aSub = GlobalState.armorOwned ? `+${aLvl} HP | ${aMax ? '★ MAX LEVEL' : 'Upgrade for +1 HP'}` : 'Buy from Shop first';
    const aBtn = GlobalState.armorOwned && !aMax ? `${GlobalState.upgradePrice}G UPGRADE` : (aMax ? '★ MAX' : null);
    this.addNeonItem(centerX, y, '🛡️', aName, aSub, aBtn, () => {
        if (GlobalState.upgradeArmor()) {
            this.playerHP = GlobalState.getMaxHP();
            this.hpText.setText(`HP: ${this.playerHP}`);
            this.goldText.setText(`${GlobalState.gold}`);
            this.openHero();
        }
    }, accent, aMax);
    y += 65;

    // SECTION: WEAPON SELECT
    this.addNeonSection(centerX, y, '▸ WEAPON SELECT ◂', accent);
    y += 25;

    // Equipped weapon highlight
    const equipped = GlobalState.weapons[GlobalState.equippedWeapon];
    if (equipped) {
        const eqBox = this.add.rectangle(centerX, y, this.scale.width - 80, 30, 0x001a20, 0.8).setScrollFactor(0).setDepth(202).setStrokeStyle(1, 0x00FF88);
        const eqTxt = this.add.text(centerX, y, `⚡ ACTIVE: ${equipped.name}`, {
            fontSize: '14px', color: '#00FF88', fontFamily: 'Arial'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(eqBox, eqTxt);
        y += 35;
    }

    // List vu khi da co
    Object.entries(GlobalState.weapons).forEach(([id, w]) => {
        if (w.owned) {
            const isEquipped = id === GlobalState.equippedWeapon;
            this.addNeonItem(centerX, y, '🔫', w.name, w.desc, isEquipped ? '✓ ACTIVE' : 'EQUIP', () => {
                if (!isEquipped) {
                    GlobalState.equippedWeapon = id;
                    GlobalState.saveToSupabase();
                    this.openHero();
                }
            }, accent, isEquipped);
            y += 57;
        }
    });
  }

  // ========== GAME LOGIC ==========
  animateGold(startX, startY, amount) {
      const goldCount = 8;
      for (let i = 0; i < goldCount; i++) {
          const coin = this.add.rectangle(startX, startY, 10, 10, 0xFFD700).setDepth(80);
          const targetX = startX + Phaser.Math.Between(-50, 50);
          const targetY = startY + Phaser.Math.Between(-50, 50);
          this.tweens.add({
              targets: coin,
              x: targetX, y: targetY, duration: 300, ease: 'Back.easeOut',
              onComplete: () => {
                  const wx = 40 + this.cameras.main.scrollX;
                  const wy = 40 + this.cameras.main.scrollY;
                  this.tweens.add({
                      targets: coin,
                      x: wx, y: wy, duration: 600, ease: 'Cubic.easeIn',
                      onComplete: () => {
                          coin.destroy();
                          if (i === goldCount - 1) {
                              GlobalState.addGold(amount);
                              this.goldText.setText(`${GlobalState.gold}`);
                              this.tweens.add({ targets: this.goldText, scale: 1.2, duration: 100, yoyo: true });
                          }
                      }
                  });
              }
          });
      }
  }

  // ========== RANKING POPUP (NEON GOLD) ==========
  async openRanking() {
    const accent = 0xFFD700;
    const { startY, centerX } = this.createPopupBase('🏆 WEEKLY RANKING', accent);
    let y = startY;

    // Reset info
    const resetTxt = this.add.text(centerX, y, 'Resets & rewards paid every Monday 00:00 UTC', {
        fontSize: '11px', color: '#667788'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    this.popupGroup.push(resetTxt);
    y += 25;

    // Loading text
    const loadingTxt = this.add.text(centerX, y + 40, '⏳ Fetching Leaderboard...', {
        fontSize: '14px', color: '#FFD700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    this.popupGroup.push(loadingTxt);

    // Fetch top 10 players
    const topPlayers = await GlobalState.fetchTopPlayers(10);
    const rewards = GlobalState.rankingRewards || [];
    loadingTxt.destroy();

    if (topPlayers.length === 0) {
        const noData = this.add.text(centerX, y + 40, 'No ranking data for today yet.', {
            fontSize: '14px', color: '#667788'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(noData);
        return;
    }

    // Header row
    const headerBg = this.add.rectangle(centerX, y, this.scale.width - 80, 24, 0x1a1500, 0.6).setScrollFactor(0).setDepth(202).setStrokeStyle(1, 0xFFD700);
    const headerRank = this.add.text(centerX - 120, y, '#', { fontSize: '11px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    const headerName = this.add.text(centerX - 50, y, 'Player', { fontSize: '11px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    const headerScore = this.add.text(centerX + 35, y, 'Best Score', { fontSize: '11px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    const headerReward = this.add.text(centerX + 110, y, 'Reward', { fontSize: '11px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    this.popupGroup.push(headerBg, headerRank, headerName, headerScore, headerReward);
    y += 22;

    // Player rows
    topPlayers.forEach((player, index) => {
        y += 5;
        const rank = index + 1;
        const isMe = player.id === GlobalState.playerId;
        const reward = rewards.find(r => r.rank === rank);
        
        // Check if unlocked: total TON deposited > 0
        const totalDep = isMe ? GlobalState.totalTonDeposited : (Number(player.total_ton_deposited) || 0);
        const isUnlocked = totalDep > 0;

        let rowColor = 0x0d0d20;
        let textColor = '#FFFFFF';
        let rankIcon = `${rank}`;
        if (rank === 1) { rankIcon = '🥇'; rowColor = 0x2a2000; textColor = '#FFD700'; }
        else if (rank === 2) { rankIcon = '🥈'; rowColor = 0x1a1a20; textColor = '#C0C0C0'; }
        else if (rank === 3) { rankIcon = '🥉'; rowColor = 0x1a1008; textColor = '#CD7F32'; }
        if (isMe) { rowColor = 0x002a10; textColor = '#00FF88'; }

        const itemW = this.scale.width - 80;
        const rowBg = this.add.rectangle(centerX, y, itemW, 36, rowColor, 0.8).setScrollFactor(0).setDepth(202).setStrokeStyle(1, isMe ? 0x00FF88 : 0x333344);

        const rankTxt = this.add.text(centerX - 120, y, rankIcon, { fontSize: '14px', color: textColor }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        const shortId = player.id ? player.id.substring(0, 6) + '..' : '???';
        const nameTxt = this.add.text(centerX - 50, y, isMe ? '⭐ YOU' : shortId, { fontSize: '12px', color: textColor }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        const scoreTxt = this.add.text(centerX + 35, y, `S${player.weekly_best_stage || 1}-F${player.weekly_best_floor || 1}`, { fontSize: '12px', color: textColor }).setOrigin(0.5).setScrollFactor(0).setDepth(203);

        // Reward status
        let rewardLabel = '-';
        let rewardColor = '#FFE082';
        if (reward) {
            let typeLabel = reward.type.toUpperCase();
            if (reward.type === 'gold') typeLabel = 'G';
            if (reward.type === 'ton') typeLabel = ' TON';
            if (reward.type === 'hht') typeLabel = ' HHT';
            
            if (isUnlocked) {
                rewardLabel = `🎁 ${reward.amount}${typeLabel}`;
                rewardColor = '#FFD700';
            } else {
                rewardLabel = `🔒 Locked`;
                rewardColor = '#FF3366';
            }
        }
        const rewardTxt = this.add.text(centerX + 110, y, rewardLabel, { fontSize: '11px', color: rewardColor, fontWeight: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);

        this.popupGroup.push(rowBg, rankTxt, nameTxt, scoreTxt, rewardTxt);
        y += 32;
    });

    // Your current info footer
    y += 15;
    const myFooterTxt = `Your Weekly Best: S${GlobalState.weeklyBestStage}-F${GlobalState.weeklyBestFloor} | Deposited: ${GlobalState.totalTonDeposited.toFixed(2)} TON`;
    const myFooter = this.add.text(centerX, y, myFooterTxt, {
        fontSize: '11px', color: '#00FF88', fontFamily: 'Arial'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
    this.popupGroup.push(myFooter);
  }

  // ========== MISSIONS & REFERRAL POPUP ==========
  async openMissions(tab = 'missions') {
    const accent = 0xFF8800;
    const { startY, centerX } = this.createPopupBase('📋 MISSIONS HUB', accent);
    let y = startY + 10;

    // Tự động kiểm tra trạng thái Join Group cho các nhiệm vụ chưa verify khi mở popup
    if (tab === 'missions' && !this.isCheckingMissions) {
        this.isCheckingMissions = true;
        this.autoCheckMissions();
    }

    // Tabs
    const tabMissions = this.add.text(centerX - 80, y, '🎯 MISSIONS', { 
        fontSize: '14px', color: tab === 'missions' ? '#FF8800' : '#888888', fontWeight: 'bold' 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
    
    const tabReferral = this.add.text(centerX + 80, y, '🤝 REFERRAL', { 
        fontSize: '14px', color: tab === 'referral' ? '#FF8800' : '#888888', fontWeight: 'bold' 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });

    tabMissions.on('pointerdown', (p,x,y_evt,e) => { e.stopPropagation(); this.openMissions('missions'); });
    tabReferral.on('pointerdown', (p,x,y_evt,e) => { e.stopPropagation(); this.openMissions('referral'); });
    this.popupGroup.push(tabMissions, tabReferral);

    y += 30;

    if (tab === 'missions') {
        // Daily Check-in
        this.addNeonSection(centerX, y, '▸ DAILY CHECK-IN 📅 ◂', 0x00FFFF);
        y += 25;
        const todayStr = new Date().toISOString().split('T')[0];
        const canCheckin = GlobalState.lastCheckinDate !== todayStr;
        const streak = GlobalState.checkinStreak;
        const cfg = GlobalState.dailyCheckinConfig;
        const nextReward = cfg.rewards ? (cfg.rewards[Math.min(streak, cfg.rewards.length - 1)] || 10) : 10;
        
        this.addNeonItem(centerX, y, '🗓️', `Check-in (Streak: ${streak}d)`, `Reward: ${nextReward}G`, canCheckin ? 'CLAIM' : 'DONE', async () => {
            if (canCheckin) {
                const res = await GlobalState.dailyCheckin();
                if (res.success) {
                    this.showBlinkingText(`+${res.reward} GOLD!`, centerX, y, '#00FF00', 16);
                    this.goldText.setText(`${GlobalState.gold}`);
                    this.openMissions('missions');
                }
            }
        }, 0x00FFFF, canCheckin);
        y += 45;

        // Daily Missions
        this.addNeonSection(centerX, y, '▸ DAILY MISSIONS ⏳ ◂', 0x00FF88);
        y += 25;
        if (GlobalState.dailyMissions && GlobalState.dailyMissions.length > 0) {
            GlobalState.dailyMissions.forEach(m => {
                const key = `${m.id}_${todayStr}`;
                const completed = GlobalState.completedDailyMissions.includes(key);
                const isVerified = this[`verified_${key}`];

                let btnLabel = isVerified ? 'CLAIM' : 'GO';
                if (completed) btnLabel = 'DONE';

                this.addNeonItem(centerX, y, '✨', m.name, `Reward: ${m.reward}G`, btnLabel, async () => {
                    if (!completed) {
                        if (!isVerified) {
                            // Luon mo link khi bam GO
                            if (m.link) window.open(m.link, '_blank');
                            
                            // Check verify ngầm
                            this.showBlinkingText("Checking...", centerX, y, "#00FFFF", 14);
                            const success = await GlobalState.checkTelegramJoin(m.id);
                            if (success) {
                                this[`verified_${key}`] = true;
                                this.openMissions('missions'); // Tu dong cap nhat sang nut CLAIM
                            }
                        } else {
                            // Bam CLAIM
                            const res = await GlobalState.completeDailyMission(m.id);
                            if (res.success) {
                                this.showBlinkingText(`+${res.reward} GOLD!`, centerX, y, '#00FF00', 16);
                                this.goldText.setText(`${GlobalState.gold}`);
                                this.openMissions('missions');
                            }
                        }
                    }
                }, 0x00FF88, !completed);
                y += 45;
            });
        }

        // Onetime Missions
        this.addNeonSection(centerX, y, '▸ ONE-TIME MISSIONS 🌟 ◂', 0xFF00FF);
        y += 25;
        if (GlobalState.onetimeMissions && GlobalState.onetimeMissions.length > 0) {
            GlobalState.onetimeMissions.forEach(m => {
                const completed = GlobalState.completedOnetimeMissions.includes(m.id);
                const isVerified = this[`verified_onetime_${m.id}`];

                let btnLabel = isVerified ? 'CLAIM' : 'GO';
                if (completed) btnLabel = 'DONE';

                this.addNeonItem(centerX, y, '🎯', m.name, `Reward: ${m.reward}G`, btnLabel, async () => {
                    if (!completed) {
                        if (!isVerified) {
                            // Mo link
                            if (m.link) window.open(m.link, '_blank');
                            
                            // Check verify
                            this.showBlinkingText("Checking...", centerX, y, "#00FFFF", 14);
                            const success = await GlobalState.checkTelegramJoin(m.id);
                            if (success) {
                                this[`verified_onetime_${m.id}`] = true;
                                this.openMissions('missions');
                            }
                        } else {
                            // Bam CLAIM
                            const res = await GlobalState.completeOnetimeMission(m.id);
                            if (res.success) {
                                this.showBlinkingText(`+${res.reward} GOLD!`, centerX, y, '#00FF00', 16);
                                this.goldText.setText(`${GlobalState.gold}`);
                                this.openMissions('missions');
                            }
                        }
                    }
                }, 0xFF00FF, !completed);
                y += 45;
            });
        }
    } else {
        // Referral Tab
        const refCfg = GlobalState.referralConfig;
        const refLink = `${refCfg.bot_link || 'https://t.me/YOUR_BOT?start=ref_'}${GlobalState.playerId}`;

        this.addNeonSection(centerX, y, '▸ YOUR REF LINK 🔗 ◂', 0x00FFFF);
        y += 20;

        // Copy Link Box
        const linkBg = this.add.rectangle(centerX, y, 220, 30, 0x002233, 0.8).setScrollFactor(0).setDepth(202).setStrokeStyle(1, 0x00FFFF);
        const displayLink = refLink.length > 28 ? refLink.substring(0, 25) + '...' : refLink;
        const linkTxt = this.add.text(centerX, y, displayLink, { fontSize: '11px', color: '#FFFFFF' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        
        const copyBtn = this.add.text(centerX - 40, y + 25, '📋 COPY', { fontSize: '12px', color: '#00FFFF', backgroundColor: '#004466', padding: {x:10,y:5} }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
        const shareBtn = this.add.text(centerX + 40, y + 25, '✈️ SHARE', { fontSize: '12px', color: '#ffffff', backgroundColor: '#0088cc', padding: {x:10,y:5} }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
        
        copyBtn.on('pointerdown', (p,x,y_evt,e) => {
            e.stopPropagation();
            this.copyToClipboard(refLink);
            copyBtn.setText('COPIED!');
            this.time.delayedCall(2000, () => copyBtn.setText('📋 COPY'));
        });
        shareBtn.on('pointerdown', (p,x,y_evt,e) => {
            e.stopPropagation();
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join me in HeadShotHunter!")}`;
            window.open(shareUrl, '_blank');
        });
        this.popupGroup.push(linkBg, linkTxt, copyBtn, shareBtn);
        y += 50;

        // Commission info
        const commTxt = `Commissions: F1: ${refCfg.f1_percent}% | F2: ${refCfg.f2_percent}% | F3: ${refCfg.f3_percent}%\nTotal Invited: ${GlobalState.referralCount} friends`;
        const comm = this.add.text(centerX, y, commTxt, { fontSize: '11px', color: '#00FF88', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
        this.popupGroup.push(comm);
        y += 30;

        // Milestones
        this.addNeonSection(centerX, y, '▸ MILESTONE REWARDS 🏆 ◂', 0xFFD700);
        y += 25;
        
        const milestones = refCfg.milestones || [];
        let displayedCount = 0;
        milestones.forEach(ms => {
            if (displayedCount >= 4) return; // limit rows
            
            const claimed = GlobalState.claimedMilestones.includes(ms.count);
            const canClaim = !claimed && GlobalState.referralCount >= ms.count;
            if (claimed) return; // skip claimed to show next goals

            let btnTxt = 'LOCKED';
            if (canClaim) btnTxt = 'CLAIM';

            this.addNeonItem(centerX, y, '👥', `Invite ${ms.count} friends`, `Reward: ${ms.reward}G`, btnTxt, async () => {
                if (canClaim) {
                    const res = await GlobalState.claimMilestone(ms.count);
                    if (res.success) {
                        this.showBlinkingText(`+${res.reward} GOLD!`, centerX, y, '#FFD700', 16);
                        this.goldText.setText(`${GlobalState.gold}`);
                        this.openMissions('referral');
                    }
                }
            }, canClaim ? 0xFFD700 : 0x555555, canClaim);
            y += 45;
            displayedCount++;
        });

        if (displayedCount === 0 && milestones.length > 0) {
             const t = this.add.text(centerX, y, 'All Milestones Claimed! 🎉', { fontSize: '14px', color: '#FFD700' }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
             this.popupGroup.push(t);
        }
    }
  }

  // Helper for copy
  copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Copy failed', err);
    }
    document.body.removeChild(el);
    this.showBlinkingText("Link Copied!", this.scale.width/2, this.scale.height/2, "#00FFFF", 16);
  }

  animateHhtCoin(startX, startY, amount) {
    const coinCount = 10;
    let coinsFinished = 0;
    for (let i = 0; i < coinCount; i++) {
        const coin = this.add.text(startX, startY, '🪙', { fontSize: '20px' }).setDepth(210);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 50 + 20;
        
        this.tweens.add({
            targets: coin,
            x: startX + Math.cos(angle) * dist,
            y: startY + Math.sin(angle) * dist - 30,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: coin,
                    x: 145, y: 30, // HHT Text position
                    scale: 0.5,
                    duration: 800,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        coin.destroy();
                        coinsFinished++;
                        if (coinsFinished === coinCount) {
                            GlobalState.addHhtCoin(amount);
                            this.hhtText.setText(`${GlobalState.hhtCoin}`);
                            this.tweens.add({ targets: this.hhtText, scale: 1.2, duration: 100, yoyo: true });
                        }
                    }
                });
            }
        });
    }
  }

  createManualExplosion(x, y, color = 0xFFD700) {
      for (let i = 0; i < 10; i++) {
          const spark = this.add.rectangle(x, y, 4, 4, color).setDepth(60);
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 150 + 50;
          this.tweens.add({
              targets: spark,
              x: x + Math.cos(angle) * speed * 0.3, y: y + Math.sin(angle) * speed * 0.3,
              alpha: 0, scale: 0, duration: 300, ease: 'Power1', onComplete: () => spark.destroy()
          });
      }
  }

  generateMountain(startY, pSide, color, isBg = false) {
    const direction = pSide === 'left' ? 1 : -1;
    const landingWidth = 300; 
    const stepWidth = 30;
    const stepHeight = 30;
    const numSteps = isBg ? this.nextFloorSteps : this.currentFloorSteps;
    const stepCoordinates = [];
    const currentBatch = [];
    const totalStepWidth = numSteps * stepWidth;
    const gap = totalStepWidth + 20; 
    // Dung ty le 0.15 de sat mep man hinh hon (thay vi 0.25)
    const playerTargetX = direction === 1 ? this.scale.width * 0.15 : this.scale.width * 0.85;
    const fixedPLandingCenter = playerTargetX;
    
    currentBatch.push(this.createPlat(fixedPLandingCenter, startY, landingWidth, color, isBg));
    let currentX = fixedPLandingCenter + direction * (landingWidth/2);
    let currentY = startY;
    for (let i=0; i<numSteps; i++) {
        currentX += direction * stepWidth/2; currentY -= stepHeight;
        currentBatch.push(this.createPlat(currentX, currentY, stepWidth, color, isBg));
        stepCoordinates.push({ x: currentX, y: currentY });
        currentX += direction * stepWidth/2;
    }
    const finalELandingCenter = currentX + direction * (landingWidth/2);
    currentBatch.push(this.createPlat(finalELandingCenter, currentY, landingWidth, color, isBg));
    const nextSide = pSide === 'left' ? 'right' : 'left';
    const nextPlayerX = nextSide === 'left' ? this.scale.width * 0.15 : this.scale.width * 0.85;
    stepCoordinates.push({ x: nextPlayerX, y: currentY });
    currentBatch.push(this.createPlat(fixedPLandingCenter - direction * 800, startY, 1600, color, isBg));
    currentBatch.push(this.createPlat(finalELandingCenter + direction * 800, currentY, 1600, color, isBg));
    const enemyFinalX = finalELandingCenter - direction * (landingWidth/2 - 20); 
    if (isBg) this.bgStairs.push(...currentBatch); else this.stairs.push(...currentBatch);
    return { eX: enemyFinalX, eY: currentY, steps: stepCoordinates, enemyLandingCenter: finalELandingCenter };
  }

  createPlat(x, y, w, color, isBg) {
    const p = this.platforms.create(x, y, 'pixel');
    p.setScale(w, 2000).setOrigin(0.5, 0).setTint(color).setDepth(isBg ? -1 : 0);
    p.refreshBody();
    return p;
  }

  spawnEnemy() {
    const floor = GlobalState.currentFloor;
    const interval = GlobalState.bossConfig.spawnInterval || 10;
    const isBossFloor = (floor % interval === 0) || this.isBossChasing; 

    const { eX, eY, steps, enemyLandingCenter } = this.generateMountain(this.currentY, this.playerSide, 0x256A7D, false);
    
    // CANH BAO: Chi hien "Enemy hidden" neu SO BAC la 6 hoac 7 VA KHONG phai tang Boss
    if (!isBossFloor && (this.currentFloorSteps === 6 || this.currentFloorSteps === 7)) {
        this.showBossWarning("Enemy hidden! Using laser gun to detect...");
    }

    // So bac thang cho tang TIEP THEO: Neu tang tiep theo la boss thi luon 6-7, neu khong thi random 3-7
    const nextIsBoss = ((floor + 1) % interval === 0);
    this.nextFloorSteps = nextIsBoss ? Phaser.Math.Between(6, 7) : Phaser.Math.Between(3, 7);

    const nextSide = this.playerSide === 'left' ? 'right' : 'left';
    const bgResult = this.generateMountain(eY, nextSide, 0x1B4F5E, true);
    this.enemyY = eY;
    this.currentSteps = steps;
    this.nextSteps = bgResult.steps; // Lưu tọa độ cầu thang background cho Boss chạy

    const direction = this.playerSide === 'left' ? 1 : -1;
    const offScreenX = direction === 1 ? this.scale.width + 100 : -100;
    this.enemy = new Enemy(this, offScreenX, eY, isBossFloor, GlobalState.currentStage);
    this.enemy.active = true;
    this.tweens.add({
        targets: [this.enemy.bodySprite, this.enemy.headSprite, this.enemy.gun],
        x: eX, duration: 500, ease: 'Power1',
        onUpdate: () => { 
            this.enemy.x = this.enemy.bodySprite.x; 
            this.enemy.gun.x = this.enemy.x;
        }
    });

    // KIEM TRA KHAC CHE LASER VOI BOSS
    if (this.enemy.isBoss) {
        const currentW = GlobalState.weapons[GlobalState.equippedWeapon];
        if (currentW && currentW.type === 'laser') {
            this.showBossWarning("WARNING: BOSS JAMMING LASER SIGHT!");
            this.player.laserDisabledByBoss = true;
        }
    } else {
        this.player.laserDisabledByBoss = false;
    }

    const facingRight = this.playerSide === 'left';
    this.player.setGunLimits(facingRight ? -90 : -180, facingRight ? 0 : -90, facingRight);
    this.player.isShooting = false;
  }

  showBossWarning(msg) {
    const txt = this.add.text(this.scale.width/2, this.scale.height/2 - 80, msg, {
        fontSize: '16px', color: '#FF0000', fontFamily: 'Arial Black', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0);

    this.tweens.add({
        targets: txt,
        y: txt.y - 30,
        alpha: 0,
        duration: 2000,
        ease: 'Linear',
        onComplete: () => txt.destroy()
    });
  }

  update() {
    if (this.popupOpen) return; // Dung game khi popup mo
    if (this.player && !this.isTransitioning) { this.player.update(); }
    
    const pToRemove = [];
    for (let i = 0; i < this.activeBullets.length; i++) {
        const b = this.activeBullets[i];
        if (!b || !b.active) continue;
        let hit = false;
        const pts = [{x: b.x, y: b.y}, {x: (b.x + (b.lastX||b.x))/2, y: (b.y + (b.lastY||b.y))/2}];
        for (let pt of pts) {
            for (let plat of this.stairs) {
                if (pt.x > plat.x - plat.displayWidth/2 && pt.x < plat.x + plat.displayWidth/2 && pt.y > plat.y && pt.y < plat.y + 1000) {
                    this.createManualExplosion(pt.x, pt.y); hit = true; break;
                }
            }
            if (hit) break;
            if (this.enemy && this.enemy.active) {
                const distH = Phaser.Math.Distance.Between(pt.x, pt.y, this.enemy.headSprite.x, this.enemy.headSprite.y - 15);
                const distB = Phaser.Math.Distance.Between(pt.x, pt.y, this.enemy.bodySprite.x, this.enemy.bodySprite.y - 20);
                if (distH < 25) { this.hit(true); hit = true; break; }
                else if (distB < 35) { this.hit(false); hit = true; break; }
            }
        }
        if (hit) {
            b.destroy(); pToRemove.push(i);
            this.player.isShooting = false; // RESET de sung lia lai
            const isDead = this.enemy && !this.enemy.active;
            if (!isDead) this.time.delayedCall(200, () => this.enemyShootBack());
        } else {
            b.lastX = b.x; b.lastY = b.y;
            if (b.x < -100 || b.x > this.scale.width + 100 || b.y < this.cameras.main.scrollY - 300 || b.y > this.cameras.main.scrollY + 1000) {
                b.destroy(); pToRemove.push(i);
                this.player.isShooting = false; // RESET de sung lia lai
                this.enemyShootBack();
            }
        }
    }
    for (let idx of pToRemove.reverse()) this.activeBullets.splice(idx, 1);

    const eToRemove = [];
    for (let i = 0; i < this.enemyBullets.length; i++) {
        const eb = this.enemyBullets[i];
        if (!eb || !eb.active) continue;
        const d = Phaser.Math.Distance.Between(eb.x, eb.y, this.player.x, this.player.y - 30);
        if (d < 30) { this.playerHit(); eb.destroy(); eToRemove.push(i); }
        else if (eb.x < -100 || eb.x > this.scale.width + 100 || eb.y > this.scale.height + 2000) { eb.destroy(); eToRemove.push(i); }
    }
    for (let idx of eToRemove.reverse()) this.enemyBullets.splice(idx, 1);
  }

  enemyShootBack() {
    if (this.enemy && this.enemy.active && !this.isTransitioning && !this.enemy.isFiring) {
        this.enemy.isFiring = true;
        const eb = this.enemy.fireAtPlayer(this.player);
        if (eb) this.enemyBullets.push(eb);
        this.time.delayedCall(1000, () => { if (this.enemy) this.enemy.isFiring = false; });
    }
  }

  playerHit() {
    this.playerHP--;
    this.hpText.setText(`HP: ${this.playerHP}`);
    this.cameras.main.shake(200, 0.02);
    if (this.playerHP > 0) {
        // CON MAU -> RESET de sung lia lai va ban tiep
        this.player.isShooting = false;
        return;
    }
    if (this.playerHP <= 0) {
        const knockback = this.playerSide === 'left' ? -30 : 30;
        this.tweens.add({
            targets: [this.player.bodySprite, this.player.headSprite, this.player.gun],
            x: `+=${knockback}`, y: '-=10', angle: 90, duration: 400, ease: 'Cubic.easeOut',
            onComplete: () => {
                this.tweens.add({ targets: [this.player.bodySprite, this.player.headSprite, this.player.gun], y: '+=10', duration: 200, ease: 'Bounce.easeOut' });
                this.time.delayedCall(500, () => this.handleMiss());
            }
        });
    }
  }

  showBlinkingText(msg, x, y, color, size, type = 'info') {
    // SỬ DỤNG TỌA ĐỘ Y CỐ ĐỊNH TRÊN MÀN HÌNH ĐỂ TRÁNH CHỒNG LẤP 100%
    const screenCenterX = this.scale.width / 2;
    let screenY = 150; // Hàng mặc định
    
    if (type === 'headshot') screenY = 120; // Hàng trên
    else if (type === 'hit') screenY = 150;     // Hàng giữa
    else if (type === 'hp') screenY = 180;      // Hàng dưới

    const txt = this.add.text(screenCenterX, screenY, msg, { 
        fontFamily: 'Arial Black', 
        fontSize: '16px', // Cố định nhỏ cho mobile
        color: color, 
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(1000).setScrollFactor(0); // ScrollFactor 0 để cố định trên màn hình
    
    this.tweens.add({ 
        targets: txt, 
        y: screenY - 30, 
        alpha: 0, 
        duration: 2000, 
        ease: 'Linear',
        onComplete: () => txt.destroy() 
    });
  }

  hit(isHead) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const e = this.enemy;
    if (!e) { this.isTransitioning = false; return; }
    
    const isDead = e.takeDamage();
    const direction = this.playerSide === 'left' ? 1 : -1;

    // Hiển thị thông báo (Cố định vị trí để không đơ)
    if (isHead) {
        this.showBlinkingText('HEADSHOT x2!', 0, 0, '#ff0000', 18, 'headshot');
    } else {
        this.showBlinkingText('HIT!', 0, 0, '#ffffff', 14, 'hit');
    }

    if (e.isBoss && !isDead) {
        this.showBlinkingText(`BOSS HP: ${e.hp}/3`, 0, 0, '#ffcc00', 16, 'hp');
    }

    // Knockback đơn giản
    this.tweens.add({
        targets: [e.bodySprite, e.headSprite, e.gun],
        x: e.x + (direction * 30),
        angle: direction * 45,
        duration: 200,
        onComplete: () => {
            this.tweens.add({ targets: [e.bodySprite, e.headSprite, e.gun], angle: 0, duration: 100 });
        }
    });

    // Sau khi bị bắn
    this.time.delayedCall(800, () => {
        if (isDead) {
            // Địch chết -> Leo tầng
            this.animateGold(e.x, e.y - 30, GlobalState.currentFloor * (isHead ? 2 : 1)); 
            
            // Neu la Boss, roi them HHT Coin
            if (e.isBoss) {
                const reward = GlobalState.getBossHhtReward(GlobalState.currentFloor);
                this.animateHhtCoin(e.x, e.y - 50, reward);
                this.isBossChasing = false; // Reset khi boss chet
            }

            e.destroy();
            this.walkUpStairs(() => { this.nextFloor(); });
        } else if (e.isBoss) {
            // Boss chưa chết -> Bỏ chạy lên tầng trên
            this.isBossChasing = true; 
            this.showBossWarning("BOSS ESCAPING!");
            
            // Animation Boss CHẠY
            let currentStepIdx = 0;
            const retreatSteps = this.nextSteps || [];
            
            const bossRetreat = () => {
                if (currentStepIdx >= retreatSteps.length) {
                    // Leo xong
                    e.destroy();
                    this.walkUpStairs(() => {
                        this.currentY = this.enemyY;
                        this.playerSide = this.playerSide === 'left' ? 'right' : 'left';
                        this.currentFloorSteps = this.nextFloorSteps;
                        
                        GlobalState.nextFloor();
                        this.stageText.setText(`STAGE ${GlobalState.currentStage} - FLOOR ${GlobalState.currentFloor}`);
                        
                        this.stairs.forEach(s => { if (s) s.destroy(); });
                        this.stairs = [...this.bgStairs];
                        this.bgStairs = [];
                        this.stairs.forEach(s => s.setTint(0x256A7D).setDepth(0));
                        
                        const targetScrollY = this.currentY - (this.scale.height - 200);
                        this.tweens.add({
                            targets: this.cameras.main,
                            scrollY: targetScrollY,
                            duration: 500,
                            onComplete: () => { 
                                const oldHP = e.hp;
                                this.spawnEnemy(); 
                                // Chi ke thua HP neu linh moi cung la Boss
                                if (this.enemy && this.enemy.isBoss) {
                                    this.enemy.hp = oldHP;
                                }
                                this.isTransitioning = false; 
                            }
                        });
                    });
                    return;
                }

                const step = retreatSteps[currentStepIdx];
                this.tweens.add({
                    targets: [e.bodySprite, e.headSprite, e.gun],
                    x: step.x, y: step.y - 20,
                    angle: currentStepIdx % 2 === 0 ? 15 : -15,
                    duration: 80, ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: [e.bodySprite, e.headSprite, e.gun],
                            x: step.x, y: step.y,
                            angle: 0,
                            duration: 50, ease: 'Sine.easeIn',
                            onComplete: () => {
                                currentStepIdx++;
                                bossRetreat();
                            }
                        });
                    }
                });
            };

            bossRetreat();
        } else {
            // Trường hợp lính thường chưa chết (không nên xảy ra)
            this.isTransitioning = false;
        }
    });
  }

  walkUpStairs(onComplete) {
    if (!this.currentSteps || this.currentSteps.length === 0) {
        if (onComplete) onComplete();
        return;
    }
    this.tweens.chain({
        targets: this.player,
        tweens: this.currentSteps.map((step) => ({
            x: step.x, y: step.y,
            duration: 100, ease: 'Sine.easeInOut',
            onUpdate: () => { this.player.setPosition(this.player.x, this.player.y); }
        })),
        onComplete: () => { 
            if (onComplete) onComplete();
        }
    });
  }

  handleMiss() {
    this.scene.start('GameOverScene');
  }

  nextFloor() {
    GlobalState.nextFloor();
    this.stageText.setText(`STAGE ${GlobalState.currentStage} - FLOOR ${GlobalState.currentFloor}`);
    this.currentY = this.enemyY;
    this.playerSide = this.playerSide === 'left' ? 'right' : 'left';
    this.currentFloorSteps = this.nextFloorSteps;
    this.stairs.forEach(s => { if (s) s.destroy(); });
    this.stairs = [...this.bgStairs];
    this.bgStairs = [];
    this.stairs.forEach(s => s.setTint(0x256A7D).setDepth(0));
    const targetScrollY = this.currentY - (this.scale.height - 200);
    this.tweens.add({
        targets: this.cameras.main,
        scrollY: targetScrollY, duration: 500, ease: 'Power2',
        onComplete: () => { this.spawnEnemy(); this.isTransitioning = false; }
    });
  }
}
