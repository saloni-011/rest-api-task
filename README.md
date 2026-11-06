# 📝 Task Management RESTful API

A secure, production-ready CRUD REST API with JWT-based user authentication and data validation built with **Node.js**, **Express**, and **Prisma ORM** with **SQLite**.

Built for **Valentius Kryptix Intern Hub — WA-2: REST API with Node/Django**.

---

## 🌟 Features

- **Full CRUD for Core Resource (`/api/tasks`)**: Create, Read (all & single), Update (PUT & PATCH), and Delete tasks.
- **User Authentication**: Secure user registration and login with passwords hashed using **bcryptjs** (salt factor 10).
- **JWT Protection**: Protected routes requiring a valid JSON Web Token (`Bearer <token>`). Unauthenticated requests are rejected with `401 Unauthorized`.
- **User Isolation**: Users can only view, update, or delete their own tasks.
- **Strict Input Validation**: Rejects empty or malformed requests with clean, descriptive error messages and `400 Bad Request`.
- **Search & Filter**: Filter tasks by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`) and keyword search across title and description.
- **Standardized HTTP Status Codes**: Explicit `200`, `201`, `400`, `401`, `404`, and `500` status codes.
- **Centralized Error Handling**: Catches malformed JSON payloads, unhandled route 404s, and unexpected errors gracefully.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database ORM**: Prisma ORM
- **Database**: SQLite (zero-config local database, easily swappable to PostgreSQL or MySQL)
- **Security & Authentication**: `jsonwebtoken` (JWT), `bcryptjs`, `cors`
- **Environment Management**: `dotenv`

---

## 📁 Project Structure

```text
rest-api-task/
├── prisma/
│   ├── schema.prisma       # Database schema (User and Task models)
│   └── dev.db              # SQLite local database (generated on migration)
├── src/
│   ├── middleware/
│   │   ├── auth.js         # JWT verification & route protection middleware
│   │   └── validate.js     # Request body and parameter validators
│   ├── routes/
│   │   ├── auth.js         # Registration, login, and user profile routes
│   │   └── tasks.js        # Protected CRUD task routes
│   ├── utils/
│   │   └── prisma.js       # Reusable Prisma client singleton
│   └── index.js            # Express server entry point & error handlers
├── .env.example            # Sample environment variables
├── .gitignore              # Ignored files (node_modules, dev.db, .env)
├── package.json            # Dependencies and scripts
└── README.md               # API documentation and testing guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (comes with Node.js)

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/rest-api-task.git
cd rest-api-task
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secure_super_secret_jwt_key_here"
```

### 5. Initialize the Database
Generate the Prisma Client and push the database schema to SQLite:
```bash
npx prisma db push
```

### 6. Start the Server
- **Development mode** (with nodemon):
  ```bash
  npm run dev
  ```
- **Production mode**:
  ```bash
  npm start
  ```
The server will start at `http://localhost:5000`.

---

## 📊 Database Schema

### `User` Model
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | Int | `@id @default(autoincrement())` | Unique user identifier |
| `name` | String | | User's full name |
| `email` | String | `@unique` | Unique email address |
| `password` | String | | Hashed password (bcrypt) |
| `tasks` | Task[] | | One-to-many relationship with Task |
| `createdAt` | DateTime | `@default(now())` | Registration timestamp |

### `Task` Model
| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | Int | `@id @default(autoincrement())` | Unique task identifier |
| `title` | String | | Title of task (1 - 200 chars) |
| `description` | String? | Optional | Detailed notes / description |
| `status` | String | `@default("PENDING")` | `PENDING`, `IN_PROGRESS`, `COMPLETED` |
| `userId` | Int | Foreign Key | Owner ID |
| `createdAt` | DateTime | `@default(now())` | Creation timestamp |
| `updatedAt` | DateTime | `@updatedAt` | Last update timestamp |

---

## 📖 API Documentation

### Base URL: `http://localhost:5000/api`

---

### 1. Root & Health Check

#### `GET /`
Returns basic metadata and available endpoints.

- **Status**: `200 OK`
- **Response**:
  ```json
  {
    "name": "Task Management REST API",
    "version": "1.0.0",
    "status": "healthy",
    "documentation": { ... }
  }
  ```

---

### 2. Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/register`
Register a new user. Passwords are automatically hashed with bcrypt before saving.

- **Auth Required**: No
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "message": "User registered successfully.",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-11-06T10:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "A valid email address is required." }
    ```
    ```json
    { "error": "Password must be at least 6 characters long." }
    ```
    ```json
    { "error": "User with this email already exists." }
    ```

---

#### `POST /api/auth/login`
Authenticate existing user and receive a signed JWT token (valid for 24 hours).

- **Auth Required**: No
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Login successful.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEs...",
    "user": {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "A valid email address is required." }
    ```
  - `401 Unauthorized`:
    ```json
    { "error": "Invalid email or password." }
    ```

---

#### `GET /api/auth/me`
Retrieve profile of currently authenticated user.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**: `Authorization: Bearer <your_jwt_token>`
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2026-11-06T10:00:00.000Z"
  }
  ```
- **Error Response (`401 Unauthorized`)**:
  ```json
  { "error": "Access denied. Authorization header is missing." }
  ```

---

### 3. Task Management CRUD Endpoints (`/api/tasks`)

> **Note**: All `/api/tasks` endpoints are **protected**. Every request must include the header:
> `Authorization: Bearer <your_jwt_token>`

---

#### `POST /api/tasks`
Create a new task.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "title": "Build REST API",
    "description": "Implement authentication and CRUD endpoints",
    "status": "IN_PROGRESS"
  }
  ```
  *(Note: `description` and `status` are optional. Default status is `PENDING`)*
