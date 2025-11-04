# Development Scripts and Environment Setup

This document describes how to set up and run the development environment.

## Backend Setup

### 1. Environment Variables

Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
OPENAI_API_KEY=your_actual_api_key_here
```

### 2. Running the Backend

**Option 1: Using the dev script**
```bash
cd backend
./dev.sh
```

**Option 2: Manual activation**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc

## Frontend Setup

### 1. Environment Variables

Copy the example environment file:
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` if needed (defaults should work for local development).

### 2. Running the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at:
- Frontend: http://localhost:3000

## Running Both Services

### Option 1: Separate Terminals

Terminal 1 (Backend):
```bash
cd backend
./dev.sh
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Option 2: Using a Process Manager (Optional)

You can use tools like `concurrently` or `foreman` to run both services together.

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM | Required |
| `APP_NAME` | Application name | Resume Job Skill Gap Analyzer |
| `DEBUG` | Debug mode | True |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8000 |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000,http://localhost:5173 |
| `MAX_FILE_SIZE_MB` | Max upload file size | 10 |
| `LLM_MODEL` | LLM model to use | gpt-4-turbo-preview |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:8000 |
| `NEXT_PUBLIC_APP_NAME` | Application name | Resume Job Skill Gap Analyzer |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | Max file size | 10 |

## Troubleshooting

### Backend Issues

1. **Import errors**: Make sure virtual environment is activated
2. **Port already in use**: Change PORT in .env or kill the process using port 8000
3. **CORS errors**: Check CORS_ORIGINS in .env matches your frontend URL

### Frontend Issues

1. **API connection errors**: Verify NEXT_PUBLIC_API_URL matches backend URL
2. **Build errors**: Run `npm install` to ensure all dependencies are installed
3. **Port already in use**: Kill the process using port 3000 or change port: `npm run dev -- -p 3001`

## Hot Reload

Both services support hot reload:
- **Backend**: Uses `--reload` flag in uvicorn (auto-restarts on file changes)
- **Frontend**: Next.js has built-in hot module replacement (HMR)

