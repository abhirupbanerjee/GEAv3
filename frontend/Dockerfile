# ============================================
# STAGE 1: Build Next.js Application
# ============================================

FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments (existing)
ARG DMS_URL
ARG GIT_URL
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
ARG NEXT_PUBLIC_ABOUT_CONTACT_EMAIL
ARG NEXT_PUBLIC_COPYRIGHT_YEAR
ARG FEEDBACK_DB_PORT=5432
ARG FEEDBACK_DB_NAME=feedback
ARG FEEDBACK_DB_USER=feedback_user

# NEW Args
ARG SENDGRID_API_KEY
ARG SENDGRID_FROM_EMAIL
ARG SENDGRID_FROM_NAME
ARG SERVICE_ADMIN_EMAIL
ARG MAX_FILE_SIZE
ARG MAX_TOTAL_UPLOAD_SIZE
ARG ALLOWED_FILE_TYPES
ARG EA_SERVICE_RATE_LIMIT
ARG GRIEVANCE_RATE_LIMIT
ARG API_BASE_URL
ARG NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID=AGY-005

# Set as environment variables during build
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME
ENV NEXT_PUBLIC_SITE_SHORT_NAME=$NEXT_PUBLIC_SITE_SHORT_NAME
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN

# Install dependencies
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .
COPY ./src/middleware.ts ./src/middleware.ts

# Generate env.ts from build arguments (UPDATED)
RUN echo "// Auto-generated during Docker build" > src/config/env.ts && \
    echo "export const config = {" >> src/config/env.ts && \
    echo "  DMS_URL: '${DMS_URL}'," >> src/config/env.ts && \
    echo "  GIT_URL: '${GIT_URL}'," >> src/config/env.ts && \
    echo "  CHATBOT_URL: '${CHATBOT_URL}'," >> src/config/env.ts && \
    echo "  GOG_URL: '${GOG_URL}'," >> src/config/env.ts && \
    echo "  ESERVICES_URL: '${ESERVICES_URL}'," >> src/config/env.ts && \
    echo "  CONSTITUTION_URL: '${CONSTITUTION_URL}'," >> src/config/env.ts && \
    echo "  SITE_NAME: '${SITE_NAME}'," >> src/config/env.ts && \
    echo "  COPYRIGHT_YEAR: '${NEXT_PUBLIC_COPYRIGHT_YEAR}'," >> src/config/env.ts && \
    echo "  CONTACT_EMAIL: '${CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  ABOUT_CONTACT_EMAIL: '${NEXT_PUBLIC_ABOUT_CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_HOST: '${FEEDBACK_DB_HOST}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_PORT: '${FEEDBACK_DB_PORT}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_NAME: '${FEEDBACK_DB_NAME}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_USER: '${FEEDBACK_DB_USER}'," >> src/config/env.ts && \
    echo "  FEEDBACK_DB_PASSWORD: '${FEEDBACK_DB_PASSWORD}'," >> src/config/env.ts && \
    echo "  SENDGRID_API_KEY: '${SENDGRID_API_KEY}'," >> src/config/env.ts && \
    echo "  SENDGRID_FROM_EMAIL: '${SENDGRID_FROM_EMAIL}'," >> src/config/env.ts && \
    echo "  SENDGRID_FROM_NAME: '${SENDGRID_FROM_NAME}'," >> src/config/env.ts && \
    echo "  SERVICE_ADMIN_EMAIL: '${SERVICE_ADMIN_EMAIL}'," >> src/config/env.ts && \
    echo "  MAX_FILE_SIZE: ${MAX_FILE_SIZE}," >> src/config/env.ts && \
    echo "  MAX_TOTAL_UPLOAD_SIZE: ${MAX_TOTAL_UPLOAD_SIZE}," >> src/config/env.ts && \
    echo "  ALLOWED_FILE_TYPES: '${ALLOWED_FILE_TYPES}'," >> src/config/env.ts && \
    echo "  EA_SERVICE_RATE_LIMIT: ${EA_SERVICE_RATE_LIMIT}," >> src/config/env.ts && \
    echo "  GRIEVANCE_RATE_LIMIT: ${GRIEVANCE_RATE_LIMIT}," >> src/config/env.ts && \
    echo "  SERVICE_REQUEST_ENTITY_ID: '${NEXT_PUBLIC_SERVICE_REQUEST_ENTITY_ID}'," >> src/config/env.ts && \
    echo "  API_BASE_URL: '${API_BASE_URL}'," >> src/config/env.ts && \
    echo "  appUrl: '${NEXT_PUBLIC_FRONTEND_URL}'," >> src/config/env.ts && \
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

# Install PostgreSQL client for database backup/restore operations
RUN apk add --no-cache postgresql16-client

# Set production environment
ENV NODE_ENV=production

# Create non-root user FIRST (before copying files)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder (with ownership set during copy)
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Pre-create upload directories for runtime writes
RUN mkdir -p /app/public/uploads/branding /app/public/uploads/contacts && \
    chown -R nextjs:nodejs /app/public/uploads

USER nextjs

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]