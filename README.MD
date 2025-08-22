# Claustroboard

## Requirements

- Node.js v12+
- npm 
- Go 1.24+

## Setup

```sh
npm i
cp .env.example .env
```
You may also add your own Discord Webhook in `.env`.

## Running

Frontend and backend with watches & rebuilding:
```sh
npm start
```

Build frontend:
```sh
npm run build
```

Texture atlas automatic watching & scaling:
```sh
./scale-all.sh
```

Killing a stuck Go webserver:
```sh
./kill-hanging-go.sh
```