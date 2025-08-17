FROM node:20-alpine

WORKDIR /app

COPY dist/ ./dist
COPY .env .env

CMD ["node", "dist/main.js"]
