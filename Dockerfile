# Dockerfile для Next.js приложения с API routes и SSR
FROM node:20-alpine AS base

# Устанавливаем зависимости только если они нужны
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем package files
COPY package.json package-lock.json* ./
RUN npm ci

# Пересобираем исходный код только если нужно
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ARG для переменных сборки (передаются из Timeweb)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ADMIN_PASSWORD
ARG NODE_ENV=production

# Преобразуем ARG в ENV для использования в сборке Next.js
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD
ENV NODE_ENV=$NODE_ENV

# Переменные окружения для сборки
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Продакшн образ, копируем только нужные файлы
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Создаем директорию public и копируем файлы (если есть)
RUN mkdir -p ./public
COPY --from=builder /app/public ./public

# Копируем собранное приложение
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

