# Better Auth Debugging Guide

## Common Issues and Solutions

### 1. Check Environment Variables
Make sure your `.env` file has all required variables:
```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goventurevalue
```

### 2. Verify Database Connection
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### 3. Check if Tables Exist
```bash
# Connect to database and list tables
psql $DATABASE_URL -c "\dt"
```

You should see: `user`, `session`, `account`, `verification` tables.

### 4. Test API Route
```bash
# Test the auth endpoint
curl http://localhost:3000/api/auth/session
```

### 5. Check Browser Console
- Open browser DevTools
- Check Network tab for `/api/auth/*` requests
- Look for errors in Console tab

### 6. Check Server Logs
When you start the dev server, you should see:
```
🔐 Better Auth Configuration:
  - Base URL: http://localhost:3000
  - Mock Auth: false
  - Secret: ✅ Set
  - Google Client ID: ✅ Set
  - Google Client Secret: ✅ Set
  - Database URL: ✅ Set
```

### 7. Common Errors

**Error: "Secret is required"**
- Solution: Set `BETTER_AUTH_SECRET` in your `.env` file

**Error: "Database connection failed"**
- Solution: Check `DATABASE_URL` and ensure PostgreSQL is running

**Error: "Table does not exist"**
- Solution: Run `pnpm db:push` to create tables

**Error: "Invalid redirect URI"**
- Solution: Check Google OAuth redirect URI matches `BETTER_AUTH_URL/api/auth/callback/google`

### 8. Reset Everything
If nothing works, try:
```bash
# 1. Stop the dev server
# 2. Clear node_modules and reinstall
rm -rf node_modules .next
pnpm install

# 3. Reset database (WARNING: deletes all data)
pnpm db:push --force

# 4. Restart dev server
pnpm dev
```
