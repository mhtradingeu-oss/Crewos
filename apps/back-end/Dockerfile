# syntax=docker/dockerfile:1.5

# --------------------
# deps: install once with cache + retries
# --------------------
FROM node:20-bullseye-slim AS deps
WORKDIR /app

# Make npm installs resilient in CI/Docker
RUN npm config set fetch-retries 5 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm config set fetch-retry-maxtimeout 120000 \
	&& npm config set progress false

# Copy only manifests required for a workspace-aware install
COPY package.json package-lock.json tsconfig.base.json ./
COPY turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/back-end/package.json ./apps/back-end/
COPY apps/back-end/tsconfig.json ./apps/back-end/
COPY apps/front-end/package.json ./apps/front-end/

# Deterministic install with cache to avoid ECONNRESET
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps --no-audit --progress=false


# --------------------
# builder: compile shared then backend
# --------------------
FROM node:20-bullseye-slim AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=deps /app/turbo.json ./turbo.json

# Bring in full source after deps for better caching
COPY . .

# Build shared first so dist is available for dependents
RUN npm run build --workspace=@mh-os/shared


RUN ls -R /app/packages/shared/dist || (echo "❌ Shared did not build!" && exit 1)

# Build backend
RUN npm run build --workspace=mh-os-superapp-backend

# Generate Prisma client for runtime
RUN npx prisma generate --schema=apps/back-end/prisma/schema.prisma

# Remove dev-only dependencies to slim runtime copy
RUN npm prune --omit=dev


# --------------------
# runtime: slim image with built artifacts
# --------------------
FROM node:20-bullseye-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules


COPY --from=builder /app/packages/shared ./packages/shared


COPY --from=builder /app/apps/back-end ./apps/back-end


WORKDIR /app/apps/back-end

CMD ["npm", "start"]
