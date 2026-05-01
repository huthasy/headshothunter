import Phaser from 'phaser';

export class Enemy {
  constructor(scene, x, y, isBoss = false, stage = 1) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isBoss = isBoss;
    this.active = true;
    this.isFiring = false;

    const bodyColor = isBoss ? 0xff0000 : 0xdddddd;
    
    this.bodySprite = scene.add.sprite(x, y, 'enemy_body').setOrigin(0.5, 1).setDepth(5).setTint(bodyColor);
    this.headSprite = scene.add.sprite(x, y - 40, 'enemy_head').setOrigin(0.5, 1).setDepth(5);
    
    // TRANG BI SUNG
    this.gun = scene.add.sprite(x, y - 24, 'gun').setDepth(6).setTint(0x333333);
    
    // Xac dinh huong ngay tu dau
    const playerX = scene.player ? scene.player.x : scene.scale.width * 0.25;
    this.facingLeft = this.x > playerX;

    if (this.facingLeft) {
        this.gun.setOrigin(1, 0.5); // Diem xoay tai chuoi sung (ben phai sprite súng)
        this.gun.setFlipX(true);
    } else {
        this.gun.setOrigin(0, 0.5); // Diem xoay tai chuoi sung (ben trai sprite súng)
        this.gun.setFlipX(false);
    }

    this.hp = isBoss ? 3 : 1;
  }

  fireAtPlayer(player) {
    // Tinh toan goc ban
    let angle = Phaser.Math.Angle.Between(this.gun.x, this.gun.y, player.x, player.y - 20);
    
    // NEU DICH DANG FACING LEFT (Dung ben phai player)
    // Chung ta can tru di PI (180 do) khoi goc xoay vi súng da bi FlipX
    if (this.facingLeft) {
        this.gun.setRotation(angle + Math.PI);
    } else {
        this.gun.setRotation(angle);
    }
    
    const bullet = this.scene.physics.add.sprite(this.gun.x, this.gun.y, 'bullet');
    bullet.setTint(0xff0000); 
    bullet.setDepth(20);
    
    const speed = 1000;
    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    
    return bullet;
  }

  takeDamage() {
    this.hp -= 1;
    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  destroy() {
    this.bodySprite.destroy();
    this.headSprite.destroy();
    this.gun.destroy();
    this.active = false;
  }
}
