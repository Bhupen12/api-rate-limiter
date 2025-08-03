# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api-gateway/package.json ./packages/api-gateway/package.json

# Check if pnpm-lock.yaml exists, if not create it
RUN if [ ! -f pnpm-lock.yaml ]; then touch pnpm-lock.yaml; fi

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Development stage
FROM base AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api-gateway/package.json ./packages/api-gateway/package.json

# Check if pnpm-lock.yaml exists, if not create it
RUN if [ ! -f pnpm-lock.yaml ]; then touch pnpm-lock.yaml; fi

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Copy built application
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/api-gateway/dist ./packages/api-gateway/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apiuser -u 1001
USER apiuser

EXPOSE 3000

CMD ["node", "packages/api-gateway/dist/server.js"]