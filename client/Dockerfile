FROM node:24-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /srv
COPY gateway.mjs .
COPY --from=build /build/dist ./dist

USER node
EXPOSE 3000

CMD ["node", "gateway.mjs"]
