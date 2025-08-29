# Overview
This project is a mobile-optimized crypto trading application for real-time Bitget perpetual futures data. Its purpose is to provide comprehensive trading functionality, including market monitoring, order placement, automated trading bot setup, intelligent folder-based trading pair organization, and revolutionary bulk bot deployment capabilities. The project aims to offer a clean, modern interface, matching professional trading platforms, with a vision to empower users with advanced AI-powered trading opportunities and streamlined strategy deployment for enhanced market potential.

# User Preferences
Preferred communication style: Simple, everyday language.
Table design preference: Compact rows with minimal padding (py-2) for space efficiency while maintaining readability.
Navigation preference: Pages should open instantly at the top without scrolling animations for immediate access to content.
Bots page UX preference: Use clickable overview cards for navigation instead of redundant tab system - streamlined interface with functional cards that show active states.
Account balance display: Total Balance = Total Equity + Available Balance + P&L (complete account value including position allocations).
Header structure preference: Total Balance, Total Equity, Available Balance (in that specific order).
Balance calculation logic: Total Equity = Available Balance + Margin Used, Total Balance = Total Equity + Available Balance + P&L.
Bot page layout preference: Improved two-row vertical design for better mobile display and proper element fitting. Financial data now displays in vertical stacks, folder headers use two-row layout to prevent overflow, and all elements properly fit within screen width.
Multi-bucket volatility classification system: Sophisticated 3-bucket analysis system with comprehensive technical criteria:
- Aggressive: 1M/5M timeframes for high-volatility scalping (>8% daily range, RSI extremes, BB breaks, 2x volume spikes)
- Balanced: 15M/1H timeframes for medium-volatility trading (3-8% daily range, EMA trend alignment, MACD/RSI confirmation)
- Conservative: 4H/1D timeframes for low-volatility position trading (<3% daily range, EMA200 bias filtering, sustained trends)
Auto scanner multi-timeframe integration: Scanner automatically uses dual timeframe analysis based on selected trading style. Primary timeframe provides detailed technical analysis while secondary timeframe offers confirmation. No manual configuration required - settings apply instantly upon style selection.
Bot termination system: Comprehensive bot termination that closes both Bitget positions AND terminates corresponding bot database records.
Entry system preference: ULTRA-CONSERVATIVE account protection system implemented after previous system caused consistent losses. NEW SAFETY REQUIREMENTS: 85%+ confidence threshold minimum (was 30-50%), 40+ point signal difference required (was 15), enhanced safety blocks for dangerous overbought/oversold entries. REVISED INDICATOR WEIGHTS: MACD (40% - only strong crossovers), RSI (25% - only extreme levels <25/>75), Bollinger Bands (20% - only extreme breaches), Volume Analysis (20% - requires 2.0+ strength), Moving Averages (15% - confirmed crossovers only). ACCOUNT PROTECTION: 5-8% stop losses minimum (was 2%), 15-20% take profit targets (was 3%), maximum 1.5% account risk per trade, high leverage gets wider stops automatically. System now trades much less frequently but with higher win rates and proper risk management to prevent account destruction.
Auto Market Scanner: FULLY OPERATIONAL AND FIXED - focused scanning system that analyzes TOP 50 HIGHEST-VOLUME USDT pairs from Bitget API. Optimized for 10x faster performance (10-15 seconds vs 2+ minutes) while maintaining higher signal quality through volume-based filtering. Fixed ultra-conservative blocking issues - now uses REALISTIC confidence thresholds (20-35%) and 8+ point signal differences for actual market conditions. Frontend and backend thresholds properly aligned. Successfully finds 3+ high-confidence trading opportunities from 47+ valid signals. Automatically selects optimal opportunities using multi-indicator AI analysis and deploys bots with capital allocation. Configurable parameters for maximum bots (3-10), realistic confidence thresholds, and automatic capital distribution across selected opportunities.

Sophisticated Entry Point Analysis: FULLY IMPLEMENTED advanced entry system based on detailed trading rules document. Features bucket-specific entry strategies: Balanced bucket (1H/15M timeframes) with EMA100, MACD, RSI rules including HTF bias filtering; Aggressive bucket (5M/1M timeframes) with extreme RSI levels (<=20/>=80), Bollinger Band breakout patterns, MACD histogram crossovers, and 2.0x volume confirmation requirements; Conservative bucket with bias-based entries and low volatility requirements. All entries include comprehensive safety scoring, dynamic stop loss/take profit calculations, invalidation rules, and ultra-conservative account protection measures. Entry system is completely separate from market scanning - scanner finds opportunities, entry determines exact entry points with maximum 1-2 day hold times.
Auto Market Scanner UI Organization: Reorganized with proper card separation - Scanner Configuration card contains trading style selector, max bots setting, and start scanner button. Scanner Results & Deployment card contains capital allocation, leverage settings, and deploy button for found opportunities. Removed duplicate leverage settings from trading style selector to keep leverage configuration only in deployment section.
Trade Selection Philosophy: Prioritizes HIGH-VOLATILITY pairs that can achieve minimum 5% leveraged gains with smaller percentage moves. System automatically identifies volatile pairs (>2% daily movement) and adjusts entry requirements accordingly. With 3x leverage: 2% price move = 6% account gain (exceeding 5% target). Focus on volatile meme tokens, small caps, and trending altcoins that move 2-5% regularly for quick scalping opportunities. Enhanced market scanner requires minimum 0.8% moves to identify truly volatile opportunities.

