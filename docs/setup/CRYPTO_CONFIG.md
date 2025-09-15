# Cryptocurrency Environment Configuration

This document explains the environment variables used to configure the single cryptocurrency in the MafiaWar Discord bot.

## Environment Variables

Add these variables to your `.env` file to customize your bot's cryptocurrency:

### Required Variables

```bash
# Cryptocurrency Configuration
CRYPTO_NAME=MafiaCoin              # The display name of your cryptocurrency
CRYPTO_SYMBOL=MAFIA                # The symbol/ticker (e.g., BTC, ETH)
CRYPTO_DESCRIPTION="The official cryptocurrency of the criminal underworld."
CRYPTO_BASE_PRICE=1337               # Starting price in USD (default: 1337)
CRYPTO_VOLATILITY=0.35             # Price volatility factor 0.1-0.5 (default: 0.35)
```

### Optional Bot Branding

```bash
# Bot Configuration (existing)
BOT_NAME=MafiaWar
BOT_CURRENCY_SYMBOL=$
BOT_CURRENCY_NAME=dollars
BOT_THEME_COLOR=0x800080
```

## Examples

### Conservative Setup (Lower Risk)

```bash
CRYPTO_NAME=SafeCoin
CRYPTO_SYMBOL=SAFE
CRYPTO_DESCRIPTION="A stable digital currency for safe investments."
CRYPTO_BASE_PRICE=5
CRYPTO_VOLATILITY=0.15
```

### High Risk Setup

```bash
CRYPTO_NAME=RiskCoin
CRYPTO_SYMBOL=RISK
CRYPTO_DESCRIPTION="High-risk, high-reward cryptocurrency for daredevils."
CRYPTO_BASE_PRICE=50
CRYPTO_VOLATILITY=0.5
```

### Crime-Themed Setup (Default)

```bash
CRYPTO_NAME=MafiaCoin
CRYPTO_SYMBOL=MAFIA
CRYPTO_DESCRIPTION="The official cryptocurrency of the criminal underworld."
CRYPTO_BASE_PRICE=10
CRYPTO_VOLATILITY=0.35
```

## How It Works

- **CRYPTO_NAME**: Displayed in all UI elements (e.g., "Successfully bought MafiaCoin!")
- **CRYPTO_SYMBOL**: Used in portfolio displays and shortened references (e.g., "0.123456 MAFIA")
- **CRYPTO_DESCRIPTION**: Shown in price displays and help text
- **CRYPTO_BASE_PRICE**: Starting price when the bot first runs
- **CRYPTO_VOLATILITY**: How much the price fluctuates (0.1 = stable, 0.5 = very volatile)

## Commands Updated

- `/crypto prices` - Shows price for your configured cryptocurrency
- `/crypto buy <amount>` - Buys your cryptocurrency (no coin selection needed)
- `/crypto sell <amount>` - Sells your cryptocurrency (no coin selection needed)
- `/crypto portfolio` - Shows holdings of your cryptocurrency
