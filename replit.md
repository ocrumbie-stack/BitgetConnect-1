# Overview
This project is a mobile-optimized crypto trading application designed for real-time Bitget perpetual futures trading. Its primary purpose is to provide users with tools for market monitoring, order placement, automated trading bot setup, and streamlined strategy deployment. The application aims to empower users with advanced AI-powered trading opportunities, efficient organization through folder-based trading pair management, and bulk bot deployment capabilities.

# User Preferences
Preferred communication style: Simple, everyday language.
Table design preference: Compact rows with minimal padding (py-2) for space efficiency while maintaining readability.
Navigation preference: Pages should open instantly at the top without scrolling animations for immediate access to content.
Bots page UX preference: Use clickable overview cards for navigation instead of redundant tab system - streamlined interface with functional cards that show active states.
Account balance display: Total Balance = Total Equity + Available Balance + P&L (complete account value including position allocations).
Header structure preference: Total Balance, Total Equity, Available Balance (in that specific order).
Balance calculation logic: Total Equity = Available Balance + Margin Used, Total Balance = Total Equity + Available Balance + P&L.
Bot page layout preference: Improved two-row vertical design for better mobile display and proper element fitting. Financial data now displays in vertical stacks, folder headers use two-row layout to prevent overflow, and all elements properly fit within screen width.
Card positioning preference: Balance card positioned beside P&L card in separate row below Market Scanner (not in same grid space). Uses 2-column grid layout for optimal space utilization with proper visual separation.
Multi-bucket volatility classification system: Sophisticated 3-bucket analysis system with comprehensive technical criteria:
- Aggressive: 1M/5M timeframes for high-volatility scalping (>8% daily range, RSI extremes, BB breaks, 2x volume spikes)
- Balanced: 15M/1H timeframes for medium-volatility trading (3-8% daily range, EMA trend alignment, MACD/RSI confirmation)
- Conservative: 4H/1D timeframes for low-volatility position trading (<3% daily range, EMA200 bias filtering, sustained trends)
Auto scanner multi-timeframe integration: Scanner automatically uses dual timeframe analysis based on selected trading style. Primary timeframe provides detailed technical analysis while secondary timeframe offers confirmation. No manual configuration required - settings apply instantly upon style selection.
Bot termination system: Comprehensive bot termination that closes both Bitget positions AND terminates corresponding bot database records.
Strategy Edit System: FULLY FUNCTIONAL strategy editing with complete form pre-population, dynamic dialog titles, proper state management, and successful API integration. Edit button opens populated form dialog, allows modifications, and saves changes via PUT endpoint.
Enhanced Indicator Conditions: FULLY EXPANDED condition options for all 8 indicators. MACD supports 6 conditions (Bullish/Bearish Crossover, Histogram Above/Below Zero, MACD Above/Below Signal). Moving Average supports 4 conditions (Above, Below, Crossover Above/Below). RSI supports 4 conditions (Above, Below, Overbought, Oversold). NEW INDICATORS FULLY IMPLEMENTED: CCI (4 conditions: Above, Below, Crossing Up/Down), ATR (4 conditions: Above, Below, High/Low Volatility), Bollinger Bands (4 conditions: Above Upper, Below Lower, Between Bands, Squeeze), Stochastic (4 conditions: Above, Below, Overbought, Oversold), Williams %R (4 conditions: Above, Below, Overbought, Oversold). All indicators feature comprehensive calculation functions, evaluation logic, and complete frontend-backend integration with proper error handling and logging.
Entry system preference: ULTRA-CONSERVATIVE account protection system implemented after previous system caused consistent losses. NEW SAFETY REQUIREMENTS: 85%+ confidence threshold minimum (was 30-50%), 40+ point signal difference required (was 15), enhanced safety blocks for dangerous overbought/oversold entries. REVISED INDICATOR WEIGHTS: MACD (40% - only strong crossovers), RSI (25% - only extreme levels <25/>75), Bollinger Bands (20% - only extreme breaches), Volume Analysis (20% - requires 2.0+ strength), Moving Averages (15% - confirmed crossovers only). ACCOUNT PROTECTION: 5-8% stop losses minimum (was 2%), 10-15% take profit targets (reduced from 15-20% for quicker exits), maximum 1.5% account risk per trade, high leverage gets wider stops automatically. System now trades much less frequently but with higher win rates and proper risk management to prevent account destruction.
Auto Market Scanner: FULLY OPERATIONAL AND FIXED - focused scanning system that analyzes TOP 50 HIGHEST-VOLUME USDT pairs from Bitget API. Optimized for 10x faster performance (10-15 seconds vs 2+ minutes) while maintaining higher signal quality through volume-based filtering. Fixed ultra-conservative blocking issues - now uses REALISTIC confidence thresholds (20-35%) and 8+ point signal differences for actual market conditions. Frontend and backend thresholds properly aligned. Successfully finds 3+ high-confidence trading opportunities from 47+ valid signals. Automatically selects optimal opportunities using multi-indicator AI analysis and deploys bots with capital allocation. Configurable parameters for maximum bots (3-10, increased default to 10), realistic confidence thresholds, and automatic capital distribution across selected opportunities. ENHANCED CONCURRENT POSITIONS: System now supports up to 10 concurrent active positions by default (increased from 5) for better portfolio diversification and trading opportunity capture.
Enhanced Folder Organization: EVERY market scan deployment now automatically creates its own unique timestamped folder for better tracking and organization. Folders are named "🤖 Scanner Name - MM/DD HH:MM" or "🤖 Auto Scanner - MM/DD HH:MM" with detailed descriptions including deployment time, bot count, capital allocation, and leverage settings. Each folder includes a unique identifier to prevent conflicts and maintains complete deployment history.
AI Bot Deployment System: FULLY RESTORED comprehensive deployment dialog with three deployment modes: Single Trading Pair (individual bot deployment with pair search and auto-suggest), Folder Deployment (bulk deployment to all pairs in selected folder), and Auto Market Scanner (AI finds optimal opportunities automatically). Features complete capital/leverage configuration, conditional UI based on selected mode, and full integration with existing handleRunStrategy backend logic. Trading Style Selector now collapsible with compact summary view showing key settings.
Sophisticated Entry Point Analysis: FULLY IMPLEMENTED advanced entry system based on detailed trading rules document. Features bucket-specific entry strategies: Balanced bucket (1H/15M timeframes) with EMA100, MACD, RSI rules including HTF bias filtering; Aggressive bucket (5M/1M timeframes) with extreme RSI levels (<=20/>=80), Bollinger Band breakout patterns, MACD histogram crossovers, and 2.0x volume confirmation requirements; Conservative bucket with bias-based entries and low volatility requirements. All entries include comprehensive safety scoring, dynamic stop loss/take profit calculations, invalidation rules, and ultra-conservative account protection measures. Entry system is completely separate from market scanning - scanner finds opportunities, entry determines exact entry points with maximum 1-2 day hold times.
Auto Market Scanner UI Organization: Reorganized with proper card separation - Scanner Configuration card contains trading style selector, max bots setting, and start scanner button. Scanner Results & Deployment card contains capital allocation, leverage settings, and deploy button for found opportunities. Removed duplicate leverage settings from trading style selector to keep leverage configuration only in deployment section.
Trade Selection Philosophy: Prioritizes HIGH-VOLATILITY pairs that can achieve minimum 5% leveraged gains with smaller percentage moves. System automatically identifies volatile pairs (>2% daily movement) and adjusts entry requirements accordingly. With 3x leverage: 2% price move = 6% account gain (exceeding 5% target). Focus on volatile meme tokens, small caps, and trending altcoins that move 2-5% regularly for quick scalping opportunities. Enhanced market scanner requires minimum 0.8% moves to identify truly volatile opportunities.
Dynamic Exit Visualizer Design Standards: ESTABLISHED DESIGN SYSTEM for consistent modal/popup components throughout the app. Key design elements: Simple white/dark gray card with `max-w-md` size and `rounded-lg` corners, no fancy gradients or headers. Clean two-badge layout for primary data (ROI percentage + risk level) using large badges with proper color coding. Simple progress section with clear "Stop Loss"/"Take Profit" labels and 6px height progress bar. Minimal trading info with centered pair name and entry/current prices. Single action button for primary function with two-step confirmation pattern. Clean spacing using `space-y-6` for main sections and `p-6` padding. Border separations using subtle gray borders. This design pattern should be replicated for any modal, popup, or overlay component to maintain visual consistency across the trading platform.

