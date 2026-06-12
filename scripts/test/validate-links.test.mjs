// validate-links.test.mjs — Tests FR-7
// T-LNK-1: 200 → ok
// T-LNK-2: 404 → probleme
// T-LNK-3: timeout → probleme
// T-LNK-4: tripadvisor.com → inverifiable, ZÉRO requête
// T-LNK-5: booking.com → inverifiable, ZÉRO requête
// T-LNK-6: validate:fast n'inclut PAS validate-links

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isBotWalled, collectUrls, checkUrl, validateLinks } from '../validate-links.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));

// ---------------------------------------------------------------------------
// Serveur HTTP local (port 0 = OS choisit le port libre)
// ---------------------------------------------------------------------------

let server;
let baseUrl;

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200);
      res.end('ok');
    } else if (req.url === '/notfound') {
      res.writeHead(404);
      res.end('not found');
    } else if (req.url === '/hang') {
      // Ne répond jamais — pour tester le timeout
    } else {
      res.writeHead(200);
      res.end('ok');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
});

// ---------------------------------------------------------------------------
// T-LNK-1 : 200 → ok
// ---------------------------------------------------------------------------
test('T-LNK-1: HTTP 200 → ok', async () => {
  const result = await checkUrl(`${baseUrl}/ok`);
  assert.equal(result.state, 'ok');
});

// ---------------------------------------------------------------------------
// T-LNK-2 : 404 → probleme
// ---------------------------------------------------------------------------
test('T-LNK-2: HTTP 404 → probleme', async () => {
  const result = await checkUrl(`${baseUrl}/notfound`);
  assert.equal(result.state, 'probleme');
});

// ---------------------------------------------------------------------------
// T-LNK-3 : timeout → probleme
// ---------------------------------------------------------------------------
test('T-LNK-3: timeout → probleme', async () => {
  const result = await checkUrl(`${baseUrl}/hang`, { timeoutMs: 200 });
  assert.equal(result.state, 'probleme');
  assert.match(result.detail, /timeout/);
});

// ---------------------------------------------------------------------------
// T-LNK-4 : tripadvisor → inverifiable SANS requête
// ---------------------------------------------------------------------------
test('T-LNK-4: tripadvisor.com → inverifiable, zéro requête', async () => {
  const poisWithTrip = [
    {
      id: 'poi-trip',
      links: { official: null, booking: null, tripadvisor: 'https://tripadvisor.com/Restaurant_Review', maps: null },
      extraLinks: [],
    },
  ];
  const fetchSpy = () => {
    throw new Error('fetch NE DOIT PAS être appelé pour les domaines bot-wallés');
  };
  const report = await validateLinks({ dest: 'test', pois: poisWithTrip, fetchImpl: fetchSpy });
  const v = report.verdicts.find((x) => x.id.includes('tripadvisor'));
  assert.ok(v, 'doit avoir un verdict tripadvisor');
  assert.equal(v.state, 'inverifiable');
});

// ---------------------------------------------------------------------------
// T-LNK-5 : booking.com → inverifiable SANS requête
// ---------------------------------------------------------------------------
test('T-LNK-5: booking.com → inverifiable, zéro requête', async () => {
  const poisWithBooking = [
    {
      id: 'poi-book',
      links: { official: null, booking: 'https://booking.com/hotel/fr/test.fr.html', tripadvisor: null, maps: null },
      extraLinks: [],
    },
  ];
  const fetchSpy = () => {
    throw new Error('fetch NE DOIT PAS être appelé pour les domaines bot-wallés');
  };
  const report = await validateLinks({ dest: 'test', pois: poisWithBooking, fetchImpl: fetchSpy });
  const v = report.verdicts.find((x) => x.id.includes('booking'));
  assert.ok(v, 'doit avoir un verdict booking');
  assert.equal(v.state, 'inverifiable');
});

// ---------------------------------------------------------------------------
// T-LNK-6 : validate:fast n'inclut PAS validate-links ; inclut build+geo+images+lint-orphans
// ---------------------------------------------------------------------------
test('T-LNK-6: validate:fast exclu validate-links, inclut build+geo+images+lint-orphans', () => {
  const fast = PKG.scripts?.['validate:fast'] ?? '';
  assert.ok(!fast.includes('validate-links'), `validate:fast ne doit PAS inclure validate-links — actuel: "${fast}"`);
  assert.ok(fast.includes('astro build') || fast.includes('build'), `validate:fast doit inclure build — actuel: "${fast}"`);
  assert.ok(fast.includes('validate-geo'), `validate:fast doit inclure validate-geo — actuel: "${fast}"`);
  assert.ok(fast.includes('validate-images'), `validate:fast doit inclure validate-images — actuel: "${fast}"`);
  assert.ok(fast.includes('lint-orphans'), `validate:fast doit inclure lint-orphans — actuel: "${fast}"`);
});

// ---------------------------------------------------------------------------
// Tests unitaires isBotWalled / collectUrls
// ---------------------------------------------------------------------------
test('isBotWalled: tripadvisor.fr → true', () => {
  assert.ok(isBotWalled('https://www.tripadvisor.fr/Restaurant_Review'));
});

test('isBotWalled: maps.google.com → true', () => {
  assert.ok(isBotWalled('https://maps.google.com/maps?q=test'));
});

test('isBotWalled: goo.gl → true', () => {
  assert.ok(isBotWalled('https://goo.gl/maps/abc'));
});

test('isBotWalled: example.org → false', () => {
  assert.ok(!isBotWalled('https://example.org'));
});

test('collectUrls: extrait official + extraLinks', () => {
  const pois = [
    {
      id: 'poi-a',
      links: { official: 'https://example.org', booking: null, tripadvisor: null, maps: null },
      extraLinks: [{ label: 'AllTrails', url: 'https://alltrails.com/test' }],
    },
  ];
  const urls = collectUrls(pois);
  assert.equal(urls.length, 2);
  assert.ok(urls.some((u) => u.url === 'https://example.org'));
  assert.ok(urls.some((u) => u.url === 'https://alltrails.com/test'));
});
