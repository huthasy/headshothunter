import Phaser from 'phaser';
import { GlobalState } from '../GlobalState.js';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.bodySprite = scene.add.sprite(x, y, 'player_body').setOrigin(0.5, 1).setDepth(5);
    this.headSprite = scene.add.sprite(x, y - 40, 'player_head').setOrigin(0.5, 1).setDepth(5);
    this.gun = scene.add.sprite(x, y - 24, 'gun').setOrigin(0, 0.5).setDepth(6);

    this.gunAngle = 0;
    this.gunDirection = 1;
    this.baseGunSpeed = GlobalState.baseGunSpeed || 3;
    this.minAngle = -90;
    this.maxAngle = 0;
    this.isShooting = false;
    this.facingRight = true;

    this.laser = scene.add.graphics().setDepth(4);
    this.laserDot = null;
    this.laserDisabledByBoss = false; 
  }

  getWeapon() {
    return GlobalState.weapons[GlobalState.equippedWeapon] || GlobalState.weapons.pistol;
  }

  getAimLength() {
    const weapon = this.getWeapon();
    const baseLength = 80;
    // Neu la laser bi boss disable -> dung multiplier tu config cua sung (mac dinh 3)
    if (weapon.type === 'laser' && this.laserDisabledByBoss) {
        return baseLength * (weapon.laser_boss_multiplier || 3);
    }
    return baseLength * (weapon.rangeMultiplier || 1);
  }

  update() {
    if (this.isShooting) {
        this.laser.clear();
        if (this.laserDot) this.laserDot.setVisible(false);
        return;
    }

    const weapon = this.getWeapon();
    const speed = this.baseGunSpeed * (weapon.speedMultiplier || 1);

    this.gunAngle += speed * this.gunDirection;
    if (this.gunAngle >= this.maxAngle) { this.gunAngle = this.maxAngle; this.gunDirection = -1; }
    else if (this.gunAngle <= this.minAngle) { this.gunAngle = this.minAngle; this.gunDirection = 1; }

    this.gun.setAngle(this.gunAngle);
    this.drawLaser();
  }

  drawLaser() {
    this.laser.clear();
    const startRad = Phaser.Math.DegToRad(this.minAngle);
    const endRad = Phaser.Math.DegToRad(this.maxAngle);
    const currentRad = Phaser.Math.DegToRad(this.gunAngle);
    const weapon = this.getWeapon();
    const aimLen = this.getAimLength();

    // QUAT MO TRANG
    this.laser.fillStyle(0xffffff, 0.1);
    this.laser.beginPath();
    this.laser.moveTo(this.gun.x, this.gun.y);
    this.laser.arc(this.gun.x, this.gun.y, aimLen, startRad, endRad, false);
    this.laser.fillPath();

    if (weapon.type === 'laser' && !this.laserDisabledByBoss) {
        // === LASER BINH THUONG ===
        this.laser.lineStyle(1, 0xff0000, 0.5);
        this.laser.beginPath();
        this.laser.moveTo(this.gun.x, this.gun.y);
        const laserLen = 600;
        const endX = this.gun.x + Math.cos(currentRad) * laserLen;
        const endY = this.gun.y + Math.sin(currentRad) * laserLen;
        this.laser.lineTo(endX, endY);
        this.laser.strokePath();

        if (!this.laserDot) {
            this.laserDot = this.scene.add.circle(0, 0, 5, 0xff0000).setDepth(50);
        }

        let dotX = this.gun.x + Math.cos(currentRad) * 300;
        let dotY = this.gun.y + Math.sin(currentRad) * 300;

        if (this.scene.enemy && this.scene.enemy.active) {
            const gx = this.gun.x, gy = this.gun.y;
            const dirX = Math.cos(currentRad), dirY = Math.sin(currentRad);
            const targets = [
                { x: this.scene.enemy.headSprite.x, y: this.scene.enemy.headSprite.y - 15, r: 25 },
                { x: this.scene.enemy.bodySprite.x, y: this.scene.enemy.bodySprite.y - 20, r: 35 }
            ];
            for (const t of targets) {
                const dx = t.x - gx, dy = t.y - gy;
                const proj = dx * dirX + dy * dirY;
                if (proj > 0) {
                    const closestX = gx + dirX * proj;
                    const closestY = gy + dirY * proj;
                    if (Phaser.Math.Distance.Between(closestX, closestY, t.x, t.y) < t.r) {
                        dotX = closestX; dotY = closestY; break;
                    }
                }
            }
        }
        this.laserDot.setPosition(dotX, dotY).setVisible(true);
    } else {
        // === SUNG THUONG HOAC LASER BI BOSS DISABLE ===
        let color = 0x00FF00;
        if (weapon.type === 'laser' && this.laserDisabledByBoss) {
            color = 0x00FF00; // Tia xanh giong pistol
        }
        
        this.laser.lineStyle(3, color, 1);
        this.laser.beginPath();
        this.laser.moveTo(this.gun.x, this.gun.y);
        this.laser.lineTo(this.gun.x + Math.cos(currentRad) * aimLen, this.gun.y + Math.sin(currentRad) * aimLen);
        this.laser.strokePath();
        if (this.laserDot) this.laserDot.setVisible(false);
    }
  }

  setGunLimits(min, max, facingRight) {
    const angle = GlobalState.sweepAngle || 60;
    if (facingRight) {
        this.minAngle = -angle; this.maxAngle = 0;
        this.gunAngle = 0; this.gunDirection = -1;
    } else {
        this.minAngle = -180; this.maxAngle = -180 + angle;
        this.gunAngle = -180; this.gunDirection = 1;
    }
    this.facingRight = facingRight;
    this.gun.setFlipY(!facingRight);
  }

  fire() {
    this.isShooting = true;
    
    // Play shooting sound if it successfully loaded
    if (this.scene.cache.audio.exists('shoot')) {
        this.scene.sound.play('shoot', { volume: 0.5 });
    }

    const angleRad = Phaser.Math.DegToRad(this.gunAngle);
    const weapon = this.getWeapon();
    const bulletCount = weapon.bulletCount || 1;
    const spreadDeg = weapon.spread || 0;
    const bullets = [];

    for (let i = 0; i < bulletCount; i++) {
        let finalAngle = angleRad;
        if (bulletCount > 1 && spreadDeg > 0) {
            const offset = (i - (bulletCount - 1) / 2) * Phaser.Math.DegToRad(spreadDeg);
            finalAngle = angleRad + offset;
        }
        const b = this.scene.physics.add.sprite(this.gun.x, this.gun.y, 'bullet');
        if (b) {
            b.setDepth(20);
            b.setVelocity(Math.cos(finalAngle) * 2000, Math.sin(finalAngle) * 2000);
            b.lastX = b.x; b.lastY = b.y;
            bullets.push(b);
        }
    }
    return bullets;
  }

  setPosition(x, y) {
    this.x = x; this.y = y;
    this.bodySprite.setPosition(x, y);
    this.headSprite.setPosition(x, y - 40);
    this.gun.setPosition(x, y - 24);
  }
}
