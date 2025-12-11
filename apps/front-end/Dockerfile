# syntax=docker/dockerfile:1.5

# --------------------
# deps: workspace install with cache
# --------------------
FROM node:20-bullseye-slim AS deps
WORKDIR /app

RUN npm config set fetch-retries 5 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm config set fetch-retry-maxtimeout 120000 \
	&& npm config set progress false

COPY package.json package-lock.json tsconfig.base.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/front-end/package.json ./apps/front-end/
COPY apps/front-end/tsconfig.json ./apps/front-end/
COPY apps/front-end/next.config.mjs ./apps/front-end/
COPY apps/front-end/postcss.config.cjs ./apps/front-end/
COPY apps/front-end/tailwind.config.cjs ./apps/front-end/

RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps --no-audit --progress=false


# --------------------
# builder: build shared then frontend
# --------------------
FROM node:20-bullseye-slim AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=deps /app/turbo.json ./turbo.json

# Copy full workspace
COPY . .

# Build shared first so dist exists inside Docker
RUN npm run build --workspace=@mh-os/shared
RUN test -d /app/packages/shared/dist || (echo '❌ Shared did not build inside Docker!' && exit 1)

# Build frontend
RUN npm run build --workspace=mh-os-admin

# Remove dev deps to slim runtime copy
RUN npm prune --omit=dev


# --------------------
# runtime: minimal image with build output
# --------------------
FROM node:20-bullseye-slim AS runner
WORKDIR /app/apps/front-end

ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH

COPY --from=builder /app/package.json /app/package-lock.json /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/apps/front-end .

EXPOSE 3000
CMD ["npm", "run", "start"]
