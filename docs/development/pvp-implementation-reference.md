# PvP System Implementation Reference

This document provides detailed technical specifications and code examples for implementing the PvP system in MafiaWar.

## Core Service Architecture

### PvPService Class Structure

```typescript
// src/services/PvPService.ts
import { PrismaClient } from '@prisma/client';
import { Character, Asset, Gang } from '../types/game';

export interface PvPAction {
  id: string;
  attackerId: string;
  defenderId?: string;
  targetId: string;
  targetType: 'player' | 'asset' | 'gang';
  actionType: 'robbery' | 'duel' | 'assassination' | 'sabotage';
  success: boolean;
  damageDealt: number;
  moneyStolen: number;
  xpGained: number;
  timestamp: Date;
}

export interface PvPResult {
  success: boolean;
  message: string;
  rewards?: {
    money: number;
    xp: number;
    reputation: number;
  };
  penalties?: {
    jailTime: number;
    hospitalTime: number;
    moneyLost: number;
  };
  details: string;
}

export class PvPService {
  private static instance: PvPService;
  private prisma: PrismaClient;
  private antiAbuse: AntiAbuseService;
  private notifications: NotificationService;

  private constructor() {
    this.prisma = DatabaseManager.getInstance().getPrisma();
    this.antiAbuse = AntiAbuseService.getInstance();
    this.notifications = NotificationService.getInstance();
  }

  public static getInstance(): PvPService {
    if (!PvPService.instance) {
      PvPService.instance = new PvPService();
    }
    return PvPService.instance;
  }

  // Core PvP Methods
  async robAsset(attackerId: string, assetId: string, method: RobberyMethod): Promise<PvPResult>;
  async challengeDuel(challengerId: string, defenderId: string, betAmount?: number): Promise<PvPResult>;
  async placeBounty(issuerId: string, targetId: string, amount: number, description?: string): Promise<PvPResult>;
  async claimBounty(hunterId: string, bountyId: string): Promise<PvPResult>;
  
  // Gang Warfare Methods
  async declareWar(attackingGangId: string, defendingGangId: string, territoryId?: string): Promise<PvPResult>;
  async participateInWar(playerId: string, warId: string, action: WarAction): Promise<PvPResult>;
  async claimTerritory(gangId: string, territoryId: string): Promise<PvPResult>;
  
  // Utility Methods
  async findSuitableTargets(playerId: string, targetType: string): Promise<SuitableTarget[]>;
  async calculateCombatOutcome(attacker: Character, defender: Character): Promise<CombatResult>;
  async processPostCombatEffects(result: CombatResult): Promise<void>;
}
```

### Anti-Abuse Service

```typescript
// src/services/AntiAbuseService.ts
export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  cooldownRemaining?: number;
  restrictions?: string[];
}

export class AntiAbuseService {
  private static instance: AntiAbuseService;
  private cooldownManager: CooldownManager;
  private rateLimit: RateLimitManager;

  // Core anti-abuse checks
  async checkPvPAction(
    attackerId: string, 
    targetId: string, 
    actionType: string
  ): Promise<AbuseCheckResult> {
    // Check cooldowns
    const cooldownCheck = await this.cooldownManager.checkCooldown(attackerId, actionType);
    if (!cooldownCheck.allowed) {
      return cooldownCheck;
    }

    // Check rate limits
    const rateLimitCheck = await this.rateLimit.checkRateLimit(attackerId, actionType);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck;
    }

    // Check newbie protection
    const newbieCheck = await this.checkNewbieProtection(attackerId, targetId);
    if (!newbieCheck.allowed) {
      return newbieCheck;
    }

    // Check for farming patterns
    const farmingCheck = await this.detectFarming(attackerId, targetId);
    if (!farmingCheck.allowed) {
      return farmingCheck;
    }

    return { allowed: true };
  }

  private async checkNewbieProtection(attackerId: string, targetId: string): Promise<AbuseCheckResult> {
    const [attacker, target] = await Promise.all([
      this.getCharacter(attackerId),
      this.getCharacter(targetId)
    ]);

    // Protect players under level 10 or less than 3 days old
    const isTargetProtected = target.level < 10 || 
      (Date.now() - target.created_at.getTime()) < (3 * 24 * 60 * 60 * 1000);

    if (isTargetProtected) {
      return {
        allowed: false,
        reason: "Target is under newbie protection",
        restrictions: ["newbie_protection"]
      };
    }

    return { allowed: true };
  }

  private async detectFarming(attackerId: string, targetId: string): Promise<AbuseCheckResult> {
    // Get recent interactions between these players
    const recentActions = await this.prisma.pvpAction.findMany({
      where: {
        OR: [
          { attackerId, defenderId: targetId },
          { attackerId: targetId, defenderId: attackerId }
        ],
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // Flag if too many interactions
    if (recentActions.length > 5) {
      return {
        allowed: false,
        reason: "Too many recent interactions with this player",
        restrictions: ["farming_protection"]
      };
    }

    // Flag if win/loss ratio is suspicious
    const wins = recentActions.filter(a => a.attackerId === attackerId && a.success).length;
    const losses = recentActions.filter(a => a.attackerId === attackerId && !a.success).length;
    
    if (recentActions.length > 3 && (wins === 0 || losses === 0)) {
      return {
        allowed: false,
        reason: "Suspicious win/loss pattern detected",
        restrictions: ["farming_protection"]
      };
    }

    return { allowed: true };
  }
}
```

