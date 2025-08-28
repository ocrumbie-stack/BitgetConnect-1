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
Bot page layout preference: Fixed layout issues in active execution tab with improved two-row vertical design for better mobile display and proper element fitting (August 2025). Successfully resolved horizontal scrolling issues on mobile devices - financial data now displays in vertical stacks, folder headers use two-row layout to prevent overflow, and all elements properly fit within screen width (August 2025).
Bot termination system: Successfully implemented comprehensive bot termination that closes both Bitget positions AND terminates corresponding bot database records. "Close All Positions" button now works completely - no more ghost bots appearing after termination. Both individual Stop buttons and bulk termination properly filter out terminated bots from the UI display. Fixed critical synchronization issue where bots with active Bitget positions showed as "waiting_entry" instead of "active" due to missing exit criteria for folder-deployed bots - now properly detects and displays all bots with live positions (August 2025).
Entry system preference: Evolved from MACD-only to comprehensive multi-indicator analysis system. AI bots now use weighted technical analysis combining MACD (25%), RSI (20%), Bollinger Bands (20%), Volume Analysis (15%), Moving Averages (10%), and Support/Resistance (10%) with adaptive confidence thresholds for signal generation. Enhanced with dynamic thresholds (40-60%) based on signal strength, directional clarity, and high-conviction indicators. System fully supports both long and short positions with proper directional scoring and order execution (August 2025).
Auto Market Scanner: Implemented autonomous market-wide scanning system that evaluates 100+ trading pairs, automatically selects optimal opportunities using multi-indicator AI analysis, and deploys bots with just capital allocation required from user. Features configurable parameters for maximum bots (3-10), minimum confidence threshold (60-90%), and automatic capital distribution across selected opportunities. Successfully resolved volume field mapping issue from volume24h to quoteVolume for proper Bitget API integration (August 2025).

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

**Enhanced Multi-Indicator AI Bot System (August 2025)**: Upgraded from MACD-only to sophisticated technical analysis engine combining 6 indicators with weighted scoring - MACD crossover/momentum detection, RSI oversold/overbought levels, Bollinger Bands squeeze/breakout analysis, volume-price relationship assessment, moving average golden/death crosses, and support/resistance proximity analysis. Each indicator contributes weighted scores (totaling 100%) with 60% minimum confidence threshold required for trade execution. System provides detailed indicator breakdown, confidence ratings, and supports both long/short position directions.

## Feature Specifications
The application includes:
- **Multi-page navigation**: Home, Markets, Trade, Bot, Analyzer.
- **Home Page**: Enhanced market overview with visual dashboard design, interactive sentiment analysis, top gainers/losers, high volume activity tracking, and AI-powered trading opportunities with strategy analysis (Momentum, Breakout, Scalping, Swing, Reversal), smart scoring, and risk assessment.
- **Markets Page**: Comprehensive screener functionality with diverse filtering options (Gainers, Losers, Volatile >5%, Stable <2%, Large Cap >20M volume) and clickable sorting.
- **Trade Page**: Order placement, leverage, and position management.
- **Bot Page**: Automated trading strategy setup, including creation, deployment, monitoring, and termination. Bots are strategy-based and can be applied to any trading pair.
- **Trading Pair Management**: Folder-based organization with bulk bot deployment, manual pair addition, and context menus for adding pairs from the Markets page.
- **Bulk Bot Deployment**: Deploying strategies to all pairs within a folder simultaneously, with individual capital allocation, leverage settings, and investment calculation.
- **AI-Powered Recommendations**: Comprehensive analysis of 150+ trading pairs with lowered volume threshold (50k+) for diverse altcoin coverage, recommendations based on daily movement patterns, liquidity, and trading patterns, with detailed display of movement percentage and AI scores.
- **Unified AI Analysis Hub**: Complete trading analysis platform with integrated tools for price prediction, risk analysis, and trend statistics. Features real-time Bitget API integration, smart autocomplete with live prices, multi-timeframe analysis (1H, 4H, 1D, 1W), confidence scoring (0-100%), comprehensive technical indicators (RSI, MACD, Stochastic, ADX), market sentiment assessment, support/resistance detection, volatility statistics, volume analysis, performance history tracking, technical signals analysis, and position sizing recommendations. All data fetched live from Bitget API with 3-second refresh intervals.
- **Analyzer Page**: Advanced technical analysis tool with trend detection, support/resistance levels, entry/exit recommendations, multi-timeframe analysis, and direct trading execution.
- **Comprehensive Alert System**: Complete notification system with 8+ alert categories (PnL gains/losses, screener matches, trend changes, volume spikes, price breakouts, technical signals, support/resistance levels, unusual activity, market news), intelligent auto-suggest functionality for trading pairs with live price data and keyboard navigation, distinction between alert settings (configurations) and alerts (actual notifications), real-time monitoring with 5-second refresh intervals, and proper light/dark mode support.

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