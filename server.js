import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initializeDatabase, getUser, getAllUsers, updateUserBalance, updateUserName } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production-12345678';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize database
await initializeDatabase();

// Helper functions
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.get('/', (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect('/dashboard');
    } catch (err) {
      res.clearCookie('token');
    }
  }
  res.send(getLoginPage());
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await getUser(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 86400000 });
    res.json({ success: true, redirect: user.role === 'admin' ? '/admin' : '/dashboard' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const user = await getUser(req.user.username);
    res.send(getDashboardPage(user));
  } catch (err) {
    res.status(500).send('Error loading dashboard');
  }
});

app.get('/admin', verifyToken, async (req, res) => {
  const user = await getUser(req.user.username);
  if (user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }
  res.send(getAdminPage());
});

app.get('/api/admin/users', verifyToken, async (req, res) => {
  const user = await getUser(req.user.username);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/update-balance', verifyToken, async (req, res) => {
  const user = await getUser(req.user.username);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { userId, newBalance } = req.body;
  try {
    await updateUserBalance(userId, newBalance);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

app.get('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// HTML Pages
function getLoginPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Bank of China Global - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 400px;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
      font-size: 2em;
      color: #CC0000;
      font-weight: bold;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 1em;
    }
    input:focus {
      outline: none;
      border-color: #CC0000;
      box-shadow: 0 0 5px rgba(204, 0, 0, 0.3);
    }
    button {
      width: 100%;
      padding: 12px;
      background: #CC0000;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 1em;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover {
      background: #990000;
    }
    .error {
      color: #CC0000;
      margin-top: 10px;
      text-align: center;
    }
    .demo-info {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">🏦 Bank of China Global</div>
    <form id="loginForm">
      <div class="form-group">
        <label>Username</label>
        <input type="text" name="username" required>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required>
      </div>
      <button type="submit">Login</button>
      <div id="error" class="error"></div>
    </form>
    <div class="demo-info">
      <strong>Demo Account:</strong><br>
      Username: DANGO888<br>
      Password: dango888
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = e.target.username.value;
      const password = e.target.password.value;
      
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          document.getElementById('error').textContent = 'Invalid credentials';
        }
      } catch (err) {
        document.getElementById('error').textContent = 'Login failed';
      }
    });
  </script>
</body>
</html>`;
}

function getDashboardPage(user) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Dashboard - Bank of China Global</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
    }
    .navbar {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .container {
      max-width: 1000px;
      margin: 40px auto;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .balance {
      font-size: 2.5em;
      color: #CC0000;
      font-weight: bold;
      margin: 20px 0;
    }
    .user-info {
      color: #666;
      margin: 10px 0;
    }
    button {
      background: #CC0000;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
    }
    button:hover {
      background: #990000;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div>🏦 Bank of China Global</div>
    <a href="/api/logout" style="color: white; text-decoration: none;">Logout</a>
  </div>
  <div class="container">
    <div class="card">
      <h1>Welcome back, ${user.full_name || user.username}!</h1>
      <div class="user-info">Account: ${user.username}</div>
      <div class="user-info">Account Balance:</div>
      <div class="balance">$${user.balance.toFixed(2)} USD</div>
    </div>
  </div>
</body>
</html>`;
}

function getAdminPage() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel - Bank of China Global</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
    }
    .navbar {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #CC0000;
      color: white;
    }
    button {
      background: #CC0000;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
    }
    button:hover {
      background: #990000;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div>🏦 Bank of China Global - Admin Panel</div>
    <a href="/api/logout" style="color: white; text-decoration: none;">Logout</a>
  </div>
  <div class="container">
    <div class="card">
      <h1>Customer Management</h1>
      <table id="usersTable">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Balance</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody id="usersBody"></tbody>
      </table>
    </div>
  </div>
  <script>
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const users = await res.json();
        const tbody = document.getElementById('usersBody');
        tbody.innerHTML = users.map(u => '<tr><td>' + u.username + '</td><td>' + (u.full_name || 'N/A') + '</td><td>$' + u.balance.toFixed(2) + '</td><td>' + u.role + '</td></tr>').join('');
      } catch (err) {
        console.error('Failed to load users');
      }
    }
    loadUsers();
  </script>
</body>
</html>`;
}

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Visit: http://localhost:${PORT}`);
});
