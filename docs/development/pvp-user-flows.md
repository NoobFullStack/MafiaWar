# PvP System User Flow Diagrams

This document provides visual representations of key PvP user flows and system interactions.

## Asset Robbery Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Player A      │    │   Asset System  │    │   Player B      │
│   (Robber)      │    │                 │    │   (Owner)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       │                       │
   [/pvp rob asset_id]           │                       │
         │                       │                       │
         ▼                       │                       │
   ┌─────────────┐              │                       │
   │ Target      │              │                       │
   │ Validation  │              │                       │
   └─────────────┘              │                       │
         │                       │                       │
         ▼                       │                       │
   ┌─────────────┐              │                       │
   │ Success     │◄─────────────┤                       │
   │ Calculation │              │                       │
   └─────────────┘              │                       │
         │                       │                       │
         ▼                       │                       │
   ┌─────────────┐              │                       │
   │ Success?    │              │                       │
   └─────────────┘              │                       │
      │       │                 │                       │
      ▼       ▼                 │                       │
 ┌────────┐ ┌────────┐          │                       │
 │Success │ │Failure │          │                       │
 └────────┘ └────────┘          │                       │
      │       │                 │                       │
      ▼       ▼                 │                       │
 ┌────────┐ ┌────────┐          │        ┌─────────────┐
 │Money   │ │Jail    │          │        │ Notify      │
 │Transfer│ │Time    │          │        │ Owner       │
 └────────┘ └────────┘          │        └─────────────┘
      │       │                 │                │
      ▼       ▼                 │                ▼
 ┌────────────────────────────────┐              │
 │     Update Records &           │              │
 │     Send Notifications         │◄─────────────┘
 └────────────────────────────────┘
```

## Gang Warfare Flow

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Gang A     │  │   Gang B     │  │  Territory   │  │   System     │
│  (Attacker)  │  │  (Defender)  │  │   System     │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
       │                 │                 │                 │
       ▼                 │                 │                 │
[/gang war declare]      │                 │                 │
       │                 │                 │                 │
       ▼                 │                 │                 │
┌─────────────┐          │                 │                 │
│ War Valid?  │          │                 │                 │
└─────────────┘          │                 │                 │
       │                 │                 │                 │
       ▼                 │                 │                 │
┌─────────────┐          │                 │                 │
│ Notify All  │          │                 │                 │
│ Members     │──────────┼─────────────────┼─────────────────┤
└─────────────┘          │                 │                 │
       │                 ▼                 │                 │
       │        ┌─────────────┐            │                 │
       │        │ Accept/     │            │                 │
       │        │ Decline     │            │                 │
       │        └─────────────┘            │                 │
       │                 │                 │                 │
       ▼                 ▼                 │                 │
┌─────────────────────────────┐            │                 │
│     War Phase Begin         │            │                 │
└─────────────────────────────┘            │                 │
       │                                   │                 │
       ▼                                   │                 │
┌─────────────────────────────┐            │                 │
│   Battle Resolution         │            │                 │
│   (Multiple Rounds)         │◄───────────┤                 │
└─────────────────────────────┘            │                 │
       │                                   │                 │
       ▼                                   ▼                 │
┌─────────────────────────────┐    ┌─────────────┐          │
│      Victory/Defeat         │    │  Territory  │          │
│     Determination           │    │  Transfer   │          │
└─────────────────────────────┘    └─────────────┘          │
       │                                   │                 │
       ▼                                   ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Update All Records & Stats                    │
└─────────────────────────────────────────────────────────────┘
```

## Bounty System Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Issuer     │    │   Bounty    │    │   Hunter    │    │   Target    │
│             │    │   System    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   │                   │                   │
[/pvp bounty place]        │                   │                   │
       │                   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ Payment     │            │                   │                   │
│ Validation  │            │                   │                   │
└─────────────┘            │                   │                   │
       │                   │                   │                   │
       ▼                   │                   │                   │