### Asset Robbery Implementation

```typescript
// Asset robbery system with detailed mechanics
export interface RobberyMethod {
  type: 'quick_hit' | 'major_heist' | 'sabotage';
  stealthRequirement: number;
  riskLevel: number;
  potentialReward: number;
  detectionChance: number;
}

export const ROBBERY_METHODS: Record<string, RobberyMethod> = {
  quick_hit: {
    type: 'quick_hit',
    stealthRequirement: 30,
    riskLevel: 0.3,
    potentialReward: 0.2, // 20% of stored income
    detectionChance: 0.1
  },
  major_heist: {
    type: 'major_heist',
    stealthRequirement: 60,
    riskLevel: 0.7,
    potentialReward: 0.6, // 60% of stored income
    detectionChance: 0.4
  },
  sabotage: {
    type: 'sabotage',
    stealthRequirement: 80,
    riskLevel: 0.5,
    potentialReward: 0, // No money, reduces income temporarily
    detectionChance: 0.2
  }
};

async robAsset(attackerId: string, assetId: string, method: RobberyMethod): Promise<PvPResult> {
  return await this.prisma.$transaction(async (tx) => {
    // Get asset and owner information
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      include: { character: true }
    });

    if (!asset || !asset.character) {
      throw new Error('Asset not found or has no owner');
    }

    const attacker = await tx.character.findUnique({
      where: { id: attackerId }
    });

    if (!attacker) {
      throw new Error('Attacker not found');
    }

    // Check anti-abuse measures
    const abuseCheck = await this.antiAbuse.checkPvPAction(attackerId, asset.character.id, 'robbery');
    if (!abuseCheck.allowed) {
      throw new Error(abuseCheck.reason);
    }

    // Calculate success rate
    const successRate = this.calculateRobberySuccess(attacker, asset, method);
    const isSuccess = Math.random() < successRate;

    // Calculate stored income available for robbery
    const storedIncome = this.calculateStoredIncome(asset);
    const potentialSteal = Math.floor(storedIncome * method.potentialReward);

    let result: PvPResult;

    if (isSuccess) {
      // Successful robbery
      let amountStolen = potentialSteal;
      
      if (method.type === 'sabotage') {
        // Sabotage reduces income temporarily instead of stealing money
        await tx.asset.update({
          where: { id: assetId },
          data: {
            income_rate: asset.income_rate * 0.7, // 30% reduction
            sabotaged_until: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });
        amountStolen = 0;
      } else {
        // Transfer money from asset owner to attacker
        await this.transferMoney(asset.character.id, attackerId, amountStolen, 'robbery');
      }

      // Update asset last robbery time
      await tx.asset.update({
        where: { id: assetId },
        data: { last_robbery_attempt: new Date() }
      });

      // Calculate XP and reputation rewards
      const xpReward = Math.floor(method.riskLevel * 50);
      const repReward = Math.floor(method.riskLevel * 10);

      await tx.character.update({
        where: { id: attackerId },
        data: {
          experience: { increment: xpReward },
          reputation: { increment: repReward }
        }
      });

      result = {
        success: true,
        message: `Successfully robbed ${asset.name}!`,
        rewards: {
          money: amountStolen,
          xp: xpReward,
          reputation: repReward
        },
        details: method.type === 'sabotage' 
          ? `Sabotaged asset - income reduced by 30% for 24 hours`
          : `Stole $${amountStolen.toLocaleString()} from ${asset.name}`
      };

    } else {
      // Failed robbery - consequences
      const jailTime = Math.floor(method.riskLevel * 120); // Minutes
      const moneyLost = Math.floor(attacker.cash_on_hand * 0.1); // 10% fine

      await tx.character.update({
        where: { id: attackerId },
        data: {
          jail_until: new Date(Date.now() + jailTime * 60 * 1000),
          cash_on_hand: { decrement: moneyLost },
          reputation: { decrement: 5 }
        }
      });

      result = {
        success: false,
        message: `Robbery failed! You've been caught and jailed.`,
        penalties: {
          jailTime,
          moneyLost,
          hospitalTime: 0
        },
        details: `Jailed for ${jailTime} minutes and fined $${moneyLost.toLocaleString()}`
      };
    }

    // Log the action
    await tx.pvpAction.create({
      data: {
        attackerId,
        defenderId: asset.character.id,
        targetId: assetId,
        targetType: 'asset',
        actionType: 'robbery',
        success: isSuccess,
        damageDealt: 0,
        moneyStolen: result.rewards?.money || 0,
        xpGained: result.rewards?.xp || 0
      }
    });

    // Set cooldown
    await this.cooldownManager.setCooldown(attackerId, 'robbery', 30 * 60 * 1000); // 30 minutes

    // Send notifications
    await this.notifications.notifyRobbery(asset.character.id, attackerId, asset.name, result);

    return result;
  });
}

