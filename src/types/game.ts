export interface GameUser {
  id: string;
  discordId: string;
  username: string;
  character?: GameCharacter;
}

export interface GameCharacter {
  id: string;
  name: string;
  stats: CharacterStats;
  money: number;
  reputation: number;
  level: number;
}

export interface CharacterStats {
  strength: number;
  stealth: number;
  intelligence: number;
  [key: string]: number;
}

export interface CrimeResult {
  success: boolean;
  moneyEarned: number;
  experienceGained: number;
  message: string;
  jailTime?: number;
}

export interface AssetInfo {
  id: string;
  type: string;
  name: string;
  level: number;
  incomeRate: number;
  securityLevel: number;
  value: number;
}
