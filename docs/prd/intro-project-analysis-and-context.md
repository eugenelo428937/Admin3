# Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source**: IDE-based fresh analysis combined with existing comprehensive documentation

**Current Project State**
Admin3 is a Django REST API backend with React frontend for online order system. The system provides a complete e-commerce platform for educational products including Materials, Tutorials, and Marking services. It integrates with the Administrate API for course management and includes sophisticated business logic for exam sessions, subject management, and complex pricing structures.

### Available Documentation Analysis

The project has **extensive documentation** already available:
- ✅ Tech Stack Documentation (CLAUDE.md)
- ✅ Comprehensive PRD (docs/prd.md) 
- ✅ API Documentation (implied from project structure)
- ✅ Setup and deployment guides (docs/project_doc/)
- ✅ Feature-specific documentation (email system, search, bundles, etc.)
- ✅ Technical implementation guides
- ✅ Database schema and relationships documented

### Enhancement Scope Definition

**Enhancement Type**: Multiple high-priority feature additions with rules engine enhancement as the core foundation

**High-Priority Enhancements**:
1. **MOST IMPORTANT**: Enhanced Rules Engine with defined entry points for different rule executions
2. **IMPORTANT**: Dynamic VAT calculation using Rules Engine for different countries and products  
3. **IMPORTANT**: Mobile layout enhancement
4. Refined User registration form
5. User delivery and contact details selection/modification
6. Auto-complete feature for user registration with employer info
7. Recommended Products functionality
8. Dynamic employer warning messages and contact details during checkout

**Enhancement Description**: The system needs a comprehensive rules engine enhancement that serves as the foundation for dynamic VAT calculations, employer-specific messaging, and other business logic. This will be combined with improved user experience features including mobile optimization, enhanced registration, and personalized product recommendations.

**Impact Assessment**: 
- **Major Impact** - Rules engine enhancement affects multiple system components
- **Significant Impact** - Mobile layout requires substantial frontend changes
- **Moderate Impact** - User registration and employer features build on existing systems

### Goals and Background Context

**Goals**:
- Create a flexible, entry-point-driven rules engine for complex business logic
- Implement accurate VAT calculations for international customers
- Optimize user experience on mobile devices
- Streamline user registration with employer integration
- Add intelligent product recommendations
- Provide contextual employer-specific information during checkout

**Background Context**: 
The current Admin3 system has a basic rules engine framework but needs significant enhancement to handle complex business scenarios like international VAT calculations and employer-specific workflows. The mobile experience is currently suboptimal, and the registration process lacks the sophistication needed for B2B customers with employer relationships. These enhancements will transform the system into a truly international, mobile-optimized platform with intelligent business rule processing.
