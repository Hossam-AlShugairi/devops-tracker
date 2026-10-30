# ----------------------------------------------------
# Multi-stage Dockerfile for DevOps Tracker
# ----------------------------------------------------

# Stage 1: Build client frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
COPY shared/ /app/shared/
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY server/ ./server/
COPY shared/ ./shared/
RUN npm run build:server

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/tracker.db

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled server & built client assets
COPY --from=server-builder /app/dist/server ./dist/server
COPY --from=client-builder /app/client/dist ./client/dist

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "dist/server/server/src/index.js"]
