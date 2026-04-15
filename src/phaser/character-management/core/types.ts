export type SkillType = 'combat' | 'farming' | 'building';
export type BodyPart = 'arm' | 'leg' | 'torso';
export type ActionType = 'idle' | 'rest' | 'train' | 'treat';

export interface Skill {
  type: SkillType;
  level: number;
  exp: number;
}

export interface Injury {
  part: BodyPart;
  name: string;
  daysRemaining: number;
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  food: number;
  maxFood: number;
  fatigue: number;
  maxFatigue: number;
}

export interface Character {
  id: string;
  name: string;
  stats: CharacterStats;
  skills: Skill[];
  injuries: Injury[];
  action: ActionType;
}

export interface GameState {
  characters: Character[];
  turn: number;
  selectedCharacterId: string | null;
}

export interface IGamePort {
  onStateChanged(state: GameState): void;
}
