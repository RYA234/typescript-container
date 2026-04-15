import Phaser from 'phaser';
import { Character, ActionType } from '../../../core/types';
import { GameEngine } from '../../../core/GameEngine';
import { SKILL_NAMES } from '../../../core/CharacterFactory';

const BODY_PART_NAMES = { arm: '腕', leg: '脚', torso: '胴' };

export class DetailPanel {
  private engine: GameEngine;
  private container!: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene, engine: GameEngine) {
    this.engine = engine;
    this.container = scene.add.dom(260, 10).createFromHTML('<div id="detail-panel"></div>');
    this.container.setOrigin(0, 0);
  }

  update(character: Character): void {
    const bar = (val: number, max: number, color: string) => {
      const pct = Math.round((val / max) * 100);
      return `<div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
    };

    const html = `
      <div class="detail-panel">
        <div class="panel-title">${character.name}</div>

        <div class="section-title">── 生存ステータス ──</div>
        <div class="stat-row">HP ${character.stats.hp}/${character.stats.maxHp}
          ${bar(character.stats.hp, character.stats.maxHp, '#4ade80')}
        </div>
        <div class="stat-row">食料 ${character.stats.food}/${character.stats.maxFood}
          ${bar(character.stats.food, character.stats.maxFood, '#facc15')}
        </div>
        <div class="stat-row">疲労 ${character.stats.fatigue}/${character.stats.maxFatigue}
          ${bar(character.stats.fatigue, character.stats.maxFatigue, '#f87171')}
        </div>

        <div class="section-title">── スキル ──</div>
        ${character.skills.map((s) => `
          <div class="stat-row">${SKILL_NAMES[s.type]} Lv.${s.level}
            ${bar(s.exp, [0,100,300,600,1000][s.level] ?? 1000, '#818cf8')}
          </div>
        `).join('')}

        <div class="section-title">── 負傷 ──</div>
        ${character.injuries.length === 0
          ? '<div class="no-injury">なし</div>'
          : character.injuries.map((i) =>
              `<div class="injury-row">${BODY_PART_NAMES[i.part]}: ${i.name}（残${i.daysRemaining}日）</div>`
            ).join('')
        }

        <div class="section-title">── アクション ──</div>
        <div class="action-buttons">
          <button class="btn-action ${character.action === 'idle' ? 'active' : ''}"
                  data-action="idle">待機</button>
          <button class="btn-action ${character.action === 'rest' ? 'active' : ''}"
                  data-action="rest">休息</button>
          <button class="btn-action ${character.action === 'train' ? 'active' : ''}"
                  data-action="train">訓練</button>
          <button class="btn-action ${character.action === 'treat' ? 'active' : ''}"
                  data-action="treat">治療</button>
        </div>
      </div>
    `;

    this.container.setHTML(html);

    this.container.node.querySelectorAll('.btn-action').forEach((btn: unknown) => {
      const b = btn as { dataset: Record<string, string>; addEventListener: (e: string, fn: () => void) => void };
      b.addEventListener('click', () => {
        const action = b.dataset['action'];
        if (action) this.engine.setAction(character.id, action as ActionType);
      });
    });
  }

  clear(): void {
    this.container.setHTML('<div class="detail-panel"><div class="no-select">キャラクターを選択してください</div></div>');
  }
}
