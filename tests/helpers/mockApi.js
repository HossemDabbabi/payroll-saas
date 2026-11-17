// @ts-check
// Helpers shared by the negative E2E tests. The API is mocked with
// page.route so these tests need neither the backend nor MongoDB
// and can run in CI without secrets.

export const fakeUser = {
  id: 'u1',
  email: 'qa@example.test',
  companyName: 'QA Company',
  role: 'user',
  subscription: { plan: 'business', employeeLimit: 30 },
  trialInfo: { isExpired: false, daysRemaining: 7 },
};

/** Make the app believe a user is signed in (token + /auth/me). */
export async function signInWithMock(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('payroll_token', 'fake-token');
    localStorage.setItem('payroll_user', JSON.stringify(user));
  }, fakeUser);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: fakeUser }) })
  );
}

/** Answer any API call with a JSON status/body. */
export function mockJson(page, urlGlob, status, body, method) {
  return page.route(urlGlob, (route) => {
    if (method && route.request().method() !== method) return route.fallback();
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
