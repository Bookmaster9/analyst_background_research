# Analyst Dashboard

An interactive web application for exploring financial analyst insights, stock price predictions, and earnings call commentary powered by AI.

**[View Live Application →](https://analyst-dashboard.vercel.app)**

## Overview

Analyst Dashboard is a comprehensive platform that aggregates financial analyst data, allowing users to search for analysts, explore their price predictions, visualize stock performance with interactive TradingView charts, and engage with earnings call commentary through an AI-powered chatbot interface.

## Features

### Landing Page & Search

**Dynamic Analyst Search**
- Real-time autocomplete search that finds analysts as you type
- Instant suggestions showing analyst names and their abbreviated forms
- Clean, responsive search interface with loading indicators

**Example Analysts**
- Curated sidebar displaying 5 random analysts from the database
- Refresh button to discover new analysts with each click
- One-click navigation to any analyst's full dashboard

**Animated Background**
- Eye-catching gradient background transitioning from slate to indigo to blue
- Floating currency symbols ($, ₿, €, ¥, £) with smooth animations
- Animated grid patterns and chart lines
- Binary code rain effect for a tech-forward aesthetic
- All animations are non-intrusive and enhance the financial tech theme

### Analyst Dashboard

**Profile Information**
- Comprehensive analyst details including full name and identification
- Direct LinkedIn integration with clickable profile links
- Professional layout with glassmorphism design elements

**Stock Price Predictions**
- Visual cards displaying each prediction with key metrics
- Interactive click-to-expand functionality for detailed views
- Color-coded performance indicators (green for positive returns, red for negative)

**Prediction Details Popup**
- Full-screen modal with comprehensive prediction statistics:
  - Prediction date and forecast duration
  - Starting price at prediction time
  - Target price set by the analyst
  - Actual ending price (realized performance)
  - Calculated return percentage
- Embedded TradingView charts showing 60-month historical data
- Real-time stock price visualization with professional charting tools
- Click outside or use close button to dismiss

**Earnings Call Commentary**
- Browse through all earnings call questions and comments made by the analyst
- Full-text search and filtering capabilities
- Organized chronologically with company context

### AI-Powered Insights

**Earnings Commentary Chatbot**
- Modal-based interface that overlays the main dashboard
- Two-column layout:
  - Left side: Scrollable list of all earnings call comments
  - Right side: Interactive AI chat assistant
- Context-aware responses based on selected earnings commentary
- Natural conversation flow with message history
- Auto-scroll to latest messages for seamless interaction
- Proper overflow handling ensures long conversations remain navigable

**AI Features**
- Ask questions about specific earnings call comments
- Get summaries and insights from analyst commentary
- Explore themes and patterns in analyst observations
- Natural language processing for intuitive interactions

### Technical Highlights

**Performance & UX**
- Built with Next.js 15 and the App Router for optimal performance
- Server-side rendering for fast initial page loads
- Client-side navigation for instant page transitions
- Responsive design that works beautifully on desktop and mobile

**Data Visualization**
- TradingView integration for professional-grade stock charts
- Interactive modals with smooth animations
- Real-time data fetching from Supabase database
- Efficient rendering of large datasets

**Modern UI/UX**
- Tailwind CSS for consistent, beautiful styling
- Glassmorphism effects with backdrop blur
- Smooth transitions and hover states
- Accessible keyboard navigation
- Custom animations for enhanced user experience

## Tech Stack

- **Frontend Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom animations
- **Database:** Supabase (PostgreSQL)
- **Charts:** TradingView Widget API
- **Deployment:** Vercel
- **AI Integration:** OpenAI API for chatbot functionality

## Database

The application is powered by a Supabase PostgreSQL database containing:
- Financial analyst profiles and LinkedIn information
- Historical stock price predictions and their outcomes
- Earnings call commentary and analyst questions
- Real-time and historical security price data
- Company information and metadata

## Project Architecture

Built with modern web development best practices:
- Type-safe TypeScript throughout the application
- Modular component architecture for maintainability
- Server and client components optimally distributed
- Environment-based configuration for security
- Responsive design patterns for all screen sizes

---

**[Explore the Live Dashboard →](https://analyst-dashboard.vercel.app)**
