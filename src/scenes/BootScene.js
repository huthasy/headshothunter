import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 1. Player Body
    const pbGraphics = this.add.graphics();
    pbGraphics.fillStyle(0xFFC107, 1); // Yellow
    pbGraphics.fillRect(0, 0, 30, 40);
    pbGraphics.generateTexture('player_body', 30, 40);
    pbGraphics.destroy();

    // 2. Player Head
    const phGraphics = this.add.graphics();
    phGraphics.fillStyle(0xFFFFFF, 1); // White
    phGraphics.fillRect(0, 0, 30, 30);
    phGraphics.generateTexture('player_head', 30, 30);
    phGraphics.destroy();

    // 3. Enemy Body
    const ebGraphics = this.add.graphics();
    ebGraphics.fillStyle(0x00E5FF, 1); // Cyan
    ebGraphics.fillRect(0, 0, 30, 40);
    ebGraphics.generateTexture('enemy_body', 30, 40);
    ebGraphics.destroy();

    // 4. Enemy Head
    const ehGraphics = this.add.graphics();
    ehGraphics.fillStyle(0xFFFFFF, 1); // White
    ehGraphics.fillRect(0, 0, 30, 30);
    ehGraphics.generateTexture('enemy_head', 30, 30);
    ehGraphics.destroy();

    // 5. Boss Body & Head (slightly darker red, larger)
    const bbGraphics = this.add.graphics();
    bbGraphics.fillStyle(0xAA1111, 1); 
    bbGraphics.fillRect(0, 0, 36, 54);
    bbGraphics.generateTexture('boss_body', 36, 54);
    bbGraphics.destroy();

    const bhGraphics = this.add.graphics();
    bhGraphics.fillStyle(0xFFCC99, 1); // Skin color
    bhGraphics.fillRect(0, 0, 30, 30);
    bhGraphics.generateTexture('boss_head', 30, 30);
    bhGraphics.destroy();

    // 6. Gun (Pixel Art style)
    const gunGraphics = this.add.graphics();
    // Grip
    gunGraphics.fillStyle(0x333333, 1);
    gunGraphics.fillRect(4, 6, 8, 10);
    // Main body
    gunGraphics.fillStyle(0x555577, 1);
    gunGraphics.fillRect(0, 0, 24, 8);
    // Silencer
    gunGraphics.fillStyle(0x222222, 1);
    gunGraphics.fillRect(24, 2, 12, 4);
    // Outline
    gunGraphics.lineStyle(2, 0x000000, 1);
    gunGraphics.strokeRect(4, 6, 8, 10);
    gunGraphics.strokeRect(0, 0, 24, 8);
    gunGraphics.strokeRect(24, 2, 12, 4);
    
    gunGraphics.generateTexture('gun', 40, 18);
    gunGraphics.destroy();

    // 7. Bullet (Yellow)
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xFFD700, 1); // Gold/Yellow
    bulletGraphics.fillRect(0, 0, 12, 6);
    bulletGraphics.generateTexture('bullet', 12, 6);
    bulletGraphics.destroy();

    // 8. Stair/Pixel Base
    const pixelGraphics = this.add.graphics();
    pixelGraphics.fillStyle(0xffffff, 1); 
    pixelGraphics.fillRect(0, 0, 1, 1);
    pixelGraphics.generateTexture('pixel', 1, 1);
    pixelGraphics.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
