import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = 'e2e/.auth/admin.json';

setup('authenticate as superuser', async ({ request, page }) => {
  // Get CSRF first (cookies stored in request context)
  await request.get('http://127.0.0.1:8888/api/auth/csrf/');

  const resp = await request.post('http://127.0.0.1:8888/api/auth/login/', {
    data: {
      username: 'playwright@test.local',
      password: 'Playwright123!',
    },
  });
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body.token).toBeTruthy();

  // Prime localStorage on the app origin so the React app sees auth.
  await page.goto('http://127.0.0.1:3000/');
  await page.evaluate(
    ({ token, refresh, user }) => {
      localStorage.setItem('token', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
    },
    { token: body.token, refresh: body.refresh, user: body.user }
  );

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
