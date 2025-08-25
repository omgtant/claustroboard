FROM golang:1.24.6 AS build

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o claustroboard .

FROM scratch AS final

WORKDIR /app

COPY --from=build /app/claustroboard .
COPY .env .

EXPOSE 8080

CMD ["./claustroboard"]