FROM node:20-slim

WORKDIR /app

# Copy root files (needed for pnpm list -r in the script)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./

COPY apis.tar.gz apis.tar.gz

RUN tar -xzf apis.tar.gz --remove-files

# Copy only app folder with dist + package.json
COPY apps/apis/dist ./apps/apis/dist
COPY apps/apis/package.json ./apps/apis/package.json

# Install ts-node to run our script (can also be done in base image if reused)
RUN npm install -g pnpm ts-node typescript

# RUN pnpm install --filter ./apps/apis... --frozen-lockfile --prod

RUN pnpm install --frozen-lockfile --prod

COPY apps/apis/.env .env

CMD ["node", "-r", "./apps/apis/dist/tracing.js", "apps/apis/dist/main.js"]
