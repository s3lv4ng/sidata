const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dir: '.', dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.keepAliveTimeout = 60000;
  server.headersTimeout = 65000;
  server.maxRequestsPerSocket = 0; // unlimited

  server.listen(port, '0.0.0.0', () => {
    console.log(`> Server listening on http://0.0.0.0:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });
});
