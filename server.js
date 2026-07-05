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

app.get('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// HTML Pages
function getLoginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>中国银行全球 | Bank of China Global</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
    }
    
    .login-wrapper {
      width: 100%;
      max-width: 420px;
      padding: 20px;
    }
    
    .login-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .login-header {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }
    
    .logo-subtitle {
      font-size: 12px;
      opacity: 0.9;
      letter-spacing: 1px;
      font-weight: 300;
    }
    
    .login-body {
      padding: 40px;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.3s ease;
      font-family: inherit;
    }
    
    input:focus {
      outline: none;
      border-color: #CC0000;
      box-shadow: 0 0 0 3px rgba(204, 0, 0, 0.1);
      background-color: #fafafa;
    }
    
    .login-button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .login-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(204, 0, 0, 0.3);
    }
    
    .login-button:active {
      transform: translateY(0);
    }
    
    .error-message {
      color: #CC0000;
      font-size: 13px;
      margin-top: 12px;
      text-align: center;
      min-height: 18px;
    }
    
    .login-footer {
      background: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    
    .footer-text {
      margin-bottom: 8px;
    }
    
    .security-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #f0f0f0;
      border-radius: 3px;
      font-size: 11px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-container">
      <div class="login-header">
        <div class="logo-text">中国银行</div>
        <div class="logo-subtitle">BANK OF CHINA GLOBAL</div>
      </div>
      
      <div class="login-body">
        <form id="loginForm">
          <div class="form-group">
            <label for="username">用户名 / Username</label>
            <input type="text" id="username" name="username" required autocomplete="off">
          </div>
          
          <div class="form-group">
            <label for="password">密码 / Password</label>
            <input type="password" id="password" name="password" required autocomplete="off">
          </div>
          
          <button type="submit" class="login-button">登录 / Sign In</button>
          
          <div id="error" class="error-message"></div>
        </form>
      </div>
      
      <div class="login-footer">
        <div class="footer-text">© 2026 Bank of China Global. All rights reserved.</div>
        <div class="security-badge">🔒 Secure Connection</div>
      </div>
    </div>
  </div>
  
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('error');
      
      errorDiv.textContent = '';
      
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
          errorDiv.textContent = 'Invalid credentials. Please try again.';
        }
      } catch (err) {
        errorDiv.textContent = 'Connection error. Please try again.';
      }
    });
  </script>
</body>
</html>`;
}

function getDashboardPage(user) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>账户仪表板 | Account Dashboard</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
    }
    
    .navbar {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .navbar-brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    
    .navbar-menu {
      display: flex;
      gap: 20px;
      align-items: center;
    }
    
    .navbar-menu a {
      color: white;
      text-decoration: none;
      font-size: 13px;
      transition: opacity 0.3s;
    }
    
    .navbar-menu a:hover {
      opacity: 0.8;
    }
    
    .container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 20px;
    }
    
    .welcome-section {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 30px;
    }
    
    .welcome-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 30px;
    }
    
    .account-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .info-item {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 15px;
    }
    
    .info-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .info-value {
      font-size: 16px;
      color: #333;
      font-weight: 600;
    }
    
    .balance-card {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(204, 0, 0, 0.2);
      grid-column: 1 / -1;
    }
    
    .balance-label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .balance-amount {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    
    .balance-currency {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 8px;
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 30px;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(204, 0, 0, 0.3);
    }
    
    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #e0e0e0;
    }
    
    .transactions-card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .transactions-title {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      margin-bottom: 20px;
    }
    
    .transactions-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .transactions-table th {
      background: #f8f8f8;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .transactions-table td {
      padding: 14px 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
      color: #333;
    }
    
    .transactions-table tr:hover {
      background: #f8f8f8;
    }
    
    .status-completed {
      display: inline-block;
      padding: 4px 12px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div class="navbar-brand">中国银行 | BOC</div>
    <div class="navbar-menu">
      <span>${user.full_name || 'Account'}</span>
      <a href="/api/logout">登出 / Logout</a>
    </div>
  </div>
  
  <div class="container">
    <div class="welcome-section">
      <h1 class="welcome-title">欢迎回来 / Welcome Back</h1>
      
      <div class="account-info">
        <div class="info-item">
          <div class="info-label">账户 / Account</div>
          <div class="info-value">${user.username}</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">账户类型 / Account Type</div>
          <div class="info-value">Premium</div>
        </div>
        
        <div class="balance-card">
          <div class="balance-label">账户余额 / Account Balance</div>
          <div class="balance-amount">$${user.balance.toFixed(2)}</div>
          <div class="balance-currency">USD - United States Dollar</div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button class="btn btn-primary" onclick="showTab('overview')">概览 / Overview</button>
        <button class="btn btn-secondary" onclick="showTab('transactions')">交易 / Transactions</button>
      </div>
    </div>
    
    <div id="transactions-section" style="display: none; margin-top: 30px;">
      <div class="transactions-card">
        <h2 class="transactions-title">交易历史 / Transaction History</h2>
        <table class="transactions-table">
          <thead>
            <tr>
              <th>日期 / Date</th>
              <th>金额 / Amount</th>
              <th>类型 / Type</th>
              <th>状态 / Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-01-24</td>
              <td>$1,850.00</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
            <tr>
              <td>2026-02-25</td>
              <td>$1,650.00</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
            <tr>
              <td>2026-03-12</td>
              <td>$12,350.00</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
            <tr>
              <td>2026-04-23</td>
              <td>$5,116.50</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
            <tr>
              <td>2026-05-26</td>
              <td>$12,350.00</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
            <tr>
              <td>2026-06-21</td>
              <td>$5,116.50</td>
              <td>转账 / Transfer</td>
              <td><span class="status-completed">已完成 / Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2026 Bank of China Global. All rights reserved. | 中国银行版权所有</p>
  </div>
  
  <script>
    function showTab(tab) {
      const welcomeSection = document.querySelector('.welcome-section');
      const transactionsSection = document.getElementById('transactions-section');
      
      if (tab === 'overview') {
        welcomeSection.style.display = 'block';
        transactionsSection.style.display = 'none';
      } else if (tab === 'transactions') {
        welcomeSection.style.display = 'none';
        transactionsSection.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;
}

function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理面板 | Admin Panel</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
    }
    
    .navbar {
      background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .navbar-brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    
    .navbar-menu a {
      color: white;
      text-decoration: none;
      font-size: 13px;
    }
    
    .container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 20px;
    }
    
    .admin-section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .admin-title {
      font-size: 22px;
      font-weight: 700;
      color: #333;
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      background: #f8f8f8;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    td {
      padding: 14px 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
      color: #333;
    }
    
    tr:hover {
      background: #f8f8f8;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div class="navbar-brand">中国银行 | BOC - 管理面板</div>
    <a href="/api/logout" style="color: white; text-decoration: none;">登出 / Logout</a>
  </div>
  
  <div class="container">
    <div class="admin-section">
      <h1 class="admin-title">客户管理 / Customer Management</h1>
      
      <table id="usersTable">
        <thead>
          <tr>
            <th>用户名 / Username</th>
            <th>姓名 / Full Name</th>
            <th>余额 / Balance</th>
            <th>角色 / Role</th>
          </tr>
        </thead>
        <tbody id="usersBody"></tbody>
      </table>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2026 Bank of China Global. All rights reserved.</p>
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
