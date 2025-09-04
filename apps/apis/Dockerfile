FROM node:20-alpine

WORKDIR /app

COPY dist/ ./dist
COPY .env .env

EXPOSE 3080
EXPOSE 3081

CMD ["node", "-r", "./dist/tracing.js", "dist/main.js"]
