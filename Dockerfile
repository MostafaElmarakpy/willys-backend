FROM node:lts-alpine AS build

WORKDIR /usr/local/app

COPY . .

RUN yarn install --frozen-lockfile

RUN yarn build

FROM node:lts-alpine

WORKDIR /usr/local/app

COPY --from=build /usr/local/app/dist dist

COPY --from=build /usr/local/app/package.json .
COPY --from=build /usr/local/app/yarn.lock .

RUN yarn install --frozen-lockfile --production

RUN yarn cache clean

CMD ["node", "dist/main.js"]

EXPOSE 8080