private calculateRobberySuccess(
  attacker: Character, 
  asset: Asset, 
  method: RobberyMethod
): number {
  // Base success rate from method
  let successRate = 0.5;

  // Attacker stealth bonus
  const stealthBonus = Math.min(attacker.stealth / 100, 0.3); // Max 30% bonus
  successRate += stealthBonus;

  // Asset security penalty
  const securityPenalty = Math.min(asset.security_level / 100, 0.4); // Max 40% penalty
  successRate -= securityPenalty;

  // Method difficulty
  if (attacker.stealth < method.stealthRequirement) {
    successRate -= 0.2; // 20% penalty for insufficient stealth
  }

  // Gang protection (if asset owner is in a gang)
  if (asset.character?.gang_id) {
    successRate -= 0.1; // 10% penalty for gang protection
  }

  // Recent robbery resistance
  const timeSinceLastRobbery = Date.now() - (asset.last_robbery_attempt?.getTime() || 0);
  const hoursElapsed = timeSinceLastRobbery / (1000 * 60 * 60);
  
  if (hoursElapsed < 6) {
    successRate -= 0.3; // High resistance if recently robbed
  } else if (hoursElapsed < 24) {
    successRate -= 0.1; // Some resistance
  }

  // Clamp between 5% and 95%
  return Math.max(0.05, Math.min(0.95, successRate));
}
```

### Gang Warfare System

```typescript
// Gang warfare implementation
export interface GangWar {
  id: string;
  attackingGangId: string;
  defendingGangId: string;
  territoryId?: string;
  warType: 'raid' | 'siege' | 'formal_war';
  status: 'declared' | 'active' | 'completed' | 'ceasefire';
  phases: WarPhase[];
  startedAt: Date;
  endsAt?: Date;
}

export interface WarPhase {
  id: string;
  phaseNumber: number;
  phaseType: 'preparation' | 'battle' | 'resolution';
  startTime: Date;
  endTime: Date;
  participants: WarParticipant[];
  outcome?: WarOutcome;
}

