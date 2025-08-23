# Overview
This is a complete mobile-optimized crypto trading application designed for real-time Bitget perpetual futures data. Its main purpose is to provide comprehensive trading functionality, including market monitoring, order placement, automated trading bot setup, intelligent folder-based trading pair organization, and revolutionary bulk bot deployment capabilities. The project aims to offer a clean, modern interface, matching professional trading platforms, with a vision to empower users with advanced AI-powered trading opportunities and streamlined strategy deployment for enhanced market potential.

# User Preferences
Preferred communication style: Simple, everyday language.

# Recent Changes
- **August 23, 2025**: Dynamic Risk Visualization Meter & AI Scalping Recommendations
  - Created comprehensive Dynamic Risk Visualization Meter component with real-time risk assessment
  - Implemented color-coded risk indicators (Extreme/High/Medium/Low/Very Low) with visual progress bars
  - Added detailed risk breakdown analysis: Volatility, Volume Risk, Trend Risk, Support Level, Liquidity Risk
  - Integrated shield icon buttons across Home page (Top Gainers, Top Losers, Volume Surge sections)
  - Added risk analysis functionality to Markets page with clickable shield buttons on all trading pairs
  - Created modal overlay system for detailed risk assessment with scrollable content
  - Implemented action buttons for direct navigation to Trade and Analyzer pages
  - Added intelligent risk scoring algorithm with weighted factors and personalized trading recommendations
  - Enhanced user experience with click-to-analyze functionality and professional risk assessment display
  
  **AI Scalping Recommendations System:**
  - Fixed critical percentage calculation bug: API decimals (1.00992) now properly convert to actual percentages (100.99%)
  - Added prominent SCALPING RECOMMENDATION section with clear GO LONG/SHORT direction
  - Implemented volatility-based scalping timeframes: 1m for extreme, 3m for very high, 5m for high, 15m for medium/low
  - Created intelligent scalping settings: dynamic stop loss (0.5-2.0%), take profit (0.8-2.0%), leverage (3-7x)
  - Added entry condition guidance: RSI + MACD signal combinations for quick scalping trades
  - Enhanced debug logging with raw API values vs actual percentages for volatility verification
  - Calibrated realistic crypto volatility thresholds: ≥20% extreme, ≥10% very high, ≥5% high, ≥3% medium, ≥1.5% low

  **Bot Strategy UI Refinements:**
  - Updated Moving Average settings with clean screener-style layout matching user preferences
  - Implemented structured "MA Type", "Period", "Condition", "Comparison" column headers
  - Fixed "Other MA" dropdown functionality with proper state management and comparisonType tracking
  - Removed background colors for cleaner transparent layout with border-only design
  - Standardized font sizes and color schemes across all technical indicators to match RSI styling
  - Enhanced moving average comparison logic for price vs other MA period configurations

# System Architecture

## Frontend Architecture
The client-side is built with React 18 and TypeScript, using Vite for build tooling. It employs Tailwind CSS with shadcn/ui for consistent styling and a mobile-first, responsive design. State management is handled by React Query for server state and caching, while Wouter provides lightweight client-side routing. Real-time updates are facilitated via WebSocket integration. The application features a component-based structure with reusable UI components, hooks, and pages, organized around a bottom navigation bar with five main sections: Home, Markets, Trade, Bot, and Assets.

## Backend Architecture
The server-side uses Express.js with TypeScript. It integrates with the Bitget API for futures market data and provides a WebSocket server for pushing live updates. Data is currently stored in-memory, designed with an abstract `IStorage` interface for future database integration. Middleware is used for API request monitoring.

## Data Storage Solutions
The system uses in-memory storage with an `IStorage` interface, ready for future integration with PostgreSQL using Drizzle ORM. The schema defines models for users, Bitget credentials, futures data, positions, and account information, prepared for migration.

## Authentication and Authorization
A basic structure for user management is in place, including a user schema for username/password authentication, secure storage for Bitget API keys, and preparation for PostgreSQL session storage.

## UI/UX Decisions
The application prioritizes a clean, professional design optimized for mobile devices, matching modern trading interfaces. It features a bottom navigation bar, collapsible folder views for organization, and intuitive interfaces for trading pair management, bot deployment, and AI-powered recommendations. Components from shadcn/ui ensure a consistent visual style. AI-powered features include color-coded risk levels, confidence ratings, and strategy-specific icons.

## Technical Implementations
Key technical implementations include real-time data streaming via WebSockets, a comprehensive trading pair organization system with folder management and bulk bot deployment, and an AI-powered trading opportunity recommendation system. The AI analyzes price movements, volume patterns, and risk factors across multiple strategies (Momentum, Breakout, Scalping, Swing, Reversal) to provide smart scoring and confidence ratings. The bot system uses reusable strategy templates with configurable technical indicators and risk management settings.

## Feature Specifications
The application includes:
- **Multi-page navigation**: Home, Markets, Trade, Bot, Analyzer.
- **Home Page**: Enhanced market overview with visual dashboard design featuring gradient cards, interactive sentiment analysis with progress bars, top gainers/losers rankings, high volume activity tracking, and AI-powered trading opportunities with strategy analysis (Momentum, Breakout, Scalping, Swing, Reversal), smart scoring, and risk assessment.
- **Markets Page**: Comprehensive screener functionality with filtering criteria and clickable sorting.
- **Trade Page**: Order placement, leverage, and position management.
- **Bot Page**: Automated trading strategy setup, including creation, deployment, monitoring, and termination. Bots are strategy-based and can be applied to any trading pair.
- **Trading Pair Management**: Folder-based organization with bulk bot deployment, manual pair addition, and context menus for adding pairs from the Markets page.
- **Bulk Bot Deployment**: Deploying strategies to all pairs within a folder simultaneously, with individual capital allocation, leverage settings, and investment calculation.
- **AI-Powered Recommendations**: Recommendations based on daily movement patterns, liquidity, and trading patterns, with detailed display of movement percentage and AI scores.
- **Unified AI Analysis Hub**: Complete trading analysis platform with three integrated tools: price prediction, risk analysis, and trend statistics. Features real-time Bitget API integration, smart autocomplete with live prices, multi-timeframe analysis (1H, 4H, 1D, 1W), confidence scoring (0-100%), comprehensive technical indicators (RSI, MACD, Stochastic, ADX), market sentiment assessment, support/resistance detection, volatility statistics, volume analysis, performance history tracking, technical signals analysis, and position sizing recommendations. All data fetched live from Bitget API with 3-second refresh intervals.
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