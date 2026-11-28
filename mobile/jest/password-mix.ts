/**
 * The four types the owner's rule requires (28 Nov 2026, evening), added to a
 * good passphrase the way a learner adds them: a capital at the start, and a
 * number and a symbol at the end when they are missing (" 7!"). Used to turn
 * the earlier good fixtures (written for 15+ characters, no required types)
 * into passwords that meet the rule. Not a test file.
 */
export function withAllTypes(p: string): string {
  let out = p;
  if (!/[A-Z]/.test(out)) {
    const i = out.search(/[a-z]/);
    out = i >= 0 ? out.slice(0, i) + out[i].toUpperCase() + out.slice(i + 1) : `${out} Ok`;
  }
  if (!/[a-z]/.test(out)) out = `${out} ok`;
  let tail = '';
  if (!/[0-9]/.test(out)) tail += '7';
  if (!/[!-/:-@[-`{-~]/.test(out)) tail += '!';
  return tail ? `${out} ${tail}` : out;
}