export interface Territory {
  id: string;
  name: string;
  description: string;
  incomeBonus: number; // Percentage bonus to income
  controlledBy?: string; // Gang ID
  contestable: boolean;
  lastBattle?: Date;
  strategicValue: number; // 1-10 scale
}

async declareWar(
  attackingGangId: string, 
  defendingGangId: string, 
  territoryId?: string
): Promise<PvPResult> {
  return await this.prisma.$transaction(async (tx) => {
    // Validate gangs exist and can declare war
    const [attackingGang, defendingGang] = await Promise.all([
      tx.gang.findUnique({ where: { id: attackingGangId }, include: { members: true } }),
      tx.gang.findUnique({ where: { id: defendingGangId }, include: { members: true } })
    ]);

    if (!attackingGang || !defendingGang) {
      throw new Error('One or both gangs not found');
    }

    // Check if gangs can declare war (cooldowns, existing wars, etc.)
    const canDeclareWar = await this.canDeclareWar(attackingGangId, defendingGangId);
    if (!canDeclareWar.allowed) {
      throw new Error(canDeclareWar.reason);
    }

    // Create war declaration
    const war = await tx.gangWar.create({
      data: {
        attackingGangId,
        defendingGangId,
        territoryId,
        warType: territoryId ? 'siege' : 'raid',
        status: 'declared',
        startedAt: new Date()
      }
    });

    // Create initial preparation phase
    await tx.warPhase.create({
      data: {
        warId: war.id,
        phaseNumber: 1,
        phaseType: 'preparation',
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour prep
      }
    });

    // Notify all gang members
    await this.notifications.notifyGangWar(attackingGangId, defendingGangId, war);

    return {
      success: true,
      message: `War declared against ${defendingGang.name}!`,
      details: `Preparation phase begins. War will commence in 24 hours.`,
      rewards: { money: 0, xp: 0, reputation: 10 }
    };
  });
}

async participateInWar(playerId: string, warId: string, action: WarAction): Promise<PvPResult> {
  return await this.prisma.$transaction(async (tx) => {
    const war = await tx.gangWar.findUnique({
      where: { id: warId },
      include: { 
        attackingGang: { include: { members: true } },
        defendingGang: { include: { members: true } },
        phases: { orderBy: { phaseNumber: 'desc' }, take: 1 }
      }
    });

    if (!war || war.status !== 'active') {
      throw new Error('War not found or not active');
    }

    const player = await tx.character.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new Error('Player not found');
    }

    // Verify player is member of participating gang
    const isAttacker = war.attackingGang.members.some(m => m.id === playerId);
    const isDefender = war.defendingGang.members.some(m => m.id === playerId);
    
    if (!isAttacker && !isDefender) {
      throw new Error('Player is not a member of either participating gang');
    }

    const currentPhase = war.phases[0];
    if (!currentPhase || currentPhase.phaseType !== 'battle') {
      throw new Error('No active battle phase');
    }

    // Process the war action
    const actionResult = await this.processWarAction(player, war, action, isAttacker);

    // Update war participation
    await tx.warParticipant.upsert({
      where: {
        playerId_phaseId: {
          playerId,
          phaseId: currentPhase.id
        }
      },
      update: {
        actions: { increment: 1 },
        damage_dealt: { increment: actionResult.damage },
        last_action: new Date()
      },
      create: {
        playerId,
        phaseId: currentPhase.id,
        side: isAttacker ? 'attacker' : 'defender',
        actions: 1,
        damage_dealt: actionResult.damage,
        last_action: new Date()
      }
    });

    // Check if phase should end
    await this.checkPhaseCompletion(war.id, currentPhase.id);

    return {
      success: actionResult.success,
      message: actionResult.message,
      rewards: actionResult.rewards,
      details: actionResult.details
    };
  });
}

