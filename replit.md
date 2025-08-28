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
Multi-timeframe trading style system: Fully automated 3-style preset system with dual-timeframe analysis:
- Conservative: 4H + 1D timeframes for stable growth (75% confidence, 3x max leverage)
- Balanced: 15M + 1H timeframes for steady returns (60% confidence, 5x max leverage)  
- Aggressive: 1M + 5M timeframes for quick scalping profits (45% confidence, 10x max leverage)
Auto scanner multi-timeframe integration: Scanner automatically uses dual timeframe analysis based on selected trading style. Primary timeframe provides detailed technical analysis while secondary timeframe offers confirmation. No manual configuration required - settings apply instantly upon style selection.
Bot termination system: Comprehensive bot termination that closes both Bitget positions AND terminates corresponding bot database records.
Entry system preference: VOLATILITY-OPTIMIZED multi-indicator analysis system for 5-minute scalping with leverage. AI bots use weighted technical analysis combining MACD (25%), RSI (20%), Bollinger Bands (20%), Volume Analysis (15%), Moving Averages (10%), and Enhanced Support/Resistance (15%). OPTIMIZATIONS FOR HIGH VOLATILITY: Base confidence threshold 60% (50% for volatile pairs >3%), volatility-adaptive signal requirements (15-20 points based on pair movement), enhanced support/resistance with multi-touch confirmation and volume-confirmed breakouts, automatic overbought/oversold blocking, minimum 5-minute evaluation intervals per pair, 5-minute timeframes for quick leveraged gains targeting minimum 5% profits.
Auto Market Scanner: FULLY OPERATIONAL autonomous market-wide scanning system that evaluates 100+ trading pairs, automatically selects optimal opportunities using multi-indicator AI analysis, and deploys bots with just capital allocation required from user. Features configurable parameters for maximum bots (3-10), minimum confidence threshold (30-90%), and automatic capital distribution across selected opportunities.
Auto Market Scanner UI Organization: Reorganized with proper card separation - Scanner Configuration card contains trading style selector, max bots setting, and start scanner button. Scanner Results & Deployment card contains capital allocation, leverage settings, and deploy button for found opportunities. Removed duplicate leverage settings from trading style selector to keep leverage configuration only in deployment section.
Trade Selection Philosophy: Prioritizes HIGH-VOLATILITY pairs that can achieve minimum 5% leveraged gains with smaller percentage moves. System automatically identifies volatile pairs (>2% daily movement) and adjusts entry requirements accordingly. With 3x leverage: 2% price move = 6% account gain (exceeding 5% target). Focus on volatile meme tokens, small caps, and trending altcoins that move 2-5% regularly for quick scalping opportunities. Enhanced market scanner requires minimum 0.8% moves to identify truly volatile opportunities.

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

**Enhanced Multi-Indicator AI Bot System**: Sophisticated technical analysis engine combining 6 indicators with weighted scoring - MACD, RSI, Bollinger Bands, Volume Analysis, Moving Averages, and Support/Resistance. Each indicator contributes weighted scores with adaptive confidence thresholds (25-50% based on signal strength).

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