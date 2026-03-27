# Secure Enterprise Messenger - Refactored Project Structure

This project is organized as follows:

## Project Structure

```
secure-enterprise-messenger/
├── backend/                  # Express.js backend server
│   ├── src/
│   │   ├── db/
│   │   │   └── connection.ts     # PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication endpoints
│   │   │   ├── users.ts          # User management
│   │   │   ├── tasks.ts          # Task management
│   │   │   ├── projects.ts       # Project management
│   │   │   ├── messages.ts       # Message endpoints
│   │   │   └── chats.ts          # Chat endpoints
│   │   ├── services/
│   │   │   └── userService.ts    # User business logic
│   │   └── server.ts             # Main server entry
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Vite + TypeScript frontend
│   ├── public/
│   │   ├── css/
│   │   │   ├── style.css         # Login page styles
│   │   │   └── dashboard.css     # Dashboard styles
│   │   ├── index.html            # Login page
│   │   └── dashboard.html        # Main app shell
│   ├── src/
│   │   ├── services/
│   │   │   ├── auth.ts           # Authentication service
│   │   │   ├── chat.ts           # Chat service
│   │   │   ├── task.ts           # Task service
│   │   │   ├── project.ts        # Project service
│   │   │   └── crypto.ts         # Encryption service
│   │   ├── utils/
│   │   │   ├── rbac.ts           # Role-based access control
│   │   │   └── mock.ts           # Mock data (deprecated)
│   │   └── main.ts               # Frontend entry point
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── db/
│   └── schema.sql            # PostgreSQL schema
│
├── scripts/                  # Utility scripts
│   └── (setup/migration scripts)
│
├── package.json              # Root workspace package
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
└── README.md

```

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Installation

1. Clone the repository and install all dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and other config
```

3. Initialize the database:
```bash
# Run the schema migration
psql -U postgres -d messenger -f db/schema.sql
```

### Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:backend  # http://localhost:3000
npm run dev:frontend # http://localhost:5173
```

### Production Build

Build both backend and frontend:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

## Architecture

### Backend (Express.js)
- RESTful API running on port 3000
- PostgreSQL database with connection pooling
- JWT-based authentication
- TypeScript for type safety
- Routes organized by feature

### Frontend (Vite)
- Modern TypeScript frontend
- Tailwind CSS for styling
- Service-based architecture for API calls
- RBAC (Role-Based Access Control) utilities
- AES-GCM encryption for E2EE

## Key Features

✅ **Authentication & Authorization**
- JWT-based login
- RBAC with Admin/Manager/Employee roles
- Password hashing with bcrypt

✅ **Core Features**
- Message management with encryption
- Task management & Kanban board
- Project management
- User & team management
- Department organization

⚠️ **In Development**
- Real-time WebSocket messaging
- Full E2EE implementation
- Advanced search & filtering
- File attachments
- Post-quantum cryptography

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Messages & Chats
- `GET /api/messages/:channelId` - Get messages
- `POST /api/messages` - Send message
- `GET /api/chats` - List chats
- `POST /api/chats` - Create chat

## Database

The project uses PostgreSQL with the following main tables:
- `users` - User accounts
- `roles` - User roles (admin, manager, employee)
- `user_roles` - Many-to-many user-role mapping
- `projects` - Projects
- `tasks` - Task assignments
- `chats` - Communication channels
- `messages` - Encrypted messages
- `departments` - Organization departments

## Environment Variables

```
DATABASE_URL       - PostgreSQL connection string
NODE_ENV          - Development or production
PORT              - Server port (default: 3000)
JWT_SECRET        - Secret key for JWT signing
GEMINI_API_KEY    - (Optional) Google Gemini API key
```

## Default Test Credentials

```
Username: admin_user
Password: password123
Role: Admin

Username: manager_it
Password: password123
Role: Manager

Username: employee_it
Password: password123
Role: Employee
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