private async processWarAction(
  player: Character, 
  war: GangWar, 
  action: WarAction,
  isAttacker: boolean
): Promise<WarActionResult> {
  const enemy_gang = isAttacker ? war.defendingGang : war.attackingGang;
  
  switch (action.type) {
    case 'assault':
      return this.processAssault(player, enemy_gang, action);
    case 'sabotage':
      return this.processSabotage(player, enemy_gang, action);
    case 'defend':
      return this.processDefense(player, war, action);
    case 'support':
      return this.processSupport(player, war, action);
    default:
      throw new Error('Unknown war action type');
  }
}
```

### Bounty System Implementation

```typescript
// Bounty hunting system
export interface Bounty {
  id: string;
  issuerId: string;
  targetId: string;
  amount: number;
  paymentType: 'cash' | 'bank' | 'crypto';
  description?: string;
  completed: boolean;
  completedBy?: string;
  expiresAt: Date;
  createdAt: Date;
}

async placeBounty(
  issuerId: string, 
  targetId: string, 
  amount: number, 
  description?: string
): Promise<PvPResult> {
  return await this.prisma.$transaction(async (tx) => {
    const [issuer, target] = await Promise.all([
      tx.character.findUnique({ where: { id: issuerId } }),
      tx.character.findUnique({ where: { id: targetId } })
    ]);

    if (!issuer || !target) {
      throw new Error('Issuer or target not found');
    }

    // Check if issuer can afford the bounty
    if (issuer.cash_on_hand < amount) {
      throw new Error('Insufficient funds for bounty');
    }

    // Check bounty placement limits
    const recentBounties = await tx.bounty.count({
      where: {
        issuerId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    if (recentBounties >= 3) {
      throw new Error('Daily bounty limit reached');
    }

    // Create bounty
    const bounty = await tx.bounty.create({
      data: {
        issuerId,
        targetId,
        amount,
        paymentType: 'cash',
        description,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Deduct payment from issuer
    await tx.character.update({
      where: { id: issuerId },
      data: { cash_on_hand: { decrement: amount } }
    });

    // Notify target and potential hunters
    await this.notifications.notifyBountyPlaced(targetId, issuerId, amount, description);

    return {
      success: true,
      message: `Bounty of $${amount.toLocaleString()} placed on ${target.name}`,
      details: `Bounty expires in 7 days. Hunters will be notified.`
    };
  });
}

async claimBounty(hunterId: string, bountyId: string): Promise<PvPResult> {
  return await this.prisma.$transaction(async (tx) => {
    const bounty = await tx.bounty.findUnique({
      where: { id: bountyId },
      include: { target: true, issuer: true }
    });

    if (!bounty || bounty.completed || bounty.expiresAt < new Date()) {
      throw new Error('Bounty not available or expired');
    }

    const hunter = await tx.character.findUnique({ where: { id: hunterId } });
    if (!hunter) {
      throw new Error('Hunter not found');
    }

    // Check if hunter can attempt this bounty
    const canAttempt = await this.canAttemptBounty(hunterId, bounty.targetId);
    if (!canAttempt.allowed) {
      throw new Error(canAttempt.reason);
    }

    // Calculate assassination success rate
    const successRate = this.calculateAssassinationSuccess(hunter, bounty.target);
    const isSuccess = Math.random() < successRate;

    if (isSuccess) {
      // Successful assassination
      await tx.bounty.update({
        where: { id: bountyId },
        data: { 
          completed: true, 
          completedBy: hunterId,
          completed_at: new Date()
        }
      });

      // Pay hunter
      await tx.character.update({
        where: { id: hunterId },
        data: { 
          cash_on_hand: { increment: bounty.amount },
          reputation: { increment: 20 },
          experience: { increment: 100 }
        }
      });

      // Send target to hospital
      await tx.character.update({
        where: { id: bounty.targetId },
        data: { 
          hospital_until: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          reputation: { decrement: 15 }
        }
      });

      return {
        success: true,
        message: `Bounty claimed! Assassination successful.`,
        rewards: {
          money: bounty.amount,
          xp: 100,
          reputation: 20
        },
        details: `Target eliminated and sent to hospital for 4 hours`
      };

    } else {
      // Failed assassination - hunter goes to jail
      const jailTime = 90; // 90 minutes
      
      await tx.character.update({
        where: { id: hunterId },
        data: { 
          jail_until: new Date(Date.now() + jailTime * 60 * 1000),
          reputation: { decrement: 10 }
        }
      });

      // Notify target of assassination attempt
      await this.notifications.notifyAssassinationAttempt(bounty.targetId, hunterId, false);

      return {
        success: false,
        message: `Assassination failed! You've been caught.`,
        penalties: {
          jailTime,
          moneyLost: 0,
          hospitalTime: 0
        },
        details: `Jailed for ${jailTime} minutes for attempted assassination`
      };
    }
  });
}

private calculateAssassinationSuccess(hunter: Character, target: Character): number {
  let successRate = 0.4; // Base 40% success rate

  // Hunter stealth advantage
  const stealthAdvantage = Math.min((hunter.stealth - target.stealth) / 100, 0.3);
  successRate += stealthAdvantage;

  // Target's bodyguard/protection level
  const protectionPenalty = target.protection_level * 0.1;
  successRate -= protectionPenalty;

  // Level difference (harder to kill higher level targets)
  const levelDifference = target.level - hunter.level;
  if (levelDifference > 0) {
    successRate -= levelDifference * 0.02; // 2% penalty per level difference
  }

  // Gang protection
  if (target.gang_id) {
    successRate -= 0.15; // 15% penalty for gang protection
  }

  // Target's recent activity (offline targets easier to hit)
  const lastActivity = target.last_activity || new Date(0);
  const hoursInactive = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
  
  if (hoursInactive > 24) {
    successRate += 0.1; // 10% bonus for inactive targets
  }

  // Clamp between 5% and 85%
  return Math.max(0.05, Math.min(0.85, successRate));
}
```

### Discord Command Integration

```typescript
// Example Discord commands for PvP system
// src/commands/pvp.ts
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command, CommandContext, CommandResult } from '../types/command';
import { PvPService } from '../services/PvPService';

const pvpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('pvp')
    .setDescription('Player vs Player actions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('rob')
        .setDescription('Rob another player\'s asset')
        .addStringOption(option =>
          option
            .setName('asset_id')
            .setDescription('Asset ID to rob')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('method')
            .setDescription('Robbery method')
            .setRequired(true)
            .addChoices(
              { name: 'Quick Hit (20% payout, low risk)', value: 'quick_hit' },
              { name: 'Major Heist (60% payout, high risk)', value: 'major_heist' },
              { name: 'Sabotage (no money, reduce income)', value: 'sabotage' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('duel')
        .setDescription('Challenge another player to a duel')
        .addUserOption(option =>
          option
            .setName('opponent')
            .setDescription('Player to challenge')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('bet')
            .setDescription('Amount to bet on the duel')
            .setRequired(false)
            .setMinValue(100)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bounty')
        .setDescription('Manage bounties')
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Bounty action')
            .setRequired(true)
            .addChoices(
              { name: 'Place bounty', value: 'place' },
              { name: 'List bounties', value: 'list' },
              { name: 'Claim bounty', value: 'claim' }
            )
        )
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('Target for bounty (when placing)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Bounty amount (when placing)')
            .setRequired(false)
            .setMinValue(1000)
        )
        .addStringOption(option =>
          option
            .setName('bounty_id')
            .setDescription('Bounty ID (when claiming)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('targets')
        .setDescription('Find suitable PvP targets')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Target type')
            .setRequired(true)
            .addChoices(
              { name: 'Assets to rob', value: 'assets' },
              { name: 'Players to duel', value: 'players' },
              { name: 'Available bounties', value: 'bounties' }
            )
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction, userId } = context;
    const subcommand = interaction.options.getSubcommand();
    const pvpService = PvPService.getInstance();

    try {
      switch (subcommand) {
        case 'rob':
          return await this.handleRobbery(interaction, userId, pvpService);
        case 'duel':
          return await this.handleDuel(interaction, userId, pvpService);
        case 'bounty':
          return await this.handleBounty(interaction, userId, pvpService);
        case 'targets':
          return await this.handleTargets(interaction, userId, pvpService);
        default:
          return { success: false, error: 'Unknown subcommand' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  cooldown: 5, // 5 second base cooldown for PvP commands
  category: 'pvp'
};

// Implementation of PvP command handlers would go here...

export default pvpCommand;
```

This implementation reference provides the core technical foundation for building the PvP system, including service architecture, anti-abuse measures, and Discord integration patterns.