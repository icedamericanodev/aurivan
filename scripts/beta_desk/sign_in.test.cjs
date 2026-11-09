// Exercise the real CAPTCHA/email-submit code with no browser, network or inbox.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../assets/beta-desk.js'), 'utf8');
const start = source.indexOf('var captcha =');
const end = source.indexOf("$('codeForm').addEventListener", start);
assert.ok(start >= 0 && end > start, 'find the real email-submit implementation');

function setup({ loadFails = false, renderFails = false, allowed = false } = {}) {
  const elements = {};
  const calls = [];
  let error = '';
  let gate = 'email';
  let callbacks;
  let loads = 0;
  const $ = (id) => elements[id] || (elements[id] = {
    hidden: true,
    value: 'person@example.invalid',
    addEventListener(event, listener) { this[event] = listener; },
  });
  const turnstile = {
    render(_selector, options) {
      if (renderFails) throw new Error('widget unavailable');
      callbacks = options;
      return 'test-widget';
    },
    reset() {},
  };
  const context = {
    $, window: {},
    document: {
      createElement: () => ({}),
      head: {
        appendChild(script) {
          loads++;
          if (loadFails) script.onerror(new Error('offline'));
          else { context.window.turnstile = turnstile; script.onload(); }
        },
      },
    },
    TURNSTILE_SITE_KEY: 'public-test-site-key',
    BD: { validEmail: (email) => email.includes('@') },
    setGateError: (message) => { error = message; },
    Auth: {
      async sendCode(email, token) {
        calls.push({ email, token });
        if (!allowed) throw Object.assign(new Error('This is not an admin account.'), { code: 'not_admin' });
      },
    },
    maskEmail: () => 'p***@example.invalid',
    showGate: (next) => { gate = next; },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return {
    context, elements, calls,
    get error() { return error; },
    get gate() { return gate; },
    get loads() { return loads; },
    submit: () => elements.emailForm.submit({ preventDefault() {} }),
    recover() { loadFails = false; renderFails = false; },
    allow() { allowed = true; },
    complete: (token = 'fresh-token') => callbacks.callback(token),
  };
}

for (const mode of ['loadFails', 'renderFails']) {
  test(`${mode}: explain failure and allow a later submit to retry`, async () => {
    const t = setup({ [mode]: true });
    await t.submit();
    assert.match(t.error, /could not load/i);
    assert.equal(t.context.captcha.needed, false);
    assert.equal(t.calls.length, 0, 'never request an email after a failed check');
    t.recover();
    await t.submit();
    assert.equal(t.context.captcha.needed, true);
    assert.equal(t.elements.captchaBox.hidden, false);
    if (mode === 'loadFails') assert.equal(t.loads, 2, 'retry loads the failed script');
    assert.equal(t.calls.length, 0);
    t.complete();
    await t.submit();
    assert.equal(t.calls.length, 1);
    assert.match(t.error, /not an admin account/);
  });
}

test('CAPTCHA precedes email; a rejected account can retry with an allowed account', async () => {
  const t = setup();
  await t.submit();
  await t.submit();
  assert.equal(t.calls.length, 0, 'no email call until the check completes');
  t.complete('first-token');
  await t.submit();
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].token, 'first-token');
  assert.equal(t.gate, 'email');
  assert.match(t.error, /not an admin account/);
  assert.equal(t.context.captcha.token, '', 'spent tokens are cleared');
  assert.equal(t.elements.sendCodeBtn.disabled, false);
  await t.submit();
  assert.equal(t.calls.length, 1, 'a spent token cannot be reused');
  t.allow();
  t.elements.emailInput.value = 'admin@example.invalid';
  t.complete('second-token');
  await t.submit();
  assert.equal(t.calls.length, 2);
  assert.equal(t.calls[1].email, 'admin@example.invalid');
  assert.equal(t.calls[1].token, 'second-token');
  assert.equal(t.gate, 'code');
  assert.equal(t.context.captcha.token, '');
  assert.equal(t.elements.sendCodeBtn.disabled, false);
});
