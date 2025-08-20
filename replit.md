# Overview

This is a Bitget Perpetual Futures Screener application built with React and Express.js. The application provides real-time monitoring and filtering of cryptocurrency futures trading data from the Bitget exchange. It features a modern, dark-themed interface for traders to analyze market conditions, track positions, and monitor account information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built using React with TypeScript and follows a component-based architecture:
- **UI Framework**: React 18 with TypeScript, using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live data streaming
- **Component Structure**: Organized into reusable UI components, hooks, and pages

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