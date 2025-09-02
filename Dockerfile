FROM node:24-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY web/ web/
COPY postcss.config.mjs tsconfig.json ./

RUN npm run build

FROM golang:1.24.6 AS build

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

COPY --from=frontend /app/web/out ./web/out
RUN go build -o claustroboard .

FROM scratch AS final
LABEL org.opencontainers.image.description="Claustroboard is a fun multiplayer, browser-based board game."
LABEL org.opencontainers.image.source="https://github.com/omgtant/claustroboard"

WORKDIR /app

ENV APP_ADDRESS=0.0.0.0:8080

COPY --from=build /app/claustroboard .

EXPOSE 8080

CMD ["./claustroboard"]
