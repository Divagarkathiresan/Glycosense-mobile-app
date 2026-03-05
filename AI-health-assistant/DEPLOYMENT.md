# Glycosense Deployment Guide

This guide deploys:
- Backend (FastAPI) to Render (or Railway)
- Mobile app (Expo React Native) via EAS Build

## 1) Backend deployment (Render)

### A. Push project to GitHub
Render deploys from a Git repository.

### B. Create a Web Service on Render
- Root directory: `AI-health-assistant/backend`
- Build command:
```bash
pip install -r requirements.txt
```
- Start command:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

You can also rely on the included `Procfile`.

### C. Configure environment variables in Render
Set these in Render dashboard:
```env
DATABASE_URL=postgresql://...
SECRET_KEY=<strong-random-secret>
ALLOWED_ORIGINS=*
```

Recommended production CORS example:
```env
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://expo.dev
```

### D. Verify backend
After deploy, verify:
- `GET https://<your-backend-domain>/`
- `GET https://<your-backend-domain>/db-test`

## 2) Mobile app deployment (Expo EAS)

From `AI-health-assistant/Glycosense`:

### A. Set API URL for production
Use environment variable at build/update time:
```bash
export EXPO_PUBLIC_API_BASE_URL=https://<your-backend-domain>
```

### B. Login and initialize EAS
```bash
npm install
npx eas login
npx eas build:configure
```

### C. Build binaries
```bash
npx eas build --platform android
npx eas build --platform ios
```

### D. Submit to stores (optional)
```bash
npx eas submit --platform android
npx eas submit --platform ios
```

## 3) Optional web deployment (Expo web static)

From `AI-health-assistant/Glycosense`:
```bash
export EXPO_PUBLIC_API_BASE_URL=https://<your-backend-domain>
npx expo export --platform web
```
Deploy the generated `dist` output to Netlify/Vercel/Cloudflare Pages.

## 4) Post-deploy validation checklist

- Register/login works
- `POST /diabetes-risk` returns score + level
- `GET /diabetes-risk/history` returns records
- Recommendations endpoint works with JWT
- CORS allows only intended origins in production

## Files already prepared for deployment

- `backend/Procfile`
- `backend/runtime.txt`
- `backend/.env.example`
- `Glycosense/lib/api.ts` now supports `EXPO_PUBLIC_API_BASE_URL`
