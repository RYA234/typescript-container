import Phaser from 'phaser';
import { CharacterManagementScene } from '../adapters/phaser/CharacterManagementScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 580,
  parent: 'game-container',
  backgroundColor: '#0f172a',
  dom: { createContainer: true },
  scene: [CharacterManagementScene],
});
