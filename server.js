import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bank of China Global</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #CC0000 0%, #B8960C 100%);
          color: white;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 10px;
          text-align: center;
          max-width: 500px;
        }
        h1 {
          margin: 0 0 20px 0;
          font-size: 2.5em;
        }
        p {
          margin: 10px 0;
          font-size: 1.1em;
        }
        .status {
          background: #4CAF50;
          padding: 10px;
          border-radius: 5px;
          margin-top: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏦 Bank of China Global</h1>
        <p>Professional Online Wallet</p>
        <p>Deployed on Fly.io</p>
        <div class="status">✓ Server Running</div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Visit: http://localhost:${PORT}`);
});
