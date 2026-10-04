const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
let server;
let base;
before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
test('root returns the documented JSON', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { platform: 'AKS', status: 'ok' });
  assert.equal(response.headers.get('x-powered-by'), null);
});
for (const [path, body] of [['/healthz', 'ok'], ['/readyz', 'ready']]) {
  test(`${path} is a working probe`, async () => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), body);
  });
}
test('unknown paths return 404', async () => {
  assert.equal((await fetch(base + '/missing')).status, 404);
});
