# Deploying the frontend to Vercel (frontend-only)

This repository is configured to deploy the Vite-based frontend to Vercel as a static site. The demo backend (Express) can remain hosted elsewhere (local, Render, Railway, etc.) and the frontend will proxy `/api/*` to that backend via a rewrite configured in `vercel.json`.

Important: Replace `https://YOUR_BACKEND_HOST` in `vercel.json` with the absolute URL of your running backend (for example `https://smart-sanitation-backend.example.com`). If you don't have an externally-hosted backend and want to keep using the local demo server, you can deploy the frontend and test locally by updating the frontend's dev server or using a CORS proxy.

Quick steps (GitHub integration):

1. Commit your changes and push to GitHub.
2. On Vercel, create a new project and import your GitHub repository.
3. Build settings (Vercel will usually auto-detect):
   - Framework Preset: Other
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add Environment Variables (Project Settings → Environment Variables) if your frontend expects them (none are required for static UI, but for runtime API host you can set `VITE_API_BASE` if you add support):
   - PAYSTACK_PUBLIC (if using client-side Paystack keys)
   - (Prefer to keep secret keys on the backend only.)
5. Update `vercel.json` to point `/api/*` to your externally-hosted backend. Example rewrite:

```json
{
  "src": "/api/(.*)",
  "dest": "https://smart-sanitation-backend.example.com/api/$1"
}
```

6. Deploy. Vercel will run `npm run build` and publish the `dist` folder.

Using Vercel CLI (optional):

1. Install and login:
```bash
npm i -g vercel
vercel login
```
2. From the project root run:
```bash
vercel --prod
```

Notes and recommendations

- Do NOT commit secrets (like `PAYSTACK_SECRET`) to the repo. Put them in your backend's environment variables on the hosting provider and only use public keys on the frontend when safe.
- If you later want to host the backend on Vercel as serverless, you can convert the Express endpoints to Serverless functions under `/api/*` and remove the external proxy in `vercel.json`. Keep in mind serverless functions are stateless.
- After deploy, verify the frontend points to the correct backend and test payment flows in sandbox mode.

If you'd like, I can:
- Update the frontend to read a runtime `VITE_API_BASE` environment variable and use it to call the backend (recommended); or
- Convert the Express endpoints into Vercel serverless functions (option B).

Which of those would you like next?