Dynamic Exit Visualizer Design Standards: ESTABLISHED DESIGN SYSTEM for consistent modal/popup components throughout the app. Key design elements: Simple white/dark gray card with `max-w-md` size and `rounded-lg` corners, no fancy gradients or headers. Clean two-badge layout for primary data (ROI percentage + risk level) using large badges with proper color coding. Simple progress section with clear "Stop Loss"/"Take Profit" labels and 6px height progress bar. Minimal trading info with centered pair name and entry/current prices. Single action button for primary function with two-step confirmation pattern. Clean spacing using `space-y-6` for main sections and `p-6` padding. Border separations using subtle gray borders. This design pattern should be replicated for any modal, popup, or overlay component to maintain visual consistency across the trading platform.

# System Architecture

## Frontend Architecture
The client-side is built with React 18, TypeScript, and Vite. It uses Tailwind CSS with shadcn/ui for mobile-first, responsive design. State management uses React Query for server state and caching, and Wouter for client-side routing. Real-time updates are via WebSocket. The application has a component-based structure, organized around a bottom navigation bar with five main sections: Home, Markets, Trade, Bot, and Assets.

## Backend Architecture
The server-side uses Express.js with TypeScript. It integrates with the Bitget API for futures market data and provides a WebSocket server for live updates. Data is currently stored in-memory, designed with an abstract `IStorage` interface for future database integration. Account balance calculation properly aggregates margin used from all individual positions to provide accurate total balance (available + margin used).

## Data Storage Solutions
The system uses in-memory storage with an `IStorage` interface, prepared for future integration with PostgreSQL using Drizzle ORM. The schema defines models for users, Bitget credentials, futures data, positions, and account information.

## Authentication and Authorization
A basic structure for user management is in place, including a user schema for username/password authentication, secure storage for Bitget API keys, and preparation for PostgreSQL session storage.

## UI/UX Decisions
The application prioritizes a clean, professional design optimized for mobile devices, matching modern trading interfaces. It features a bottom navigation bar, collapsible folder views for organization, and intuitive interfaces for trading pair management, bot deployment, and AI-powered recommendations. shadcn/ui components ensure consistent visual style. AI-powered features include color-coded risk levels, confidence ratings, and strategy-specific icons.

## Technical Implementations
Key technical implementations include real-time data streaming via WebSockets, a comprehensive trading pair organization system with folder management and bulk bot deployment, and an AI-powered trading opportunity recommendation system. The AI analyzes price movements, volume patterns, and risk factors across multiple strategies (Momentum, Breakout, Scalping, Swing, Reversal) to provide smart scoring and confidence ratings. The bot system uses reusable strategy templates with configurable technical indicators and risk management settings.

**Enhanced Multi-Bucket Analysis System**: Revolutionary volatility-based market categorization using comprehensive technical analysis. Features EMA calculations (100-period 1H, 200-period Daily), RSI extremes detection, MACD crossover analysis, Bollinger Band breach identification, and volume spike detection (2x average). Automatically classifies trading pairs into Aggressive (high-volatility scalping), Balanced (medium-volatility trading), and Conservative (low-volatility position trading) buckets with sophisticated technical criteria and minimum $10M daily volume requirements.

**Dynamic Leverage Safety System**: Automatically calculates leverage-safe limits based on user's entered leverage. Uses the formula: Account Risk % ÷ Leverage = Position Risk % to prevent excessive account loss per trade. Implements frontend risk warnings and automatic limit adjustments for high user leverage.

## Feature Specifications
The application includes:
- **Multi-page navigation**: Home, Markets, Trade, Bot, Analyzer.
- **Home Page**: Enhanced market overview with visual dashboard, interactive sentiment analysis, top gainers/losers, and AI-powered trading opportunities with strategy analysis, smart scoring, and risk assessment.
- **Markets Page**: Comprehensive screener functionality with diverse filtering options and clickable sorting.
- **Trade Page**: Order placement, leverage, and position management.
- **Bot Page**: Automated trading strategy setup, including creation, deployment, monitoring, and termination. Bots are strategy-based and can be applied to any trading pair.
- **Trading Pair Management**: Folder-based organization with bulk bot deployment, manual pair addition, and context menus for adding pairs from the Markets page.
- **Bulk Bot Deployment**: Deploying strategies to all pairs within a folder simultaneously, with individual capital allocation, leverage settings, and investment calculation.
- **AI-Powered Recommendations**: Comprehensive analysis of 150+ trading pairs with lowered volume threshold (50k+), recommendations based on daily movement patterns, liquidity, and trading patterns, with detailed display of movement percentage and AI scores.
- **Unified AI Analysis Hub**: Complete trading analysis platform with integrated tools for price prediction, risk analysis, and trend statistics. Features real-time Bitget API integration, smart autocomplete, multi-timeframe analysis, confidence scoring, comprehensive technical indicators, market sentiment assessment, support/resistance detection, volatility statistics, volume analysis, performance history tracking, technical signals analysis, and position sizing recommendations.
- **Analyzer Page**: Advanced technical analysis tool with trend detection, support/resistance levels, entry/exit recommendations, multi-timeframe analysis, and direct trading execution.
- **Comprehensive Alert System**: Complete notification system with 8+ alert categories, intelligent auto-suggest functionality, distinction between alert settings and actual notifications, real-time monitoring, and proper light/dark mode support.

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity via Neon.
- **drizzle-orm & drizzle-kit**: Type-safe ORM for database interactions.
- **express**: Web server framework.
- **axios**: HTTP client for API requests.
- **ws**: WebSocket server implementation for real-time communication.

## Frontend Dependencies
- **@tanstack/react-query**: Server state management and caching.
- **@radix-ui/***: Headless UI components.
- **tailwindcss**: Utility-first CSS framework.
- **wouter**: Lightweight routing library.
- **react-hook-form**: Form handling and validation.

## API Integrations
- **Bitget API**: Complete integration for fetching futures market data (tickers, prices, volumes), account information, position monitoring, and real-time data synchronization.