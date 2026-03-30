import Phaser from 'phaser';

const TILE = 32;
const COLS = 25;
const ROWS = 18;

const mapData: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private target!: Phaser.GameObjects.Image;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private moving: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // アセットはコードで生成
  }

  create(): void {
    const graphics = this.add.graphics();
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * TILE;
        const y = row * TILE;
        if (mapData[row][col] === 1) {
          graphics.fillStyle(0x2d4a22, 1);
          graphics.fillRect(x, y, TILE, TILE);
          graphics.lineStyle(1, 0x1a2e14, 1);
          graphics.strokeRect(x, y, TILE, TILE);

          const wall = this.add.rectangle(x + TILE / 2, y + TILE / 2, TILE, TILE);
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        } else {
          graphics.fillStyle(0x4a7c3f, 1);
          graphics.fillRect(x, y, TILE, TILE);
          graphics.lineStyle(1, 0x3d6b33, 0.5);
          graphics.strokeRect(x, y, TILE, TILE);
        }
      }
    }

    // プレイヤーテクスチャ生成
    const playerGfx = this.make.graphics({ x: 0, y: 0 });
    playerGfx.fillStyle(0xf59e0b, 1);
    playerGfx.fillCircle(12, 12, 12);
    playerGfx.fillStyle(0xfbbf24, 1);
    playerGfx.fillCircle(9, 9, 5);
    playerGfx.generateTexture('player', 24, 24);
    playerGfx.destroy();

    this.player = this.physics.add.sprite(
      Math.floor(COLS / 2) * TILE + TILE / 2,
      Math.floor(ROWS / 2) * TILE + TILE / 2,
      'player'
    );
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    // マーカーテクスチャ生成
    const markerGfx = this.make.graphics({ x: 0, y: 0 });
    markerGfx.lineStyle(2, 0xf59e0b, 1);
    markerGfx.strokeCircle(8, 8, 8);
    markerGfx.generateTexture('marker', 16, 16);
    markerGfx.destroy();

    this.target = this.add.image(this.player.x, this.player.y, 'marker').setAlpha(0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tx = pointer.x;
      const ty = pointer.y;

      const col = Math.floor(tx / TILE);
      const row = Math.floor(ty / TILE);
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
      if (mapData[row][col] === 1) return;

      this.target.setPosition(tx, ty).setAlpha(0.8);
      this.moving = true;
      this.physics.moveToObject(this.player, { x: tx, y: ty }, 180);
    });

    this.physics.world.setBounds(0, 0, COLS * TILE, ROWS * TILE);
  }

  update(): void {
    if (!this.moving) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.target.x, this.target.y
    );

    if (dist < 6) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.target.setAlpha(0);
      this.moving = false;
    }
  }
}
