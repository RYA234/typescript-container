# Phaser.js #01 タイルマップデモ - 内部設計書

## 文書情報
- **作成日**: 2026-03-30
- **ステータス**: 🚧 設計中

---

## 1. ディレクトリ構成

```
src/phaser/
├── router.ts
├── controller.ts
└── views/
    ├── index.html        # Phaser.jsを含むデモ画面
    └── assets/
        ├── tileset.png   # タイルセット画像
        └── player.png    # プレイヤースプライト
```

---

## 2. 型定義

```typescript
// src/interfaces/phaser.ts

export interface PhaserConfig {
  width: number;
  height: number;
  tileSize: number;
}
```

---

## 3. ルーター実装

```typescript
// src/phaser/router.ts
import { Router } from 'express';
import { PhaserController } from './controller';

const router = Router();
const controller = new PhaserController();

router.get('/', controller.getIndex.bind(controller));

export default router;
```

---

## 4. コントローラー実装

```typescript
// src/phaser/controller.ts
import { Request, Response } from 'express';
import path from 'path';

export class PhaserController {
  getIndex(req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
  }
}
```

---

## 5. フロントエンド実装詳細

### 5.1 Phaser.js ゲーム設定

```javascript
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [GameScene]
};
```

- `type: Phaser.AUTO` — WebGL / Canvas を自動選択
- `gravity: { y: 0 }` — トップダウンなので重力なし

### 5.2 GameScene

```javascript
class GameScene extends Phaser.Scene {
  preload() {
    this.load.image('tiles', 'assets/tileset.png');
    this.load.image('player', 'assets/player.png');
  }

  create() {
    // タイルマップ生成
    const map = this.make.tilemap({ ... });
    const tileset = map.addTilesetImage('tiles');
    map.createLayer('ground', tileset);

    // プレイヤー配置
    this.player = this.physics.add.sprite(400, 300, 'player');

    // クリックイベント
    this.input.on('pointerdown', (pointer) => {
      this.physics.moveToObject(this.player, pointer, 200);
    });
  }

  update() {
    // 目的地に到着したら停止
    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.target.x, this.target.y
    );
    if (dist < 5) {
      this.player.body.setVelocity(0, 0);
    }
  }
}
```

### 5.3 タイルマップ構成

```
タイルサイズ: 32 x 32px
マップサイズ: 25 x 18タイル（800 x 576px）
レイヤー構成:
  - ground: 地面タイル（草・土）
  - collision: 壁・障害物（衝突判定あり）
```

---

## 6. app.tsへの追記

```typescript
// src/app.ts
import phaserRouter from './phaser/router';

app.use(`${basePath}/phaser`, phaserRouter);
```

---

## 7. ビルド設定（package.json）

`copy-views` スクリプトにphaser/viewsのコピーを追加する。

```json
"copy-views": "... && cp -r src/phaser/views dist/src/phaser/views"
```

---

## 8. 環境変数

追加の環境変数なし。既存設定で動作する。