┌─────────────┐            │                   │                   │
│ Create      │            │                   │                   │
│ Bounty      │───────────►│                   │                   │
└─────────────┘            │                   │                   │
       │                   ▼                   │                   │
       │            ┌─────────────┐            │                   │
       │            │ Notify      │            │                   │
       │            │ Available   │───────────►│                   │
       │            └─────────────┘            │                   │
       │                   │                   ▼                   │
       │                   │         [/pvp bounty claim]           │
       │                   │                   │                   │
       │                   │                   ▼                   │
       │                   │         ┌─────────────┐               │
       │                   │         │ Attempt     │               │
       │                   │         │ Elimination │               │
       │                   │         └─────────────┘               │
       │                   │                   │                   │
       │                   │                   ▼                   │
       │                   │         ┌─────────────┐               │
       │                   │         │ Success?    │               │
       │                   │         └─────────────┘               │
       │                   │              │       │                │
       │                   │              ▼       ▼                │
       │                   │         ┌────────┐ ┌────────┐         │
       │                   │         │Success │ │Failure │         │
       │                   │         └────────┘ └────────┘         │
       │                   │              │       │                │
       │                   │              ▼       │                │
       │                   │         ┌─────────────┐               │
       │                   │         │ Pay Hunter  │               │
       │                   │         │ & Complete  │               │
       │                   │         └─────────────┘               │
       │                   │              │                        │
       ▼                   ▼              ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Update All Records                               │
└─────────────────────────────────────────────────────────────────────┘
```

## PvP Matchmaking Algorithm

```
Player Requests PvP Action
         │
         ▼
┌─────────────────┐
│ Get Player      │
│ Statistics      │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Filter Valid    │
│ Targets         │
└─────────────────┘
         │
         ▼
┌─────────────────┐    Filters:
│ Apply Filters   │    • Level range (±10)
│                 │    • Wealth ratio (<5:1)
│                 │    • Recent target cooldown
│                 │    • Newbie protection
│                 │    • Gang war status
│                 │    • Online/offline status
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │    Scoring:
│ Match Quality   │    • Level difference (weight: 0.4)
│ Scores          │    • Wealth difference (weight: 0.3)
│                 │    • PvP rating diff (weight: 0.2)
│                 │    • Activity level (weight: 0.1)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Sort by Best    │
│ Match Quality   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Return Top 10   │
│ Candidates      │
└─────────────────┘
```

## Security and Anti-Abuse Flow

```
PvP Action Request
         │
         ▼
┌─────────────────┐
│ Rate Limit      │ ── Fail ──► [Error: Too Many Actions]
│ Check           │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Cooldown        │ ── Fail ──► [Error: On Cooldown]
│ Validation      │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Target          │ ── Fail ──► [Error: Invalid Target]
│ Validation      │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Multi-Account   │ ── Fail ──► [Flag for Review]
│ Detection       │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Farming         │ ── Fail ──► [Warning + Reduced Rewards]
│ Detection       │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Newbie          │ ── Fail ──► [Error: Target Protected]
│ Protection      │
└─────────────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Execute PvP     │
│ Action          │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Log Action      │
│ for Analysis    │
└─────────────────┘
```

## Economic Balance Flow

```
PvP Action Outcome
         │
         ▼
┌─────────────────┐
│ Base Reward     │
│ Calculation     │
└─────────────────┘
         │
         ▼
