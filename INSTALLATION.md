# Glycosense App - Installation & Setup Guide

## Prerequisites

- Node.js v18+ (currently using v18.20.8)
- Python 3.8+
- PostgreSQL database (Neon recommended)
- npm or yarn
- Expo CLI

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd "AI-health-assistant/backend"
```

### 2. Create Virtual Environment (Recommended)
```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
SECRET_KEY=your-secret-key-here
```

Replace with your actual Neon PostgreSQL connection string.

### 5. Start Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd "AI-health-assistant/Glycosense"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure API Base URL (Optional)
Edit `app.json` to set your backend URL:

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "http://localhost:8000"
    }
  }
}
```

### 4. Start Development Server
```bash
npm run start
```

This will:
- Load the Node.js polyfill for compatibility
- Start Expo development server
- Show QR code for mobile testing

### 5. Run on Specific Platform
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web Browser
```

## Troubleshooting

### Issue: "toReversed is not a function"
**Solution:** The polyfill is now included. Make sure you're using `npm run start` instead of `expo start` directly.

### Issue: Backend connection failed
**Solution:** 
1. Verify backend is running on port 8000
2. Check `DATABASE_URL` in `.env` file
3. Ensure PostgreSQL database is accessible

### Issue: Icons not showing
**Solution:** Icons are now properly mapped. Clear cache:
```bash
npm start -- --clear
```

### Issue: TypeScript errors
**Solution:** All TypeScript errors have been fixed. Run:
```bash
npx tsc --noEmit
```
to verify.

## Testing the Application

### 1. Test Backend Health
```bash
curl http://localhost:8000/
```
Should return: `{"status": "Backend is running"}`

### 2. Test Database Connection
```bash
curl http://localhost:8000/db-test
```

### 3. Register a User
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone_number": "1234567890",
    "password": "password123"
  }'
```

### 4. Login
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Features to Test

### Frontend
- ✅ User Registration
- ✅ User Login
- ✅ Profile Management
- ✅ Diabetes Risk Calculation
- ✅ Metrics History
- ✅ Dark Mode Toggle
- ✅ Navigation between tabs

### Backend
- ✅ User Authentication (JWT)
- ✅ Password Hashing (bcrypt)
- ✅ Risk Calculation Algorithm
- ✅ Metrics Storage
- ✅ AI Explanations
- ✅ Recommendations
- ✅ Translation API

## Production Deployment

### Backend (Example: Railway/Render)
1. Set environment variables
2. Deploy from GitHub
3. Update `DATABASE_URL` to production database

### Frontend (Example: Expo EAS)
```bash
npm install -g eas-cli
eas login
eas build --platform all
```

## Security Notes

- ✅ Passwords are hashed with bcrypt
- ✅ JWT tokens for authentication
- ✅ Environment variables for secrets
- ✅ Input validation on all endpoints
- ✅ CORS configured for security

## Support

For issues or questions:
1. Check `FIXES_SUMMARY.md` for known issues
2. Review error logs in terminal
3. Verify all dependencies are installed
4. Ensure database is properly configured

## Next Steps

After successful setup:
1. Create your first user account
2. Run a diabetes risk check
3. View your metrics history
4. Explore AI explanations
5. Test dark mode
6. Try different risk scenarios

## Development Tips

- Use `npm run start` for hot reload
- Backend auto-reloads with `--reload` flag
- Check browser console for frontend errors
- Check terminal for backend errors
- Use Expo DevTools for debugging

## File Structure

```
Glycosense App/
├── AI-health-assistant/
│   ├── backend/
│   │   ├── api/              # API routes
│   │   ├── auth/             # Authentication
│   │   ├── models/           # Database models
│   │   ├── risk_calculator/  # Risk algorithm
│   │   ├── main.py           # FastAPI app
│   │   └── requirements.txt  # Python deps
│   └── Glycosense/
│       ├── app/              # Screens
│       ├── components/       # Reusable components
│       ├── context/          # React context
│       ├── lib/              # Utilities
│       ├── scripts/          # Build scripts
│       └── package.json      # Node deps
├── FIXES_SUMMARY.md          # All fixes documented
└── INSTALLATION.md           # This file
```

## Environment Variables Reference

### Backend (.env)
```env
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
```

### Frontend (app.json)
```json
{
  "extra": {
    "apiBaseUrl": "http://localhost:8000"
  }
}
```

## Common Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd Glycosense
npm install
npm run start
npm run ios
npm run android
npm run web

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Success Indicators

✅ Backend starts without errors
✅ Frontend starts without "toReversed" error
✅ Can register and login
✅ Can calculate risk scores
✅ Can view metrics
✅ Dark mode works
✅ All tabs navigate correctly
✅ No TypeScript errors
✅ No console errors

Enjoy using Glycosense! 🩺📊
