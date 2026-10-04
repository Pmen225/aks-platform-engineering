const express = require('express');

const app = express();
app.disable('x-powered-by');
app.get('/', (_, response) => response.json({ platform: 'AKS', status: 'ok' }));
app.get('/healthz', (_, response) => response.send('ok'));
app.get('/readyz', (_, response) => response.send('ready'));

if (require.main === module) {
  const server = app.listen(process.env.PORT || 8080);
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}

module.exports = app;
