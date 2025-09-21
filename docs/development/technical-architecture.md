# Technical Architecture for New MafiaWar Features

## Overview

This document outlines the technical implementation strategy for integrating proposed new features into the existing MafiaWar Discord bot architecture. All proposals maintain backward compatibility and leverage existing systems.

---

## Database Schema Extensions

### Social Credit System

```sql
-- Extend existing user system
CREATE TABLE social_credits (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(discord_id),
    total_credits INTEGER DEFAULT 0,
    reputation_level VARCHAR(50) DEFAULT 'newcomer',
    influence_tokens INTEGER DEFAULT 0,
    favor_balance INTEGER DEFAULT 0,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE social_interactions (
    id SERIAL PRIMARY KEY,
    from_user_id VARCHAR(255) REFERENCES users(discord_id),
    to_user_id VARCHAR(255) REFERENCES users(discord_id),
    interaction_type VARCHAR(50), -- 'mentor', 'favor', 'collaboration'
    credits_awarded INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favor_marketplace (
    id SERIAL PRIMARY KEY,
    creator_id VARCHAR(255) REFERENCES users(discord_id),
    type VARCHAR(50), -- 'request' or 'offer'
    title VARCHAR(255),
    description TEXT,
    favor_amount INTEGER,
    requirements TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Territory Control System

```sql
CREATE TABLE territories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    type VARCHAR(50), -- 'financial', 'industrial', 'tech', etc.
    owner_gang_id INTEGER REFERENCES gangs(id),
    defense_level INTEGER DEFAULT 1,
    income_multiplier DECIMAL(3,2) DEFAULT 1.0,
    special_benefits JSONB, -- Store territory-specific bonuses
    last_battle TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE territory_battles (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id),
    attacker_gang_id INTEGER REFERENCES gangs(id),
    defender_gang_id INTEGER REFERENCES gangs(id),
    attack_power INTEGER,
    defense_power INTEGER,
    winner_gang_id INTEGER REFERENCES gangs(id),
    battle_duration INTEGER, -- in minutes
    battle_start TIMESTAMP,
    battle_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE territory_benefits (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id),
    benefit_type VARCHAR(50), -- 'income_boost', 'crime_bonus', 'fee_reduction'
    benefit_value DECIMAL(5,2),
    description TEXT
);
```

### Seasonal Events System

```sql
CREATE TABLE seasonal_events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50), -- 'heist', 'tournament', 'market', 'territory'
    description TEXT,
    entry_fee INTEGER DEFAULT 0,
    max_participants INTEGER,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'upcoming', -- 'upcoming', 'active', 'completed'
    rewards JSONB, -- Store event rewards
    requirements JSONB, -- Store participation requirements
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES seasonal_events(id),
    user_id VARCHAR(255) REFERENCES users(discord_id),
    team_name VARCHAR(255),
    role VARCHAR(50), -- 'hacker', 'muscle', 'driver', 'mastermind'
    status VARCHAR(50) DEFAULT 'registered',
    progress JSONB, -- Store individual progress
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE event_teams (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES seasonal_events(id),
    team_name VARCHAR(255),
    leader_id VARCHAR(255) REFERENCES users(discord_id),
    members JSONB, -- Array of user IDs and roles
    total_score INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'forming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Cross-Server Networking

```sql
-- Central network database (separate from individual server DBs)
CREATE TABLE network_servers (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(255) UNIQUE,
    server_name VARCHAR(255),
    api_endpoint VARCHAR(500),
    api_key VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE network_users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255),
    server_id VARCHAR(255) REFERENCES network_servers(server_id),
    username VARCHAR(255),
    reputation_score INTEGER DEFAULT 0,
    specializations JSONB,
    available_for_hire BOOLEAN DEFAULT FALSE,
    rates JSONB, -- Store pricing for different job types
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cross_server_contracts (
    id SERIAL PRIMARY KEY,
    employer_id VARCHAR(255),
    employer_server VARCHAR(255),
    contractor_id VARCHAR(255),
    contractor_server VARCHAR(255),
    job_type VARCHAR(50),
    description TEXT,
    payment_amount INTEGER,
    escrow_amount INTEGER, -- Held until completion
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

---

## Service Layer Extensions

### Social Credit Service

```typescript
// src/services/SocialCreditService.ts
export class SocialCreditService {
  private static instance: SocialCreditService;
  
  public static getInstance(): SocialCreditService {
    if (!SocialCreditService.instance) {
      SocialCreditService.instance = new SocialCreditService();
    }
    return SocialCreditService.instance;
  }

  async awardSocialCredits(
    fromUserId: string,
    toUserId: string,
    interactionType: string,
    credits: number,
    description: string
  ): Promise<void> {
    const database = DatabaseManager.getInstance();
    
    await database.transaction(async (tx) => {
      // Award credits to recipient
      await tx.socialCredits.upsert({
        where: { user_id: toUserId },
        update: { 
          total_credits: { increment: credits },
          updated_at: new Date()
        },
        create: {
          user_id: toUserId,
          total_credits: credits
        }
      });

      // Record interaction
      await tx.socialInteractions.create({
        data: {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          interaction_type: interactionType,
          credits_awarded: credits,
          description
        }
      });

      // Update reputation level if necessary
      await this.updateReputationLevel(toUserId, tx);
    });
  }

  async spendInfluenceTokens(
    userId: string,
    amount: number,
    purpose: string
  ): Promise<boolean> {
    const userCredits = await this.getUserSocialCredits(userId);
    
    if (userCredits.influence_tokens < amount) {
      return false;
    }

    await DatabaseManager.getInstance().socialCredits.update({
      where: { user_id: userId },
      data: { 
        influence_tokens: { decrement: amount },
        updated_at: new Date()
      }
    });

    return true;
  }

  async getUserSocialCredits(userId: string) {
    return await DatabaseManager.getInstance().socialCredits.findUnique({
      where: { user_id: userId }
    });
  }

  private async updateReputationLevel(userId: string, tx: any): Promise<void> {
    const credits = await tx.socialCredits.findUnique({
      where: { user_id: userId }
    });

    const reputationLevels = [
      { min: 0, level: 'newcomer' },
      { min: 100, level: 'known' },
      { min: 500, level: 'respected' },
      { min: 1500, level: 'influential' },
      { min: 5000, level: 'legendary' }
    ];

    const newLevel = reputationLevels
      .reverse()
      .find(level => credits.total_credits >= level.min)?.level;

    if (newLevel && newLevel !== credits.reputation_level) {
      await tx.socialCredits.update({
        where: { user_id: userId },
        data: { reputation_level: newLevel }
      });
    }
  }
}
```

### Territory Control Service

```typescript
// src/services/TerritoryService.ts
export class TerritoryService {
  private static instance: TerritoryService;
  
  public static getInstance(): TerritoryService {
    if (!TerritoryService.instance) {
      TerritoryService.instance = new TerritoryService();
    }
    return TerritoryService.instance;
  }

  async initiateAttack(
    attackerGangId: number,
    territoryId: number,
    strategy: string
  ): Promise<TerritoryBattleResult> {
    const database = DatabaseManager.getInstance();
    
    // Get territory and defender info
    const territory = await database.territories.findUnique({
      where: { id: territoryId },
      include: { owner_gang: true }
    });

    if (!territory) {
      throw new Error('Territory not found');
    }

    // Calculate attack power
    const attackPower = await this.calculateAttackPower(
      attackerGangId,
      strategy
    );

    // Create battle record
    const battle = await database.territoryBattles.create({
      data: {
        territory_id: territoryId,
        attacker_gang_id: attackerGangId,
        defender_gang_id: territory.owner_gang_id,
        attack_power: attackPower,
        defense_power: 0, // Will be calculated when defense is organized
        battle_start: new Date(),
        battle_duration: 30 // 30 minutes to organize defense
      }
    });

    // Notify defending gang
    await this.notifyDefendingGang(territory.owner_gang_id, territoryId);

    return {
      battleId: battle.id,
      attackPower,
      defenseTime: 30 * 60 * 1000 // 30 minutes in milliseconds
    };
  }

  async organizeDefense(
    defenderGangId: number,
    battleId: number,
    strategy: string
  ): Promise<void> {
    const defensePower = await this.calculateDefensePower(
      defenderGangId,
      strategy
    );

    await DatabaseManager.getInstance().territoryBattles.update({
      where: { id: battleId },
      data: { defense_power: defensePower }
    });
  }

  async resolveBattle(battleId: number): Promise<TerritoryBattleResult> {
    const database = DatabaseManager.getInstance();
    
    const battle = await database.territoryBattles.findUnique({
      where: { id: battleId },
      include: {
        territory: true,
        attacker_gang: true,
        defender_gang: true
      }
    });

    if (!battle) {
      throw new Error('Battle not found');
    }

    const winner = battle.attack_power > battle.defense_power
      ? battle.attacker_gang_id
      : battle.defender_gang_id;

    // Update battle result
    await database.territoryBattles.update({
      where: { id: battleId },
      data: {
        winner_gang_id: winner,
        battle_end: new Date()
      }
    });

    // Update territory ownership if attacker won
    if (winner === battle.attacker_gang_id) {
      await database.territories.update({
        where: { id: battle.territory_id },
        data: {
          owner_gang_id: winner,
          last_battle: new Date()
        }
      });
    }

    return {
      winner,
      attackPower: battle.attack_power,
      defensePower: battle.defense_power,
      territoryChanged: winner === battle.attacker_gang_id
    };
  }

  private async calculateAttackPower(
    gangId: number,
    strategy: string
  ): Promise<number> {
    const database = DatabaseManager.getInstance();
    
    // Get gang members and their assets
    const gang = await database.gangs.findUnique({
      where: { id: gangId },
      include: {
        members: {
          include: {
            character: true,
            assets: true
          }
        }
      }
    });

    let basePower = 0;
    
    // Member strength
    basePower += gang.members.length * 1000;
    
    // Asset bonuses
    gang.members.forEach(member => {
      basePower += member.assets.length * 1000;
    });

    // Strategy bonuses
    const strategyMultipliers = {
      'blitz': 1.2,
      'coordinated': 1.1,
      'overwhelming': 1.3
    };

    return Math.floor(basePower * (strategyMultipliers[strategy] || 1.0));
  }

  private async calculateDefensePower(
    gangId: number,
    strategy: string
  ): Promise<number> {
    // Similar to attack power but with defensive bonuses
    const basePower = await this.calculateAttackPower(gangId, 'standard');
    
    const defenseMultipliers = {
      'fortress': 1.15,
      'guerrilla': 1.1,
      'mercenary': 1.25
    };

    return Math.floor(basePower * (defenseMultipliers[strategy] || 1.0));
  }

  private async notifyDefendingGang(
    gangId: number,
    territoryId: number
  ): Promise<void> {
    // Implementation would send Discord notifications to gang members
    // This integrates with existing notification systems
  }
}
```

### Event Management Service

```typescript
// src/services/EventService.ts
export class EventService {
  private static instance: EventService;
  
  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  async createSeasonalEvent(eventData: SeasonalEventData): Promise<number> {
    const database = DatabaseManager.getInstance();
    
    const event = await database.seasonalEvents.create({
      data: {
        name: eventData.name,
        type: eventData.type,
        description: eventData.description,
        entry_fee: eventData.entryFee,
        max_participants: eventData.maxParticipants,
        start_date: eventData.startDate,
        end_date: eventData.endDate,
        rewards: eventData.rewards,
        requirements: eventData.requirements
      }
    });

    return event.id;
  }

  async registerForEvent(
    eventId: number,
    userId: string,
    teamName?: string,
    role?: string
  ): Promise<EventRegistrationResult> {
    const database = DatabaseManager.getInstance();
    
    // Check event exists and is accepting registrations
    const event = await database.seasonalEvents.findUnique({
      where: { id: eventId }
    });

    if (!event || event.status !== 'upcoming') {
      return { success: false, reason: 'Event not available for registration' };
    }

    // Check if user meets requirements
    const meetsRequirements = await this.checkEventRequirements(
      userId,
      event.requirements
    );

    if (!meetsRequirements.eligible) {
      return { 
        success: false, 
        reason: `Requirements not met: ${meetsRequirements.missing.join(', ')}`
      };
    }

    // Charge entry fee if applicable
    if (event.entry_fee > 0) {
      const moneyService = MoneyService.getInstance();
      const feeResult = await moneyService.spendMoney(
        userId,
        event.entry_fee,
        'crypto', // Use crypto for event fees
        'Event Registration Fee'
      );

      if (!feeResult.success) {
        return { success: false, reason: 'Insufficient funds for entry fee' };
      }
    }

    // Register participant
    await database.eventParticipants.create({
      data: {
        event_id: eventId,
        user_id: userId,
        team_name: teamName,
        role: role,
        status: 'registered'
      }
    });

    return { success: true };
  }

  async updateEventProgress(
    eventId: number,
    userId: string,
    progressUpdate: any
  ): Promise<void> {
    const database = DatabaseManager.getInstance();
    
    const participant = await database.eventParticipants.findFirst({
      where: {
        event_id: eventId,
        user_id: userId
      }
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const currentProgress = participant.progress || {};
    const updatedProgress = { ...currentProgress, ...progressUpdate };

    await database.eventParticipants.update({
      where: { id: participant.id },
      data: { progress: updatedProgress }
    });
  }

  private async checkEventRequirements(
    userId: string,
    requirements: any
  ): Promise<{ eligible: boolean; missing: string[] }> {
    // Implementation checks user level, stats, items, etc.
    // Returns whether user meets requirements and what's missing
    return { eligible: true, missing: [] };
  }
}
```

---

## Command Integration Examples

### Enhanced Social Commands

```typescript
// src/commands/mentor.ts
import { SlashCommandBuilder } from 'discord.js';
import { Command, CommandContext, CommandResult } from '../types/command';
import { SocialCreditService } from '../services/SocialCreditService';

const mentorCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mentor')
    .setDescription('Mentorship system for social credits')
    .addSubcommand(subcommand =>
      subcommand
        .setName('offer')
        .setDescription('Offer mentorship to a new player')
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('Player to mentor')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a mentorship offer')
        .addUserOption(option =>
          option
            .setName('mentor')
            .setDescription('Mentor to accept offer from')
            .setRequired(true)
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const subcommand = context.interaction.options.getSubcommand();
    const socialService = SocialCreditService.getInstance();

    switch (subcommand) {
      case 'offer':
        return await this.handleMentorOffer(context, socialService);
      case 'accept':
        return await this.handleMentorAccept(context, socialService);
      default:
        return { success: false, error: 'Invalid subcommand' };
    }
  },

  async handleMentorOffer(
    context: CommandContext,
    socialService: SocialCreditService
  ): Promise<CommandResult> {
    const targetUser = context.interaction.options.getUser('player', true);
    
    // Check if mentor is eligible (level, reputation, etc.)
    const mentorEligible = await socialService.checkMentorEligibility(
      context.userId
    );

    if (!mentorEligible) {
      return { 
        success: false, 
        error: 'You must be level 10+ with good reputation to mentor' 
      };
    }

    // Store pending mentorship offer
    await socialService.createMentorshipOffer(
      context.userId,
      targetUser.id
    );

    return {
      success: true,
      message: `Mentorship offer sent to ${targetUser.username}! They have 24 hours to accept.`
    };
  },

  cooldown: 300, // 5 minutes between mentor actions
  category: 'social'
};

export default mentorCommand;
```

### Territory Control Commands

```typescript
// src/commands/territory.ts
const territoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('territory')
    .setDescription('Territory control and warfare')
    .addSubcommand(subcommand =>
      subcommand
        .setName('map')
        .setDescription('View current territory control map')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('attack')
        .setDescription('Attack a territory')
        .addStringOption(option =>
          option
            .setName('territory')
            .setDescription('Territory to attack')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('strategy')
            .setDescription('Attack strategy')
            .addChoices(
              { name: 'Blitz Attack (+20% power, high risk)', value: 'blitz' },
              { name: 'Coordinated Assault (+10% power)', value: 'coordinated' },
              { name: 'Overwhelming Force (+30% power, expensive)', value: 'overwhelming' }
            )
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const subcommand = context.interaction.options.getSubcommand();
    const territoryService = TerritoryService.getInstance();

    switch (subcommand) {
      case 'map':
        return await this.showTerritoryMap(context, territoryService);
      case 'attack':
        return await this.initiateAttack(context, territoryService);
      default:
        return { success: false, error: 'Invalid subcommand' };
    }
  },

  async showTerritoryMap(
    context: CommandContext,
    territoryService: TerritoryService
  ): Promise<CommandResult> {
    const territories = await territoryService.getAllTerritories();
    
    const embed = new EmbedBuilder()
      .setTitle('🗺️ Territory Control Map')
      .setColor(BotBranding.getThemeColor())
      .setDescription(this.formatTerritoryMap(territories));

    await context.interaction.editReply({ embeds: [embed] });
    return { success: true };
  },

  formatTerritoryMap(territories: Territory[]): string {
    // Create ASCII-style map representation
    const map = [
      '🏦 Financial   🏭 Industrial  🏘️ Residential',
      '🔧 Tech        ⚫ Underground  🎭 Entertainment',
      '🚢 Harbor      🏛️ Government  🌳 Suburbs',
      '🏪 Commercial  🎓 University   🏥 Medical'
    ];

    let mapString = '```\n' + map.join('\n') + '\n```\n\n';
    
    mapString += '**Territory Ownership:**\n';
    territories.forEach(territory => {
      const owner = territory.owner_gang?.name || 'Neutral';
      mapString += `${territory.name}: ${owner}\n`;
    });

    return mapString;
  },

  cooldown: 30,
  category: 'gang'
};
```

---

## Integration with Existing Systems

### Leveraging Current Economic Framework

The new features integrate seamlessly with the existing 3-tier money system:

```typescript
// Enhanced MoneyService integration
export class EnhancedMoneyService extends MoneyService {
  
  async applyTerritoryBonuses(
    userId: string,
    baseAmount: number,
    transactionType: string
  ): Promise<number> {
    const territoryService = TerritoryService.getInstance();
    const userGang = await this.getUserGang(userId);
    
    if (!userGang) return baseAmount;
    
    const territoryBonuses = await territoryService.getGangTerritoryBonuses(
      userGang.id
    );
    
    let bonusMultiplier = 1.0;
    
    territoryBonuses.forEach(bonus => {
      if (bonus.benefit_type === 'income_boost' && transactionType === 'asset_income') {
        bonusMultiplier += bonus.benefit_value;
      } else if (bonus.benefit_type === 'fee_reduction' && transactionType === 'bank_fee') {
        bonusMultiplier -= bonus.benefit_value;
      }
    });
    
    return Math.floor(baseAmount * bonusMultiplier);
  }

  async applySocialCreditBonus(
    userId: string,
    baseSuccessRate: number
  ): Promise<number> {
    const socialService = SocialCreditService.getInstance();
    const userCredits = await socialService.getUserSocialCredits(userId);
    
    if (!userCredits) return baseSuccessRate;
    
    // High reputation players get slight success rate bonuses
    const reputationBonuses = {
      'newcomer': 0,
      'known': 0.02,
      'respected': 0.05,
      'influential': 0.08,
      'legendary': 0.12
    };
    
    const bonus = reputationBonuses[userCredits.reputation_level] || 0;
    return Math.min(0.95, baseSuccessRate + bonus); // Cap at 95%
  }
}
```

### Command Manager Extensions

```typescript
// Enhanced CommandManager with event support
export class EnhancedCommandManager extends CommandManager {
  
  private eventCommands: Map<string, Command> = new Map();
  
  async loadEventCommands(eventId: number): Promise<void> {
    const eventService = EventService.getInstance();
    const event = await eventService.getEvent(eventId);
    
    if (!event) return;
    
    // Load event-specific commands based on event type
    switch (event.type) {
      case 'heist':
        await this.loadHeistCommands(eventId);
        break;
      case 'tournament':
        await this.loadTournamentCommands(eventId);
        break;
      // ... other event types
    }
  }
  
  private async loadHeistCommands(eventId: number): Promise<void> {
    const heistCommands = [
      '/heist hack_security',
      '/heist neutralize_guards',
      '/heist position_getaway',
      '/heist coordinate_team'
    ];
    
    // Dynamically create and register event-specific commands
    heistCommands.forEach(commandName => {
      const command = this.createEventCommand(commandName, eventId);
      this.eventCommands.set(`${eventId}_${commandName}`, command);
    });
  }
}
```

---

## Performance and Scalability Considerations

### Caching Strategy

```typescript
// Redis integration for real-time features
export class CacheManager {
  private redis: Redis;
  
  async cacheTerritoryStatus(territoryId: number, data: any): Promise<void> {
    await this.redis.setex(
      `territory:${territoryId}`,
      300, // 5 minutes TTL
      JSON.stringify(data)
    );
  }
  
  async getCachedTerritoryStatus(territoryId: number): Promise<any> {
    const cached = await this.redis.get(`territory:${territoryId}`);
    return cached ? JSON.parse(cached) : null;
  }
  
  async cacheEventProgress(eventId: number, userId: string, progress: any): Promise<void> {
    await this.redis.setex(
      `event:${eventId}:user:${userId}`,
      3600, // 1 hour TTL
      JSON.stringify(progress)
    );
  }
}
```

### Background Processing

```typescript
// Background job processing for AI events and territory income
export class BackgroundProcessor {
  private queue: Queue;
  
  async scheduleEconomicAnalysis(): Promise<void> {
    // Run AI economic analysis every 6 hours
    this.queue.add('economic-analysis', {}, {
      repeat: { cron: '0 */6 * * *' }
    });
  }
  
  async scheduleTerritoryIncomeDistribution(): Promise<void> {
    // Distribute territory income every hour
    this.queue.add('territory-income', {}, {
      repeat: { cron: '0 * * * *' }
    });
  }
  
  async processEconomicAnalysis(job: Job): Promise<void> {
    const aiService = AIEconomicService.getInstance();
    const events = await aiService.analyzeMarketConditions();
    
    for (const event of events) {
      await aiService.triggerEconomicEvent(event);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests for New Services

```typescript
// tests/services/SocialCreditService.test.ts
describe('SocialCreditService', () => {
  let service: SocialCreditService;
  let mockDatabase: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    service = SocialCreditService.getInstance();
    mockDatabase = createMockDatabase();
  });

  test('should award social credits correctly', async () => {
    await service.awardSocialCredits('user1', 'user2', 'mentor', 50, 'Mentorship');
    
    expect(mockDatabase.socialCredits.upsert).toHaveBeenCalledWith({
      where: { user_id: 'user2' },
      update: { 
        total_credits: { increment: 50 },
        updated_at: expect.any(Date)
      },
      create: {
        user_id: 'user2',
        total_credits: 50
      }
    });
  });

  test('should update reputation level when thresholds are crossed', async () => {
    mockDatabase.socialCredits.findUnique.mockResolvedValue({
      user_id: 'user1',
      total_credits: 600,
      reputation_level: 'known'
    });

    await service.awardSocialCredits('user2', 'user1', 'collaboration', 100, 'Test');
    
    // Should update to 'respected' level at 500+ credits
    expect(mockDatabase.socialCredits.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { reputation_level: 'respected' }
      })
    );
  });
});
```

### Integration Tests

```typescript
// tests/integration/TerritoryWarfare.test.ts
describe('Territory Warfare Integration', () => {
  test('complete territory battle flow', async () => {
    const territoryService = TerritoryService.getInstance();
    
    // 1. Initiate attack
    const battle = await territoryService.initiateAttack(1, 1, 'blitz');
    expect(battle.battleId).toBeDefined();
    
    // 2. Organize defense
    await territoryService.organizeDefense(2, battle.battleId, 'fortress');
    
    // 3. Resolve battle
    const result = await territoryService.resolveBattle(battle.battleId);
    expect(result.winner).toBeDefined();
    expect(result.territoryChanged).toBeDefined();
  });
});
```

---

This technical architecture ensures that all new features integrate seamlessly with the existing MafiaWar infrastructure while providing the foundation for sophisticated new gameplay mechanics. The modular design allows for incremental implementation and easy maintenance.