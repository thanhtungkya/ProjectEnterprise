# Secure Enterprise Messenger

A secure internal communication platform featuring end-to-end encryption (E2EE), task management, and role-based access control (RBAC).

## 🏗️ Project Structure

This is a **monorepo** with separated backend and frontend:

```
secure-enterprise-messenger/
├── backend/          # Express.js + PostgreSQL API
├── frontend/         # Vite + TypeScript Client
├── db/              # Database schemas
└── scripts/         # Utility scripts
```

See [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for detailed structure information.

## ✨ Features

### ✅ Implemented
- User authentication (JWT + bcrypt)
- Role-based access control (RBAC)
- User & team management
- Project management
- Task management with status tracking
- Message system with encryption
- Chat channels & conversations
- Department organization
- Admin dashboard

### ⏳ In Development
- Real-time WebSocket messaging
- Full E2EE implementation
- Kanban board with drag-and-drop
- File attachments
- Advanced search & filtering
- Post-quantum cryptography (Kyber)
- Dark mode UI

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install all dependencies**
```bash
npm run install-all
```

2. **Setup environment**
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
```

3. **Initialize database**
```bash
# For local PostgreSQL:
psql -U postgres -d messenger -f db/schema.sql

# Or for Neon PostgreSQL, use your connection string:
psql "your_database_url" -f db/schema.sql
```

### Development

**Run both backend and frontend simultaneously:**
```bash
npm run dev
```

This starts:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

**Run separately:**
```bash
npm run dev:backend   # Just backend
npm run dev:frontend  # Just frontend
```

### Production Build

```bash
npm run build
npm run start
```

## 🔐 Default Test Credentials

```
Username: admin_user      | Role: Admin
Username: manager_it      | Role: Manager
Username: employee_it     | Role: Employee
Password: password123 (for all)
```

## 📚 API Documentation

### Authentication
```
POST /api/auth/login
  { "username": "admin_user", "password": "password123" }
```

### Users
```
GET /api/users                      # List all users
GET /api/users/:id                  # Get user by ID
POST /api/users                     # Create user
PATCH /api/users/:id                # Update user
DELETE /api/users/:id               # Delete user
```

### Tasks
```
GET /api/tasks                      # List tasks
POST /api/tasks                     # Create task
PATCH /api/tasks/:id                # Update task
DELETE /api/tasks/:id               # Delete task
```

### Projects
```
GET /api/projects                   # List projects
POST /api/projects                  # Create project
PATCH /api/projects/:id             # Update project
DELETE /api/projects/:id            # Delete project
```

### Messages & Chats
```
GET /api/messages/:channelId        # Get messages
POST /api/messages                  # Send message
GET /api/chats                      # List chats
POST /api/chats                     # Create chat
```

## 🗂️ Backend Architecture

```
backend/src/
├── server.ts              # Main Express app
├── db/
│   └── connection.ts      # PostgreSQL pool
├── middleware/
│   └── auth.ts            # JWT authentication
├── routes/
│   ├── auth.ts            # Login endpoint
│   ├── users.ts           # User CRUD
│   ├── tasks.ts           # Task management
│   ├── projects.ts        # Project management
│   ├── messages.ts        # Messaging
│   └── chats.ts           # Chat channels
└── services/
    └── userService.ts     # Business logic
```

## 🎨 Frontend Architecture

```
frontend/src/
├── main.ts                # Entry point
├── public/
│   ├── index.html         # Login page
│   ├── dashboard.html     # Main app
│   └── css/               # Tailwind styles
├── services/
│   ├── auth.ts            # Auth service
│   ├── chat.ts            # Chat API
│   ├── task.ts            # Task API
│   ├── project.ts         # Project API
│   └── crypto.ts          # E2EE encryption
└── utils/
    └── rbac.ts            # Access control
```

## 🔄 Technology Stack

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **Runtime**: Node.js

### Frontend
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Encryption**: Web Crypto API

### DevOps
- **Package Manager**: npm
- **Task Runner**: npm workspaces

## 📦 Environment Variables

```
DATABASE_URL        # PostgreSQL connection string
NODE_ENV           # development or production
PORT               # Server port (default: 3000)
JWT_SECRET         # Token signing secret
GEMINI_API_KEY     # (Optional) Google Gemini API
```

## 🚨 Database Setup

### PostgreSQL Connection String Formats

**Local PostgreSQL:**
```
postgresql://postgres:password@localhost:5432/messenger
```

**Neon PostgreSQL:**
```
postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require
```

## 📖 Documentation

- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Project structure details
- [README_STRUCTURE.md](./README_STRUCTURE.md) - Detailed architecture guide

## 🛠️ Available Commands

### Root Level
```bash
npm run dev              # Start both backend and frontend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run build            # Build both for production
npm run install-all      # Install all dependencies
npm run clean            # Remove all build artifacts
```

### Backend
```bash
cd backend
npm run dev              # Start in development mode
npm run build            # Compile TypeScript
npm run lint             # Check types
```

### Frontend
```bash
cd frontend
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env` is correct
- Ensure PostgreSQL is running
- Check your firewall/network rules

### Port Already in Use
- Backend (3000): Change `PORT` in .env
- Frontend (5173): Vite will use next available port

### Module Not Found Errors
- Run `npm run install-all` to install all dependencies
- Delete node_modules and run again
- Check TypeScript imports are correct

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT

## 👥 Team

Built with security and organization in mind.

---

**Status**: 🚧 Active Development (45% complete)

**Last Updated**: March 27, 2026

# ProjectEnterprise
