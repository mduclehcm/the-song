# THE SONG 🎵

Welcome to the ultimate experiment in musical chaos.

**THE SONG** is a massively-collaborative MIDI editor where strangers from around the world come together to create... well, something. It might be a symphony. It might be a digital train wreck. But it will be *ours*.

## Why?

- 🎹 **To make noise:** Because the internet isn't loud enough yet.
- 🤝 **To prove a point:** That humans can cooperate (or at least hit the same notes eventually).
- 🤪 **For the chaos:** Stress-testing my patience and my home server in one go.
- 🎩 **The secret reason:** It's technically a job interview assignment, but let's just call it "Art".

## 🚀 Quick Start with Docker

The easiest way to run THE SONG is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/mduclehcm/the-song.git
cd the-song

# Copy .env
cp env.example .env

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

For detailed Docker instructions, see [DOCKER.md](DOCKER.md).

## 🛠️ Development Setup

### Prerequisites
- Docker & Docker Compose
- Or alternatively:
  - Rust 1.90+
  - Node.js 22+

### Running with Docker (Recommended)

```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up -d
```

### Running Locally

**Backend:**
```bash
cd backend
cargo run
```

**Frontend:**
```bash
cd ui
npm install
npm run dev
```

## 📚 Documentation

- Backend: Rust + Axum + WebSockets
- Frontend: React + Vite + CRDT (loro-crdt)

