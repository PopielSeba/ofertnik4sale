## Ofertnik - PPP :: Program Equipment Rental System

### Overview

Ofertnik is a comprehensive equipment rental pricing system for PPP :: Program, designed to automate quote generation with tiered discount pricing. It includes robust equipment catalog management, client management, and administrative controls. The system aims to streamline the rental process, provide accurate pricing, and offer comprehensive management capabilities for diverse equipment types, enhancing efficiency and profitability. Key capabilities include dynamic pricing, support for various equipment types (e.g., vehicles, engine equipment), and a public sales portal for product browsing.

### User Preferences

Preferred communication style: Simple, everyday language.

**CRITICAL RULE**: Never modify the main quotes system (główne wyceny) or print functionality without asking twice for explicit confirmation. The user has experienced issues with repeated changes to this system and requires strict adherence to this rule.

**COST SENSITIVITY**: User is concerned about escalating costs due to frequent system changes. Always consider the impact of modifications and prefer minimal, targeted changes over extensive refactoring. Prioritize system stability over new features.

**CHANGE MANAGEMENT**: System has experienced stability issues after changes. Always verify that existing functionality continues to work after any modifications. Use conservative approach and thorough testing before implementing changes.

### System Architecture

**Frontend Architecture**:
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with CSS custom properties
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

**Backend Architecture**:
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM
- **Authentication**: Replit OIDC with Passport.js
- **Session Management**: PostgreSQL-backed sessions

**Database Design**:
- Supports users with role-based access, hierarchical equipment categories, detailed equipment items with specifications and availability, tiered equipment pricing, client information, quotes with line items, and secure session storage.

**Key Features**:
- **Authentication System**: Comprehensive role-based access control (Administrator, Department Managers - electrical, transport, general, shop; Employee) with user approval workflow.
- **Equipment Management**: CRUD operations for equipment, categories, and inventory, supporting diverse types like vehicles (km-based) and engine equipment (motohour intervals). Includes a complete image upload system for shop products with drag-and-drop and cloud storage integration.
- **Quote Generation System**: Dynamic pricing with tiered discounts based on rental period. Supports additional equipment, installation, disassembly, and travel/service costs. Includes dedicated systems for Electrical and General Equipment with full CRUD and print functionality, ensuring 1:1 feature parity.
- **Client Sales Portal**: Publicly accessible "Sprzedaż" section with product catalog, search, category filtering, and product details, maintaining visual consistency with the equipment catalog.
- **Needs Assessment System**: "BADANIA POTRZEB" feature with admin-managed questions, printable reports, conditional accessories, and dynamic category creation.
- **Admin Panel**: Centralized management for equipment, pricing, users, service costs, and needs assessment. Includes enhanced search functionality across shop administration panels.
- **UI/UX**: Consistent visual design across the application, including gradient backgrounds, category icons, and professional print templates.

### External Dependencies

- `@neondatabase/serverless`: PostgreSQL database connection
- `drizzle-orm`: Type-safe database operations
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Accessible UI primitives
- `react-hook-form`: Form state management
- `passport`: Authentication middleware
- `openid-client`: OIDC authentication
- `TypeScript`: Language for type safety
- `Vite`: Development and build tool
- `Tailwind CSS`: Utility-first styling
- `ESBuild`: Production bundling
- `Drizzle Kit`: Database migrations