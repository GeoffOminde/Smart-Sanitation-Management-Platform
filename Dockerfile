# Multi-stage Dockerfile for Backend
FROM node:18-alpine

WORKDIR /app

# Copy server dependencies and Prisma schema first (for postinstall script)
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Install dependencies (includes postinstall: prisma generate)
# Using --omit=dev is the modern equivalent of --production
RUN npm install --omit=dev

# Copy remaining server code
COPY server/ .

# Ensure prisma client is generated (redundant if postinstall worked, but safe)
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "index.js"]
