
## 📁 Project Structure

```
bharat-minds-backend-ai/
│
├── src/
│   ├── config/
│   │   └── appwrite.config.ts      # Appwrite SDK configuration
│   │
│   ├── routes/
│   │   └── auth.routes.ts          # Authentication API routes
│   │
│   ├── services/
│   │   └── auth.service.ts         # Business logic for auth
│   │
│   ├── schemas/
│   │   └── database.schema.ts      # Database schema definitions
│   │
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   │
│   └── index.ts                    # Express server entry point
│
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd bharat-minds-backend-ai
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Appwrite credentials
```

Required environment variables:
```env
PORT=3001
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=main_db
```

### 3. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 📚 API Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-01-16T14:30:00.000Z",
  "service": "BharatMinds AI Backend"
}
```

---

### Register User
```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "9876543210",
  "college": "BMS College of Engineering",
  "city": "Bangalore",
  "state": "Karnataka",
  "examType": "UGCET",
  "currentYear": "12th Standard",
  "stream": "Science (PCM)",
  "preferredLanguage": "English"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_abc123",
      "email": "student@example.com",
      "name": "John Doe"
    },
    "profile": {
      "$id": "profile_xyz789",
      "userId": "user_abc123",
      "college": "BMS College of Engineering",
      "city": "Bangalore",
      ...
    }
  }
}
```

---

### Get User Profile
```http
GET /api/auth/profile/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "$id": "profile_xyz789",
    "userId": "user_abc123",
    "name": "John Doe",
    "email": "student@example.com",
    "college": "BMS College of Engineering",
    "city": "Bangalore",
    "state": "Karnataka",
    "examType": "UGCET",
    "profileCompleted": false
  }
}
```

---

### Update User Profile
```http
PUT /api/auth/profile/:profileId
Content-Type: application/json
```

**Request Body:**
```json
{
  "college": "New College Name",
  "city": "New City",
  "profileCompleted": true
}
```

---

### Delete User
```http
DELETE /api/auth/user/:userId/:profileId
```

---

## 🗄️ Database Schema

### Collections

#### 1. **user_profiles**
Stores extended user profile information.

**Attributes:**
- `userId` (string, required, unique) - Links to Appwrite Auth
- `name` (string, required)
- `email` (email, required)
- `phone` (string)
- `college` (string)
- `city` (string)
- `state` (string)
- `examType` (enum: UGCET | UGNEET | COMBINED)
- `currentYear` (string)
- `stream` (string)
- `preferredLanguage` (enum: English | Kannada | Hindi | Telugu)
- `profileCompleted` (boolean, default: false)
- `registrationCompleted` (boolean, default: false)

**Indexes:**
- userId (unique)
- email
- college

---

#### 2. **students**
Complete student registration data for counselling.

**Attributes:**
- `userId` (string, required)
- `name`, `mobile`, `email` (required)
- `counsellingTypes` (array)
- `ugcetCourses`, `farmScienceCourses` (arrays)
- `ugneetCourses` (JSON string)
- `courseRanks` (JSON string)
- `baseCategory` (string)
- `hasKannada`, `hasRural`, `hasHK` (booleans)
- And more...

See `src/schemas/database.schema.ts` for complete specifications.

---

#### 3. **option_lists**
Generated college recommendations.

**Attributes:**
- `studentId`, `userId` (required)
- `safeColleges`, `targetColleges`, `reachColleges` (JSON)
- `examType`, `totalOptions`
- `generatedAt` (datetime)

---

## 🔐 Security

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number or symbol

### CORS Configuration
Configured in `.env`:
```env
CORS_ORIGIN=http://localhost:3000
```

For production, set to your frontend domain.

### API Key Security
- Never commit `.env` file
- Use Appwrite API key with appropriate permissions
- Rotate keys regularly

---

## 🛠️ Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run tests
npm test
```

### Project Structure Conventions

- **Routes** (`src/routes/`): Express routers for API endpoints
- **Services** (`src/services/`): Business logic and data operations
- **Schemas** (`src/schemas/`): Database schema definitions
- **Config** (`src/config/`): Configuration files (Appwrite, etc.)
- **Types** (`src/types/`): TypeScript type definitions

---

## 🔗 Integration with Frontend

### From Next.js Frontend

```typescript
// Call backend API
const response = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        email: 'student@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        phone: '9876543210',
        college: 'BMS College',
        city: 'Bangalore',
        state: 'Karnataka',
        examType: 'UGCET',
    }),
});

const data = await response.json();
console.log(data);
```

---

## 📊 Error Handling

All API responses follow a consistent format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": [ ... ], // Validation errors if applicable
  "code": 400
}
```

---

## 🧪 Testing

### Manual Testing with cURL

**Register User:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123",
    "name": "Test User",
    "college": "Test College",
    "city": "Bangalore",
    "state": "Karnataka",
    "examType": "UGCET"
  }'
```

**Health Check:**
```bash
curl http://localhost:3001/health
```

---

## 🔧 Appwrite Setup

### 1. Create Appwrite Account
Go to https://cloud.appwrite.io and create an account.

### 2. Create Project
- Click "Create Project"
- Name: "BharatMinds AI"
- Copy the Project ID

### 3. Generate API Key
- Go to Settings → API Keys
- Create new API key with:
  - Scopes: `users.read`, `users.write`, `databases.read`, `databases.write`
  - Never expires (or set appropriate expiry)
- Copy the API Key

### 4. Create Database
- Go to Databases → Create Database
- Name: "main_db"
- Copy Database ID

### 5. Create Collections
Use the schemas defined in `src/schemas/database.schema.ts` to create:
- `user_profiles`
- `students`
- `option_lists`

See schema file for complete attribute specifications.

---

## 📈 Deployment

### Using Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create bharatminds-api

# Set environment variables
heroku config:set APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
heroku config:set APPWRITE_PROJECT_ID=your_project_id
heroku config:set APPWRITE_API_KEY=your_api_key

# Deploy
git push heroku main
```

### Using Vercel (Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Using Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

---

## 🐛 Troubleshooting

### "Appwrite connection failed"
- Check `.env` file exists
- Verify `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`
- Ensure API key has correct scopes

### "Collection not found"
- Create collections in Appwrite Console
- Verify collection IDs in `.env`
- Check database ID is correct

### Port already in use
```bash
# Change PORT in .env
PORT=3002
```

---

## 📝 License

Copyright © 2026 BharatMinds AI
All rights reserved.

---

## 📞 Support

For issues or questions:
- Check `src/schemas/database.schema.ts` for database structure
- Review `src/routes/auth.routes.ts` for API endpoints
- See `src/types/index.ts` for TypeScript types

---

**🎉 Backend API is ready to use!**

Start the server with `npm run dev` and access at `http://localhost:3001`
