import { Character, GameState, Injury, Skill } from './types';

const FOOD_CONSUME_PER_TURN = 10;
const FATIGUE_RECOVER_PER_TURN = 20;
const STARVATION_DAMAGE = 10;
const TRAIN_EXP_PER_TURN = 30;

const EXP_TABLE: Record<number, number> = {
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
};

export class TurnProcessor {
  process(state: GameState): GameState {
    let characters = [...state.characters];
    characters = this.consumeFood(characters);
    characters = this.recoverFatigue(characters);
    characters = this.healInjuries(characters);
    characters = this.addSkillExp(characters);
    characters = this.applyStarvation(characters);
    return { ...state, characters, turn: state.turn + 1 };
  }

  private consumeFood(characters: Character[]): Character[] {
    return characters.map((c) => ({
      ...c,
      stats: {
        ...c.stats,
        food: Math.max(0, c.stats.food - FOOD_CONSUME_PER_TURN),
      },
    }));
  }

  private recoverFatigue(characters: Character[]): Character[] {
    return characters.map((c) =>
      c.action !== 'rest'
        ? c
        : {
            ...c,
            stats: {
              ...c.stats,
              fatigue: Math.max(0, c.stats.fatigue - FATIGUE_RECOVER_PER_TURN),
            },
          }
    );
  }

  private healInjuries(characters: Character[]): Character[] {
    return characters.map((c) =>
      c.action !== 'treat'
        ? c
        : {
            ...c,
            injuries: c.injuries
              .map((i): Injury => ({ ...i, daysRemaining: i.daysRemaining - 1 }))
              .filter((i) => i.daysRemaining > 0),
          }
    );
  }

  private addSkillExp(characters: Character[]): Character[] {
    return characters.map((c) =>
      c.action !== 'train'
        ? c
        : {
            ...c,
            skills: c.skills.map((s, i) =>
              i === 0 ? this.addExp(s, TRAIN_EXP_PER_TURN) : s
            ),
          }
    );
  }

  private applyStarvation(characters: Character[]): Character[] {
    return characters.map((c) =>
      c.stats.food > 0
        ? c
        : {
            ...c,
            stats: {
              ...c.stats,
              hp: Math.max(0, c.stats.hp - STARVATION_DAMAGE),
            },
          }
    );
  }

  private addExp(skill: Skill, exp: number): Skill {
    const newExp = skill.exp + exp;
    const nextThreshold = EXP_TABLE[skill.level + 1];
    if (nextThreshold && newExp >= nextThreshold && skill.level < 5) {
      return { ...skill, exp: newExp, level: skill.level + 1 };
    }
    return { ...skill, exp: newExp };
  }
}
