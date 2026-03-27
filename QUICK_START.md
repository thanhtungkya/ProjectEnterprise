# ⚡ Quick Start Guide

Get the Secure Enterprise Messenger running in 5 minutes.

## Step 1: Install Dependencies (2 minutes)

```bash
npm run install-all
```

This installs dependencies for:
- Backend (Express.js, bcrypt, PostgreSQL driver)
- Frontend (Vite, TypeScript, Tailwind CSS)

## Step 2: Configure Database (2 minutes)

### Option A: Local PostgreSQL

1. Create database:
```bash
createdb messenger
```

2. Initialize schema:
```bash
psql -d messenger -f db/schema.sql
```

3. Set environment:
```bash
echo 'DATABASE_URL=postgresql://postgres:@localhost:5432/messenger' > .env
```

### Option B: Neon PostgreSQL (Cloud)

1. Create account at https://neon.tech
2. Create a new project and copy the connection string
3. Set environment:
```bash
cp .env.example .env
nano .env  # Edit DATABASE_URL with your Neon connection string
```

## Step 3: Start Development Server (1 minute)

```bash
npm run dev
```

You should see:
```
[1] VITE v5.0.0  ready in 456 ms
[0] [API] Server listening on http://localhost:3000
```

## Step 4: Login to Dashboard

1. Open http://localhost:5173
2. Use test credentials:
   - **Username**: `admin_user`
   - **Password**: `password123`

3. You should see the admin dashboard with task counts and team overview

## ✅ Verify Installation

### Backend is working if:
- No errors in terminal for "Server listening on port 3000"
- Can access http://localhost:3000/api/health (shows JSON response)

### Frontend is working if:
- No errors in terminal for Vite startup
- Can see login page at http://localhost:5173
- Can login with test credentials

### Database is working if:
- Login succeeds and shows user data
- Dashboard displays without 500 errors

## 🚨 Troubleshooting

### "PORT 3000 already in use"
```bash
lsof -i :3000  # Find process using port
kill -9 <PID>  # Kill it
```

### "DATABASE_URL not set"
```bash
cp .env.example .env
# Edit .env with your database connection string
```

### "Cannot find module 'pg'"
```bash
npm run install-all  # Reinstall all dependencies
rm -rf backend/node_modules frontend/node_modules  # Clear and try again
```

### "Certificate error with Neon database"
Add `?sslmode=require` to your DATABASE_URL if not already present.

## 📊 Default Test Accounts

```
┌─────────────┬──────────────┬──────────────┐
│ Username    │ Role         │ Password     │
├─────────────┼──────────────┼──────────────┤
│ admin_user  │ Admin        │ password123  │
│ manager_it  │ Manager      │ password123  │
│ employee_it │ Employee     │ password123  │
└─────────────┴──────────────┴──────────────┘
```

## 🗂️ What's Running

### Backend (Port 3000)
- Express API server
- PostgreSQL connection pool
- JWT authentication
- 6 route modules (auth, users, tasks, projects, messages, chats)

### Frontend (Port 5173)
- Vite dev server with HMR
- TypeScript compilation
- Tailwind CSS processing
- Proxy to /api routes on backend

## 📝 Next Steps

1. **Explore Dashboard**: Login and click through different views
2. **Check API**: Open http://localhost:3000/api/health
3. **View Database**: Use `psql -d messenger` to inspect database
4. **Read Code**: Check `backend/src/routes/` for API endpoints
5. **Build Features**: See [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for missing features

## 🎯 Common Tasks

### Stop the servers
```bash
Press Ctrl+C in terminal
```

### Run only backend
```bash
npm run dev:backend
```

### Run only frontend
```bash
npm run dev:frontend
```

### Build for production
```bash
npm run build
# Creates dist/backend and dist/frontend
```

### Clean build artifacts
```bash
npm run clean
```

### Check database schema
```bash
psql -d messenger -c "\dt"  # Show tables
psql -d messenger -c "\d users"  # Show users table structure
```

## 💡 Tips

- **Hot reload**: Frontend auto-reloads on file changes (Vite HMR)
- **API Testing**: Use `curl` or Postman to test endpoints
- **Database debugging**: Use `psql` to inspect data directly
- **TypeScript errors**: Check terminal - TypeScript will warn about type issues
- **Port conflicts**: Change PORT in .env if needed

---

**Ready to start?** Run `npm run dev` now! 🚀
