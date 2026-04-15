import Phaser from 'phaser';
import { GameEngine } from '../../core/GameEngine';
import { GameState, IGamePort, SkillType } from '../../core/types';
import { ListPanel } from './panels/ListPanel';
import { DetailPanel } from './panels/DetailPanel';

export class CharacterManagementScene extends Phaser.Scene implements IGamePort {
  private engine!: GameEngine;
  private listPanel!: ListPanel;
  private detailPanel!: DetailPanel;
  private turnButton!: Phaser.GameObjects.DOMElement;
  private turnText!: Phaser.GameObjects.DOMElement;
  private modal!: Phaser.GameObjects.DOMElement;

  constructor() {
    super({ key: 'CharacterManagementScene' });
  }

  create(): void {
    this.engine = new GameEngine(this);
    this.listPanel = new ListPanel(this, this.engine);
    this.detailPanel = new DetailPanel(this, this.engine);

    // ターン情報 + ターン進行ボタン
    this.turnText = this.add.dom(760, 10).createFromHTML('<div id="turn-text" class="turn-text">Turn 1</div>');
    this.turnText.setOrigin(1, 0);

    this.turnButton = this.add.dom(760, 50).createFromHTML('<button id="btn-turn" class="btn-turn">ターン進行 →</button>');
    this.turnButton.setOrigin(1, 0);
    this.turnButton.addListener('click');
    this.turnButton.on('click', () => this.engine.advanceTurn());

    // モーダル
    this.modal = this.add.dom(400, 300).createFromHTML('<div id="modal" style="display:none"></div>');
    this.modal.setOrigin(0.5, 0.5);

    // モーダル表示イベント
    this.events.on('show-create-modal', () => this.showCreateModal());

    // 初期キャラ2体
    this.engine.createCharacter('タロウ', 'combat');
    this.engine.createCharacter('ジロウ', 'farming');
  }

  // IGamePort実装: CoreからUIへの通知
  onStateChanged(state: GameState): void {
    const selected = state.characters.find((c) => c.id === state.selectedCharacterId) ?? null;
    this.listPanel.update(state.characters, state.selectedCharacterId);
    if (selected) {
      this.detailPanel.update(selected);
    } else {
      this.detailPanel.clear();
    }
    this.turnText.setHTML(`<div class="turn-text">Turn ${state.turn}</div>`);
  }

  private showCreateModal(): void {
    const html = `
      <div class="modal-overlay">
        <div class="modal-box">
          <div class="modal-title">キャラクター作成</div>
          <div class="modal-row">
            <label>名前</label>
            <input id="char-name" type="text" placeholder="名前を入力" maxlength="10" />
          </div>
          <div class="modal-row">
            <label>初期スキル</label>
            <select id="char-skill">
              <option value="combat">戦闘</option>
              <option value="farming">農業</option>
              <option value="building">建築</option>
            </select>
          </div>
          <div class="modal-buttons">
            <button id="btn-cancel">キャンセル</button>
            <button id="btn-create">作成</button>
          </div>
        </div>
      </div>
    `;

    this.modal.setHTML(html);

    this.modal.node.querySelector('#btn-cancel')?.addEventListener('click', () => {
      this.modal.setHTML('<div></div>');
    });

    this.modal.node.querySelector('#btn-create')?.addEventListener('click', () => {
      const nameEl = this.modal.node.querySelector('#char-name') as unknown as { value: string } | null;
      const skillEl = this.modal.node.querySelector('#char-skill') as unknown as { value: string } | null;
      const name = nameEl?.value.trim() ?? '';
      const skill = (skillEl?.value ?? 'combat') as SkillType;
      if (name) {
        this.engine.createCharacter(name, skill);
        this.modal.setHTML('<div></div>');
      }
    });
  }
}
