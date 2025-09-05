FROM node:20-alpine

WORKDIR /app

# Copy root manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy service manifest
COPY apps/apis/package.json ./apps/apis/

# Copy shared package manifests (so pnpm knows they exist for linking)
COPY libs/mysql-conn/package.json ./libs/mysql-conn/
COPY libs/rabbit-mq-conn/package.json ./libs/rabbit-mq-conn/

# Install deps (includes workspace deps)
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Now copy compiled service + shared package source
COPY apps/apis/dist ./apps/apis/dist
COPY apps/apis/.env .env
COPY libs/mysql-conn ./libs/mysql-conn
COPY libs/rabbit-mq-conn ./libs/rabbit-mq-conn

EXPOSE 3080
EXPOSE 3081

CMD ["node", "-r", "./apps/apis/dist/tracing.js", "apps/apis/dist/main.js"]
