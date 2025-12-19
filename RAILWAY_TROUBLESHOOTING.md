# Railway PostgreSQL Connection Troubleshooting

If your Railway deployment is failing to connect to the database, follow these steps:

## 1. Verify Deployment Status
The latest update includes:
- **Binary Targets**: Explicit support for Linux (Railway/Docker environment).
- **Diagnostic Endpoint**: A new route to test the DB connection safely.

## 2. Check Database URL
Ensure that your Railway project has a PostgreSQL service attached and the variable name matches:
- Go to your Railway project dashboard.
- Select your Service (the valid backend service).
- Go to **Variables**.
- Ensure `DATABASE_URL` is present.
- If using a different variable name (e.g., `POSTGRES_URL`), update it to `DATABASE_URL` or update your code.

## 3. Use the Diagnostic Endpoint
Once deployed, you can access:
`https://your-app-url.up.railway.app/api/health/db`

It will return:
```json
{
  "status": "connected",
  "latency": "15ms",
  "config": {
    "url_set": true,
    "url_masked": "postgresql://postgres:****@containers-..."
  }
}
```
If it returns `"status": "disconnected"`, check the `error` field in the response.

## 4. Common Issues & Fixes

### Issue: `PrismaClientInitializationError: Can't reach database server`
- **Cause**: The application cannot reach the database host.
- **Fix**: Check that the Railway PostgreSQL service is in the same project/network.

### Issue: `P1017: Server has closed the connection`
- **Cause**: Connection limits or timeouts.
- **Fix**: Ensure `restartPolicyMaxRetries` is set in `railway.json` (we handled this).

### Issue: Binary Target Missing
- **Fix**: We added `linux-musl-openssl-3.0.x` and `debian-openssl-3.0.x` to `schema.prisma`. This usually fixes "Query engine not found" errors.

## 5. View Logs
run `npm run view-logs` (if local) or check the "Deployments" -> "View Logs" tab in Railway to see the startup output.
