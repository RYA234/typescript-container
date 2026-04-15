import { Character, CharacterStats, Skill, SkillType } from './types';

const SKILL_NAMES: Record<SkillType, string> = {
  combat: '戦闘',
  farming: '農業',
  building: '建築',
};

export class CharacterFactory {
  create(name: string, initialSkill: SkillType): Character {
    return {
      id: this.generateId(),
      name,
      stats: this.buildInitialStats(),
      skills: this.buildInitialSkills(initialSkill),
      injuries: [],
      action: 'idle',
    };
  }

  private generateId(): string {
    return `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private buildInitialStats(): CharacterStats {
    return {
      hp: 100,
      maxHp: 100,
      food: 80,
      maxFood: 100,
      fatigue: 20,
      maxFatigue: 100,
    };
  }

  private buildInitialSkills(initialSkill: SkillType): Skill[] {
    const allSkills: SkillType[] = ['combat', 'farming', 'building'];
    return allSkills.map((type) => ({
      type,
      level: type === initialSkill ? 1 : 0,
      exp: 0,
    }));
  }
}

export { SKILL_NAMES };
