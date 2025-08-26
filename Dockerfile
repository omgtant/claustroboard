FROM node:24-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY web/ web/

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

WORKDIR /app

COPY --from=build /app/claustroboard .

EXPOSE 8080

CMD ["./claustroboard"]