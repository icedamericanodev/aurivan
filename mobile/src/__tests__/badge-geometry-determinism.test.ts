/** Symmetric RDP candidates must not depend on platform floating-point noise. */
import { execFileSync } from 'child_process';
import { join } from 'path';
import { pathToFileURL } from 'url';

function simplifyWithPerturbation(delta: number): { x: number; y: number }[] {
  const moduleUrl = pathToFileURL(join(__dirname, '../../scripts/badge-art/geometry.mjs')).href;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { simplify } from ${JSON.stringify(moduleUrl)};
    const points = [
      { x: 0, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 1 + ${delta} },
      { x: 6, y: 0 }, { x: 6, y: -4 }, { x: 0, y: -4 },
    ];
    console.log(JSON.stringify(simplify(points, 0.8)));
  `], { encoding: 'utf8' }));
}

it('keeps the first equally distant vertex despite platform-scale roundoff', () => {
  const exact = simplifyWithPerturbation(0);
  expect(exact).toContainEqual({ x: 2, y: 1 });
  expect(exact).not.toContainEqual({ x: 4, y: 1 });
  for (const delta of [-1e-12, -1e-13, 1e-13, 1e-12]) {
    expect(simplifyWithPerturbation(delta)).toEqual(exact);
  }
});

it('still chooses a genuinely farther vertex rather than treating it as a tie', () => {
  const points = simplifyWithPerturbation(1e-4);
  expect(points).toContainEqual({ x: 4, y: 1 + 1e-4 });
  expect(points).not.toContainEqual({ x: 2, y: 1 });
});
