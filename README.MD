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

## Running

Frontend and backend with watches & rebuilding:
```sh
npm run dev:all
```

Build frontend:
```sh
npm run build:frontend
```

Texture atlas automatic watching & scaling:
```sh
./scale-pic.sh
```

Killing a stuck Go webserver:
```sh
./kill-hanging-go.sh
```