import Phaser from 'phaser';
import { GlobalState } from '../GlobalState.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a0000');

    this.add.text(width / 2, height * 0.3, 'GAME OVER', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '64px', color: '#FF3366', fontStyle: 'italic'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, `FLOOR REACHED: ${GlobalState.currentFloor}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.55, `TOTAL GOLD: ${GlobalState.gold}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#FFD700', fontWeight: 'bold'
    }).setOrigin(0.5);

    // Hien best score
    const isNewBest = GlobalState.currentFloor > GlobalState.bestFloor;
    if (isNewBest) {
      this.add.text(width / 2, height * 0.65, '🏆 NEW BEST RECORD!', {
        fontFamily: 'Arial', fontSize: '24px', color: '#00FF00'
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, height * 0.65, `🏆 Best: Floor ${GlobalState.bestFloor}`, {
        fontFamily: 'Arial', fontSize: '20px', color: '#aaaaaa'
      }).setOrigin(0.5);
    }

    // LUU LEN SUPABASE
    GlobalState.saveToSupabase();

    const restartText = this.add.text(width / 2, height * 0.8, 'TAP TO RESTART', {
      fontFamily: 'Arial', fontSize: '24px', color: '#00D2FF', fontWeight: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText, alpha: 0.3, duration: 600, yoyo: true, repeat: -1
    });

    this.input.on('pointerdown', () => {
      GlobalState.reset();
      this.scene.start('GameScene');
    });
  }
}
