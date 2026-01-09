const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DIST_DIR = path.join(__dirname, 'dist');
// Config file path from environment variable or default
const CONFIG_PATH_ENV = process.env.CONFIG_PATH || './config.json';
const CONFIG_PATH = path.resolve(__dirname, CONFIG_PATH_ENV);
const ACTIVITY_LOG_PATH = path.join(__dirname, 'activity.log');
// Check if IS_PRODUCTION is set to true
const isProduction = process.env.IS_PRODUCTION === 'true';
// In production mode, dist directory must exist
if (isProduction && !fs.existsSync(DIST_DIR)) {
  throw new Error(`Production mode enabled but dist directory does not exist: ${DIST_DIR}`);
}
// Force port 3000 in production, otherwise use PORT environment variable or default to 3000
const PORT = isProduction ? 3000 : (process.env.PORT || 3000);

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'text/plain';
}

// Serve static files
function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

// Handle POST requests
function handlePostRequest(req, res, parsedUrl) {
  if (parsedUrl.pathname === '/log') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (res.headersSent) return;

      if (!body) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Empty body');
        return;
      }

      let event;
      try {
        event = JSON.parse(body);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
        return;
      }

      if (!event || typeof event !== 'object') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid payload');
        return;
      }

      const line = `${JSON.stringify(event)}\n`;
      fs.appendFile(ACTIVITY_LOG_PATH, line, (err) => {
        if (res.headersSent) return;

        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to write log');
          return;
        }
        res.writeHead(204);
        res.end();
      });
    });

    req.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Request error');
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

// Handle GET requests for config.json
function handleGetConfig(req, res) {
  fs.readFile(CONFIG_PATH, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Config file not found' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read config file' }));
      }
      return;
    }

    try {
      // Validate JSON before sending
      JSON.parse(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (parseError) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON in config file' }));
    }
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathName = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;

  // Handle GET requests for config.json
  if (req.method === 'GET' && parsedUrl.pathname === '/config.json') {
    handleGetConfig(req, res);
    return;
  }

  // Handle POST requests
  if (req.method === 'POST') {
    handlePostRequest(req, res, parsedUrl);
    return;
  }

  // In production mode, serve static files from dist directory
  if (isProduction) {
    // Strip leading slashes so path.join/resolve can't ignore DIST_DIR
    let filePath = path.join(DIST_DIR, pathName.replace(/^\/+/, ''));

    // Security check - prevent directory traversal
    const resolvedDistDir = path.resolve(DIST_DIR);
    const resolvedFilePath = path.resolve(filePath);
    const relativePath = path.relative(resolvedDistDir, resolvedFilePath);

    // Reject if path tries to traverse outside the base directory
    if (relativePath.startsWith('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    serveFile(filePath, res);
  } else {
    // Development mode - static files are served by Vite
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found (development mode - use Vite dev server `npm run start:dev`)');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`Serving static files from: ${DIST_DIR}`);
  } else {
    console.log(`Development mode - static files served by Vite`);
  }
  console.log('Press Ctrl+C to stop the server');
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
