# Investigation Reports

This directory contains detailed technical investigations into MafiaWar game issues.

## Reports

### [Crypto Value Decline Analysis](crypto-decline-analysis.md)
**Issue**: Crypto value dropped from $1,337 to $100 in one week  
**Root Cause**: Mathematical bias in multiplicative random walk  
**Status**: Investigation complete - code changes required  
**Date**: December 2024

**Key Finding**: The crypto pricing algorithm has a mathematical flaw that causes systematic downward bias (~2.1% per update), leading to inevitable price decline toward zero.

**Impact**: 97% expected decline over one week with hourly updates. This is not a bug or coincidence - it's a mathematical certainty.

**Solution**: Requires bias correction or log-normal random walk implementation.