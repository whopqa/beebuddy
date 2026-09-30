FROM node:22-bookworm-slim

WORKDIR /app

# Prisma's query engine needs OpenSSL in the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
# Generate for Linux without passing a production database secret to the build.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
