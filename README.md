# HRMS — Modern People Operations Platform

A state-of-the-art, premium Human Resource Management System (HRMS) built for fast-moving organizations. This monorepo features a responsive, beautifully designed frontend interface paired with a high-performance relational database backend.

---

## 🚀 Deployed URLs
*   **Frontend Web App**: [https://frontend-opal-seven-64.vercel.app/](https://frontend-opal-seven-64.vercel.app/)
*   **Backend Server (API)**: [https://backendhr-nine.vercel.app/](https://backendhr-nine.vercel.app/)
*   **API Health Monitor**: [https://backendhr-nine.vercel.app/api/health](https://backendhr-nine.vercel.app/api/health)

---

## 🏛️ Project Architecture

```mermaid
graph TD
    A[TanStack Start Frontend] -->|REST API + Bearer Token| B[Next.js App Router Backend]
    B -->|Drizzle ORM| C[Neon PostgreSQL Database]
    A -->|Interactive Bypass| D[Pre-seeded Demo Mode]
```

### Monorepo Structure:
1.  **`/frontend` (Client)**: 
    *   **Core stack**: TanStack Start, React 19, Vite, Tailwind CSS.
    *   **Routing**: File-based nested layout routing using TanStack Router.
    *   **Design system**: Custom premium Glassmorphism theme, Google Font Outfit, micro-animations, and full mobile responsiveness.
2.  **`/backend` (API Server)**:
    *   **Core stack**: Next.js (App Router), Drizzle ORM.
    *   **Database**: Serverless PostgreSQL hosted on Neon.
    *   **API Protocol**: RESTful endpoint pattern with unified JSON responses (`{ data, error }`).

---

## 🔑 Core Features & Modules
*   **Workspace Onboarding**: A 4-step wizard that configures the tenant profile, corporate brand colors/logo, and sets up the primary admin credentials.
*   **Dynamic Theming**: Applies brand identity colors dynamically to the entire layout using CSS variables resolved from database tenant configurations.
*   **Attendance & Regularization**: Real-time clock-in/out, multi-break logging, geofenced boundaries, regularization requests, and team status views.
*   **Leave Management**: Apply for leaves (full/half days), track real-time balances, view holiday calendars, and review policy allocations.
*   **Payroll Processing**: Define customizable salary structures, record employee tax declarations, run monthly payroll cycles, and generate PDF-like payslips.
*   **Interactive Demo bypass**: Allows instant dashboard testing with pre-seeded database records.

---

## ⚙️ Getting Started (Local Development)

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/) installed.

### 2. Environment Setup

#### Backend configuration:
Create [`backend/.env`](file:///Users/himanshu/TEAM-PEOPLEFIRST-HR/backend/.env):
```env
DATABASE_URL=postgres://[user]:[password]@ep-....neon.tech/neondb?sslmode=require
JWT_SECRET=your_jwt_secret_token
```

#### Frontend configuration:
Create [`frontend/.env`](file:///Users/himanshu/TEAM-PEOPLEFIRST-HR/frontend/.env):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Install Dependencies
Run the install command in both directories:
```bash
# Frontend
cd frontend && bun install

# Backend
cd ../backend && bun install
```

### 4. Database Setup & Seeding
Deploy database tables and seed mock data:
```bash
# Push schemas to Neon
bun run db:push

# Seed default tenant, employees, leaves, attendance, and payroll logs
curl -X POST "http://localhost:3000/api/seed?force=true"
```

### 5. Run Development Servers
Start both servers locally:
```bash
# Start backend API (runs on Port 3000)
cd backend && bun run dev

# Start frontend application (runs on Port 8080)
cd ../frontend && bun run dev
```

---

## 🧪 Demo Login Credentials
For quick evaluation without completing the onboarding wizard, navigate to `/login` and use:
*   **Work Email**: `admin@example.com`
*   **Password**: `admin123`

> [!TIP]
> **One-Click Sign-In**: On the login page, you can click directly on the "Quick demo sign-in" helper banner to auto-populate the credentials and log in instantly.
> On the onboarding page, click **"Quick Start →"** to bypass the setup wizard and launch the workspace using the seeded database profile.

---

## 👥 Contributors

A special thanks to the team that built this HRMS application:

*   **Dhruv Suthar**
*   **Himanshu Ladekar**
*   **Sagar Bangade**
*   **Utkarsh Verma**

---
