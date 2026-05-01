import Phaser from 'phaser';
import { GlobalState } from '../GlobalState.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, height * 0.3, 'HEADSHOT HUNTER', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.4, 'TAP TO SHOOT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#00D2FF',
      fontWeight: 'bold'
    }).setOrigin(0.5);

    // Loading text
    this.loadingText = this.add.text(width / 2, height * 0.6, '⏳ LOADING DATA...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#FFD700'
    }).setOrigin(0.5);

    // Breathing animation for loading
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.3, duration: 600, yoyo: true, repeat: -1
    });

    // Play Button (hidden until loaded)
    this.playText = this.add.text(width / 2, height * 0.7, 'TAP ANYWHERE TO START', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setVisible(false);

    // Best Score (hidden until loaded)
    this.bestText = this.add.text(width / 2, height * 0.55, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#FFD700'
    }).setOrigin(0.5).setVisible(false);

    this.isReady = false;

    // LOAD DATA TU SUPABASE
    this.loadGameData();
  }

  async loadGameData() {
    const success = await GlobalState.loadFromSupabase();

    // Xoa loading text
    this.loadingText.destroy();

    if (success) {
      this.bestText.setText(`🏆 Best: Stage ${GlobalState.bestStage} - Floor ${GlobalState.bestFloor}  |  💰 ${GlobalState.gold}G`);
      this.bestText.setVisible(true);
    } else {
      // Hien thi canh bao nhung van cho choi
      const warnText = this.add.text(this.scale.width / 2, this.scale.height * 0.6, '⚠️ Offline Mode (data not saved)', {
        fontFamily: 'Arial', fontSize: '14px', color: '#FF6666'
      }).setOrigin(0.5);
    }

    // Hien play button
    this.playText.setVisible(true);
    this.tweens.add({
      targets: this.playText,
      alpha: 0.3, duration: 800, yoyo: true, repeat: -1
    });

    this.isReady = true;

    // Input to start
    this.input.on('pointerdown', () => {
      if (this.isReady) {
        this.scene.start('GameScene');
      }
    });
  }
}