┌─────────────────┐    Modifiers:
│ Apply Economic  │    • Wealth ratio penalty
│ Modifiers       │    • Recent target penalty
│                 │    • Underdog bonus
│                 │    • Activity level adjustment
│                 │    • Gang bonus/penalty
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Check Wealth    │ ── Trigger ──► [Wealth Redistribution]
│ Concentration   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Apply Final     │
│ Reward/Penalty  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Update Player   │
│ Economics       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Log for         │
│ Balance         │
│ Analysis        │
└─────────────────┘
```

## Territory Control Map Example

```
┌─────────────────────────────────────────────────────────────────┐
│                    CITY TERRITORY MAP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  DOWNTOWN   │  │   HARBOR    │  │ INDUSTRIAL  │             │
│  │             │  │             │  │             │             │
│  │ 🏛️ [NEUTRAL] │  │ ⚓ [GANG A]  │  │ 🏭 [GANG B]  │             │
│  │ +15% Income │  │ +20% Income │  │ +25% Income │             │
│  │ High Value  │  │ Med. Value  │  │ High Value  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ RESIDENTIAL │  │   CASINO    │  │ RED LIGHT   │             │
│  │             │  │   DISTRICT  │  │  DISTRICT   │             │
│  │ 🏠 [GANG C]  │  │ 🎰 [GANG A]  │  │ 🌆 [GANG D]  │             │
│  │ +10% Income │  │ +30% Income │  │ +20% Income │             │
│  │ Low Value   │  │ Very High   │  │ Med. Value  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   SUBURBS   │  │   AIRPORT   │  │  FINANCIAL  │             │
│  │             │  │             │  │  DISTRICT   │             │
│  │ 🏘️ [NEUTRAL] │  │ ✈️ [GANG B]  │  │ 💰 [CONTESTED] │            │
│  │ +5% Income  │  │ +25% Income │  │ +35% Income │             │
│  │ Low Value   │  │ High Value  │  │ Highest Val │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ LEGEND:                                                         │
│ 🏛️ Government/Neutral    ⚓ Harbor/Smuggling                     │
│ 🏭 Industrial           🏠 Residential                          │
│ 🎰 Entertainment        🌆 Vice/Criminal                        │
│ 🏘️ Suburban             ✈️ Transportation                       │
│ 💰 Financial            🔥 Contested/War Zone                   │
└─────────────────────────────────────────────────────────────────┘
```

## Combat Resolution Example

```
┌─────────────────────────────────────────────────────────────────┐
│                        DUEL RESOLUTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Player A (Challenger)           vs           Player B (Defender)│
│  ┌─────────────────┐                         ┌─────────────────┐│
│  │ Tony "The Fist" │                         │ Maria "Blade"   ││
│  │ Level: 25       │                         │ Level: 23       ││
│  │ ──────────────  │                         │ ──────────────  ││
│  │ STR: 85  🟩🟩🟩🟩 │                         │ STR: 70  🟩🟩🟩   ││
│  │ STE: 60  🟩🟩🟩   │                         │ STE: 95  🟩🟩🟩🟩🟩││
│  │ INT: 45  🟩🟩     │                         │ INT: 80  🟩🟩🟩🟩 ││
│  │ ──────────────  │                         │ ──────────────  ││
│  │ Equipment:      │                         │ Equipment:      ││
│  │ • Brass Knuckles│                         │ • Switchblade   ││
│  │ • Body Armor    │                         │ • Smoke Grenade ││
│  └─────────────────┘                         └─────────────────┘│
│                                                                 │
│  ┌─────────────────┐                         ┌─────────────────┐│
│  │ Round 1         │                         │ Round 1         ││
│  │ Action: CHARGE  │ ←──── CLASH ────→       │ Action: DODGE   ││
│  │ Roll: 78 + 25   │                         │ Roll: 88 + 30   ││
│  │ Total: 103      │     MARIA WINS          │ Total: 118      ││
│  └─────────────────┘                         └─────────────────┘│
│                                                                 │
│  ┌─────────────────┐                         ┌─────────────────┐│
│  │ Round 2         │                         │ Round 2         ││
│  │ Action: BLOCK   │ ←──── CLASH ────→       │ Action: STRIKE  ││
│  │ Roll: 65 + 20   │                         │ Roll: 72 + 35   ││
│  │ Total: 85       │     MARIA WINS          │ Total: 107      ││
│  └─────────────────┘     (Critical!)         └─────────────────┘│
│                                                                 │
│  ┌─────────────────┐                         ┌─────────────────┐│
│  │ Round 3         │                         │ Round 3         ││
│  │ Action: GUARD   │ ←──── CLASH ────→       │ Action: FINISH  ││
│  │ Roll: 45 + 15   │                         │ Roll: 91 + 40   ││
│  │ Total: 60       │     MARIA WINS          │ Total: 131      ││
│  └─────────────────┘     (KNOCKOUT!)         └─────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                           RESULT                                │
│ 🏆 WINNER: Maria "Blade"                                        │
│ 💰 Prize Money: $5,000 (from Tony)                             │
│ 📈 Reputation: +15 (Maria), -10 (Tony)                         │
│ 🏥 Hospital Time: Tony (2 hours)                               │
│ 🎯 PvP Rating: Maria +25, Tony -20                             │
└─────────────────────────────────────────────────────────────────┘
```