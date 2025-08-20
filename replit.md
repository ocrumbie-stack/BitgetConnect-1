# Overview

This is a complete mobile-optimized crypto trading application with real-time Bitget perpetual futures data. The application features multiple pages (Home, Markets, Trade, Bot) with bottom navigation and a clean design matching modern trading interfaces. Built with React and Express.js, it provides comprehensive trading functionality including market monitoring, order placement, and automated trading bot setup.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built using React with TypeScript and follows a component-based architecture:
- **UI Framework**: React 18 with TypeScript, using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing with multi-page navigation
- **Real-time Updates**: WebSocket integration for live data streaming
- **Component Structure**: Organized into reusable UI components, hooks, and pages
- **Navigation**: Bottom navigation bar with 5 sections (Home, Markets, Trade, Bot, Assets)
- **Mobile-First**: Optimized for mobile devices with responsive design

## Backend Architecture  
The server-side uses Express.js with TypeScript:
- **Framework**: Express.js with TypeScript for type safety
- **API Integration**: Custom Bitget API service for fetching futures market data
- **Real-time Communication**: WebSocket server for pushing live updates to clients
- **Data Storage**: In-memory storage with interface abstraction for future database integration
- **Middleware**: Custom logging middleware for API request monitoring

## Data Storage Solutions
Currently implements in-memory storage with a well-defined interface:
- **Storage Interface**: Abstract IStorage interface allowing for easy database integration
- **Schema Definition**: Drizzle ORM schema with PostgreSQL dialect for future database migration
- **Data Models**: Comprehensive schema for users, Bitget credentials, futures data, positions, and account information
- **Migration Ready**: Drizzle configuration prepared for PostgreSQL deployment

## Authentication and Authorization
Basic structure in place for user management:
- **User Schema**: Defined user table with username/password authentication
- **API Credentials**: Secure storage schema for Bitget API keys and secrets
- **Session Management**: Prepared for PostgreSQL session storage using connect-pg-simple

## External Service Integrations
- **Bitget API**: Complete integration with Bitget's futures trading API
  - Market data fetching (tickers, prices, volumes)
  - Account information retrieval
  - Position monitoring
  - Real-time data synchronization
- **Database**: Configured for Neon Database (PostgreSQL) with environment-based connection
- **Development Tools**: Replit integration with development banner and error overlay

# Recent Changes

## August 20, 2025
- Expanded from single screener to complete multi-page trading application
- Implemented bottom navigation with Home, Markets, Trade, Bot, and Assets sections
- Created Home page with market overview, top gainers/losers, and quick actions
- Built Markets page with complete screener functionality matching user's reference design
- Developed Trade page for placing orders with leverage and position management
- Added Bot page for automated trading strategy setup
- Confirmed by user as "Looking good" - multi-page structure meets requirements
- All pages optimized for mobile with clean design matching provided reference images

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity via Neon
- **drizzle-orm & drizzle-kit**: Type-safe ORM with schema migrations
- **express**: Web server framework
- **axios**: HTTP client for API requests
- **ws**: WebSocket server implementation

## Frontend Dependencies  
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **react-hook-form**: Form handling and validation

## Development Dependencies
- **typescript**: Type safety across the stack
- **vite**: Frontend build tool and development server
- **tsx**: TypeScript execution for development
- **@replit/vite-plugin-***: Replit-specific development plugins