# Inertia

Document editor, file manager, and task tracker. Rails API + React frontend.

## Running locally

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

## Project structure

```
inertia/
├── backend/      # Rails 7 API
├── frontend/     # React + webpack frontend
└── docker-compose.yml
```

## API endpoints

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
DELETE /api/v1/auth/logout

GET    /api/v1/workspace
PATCH  /api/v1/workspace

GET    /api/v1/folders
POST   /api/v1/folders
GET    /api/v1/folders/:id
PATCH  /api/v1/folders/:id
DELETE /api/v1/folders/:id

GET    /api/v1/folders/:folder_id/documents
POST   /api/v1/folders/:folder_id/documents
GET    /api/v1/documents/:id
PATCH  /api/v1/documents/:id
DELETE /api/v1/documents/:id

GET    /api/v1/documents/:document_id/tasks
POST   /api/v1/documents/:document_id/tasks
GET    /api/v1/tasks           # all tasks across workspace
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id

POST   /api/v1/shares
GET    /api/v1/shares/:id
DELETE /api/v1/shares/:id
GET    /shared/:token
```
