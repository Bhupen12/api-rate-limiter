FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy only package.json files first
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api-gateway/package.json ./packages/api-gateway/package.json

# Install dependencies (this creates fresh node_modules in container)
RUN pnpm install

# Copy only source code (NO node_modules)
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY packages/api-gateway/src ./packages/api-gateway/src
COPY packages/api-gateway/tsconfig.json ./packages/api-gateway/tsconfig.json
COPY tsconfig.json ./

# Build
RUN pnpm build

EXPOSE 3000
CMD ["node", "packages/api-gateway/dist/server.js"]