FROM node:20-alpine AS builder
WORKDIR /app

# ← ADD THESE BUILD ARGUMENTS
ARG WIKI_URL
ARG DMS_URL
ARG GIT_URL
ARG SERVICES_URL
ARG CHATBOT_URL
ARG GOG_URL
ARG ESERVICES_URL
ARG CONSTITUTION_URL
ARG SITE_NAME
ARG CONTACT_EMAIL
ARG ABOUT_CONTACT_EMAIL
ARG COPYRIGHT_YEAR

COPY package*.json ./
RUN npm ci
COPY . .

# ← ADD THIS: Generate env.ts from build arguments
RUN echo "// Auto-generated during Docker build" > src/config/env.ts && \
    echo "export const config = {" >> src/config/env.ts && \
    echo "  WIKI_URL: '${WIKI_URL}'," >> src/config/env.ts && \
    echo "  DMS_URL: '${DMS_URL}'," >> src/config/env.ts && \
    echo "  SERVICES_URL: '${SERVICES_URL}'," >> src/config/env.ts && \
    echo "  GIT_URL: '${GIT_URL}'," >> src/config/env.ts && \
    echo "  CHATBOT_URL: '${CHATBOT_URL}'," >> src/config/env.ts && \
    echo "  GOG_URL: '${GOG_URL}'," >> src/config/env.ts && \
    echo "  ESERVICES_URL: '${ESERVICES_URL}'," >> src/config/env.ts && \
    echo "  CONSTITUTION_URL: '${CONSTITUTION_URL}'," >> src/config/env.ts && \
    echo "  SITE_NAME: '${SITE_NAME}'," >> src/config/env.ts && \
    echo "  COPYRIGHT_YEAR: '${COPYRIGHT_YEAR}'," >> src/config/env.ts && \
    echo "  CONTACT_EMAIL: '${CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "  ABOUT_CONTACT_EMAIL: '${ABOUT_CONTACT_EMAIL}'," >> src/config/env.ts && \
    echo "};" >> src/config/env.ts && \
    echo "export type Config = typeof config;" >> src/config/env.ts

RUN npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/out ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
