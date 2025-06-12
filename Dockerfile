# Use Node.js 20 as base image
FROM node:20-alpine AS base

#################
### DEV STAGE ###
#################
FROM base AS dev

WORKDIR /build
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --no-audit --no-fund


#################
### PROD STAGE ##
#################
FROM dev AS prod

RUN npm ci --omit=dev --no-audit --no-fund


#################
## BUILD STAGE ##
#################
FROM dev AS build

COPY src ./src
RUN npm run build


#################
### APP STAGE ###
#################
FROM base AS app


# Create a basic user and group, set permissions, and switch to it
RUN addgroup -S app && adduser -S app -G app
USER app

WORKDIR /app

COPY --from=prod /build/node_modules /app/node_modules
COPY --from=build /build/build /app/build

ENV NODE_ENV=production
ENTRYPOINT [ "node", "--enable-source-maps", "build/index.js"]