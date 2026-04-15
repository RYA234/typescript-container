import { ActionType, GameState, IGamePort, SkillType } from './types';
import { CharacterFactory } from './CharacterFactory';
import { TurnProcessor } from './TurnProcessor';

export class GameEngine {
  private state: GameState;
  private port: IGamePort;
  private turnProcessor = new TurnProcessor();
  private factory = new CharacterFactory();

  constructor(port: IGamePort) {
    this.port = port;
    this.state = { characters: [], turn: 1, selectedCharacterId: null };
  }

  getState(): GameState {
    return this.state;
  }

  advanceTurn(): void {
    this.state = this.turnProcessor.process(this.state);
    this.port.onStateChanged(this.state);
  }

  selectCharacter(id: string): void {
    this.state = { ...this.state, selectedCharacterId: id };
    this.port.onStateChanged(this.state);
  }

  setAction(id: string, action: ActionType): void {
    const characters = this.state.characters.map((c) =>
      c.id === id ? { ...c, action } : c
    );
    this.state = { ...this.state, characters };
    this.port.onStateChanged(this.state);
  }

  createCharacter(name: string, skill: SkillType): void {
    const character = this.factory.create(name, skill);
    this.state = {
      ...this.state,
      characters: [...this.state.characters, character],
    };
    this.port.onStateChanged(this.state);
  }
}
