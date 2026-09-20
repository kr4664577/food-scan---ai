import assert from 'node:assert/strict';

// Isolated browser/API fixtures; no accounts are created and no network is used.
const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};
Object.assign(globalThis, { localStorage, window: { localStorage, location: { protocol: 'https:', hostname: 'foodscan.test' } } });
const profile = { id: 'isolated-user', email: '', fullName: 'Test fixture', allergies: [] };
storage.set('foodscan_auth_token', 'isolated-session-token');
storage.set('foodscan_user', JSON.stringify(profile));
const { apiClient } = await import('../src/api/client');
const { useAppStore: store } = await import('../src/store/useAppStore');
const response = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as any });
assert.equal(store.getState().authStatus, 'restoring');
apiClient.get = (async () => response({ success: true, data: profile })) as any;
await store.getState().restoreSession();
assert.equal(store.getState().currentScreen, 'DASHBOARD');
assert.equal(store.getState().user?.id, profile.id);
assert.equal(store.getState().authStatus, 'ready');
assert.equal(apiClient.defaults.headers.common.Authorization, 'Bearer isolated-session-token');

for (const status of [undefined, 404, 429, 500]) {
  apiClient.get = (async () => { throw { response: status ? { status } : undefined }; }) as any;
  await store.getState().restoreSession();
  assert.equal(store.getState().authStatus, 'unavailable');
  assert.equal(storage.get('foodscan_auth_token'), 'isolated-session-token');
}

apiClient.get = (async () => { throw { response: { status: 401 } }; }) as any;
await store.getState().restoreSession();
assert.equal(store.getState().currentScreen, 'AUTH');
assert.equal(store.getState().token, null);
assert.equal(storage.has('foodscan_auth_token'), false);

store.getState().setUser(profile, 'replacement-session');
let finish: (value: any) => void;
apiClient.get = (() => new Promise(resolve => { finish = resolve; })) as any;
const pending = store.getState().restoreSession();
store.getState().logout();
finish!(response({ success: true, data: profile }));
await pending;
assert.equal(store.getState().user, null, 'A late session response cannot undo logout');
assert.deepEqual(store.getState().history, []);
assert.equal(store.getState().activeMealReport, null);
assert.equal(apiClient.defaults.headers.common.Authorization, undefined);
console.log('Session regression tests passed: restoration, transient failure, unauthorized, logout, stale response.');
