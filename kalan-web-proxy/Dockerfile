FROM node:22.13-alpine

ENV NODE_ENV=production PORT=4173
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --chown=node:node server.js ./
COPY --chown=node:node public ./public

USER node
EXPOSE 4173
CMD ["node", "server.js"]
