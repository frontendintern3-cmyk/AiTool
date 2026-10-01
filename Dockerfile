# Single-stage image: this app needs the full node_modules (Prisma CLI +
# Playwright + Lighthouse are used at build AND at runtime — migrate deploy
# and Lighthouse/axe-core both run inside the running container), so slimming
# to a multi-stage build buys little and risks silently dropping a needed
# devDependency. Optimize for "works correctly on first deploy" over image size.
FROM node:22-bookworm-slim

# System Chromium (not Playwright's bundled download — that needs network
# access to Playwright's CDN, which may be blocked at build time on some
# hosts) + the shared libs Chromium needs headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    openssl \
    && rm -rf /var/lib/apt/lists/*

ENV BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

WORKDIR /app

# Install dependencies for build (including Prisma CLI, TypeScript, Tailwind)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

# Generate the Postgres Prisma Client using local binary
RUN ./node_modules/.bin/prisma generate --schema=prisma-postgres/schema.prisma

# Fallback DATABASE_URL for build-time static checks
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npm run build

ENV NODE_ENV=production

RUN mkdir -p /app/public/screenshots

EXPOSE 3000

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
