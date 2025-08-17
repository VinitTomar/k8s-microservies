FROM node:20-alpine

WORKDIR /app

COPY dist/ ./dist
COPY .env .env

EXPOSE 3080

CMD ["node", "dist/main.js"]
