# Production image for a VPS. Build: docker build -t drp-website .
# Run:   docker run --env-file .env -p 3000:3000 drp-website
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
# Content pages are pre-rendered from the database, so DATABASE_URL must be reachable at build time:
#   docker build --build-arg DATABASE_URL=... .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate && npx next build

FROM node:22-alpine AS run
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/content ./content
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
# Apply pending migrations, then start.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