- **Success Response (`201 Created`)**:
  ```json
  {
    "id": 1,
    "title": "Build REST API",
    "description": "Implement authentication and CRUD endpoints",
    "status": "IN_PROGRESS",
    "userId": 1,
    "createdAt": "2026-11-06T10:05:00.000Z",
    "updatedAt": "2026-11-06T10:05:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "Title is required and cannot be empty." }
    ```
    ```json
    { "error": "Invalid status 'DONE'. Allowed values: PENDING, IN_PROGRESS, COMPLETED." }
    ```
  - `401 Unauthorized`:
    ```json
    { "error": "Invalid authentication token." }
    ```

---

#### `GET /api/tasks`
Retrieve all tasks belonging to the authenticated user. Supports optional query parameters.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters (Optional)**:
  - `status`: Filter by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`).
  - `search`: Keyword search matching against title or description.
- **Example URL**: `/api/tasks?status=IN_PROGRESS&search=REST`
- **Success Response (`200 OK`)**:
  ```json
  {
    "count": 1,
    "tasks": [
      {
        "id": 1,
        "title": "Build REST API",
        "description": "Implement authentication and CRUD endpoints",
        "status": "IN_PROGRESS",
        "userId": 1,
        "createdAt": "2026-11-06T10:05:00.000Z",
        "updatedAt": "2026-11-06T10:05:00.000Z"
      }
    ]
  }
  ```

---

#### `GET /api/tasks/:id`
Retrieve a single task by its ID.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameters**: `:id` (Integer)
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "title": "Build REST API",
    "description": "Implement authentication and CRUD endpoints",
    "status": "IN_PROGRESS",
    "userId": 1,
    "createdAt": "2026-11-06T10:05:00.000Z",
    "updatedAt": "2026-11-06T10:05:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "Task ID must be a valid positive integer." }
    ```
  - `404 Not Found`:
    ```json
    { "error": "Task not found." }
    ```

---

#### `PUT /api/tasks/:id` & `PATCH /api/tasks/:id`
Update an existing task. Both full updates and partial updates are supported.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **URL Parameters**: `:id` (Integer)
- **Request Body** (at least one field required):
  ```json
  {
    "title": "Build REST API & Test with Postman",
    "status": "COMPLETED"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "title": "Build REST API & Test with Postman",
    "description": "Implement authentication and CRUD endpoints",
    "status": "COMPLETED",
    "userId": 1,
    "createdAt": "2026-11-06T10:05:00.000Z",
    "updatedAt": "2026-11-06T10:15:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "At least one field (title, description, or status) must be provided to update." }
    ```
  - `404 Not Found`:
    ```json
    { "error": "Task not found." }
    ```

---

#### `DELETE /api/tasks/:id`
Delete an existing task.

- **Auth Required**: Yes (`Bearer <token>`)
- **Headers**: `Authorization: Bearer <token>`
- **URL Parameters**: `:id` (Integer)
- **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Task deleted successfully.",
    "deletedTaskId": 1
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    { "error": "Task ID must be a valid positive integer." }
    ```
  - `404 Not Found`:
    ```json
    { "error": "Task not found." }
    ```

---

## 🚦 HTTP Status Codes Summary

| Status Code | Meaning | Used For |
|---|---|---|
| `200 OK` | Request succeeded | `GET`, `PUT`, `PATCH`, `DELETE`, and `POST /login` |
| `201 Created` | Resource created | `POST /register` and `POST /tasks` |
| `400 Bad Request` | Missing/invalid fields | Validation failures, malformed JSON, invalid IDs |
| `401 Unauthorized` | Missing/invalid token | Protected route access without valid JWT, bad credentials |
| `404 Not Found` | Resource does not exist | Task ID not found or unknown API endpoint |
| `500 Internal Error`| Server error | Unexpected database or internal errors |

---

## 🧪 Postman Testing Workflow

Follow this sequence to test the entire API flow:

1. **Register**: Send `POST /api/auth/register` with name, email, and password.
2. **Login**: Send `POST /api/auth/login` with your credentials. Copy the `token` from the response.
3. **Set Authorization in Postman**:
   - In your Postman request tab, go to **Authorization** &rarr; select **Bearer Token** &rarr; paste your token.
4. **Create Task**: Send `POST /api/tasks` with `{ "title": "My first task" }`. Verify status `201 Created`.
5. **Get All Tasks**: Send `GET /api/tasks`. Verify status `200 OK` and inspect array.
6. **Get Single Task**: Send `GET /api/tasks/1`. Verify status `200 OK`.
7. **Update Task**: Send `PUT /api/tasks/1` with `{ "status": "COMPLETED" }`. Verify update.
8. **Delete Task**: Send `DELETE /api/tasks/1`. Verify status `200 OK`.
9. **Test Protection**: Remove the `Authorization` header and call `GET /api/tasks`. Verify status `401 Unauthorized`.

---

## 📄 License
MIT License. Built for educational evaluation.
