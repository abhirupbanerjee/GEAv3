# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ============================================
# STAGE 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments for configuration
ARG WIKI_URL
ARG DMS_URL
ARG SERVICES_URL
ARG CHATBOT_URL
ARG GOG_URL
ARG ESERVICES_URL
ARG CONSTITUTION_URL
ARG SITE_NAME
ARG CONTACT_EMAIL
ARG COPYRIGHT_YEAR

# Generate env.ts configuration file
RUN echo "// Auto-generated configuration file" > src/config/env.ts && \
    echo "" >> src/config/env.ts && \
    echo "export const config = {" >> src/config/env.ts && \
    echo "  WIKI_URL: '${WIKI_URL}'," >> src/config/env.ts && \
    echo "  DMS_URL: '${DMS_URL}'," >> src/config/env.ts && \
    echo "  SERVICES_URL: '${SERVICES_URL}'," >> src/config/env.ts && \
    echo "  CHATBOT_URL: '${CHATBOT_URL}'," >> src/config/env.ts && \
    echo "  GOG_URL: '${GOG_URL}'," >> src/config/env.ts && \
    echo "  ESERVICES_URL: '${ESERVICES_URL}'," >> src/config/env.ts && \
    echo "  CONSTITUTION_URL: '${CONSTITUTION_URL}'," >> src/config/env.ts && \
    echo "  SITE_NAME: '${SITE_NAME}'," >> src/config/env.ts && \
    echo "  CONTACT_EMAIL: '${CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  COPYRIGHT_YEAR: '${COPYRIGHT_YEAR}'," >> src/config/env.ts && \
    echo "}" >> src/config/env.ts

# Build Next.js application
RUN npm run build

# ============================================
# STAGE 3: Production
# ============================================
FROM nginx:alpine AS production

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/out /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]