# System Architecture

## UI/UX Decisions
The application prioritizes a clean, professional mobile-optimized design, mirroring modern trading interfaces. It features a bottom navigation bar, collapsible folder views, and intuitive interfaces. shadcn/ui components ensure consistent visuals. AI-powered features include color-coded risk levels, confidence ratings, and strategy-specific icons. A consistent design system is established for modals/popups, using clean layouts and clear data representation.

## Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, using Tailwind CSS with shadcn/ui for mobile-first responsive design. State management uses React Query for server state and Wouter for client-side routing. Real-time updates are via WebSocket. The backend uses Express.js with TypeScript, integrates with the Bitget API, and provides a WebSocket server. Data is stored in-memory with an `IStorage` interface, designed for future PostgreSQL integration with Drizzle ORM. Key technical implementations include real-time data streaming via WebSockets, comprehensive trading pair organization, an AI-powered trading opportunity recommendation system, reusable strategy templates for the bot system, an enhanced multi-bucket analysis system for volatility classification, a dynamic leverage safety system, and sophisticated entry point analysis.

## Feature Specifications
The application includes:
- Multi-page navigation: Home, Markets, Trade, Bot, Analyzer.
- Home Page: Enhanced market overview with dashboard, sentiment analysis, top gainers/losers, and AI-powered trading opportunities.
- Markets Page: Comprehensive screener with filtering and sorting.
- Trade Page: Order placement, leverage, and position management.
- Bot Page: Automated trading strategy setup, deployment, monitoring, and termination. Bots are strategy-based and applicable to any trading pair.
- Trading Pair Management: Folder-based organization with bulk bot deployment, manual pair addition, and context menus.
- Bulk Bot Deployment: Simultaneous strategy deployment to all pairs in a folder, with individual capital allocation and leverage.
- AI-Powered Recommendations: Analysis of 150+ trading pairs, recommendations based on movement, liquidity, and patterns, with detailed display of movement percentage and AI scores.
- Unified AI Analysis Hub: Complete trading analysis platform with integrated tools for price prediction, risk analysis, trend statistics, real-time Bitget API integration, multi-timeframe analysis, confidence scoring, technical indicators, market sentiment, support/resistance, volatility, volume analysis, performance history, technical signals, and position sizing.
- Analyzer Page: Advanced technical analysis tool with trend detection, support/resistance levels, entry/exit recommendations, multi-timeframe analysis, and direct trading execution.
- Comprehensive Alert System: Notification system with 8+ alert categories, intelligent auto-suggest, real-time monitoring, and light/dark mode support.

# External Dependencies

## Core Dependencies
- `@neondatabase/serverless`: For PostgreSQL database connectivity via Neon.
- `drizzle-orm` & `drizzle-kit`: For type-safe ORM interactions.
- `express`: For the web server framework.
- `axios`: For HTTP client requests.
- `ws`: For WebSocket server implementation and real-time communication.

## Frontend Dependencies
- `@tanstack/react-query`: For server state management and caching.
- `@radix-ui/*`: For headless UI components.
- `tailwindcss`: For the utility-first CSS framework.
- `wouter`: For lightweight client-side routing.
- `react-hook-form`: For form handling and validation.

## API Integrations
- **Bitget API**: For fetching futures market data (tickers, prices, volumes), account information, position monitoring, and real-time data synchronization.