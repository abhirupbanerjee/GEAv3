# ============================================
# STAGE 1: Build Next.js Application
# ============================================

FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for configuration
ARG WIKI_URL
ARG DMS_URL
ARG GIT_URL
ARG HELPDESK_URL
ARG CHATBOT_URL
ARG GOG_URL
ARG ESERVICES_URL
ARG CONSTITUTION_URL
ARG SITE_NAME
ARG CONTACT_EMAIL
ARG ABOUT_CONTACT_EMAIL
ARG COPYRIGHT_YEAR
ARG FEEDBACK_DB_HOST=feedback_db
ARG FEEDBACK_DB_PASSWORD
ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_SHORT_NAME
ARG NEXT_PUBLIC_BASE_DOMAIN
ARG SERVICES_URL
ARG FEEDBACK_DB_PORT=5432
ARG FEEDBACK_DB_NAME=feedback
ARG FEEDBACK_DB_USER=feedback_user


# Set as environment variables during build
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
ENV NEXT_PUBLIC_SITE_SHORT_NAME=$NEXT_PUBLIC_SITE_SHORT_NAME
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .
COPY ./src/middleware.ts ./src/middleware.ts

# Generate env.ts from build arguments
RUN echo "// Auto-generated during Docker build" > src/config/env.ts && \
    echo "export const config = {" >> src/config/env.ts && \
    echo "  WIKI_URL: '${WIKI_URL}'," >> src/config/env.ts && \
    echo "  DMS_URL: '${DMS_URL}'," >> src/config/env.ts && \
    echo "  SERVICES_URL: '${SERVICES_URL}'," >> src/config/env.ts && \
    echo "  HELPDESK_URL: '${HELPDESK_URL}'," >> src/config/env.ts && \
    echo "  GIT_URL: '${GIT_URL}'," >> src/config/env.ts && \
    echo "  CHATBOT_URL: '${CHATBOT_URL}'," >> src/config/env.ts && \
    echo "  GOG_URL: '${GOG_URL}'," >> src/config/env.ts && \
    echo "  ESERVICES_URL: '${ESERVICES_URL}'," >> src/config/env.ts && \
    echo "  CONSTITUTION_URL: '${CONSTITUTION_URL}'," >> src/config/env.ts && \
    echo "  SITE_NAME: '${SITE_NAME}'," >> src/config/env.ts && \
    echo "  COPYRIGHT_YEAR: '${COPYRIGHT_YEAR}'," >> src/config/env.ts && \
    echo "  CONTACT_EMAIL: '${CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  ABOUT_CONTACT_EMAIL: '${ABOUT_CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_HOST: '${FEEDBACK_DB_HOST}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_PORT: '${FEEDBACK_DB_PORT}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_NAME: '${FEEDBACK_DB_NAME}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_USER: '${FEEDBACK_DB_USER}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_PASSWORD: '${FEEDBACK_DB_PASSWORD}'," >> src/config/env.ts && \
    echo "};" >> src/config/env.ts && \
    echo "export type Config = typeof config;" >> src/config/env.ts
    RUN cat src/config/env.ts && echo "✅ env.ts generated successfully"

# Build the application
RUN npm run build


# ============================================
# STAGE 2: Production Runtime
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules


# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]