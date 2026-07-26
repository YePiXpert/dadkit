FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG DADKIT_BUILD_TIME=unknown
ENV DADKIT_BUILD_TIME=${DADKIT_BUILD_TIME}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3333
ARG DADKIT_BUILD_TIME=unknown
ENV DADKIT_BUILD_TIME=${DADKIT_BUILD_TIME}

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 家庭同步数据目录(挂载 named volume 持久化)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

EXPOSE 3333

USER nextjs

CMD ["node", "server.js"]
