FROM node:22-alpine

ENV NODE_ENV=production PORT=4173
WORKDIR /app

COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public ./public

USER node
EXPOSE 4173
CMD ["node", "server.js"]
