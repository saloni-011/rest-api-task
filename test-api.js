const http = require('http');
const app = require('./src/index');
const prisma = require('./src/utils/prisma');

const PORT = 5001; // Use 5001 to avoid conflicting with running dev server
let server;

function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: defaultHeaders
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseBody);
          } catch (e) {
            parsed = responseBody;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (body !== null) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting End-to-End API Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  try {
    // 1. Root Health Check
    console.log('\n--- 1. Health Check Endpoint ---');
    const rootRes = await makeRequest({ method: 'GET', path: '/' });
    assert(rootRes.statusCode === 200, 'GET / returns 200 OK');
    assert(rootRes.body.status === 'healthy', 'GET / returns healthy status');

    // 2. Authentication: Registration
    console.log('\n--- 2. User Registration ---');
    const timestamp = Date.now();
    const testUser = {
      name: 'Saloni Tester',
      email: `saloni_${timestamp}@test.com`,
      password: 'mypassword123'
    };

    // Valid register
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: testUser
    });
    assert(regRes.statusCode === 201, 'POST /api/auth/register returns 201 Created');
    assert(regRes.body.user && regRes.body.user.email === testUser.email, 'User created with correct email');
    assert(!regRes.body.user.password, 'Password is omitted from registration response');

    // Duplicate email
    const dupRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: testUser
    });
    assert(dupRes.statusCode === 400, 'Duplicate email returns 400 Bad Request');

    // Invalid email validation
    const badEmailRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Bad', email: 'invalid-email', password: 'password123' }
    });
    assert(badEmailRes.statusCode === 400, 'Invalid email returns 400 Bad Request');

    // Short password validation
    const shortPassRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Bad', email: 'valid@example.com', password: '123' }
    });
    assert(shortPassRes.statusCode === 400, 'Password < 6 chars returns 400 Bad Request');

    // 3. Authentication: Login
    console.log('\n--- 3. User Login ---');
    // Wrong password
    const wrongLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testUser.email, password: 'wrongpassword' }
    });
    assert(wrongLogin.statusCode === 401, 'Wrong password returns 401 Unauthorized');

    // Successful login
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testUser.email, password: testUser.password }
    });
    assert(loginRes.statusCode === 200, 'Valid login returns 200 OK');
    assert(loginRes.body.token, 'Login returns JWT token');
    const token = loginRes.body.token;

    // 4. Protected Route & Profile
    console.log('\n--- 4. Protected Routes & Token Verification ---');
    // Profile with valid token
    const profileRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(profileRes.statusCode === 200, 'GET /api/auth/me with Bearer token returns 200');
    assert(profileRes.body.email === testUser.email, 'Profile returns matching user email');

    // Tasks without token
    const noAuthTasks = await makeRequest({
      method: 'GET',
      path: '/api/tasks'
    });
    assert(noAuthTasks.statusCode === 401, 'GET /api/tasks without token returns 401 Unauthorized');

    // Tasks with invalid token
    const badAuthTasks = await makeRequest({
      method: 'GET',
      path: '/api/tasks',
      headers: { Authorization: 'Bearer thisisnotavalidtoken' }
    });
    assert(badAuthTasks.statusCode === 401, 'GET /api/tasks with bad token returns 401 Unauthorized');

    // 5. CRUD Endpoints on /api/tasks
    console.log('\n--- 5. Task CRUD Endpoints ---');

    // Validation failure: missing title
    const invalidTask = await makeRequest({
      method: 'POST',
      path: '/api/tasks',
      headers: { Authorization: `Bearer ${token}` },
      body: { description: 'Missing title' }
    });
    assert(invalidTask.statusCode === 400, 'POST /api/tasks missing title returns 400 Bad Request');

    // Validation failure: invalid status
    const invalidStatusTask = await makeRequest({
      method: 'POST',
      path: '/api/tasks',
      headers: { Authorization: `Bearer ${token}` },
      body: { title: 'Test Task', status: 'UNKNOWN_STATUS' }
    });
    assert(invalidStatusTask.statusCode === 400, 'POST /api/tasks with invalid status returns 400 Bad Request');

    // CREATE: Valid task
    const createRes = await makeRequest({
      method: 'POST',
      path: '/api/tasks',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Complete REST API Task',
        description: 'Implement all CRUD and authentication endpoints',
        status: 'IN_PROGRESS'
      }
    });
    assert(createRes.statusCode === 201, 'POST /api/tasks returns 201 Created');
    assert(createRes.body.id !== undefined, 'Created task has unique ID');
    assert(createRes.body.title === 'Complete REST API Task', 'Task has correct title');
    const createdTaskId = createRes.body.id;

    // READ ALL: Get tasks
    const listRes = await makeRequest({
      method: 'GET',
      path: '/api/tasks',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(listRes.statusCode === 200, 'GET /api/tasks returns 200 OK');
    assert(listRes.body.tasks && listRes.body.tasks.length >= 1, 'Tasks array returned with created task');

    // READ FILTERED: Filter by status
    const filteredRes = await makeRequest({
      method: 'GET',
      path: '/api/tasks?status=IN_PROGRESS',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(filteredRes.statusCode === 200, 'GET /api/tasks?status=IN_PROGRESS returns 200 OK');
    assert(filteredRes.body.tasks.every(t => t.status === 'IN_PROGRESS'), 'All returned tasks match status filter');

    // READ ONE: Get single task
    const getOneRes = await makeRequest({
      method: 'GET',
      path: `/api/tasks/${createdTaskId}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(getOneRes.statusCode === 200, `GET /api/tasks/${createdTaskId} returns 200 OK`);
    assert(getOneRes.body.id === createdTaskId, 'Retrieved task ID matches');

    // READ ONE: Invalid ID format (non-integer)
    const badIdRes = await makeRequest({
      method: 'GET',
      path: '/api/tasks/notanumber',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(badIdRes.statusCode === 400, 'GET /api/tasks/notanumber returns 400 Bad Request');

    // READ ONE: Not Found
    const notFoundRes = await makeRequest({
      method: 'GET',
      path: '/api/tasks/999999',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(notFoundRes.statusCode === 404, 'GET /api/tasks/999999 returns 404 Not Found');

    // UPDATE (PUT): Full/partial update
    const putRes = await makeRequest({
      method: 'PUT',
      path: `/api/tasks/${createdTaskId}`,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Updated REST API Task Title',
        status: 'COMPLETED'
      }
    });
    assert(putRes.statusCode === 200, `PUT /api/tasks/${createdTaskId} returns 200 OK`);
    assert(putRes.body.title === 'Updated REST API Task Title', 'Task title successfully updated');
    assert(putRes.body.status === 'COMPLETED', 'Task status successfully updated to COMPLETED');

    // PARTIAL UPDATE (PATCH)
    const patchRes = await makeRequest({
      method: 'PATCH',
      path: `/api/tasks/${createdTaskId}`,
      headers: { Authorization: `Bearer ${token}` },
      body: { description: 'Updated description only via PATCH' }
    });
    assert(patchRes.statusCode === 200, `PATCH /api/tasks/${createdTaskId} returns 200 OK`);
    assert(patchRes.body.description === 'Updated description only via PATCH', 'Description updated via PATCH');

    // DELETE: Delete task
    const deleteRes = await makeRequest({
      method: 'DELETE',
      path: `/api/tasks/${createdTaskId}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(deleteRes.statusCode === 200, `DELETE /api/tasks/${createdTaskId} returns 200 OK`);

    // Verify task is now 404
    const verifyDelete = await makeRequest({
      method: 'GET',
      path: `/api/tasks/${createdTaskId}`,
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(verifyDelete.statusCode === 404, 'Deleted task now returns 404 Not Found');

    // 6. User Isolation Check
    console.log('\n--- 6. Multi-User Isolation ---');
    // Register User 2
    const user2Res = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'User Two',
        email: `user2_${timestamp}@test.com`,
        password: 'password123'
      }
    });
    const login2Res = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: `user2_${timestamp}@test.com`, password: 'password123' }
    });
    const token2 = login2Res.body.token;

    // User 1 creates a private task
    const user1Task = await makeRequest({
      method: 'POST',
      path: '/api/tasks',
      headers: { Authorization: `Bearer ${token}` },
      body: { title: 'User 1 Secret Task' }
    });
    const secretTaskId = user1Task.body.id;

    // User 2 attempts to fetch User 1's task
    const user2Access = await makeRequest({
      method: 'GET',
      path: `/api/tasks/${secretTaskId}`,
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert(user2Access.statusCode === 404, 'User 2 cannot access User 1 task (isolated with 404)');

    // 7. Route 404 & Centralized Error Handler
    console.log('\n--- 7. Error Handling & 404 Routes ---');
    const unknownRoute = await makeRequest({
      method: 'GET',
      path: '/api/random/unknown/route'
    });
    assert(unknownRoute.statusCode === 404, 'Unknown endpoint returns 404 JSON error');

    // Summary
    console.log('\n=========================================');
    console.log(`📊 Test Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('=========================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    process.exit(process.exitCode || 0);
  }
}

runTests();
