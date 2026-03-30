import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const TILE = 32;
const COLS = 25;
const ROWS = 18;

new Phaser.Game({
  type: Phaser.AUTO,
  width: COLS * TILE,
  height: ROWS * TILE,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [GameScene],
});
