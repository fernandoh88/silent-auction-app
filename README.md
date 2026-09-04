# Silent Auction App

[![CI](https://github.com/fernandoh88/silent-auction-app/actions/workflows/ci.yml/badge.svg)](https://github.com/fernandoh88/silent-auction-app/actions/workflows/ci.yml)
[![Publish Server Docker Image](https://github.com/fernandoh88/silent-auction-app/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/fernandoh88/silent-auction-app/actions/workflows/docker-publish.yml)
[![Deploy Frontend To Firebase Hosting](https://github.com/fernandoh88/silent-auction-app/actions/workflows/firebase-hosting.yml/badge.svg)](https://github.com/fernandoh88/silent-auction-app/actions/workflows/firebase-hosting.yml)

Silent Auction App is a full-stack silent auction application built with React, Node.js/Express, MongoDB, Firebase Authentication, Socket.IO, and Docker. It supports authenticated auction browsing, real-time bidding, auction closing, winner notifications, and production health checks.

## Features

- User authentication with Firebase.
- Auction item listings.
- Real-time bidding with Socket.IO.
- REST API for auction item, bid, close, create, and delete operations.
- Auction closing functionality.
- Winner notifications and email functionality with Nodemailer.
- MongoDB persistence through Mongoose.
- Production health endpoint at `/health`.

## Tech Stack

Frontend:
- React
- Create React App
- React Router
- Axios
- Socket.IO Client
- Testing Library
- Nginx for the production frontend container

Backend:
- Node.js
- Express
- Mongoose
- Firebase Admin SDK
- Socket.IO
- Nodemailer
- Jest
- Supertest

Database:
- MongoDB

Authentication:
- Firebase Authentication
- Firebase Admin token verification

Real-time communication:
- Socket.IO

Infrastructure / DevOps:
- Docker
- Docker Compose
- GitHub Actions
- GitHub Container Registry
- Firebase Hosting
- Render

## Architecture

The React frontend talks to the Express backend through REST API requests and Socket.IO events. Firebase Authentication handles user sign-in on the frontend, and the backend verifies Firebase ID tokens with the Firebase Admin SDK for protected actions.

```text
React frontend -> REST API / Socket.IO -> Express backend -> MongoDB
                         |
                         -> Firebase Admin token verification
```

## Docker

The backend is containerized with Docker and can be built from the repository root:

```bash
docker build -f server/Dockerfile -t silent-auction-server ./server
```

The published backend image is available from GitHub Container Registry:

```text
ghcr.io/fernandoh88/silent-auction-server:latest
```

Run the published image with environment variables from a local env file. Do not commit real `.env` files or secrets.

```bash
docker run --rm \
  --name silent-auction-server \
  --env-file ./server/.env \
  -p 5001:5000 \
  ghcr.io/fernandoh88/silent-auction-server:latest
```

The repository also includes `docker-compose.yml` for running MongoDB, the backend, and the production frontend container together:

```bash
docker compose up --build
```

## GitHub Container Registry

GitHub Actions automatically builds and publishes the backend Docker image to GHCR when changes are pushed to `main` under `server/**` or `.github/workflows/docker-publish.yml`.

Published image:

```text
ghcr.io/fernandoh88/silent-auction-server:latest
```

Image tags:
- `latest`
- Commit SHA, for example `ghcr.io/fernandoh88/silent-auction-server:<commit-sha>`

## CI/CD

Current workflows:

- `ci.yml`: runs on pull requests and pushes to `main`; installs dependencies, runs backend tests, runs frontend tests, builds the frontend, and validates backend/frontend Docker builds.
- `docker-publish.yml`: runs on pushes to `main` that affect backend Docker publishing files, plus manual `workflow_dispatch`; logs in to GHCR with `GITHUB_TOKEN`, builds from `./server`, and publishes `latest` plus the commit SHA tag.
- `firebase-hosting.yml`: runs after a successful `CI` workflow on `main`, plus manual `workflow_dispatch`; builds the frontend and deploys `client/build` to Firebase Hosting.

## Deployment

Frontend:

```text
https://silentauctionapp-4ca96.web.app
```

Backend:

```text
https://silentauction-3eqm.onrender.com
```

Firebase Hosting is configured by `firebase.json` and `.firebaserc`. The backend deployment uses the published Docker image and should be configured with production environment variables from `server/.env.example`.

## Health Check

Endpoint:

```http
GET /health
```

Local example:

```bash
curl http://localhost:5001/health
```

Expected response format:

```json
{
  "status": "healthy",
  "timestamp": "...",
  "env": "production"
}
```

## Local Development

Clone the repository:

```bash
git clone https://github.com/fernandoh88/silent-auction-app.git
cd silent-auction-app
```

Install dependencies:

```bash
cd server
npm ci

cd ../client
npm ci
```

Configure environment variables:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update the local `.env` files with your MongoDB, Firebase, SMTP, and frontend API settings. Do not commit real secrets.

Start the backend:

```bash
cd server
npm start
```

Start the frontend in another terminal:

```bash
cd client
npm start
```

## Testing

Backend:

```bash
cd server
npm test
```

Frontend:

```bash
cd client
npm test
npm run build
```

## Project Structure

```text
.
|-- .github/workflows/
|   |-- ci.yml
|   |-- docker-publish.yml
|   `-- firebase-hosting.yml
|-- client/
|   |-- Dockerfile
|   |-- nginx.conf
|   |-- package.json
|   `-- src/
|-- server/
|   |-- Dockerfile
|   |-- app.js
|   |-- package.json
|   |-- config/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- tests/
|   `-- utils/
|-- docker-compose.yml
|-- firebase.json
`-- README.md
```

## Portfolio / Author

Fernando Henrique da Silva Machado

Portfolio:
https://fernando-portfolio-pi.vercel.app/

GitHub:
https://github.com/fernandoh88

LinkedIn:
https://www.linkedin.com/in/fernando-machado8/
