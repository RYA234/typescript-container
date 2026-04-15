import Phaser from 'phaser';
import { Character, ActionType } from '../../../core/types';
import { GameEngine } from '../../../core/GameEngine';

const ACTION_LABELS: Record<ActionType, string> = {
  idle: '待機',
  rest: '休息',
  train: '訓練',
  treat: '治療',
};

export class ListPanel {
  private scene: Phaser.Scene;
  private engine: GameEngine;
  private container!: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene, engine: GameEngine) {
    this.scene = scene;
    this.engine = engine;
    this.container = scene.add.dom(10, 10).createFromHTML('<div id="list-panel"></div>');
    this.container.setOrigin(0, 0);
  }

  update(characters: Character[], selectedId: string | null): void {
    const html = `
      <div class="list-panel">
        <div class="panel-title">キャラクター一覧</div>
        ${characters.map((c) => `
          <div class="char-card ${c.id === selectedId ? 'selected' : ''}"
               data-id="${c.id}">
            <div class="char-name">${c.name}</div>
            <div class="char-status">
              HP ${c.stats.hp}/${c.stats.maxHp} |
              ${ACTION_LABELS[c.action]}
              ${c.stats.food === 0 ? ' ⚠飢餓' : ''}
              ${c.injuries.length > 0 ? ` 🩹${c.injuries.length}` : ''}
            </div>
          </div>
        `).join('')}
        <button class="btn-add" id="btn-add-char">＋ キャラ追加</button>
      </div>
    `;

    this.container.setHTML(html);

    // キャラ選択
    this.container.node.querySelectorAll('.char-card').forEach((el: unknown) => {
      const card = el as { dataset: Record<string, string>; addEventListener: (e: string, fn: () => void) => void };
      card.addEventListener('click', () => {
        const id = card.dataset['id'];
        if (id) this.engine.selectCharacter(id);
      });
    });

    // キャラ追加
    const addBtn = this.container.node.querySelector('#btn-add-char');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.scene.events.emit('show-create-modal');
      });
    }
  }
}
