/**
 * Test helper for the practice answer screen's ⋯ "More on this question"
 * sheet (mobile 1.49, components/quiz.tsx AnswerMore): open it, tap the row
 * whose spoken label starts with `rowStart`, and run the row's action at once
 * (on a phone it waits for the sheet to fade away first).
 */
import { act, type ReactTestInstance } from 'react-test-renderer';
import { flushSheetWaitsForTest } from '../src/lib/sheetWait';

const pressable = (root: ReactTestInstance, test: (label: string) => boolean): ReactTestInstance | undefined =>
  root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function')[0];

/** The ⋯ button, or undefined (a mock has none). */
export const moreButton = (root: ReactTestInstance) => pressable(root, (l) => l === 'More on this question');

/** The spoken labels of the ⋯ sheet's rows, in order (opens the sheet, then closes it again). */
export function moreRowLabels(root: ReactTestInstance): string[] {
  const btn = moreButton(root);
  if (!btn) throw new Error('no ⋯ "More on this question" button');
  act(() => {
    btn.props.onPress();
  });
  const sheet = root.findAll((n) => n.props.title === 'More on this question' && typeof n.props.onClose === 'function')[0];
  const labels = sheet
    .findAll((n) => typeof n.props.accessibilityLabel === 'string' && typeof n.props.onPress === 'function' && typeof n.type !== 'string')
    .map((n) => n.props.accessibilityLabel as string)
    .filter((l, i, all) => all.indexOf(l) === i && !l.startsWith('Close'));
  act(() => {
    sheet.props.onClose();
  });
  return labels;
}

/** Open ⋯, tap the row starting `rowStart`, and run its action now. */
export function viaMore(root: ReactTestInstance, rowStart: string): void {
  const btn = moreButton(root);
  if (!btn) throw new Error('no ⋯ "More on this question" button');
  act(() => {
    btn.props.onPress();
  });
  const row = pressable(root, (l) => l.startsWith(rowStart));
  if (!row) throw new Error(`no ⋯ row starting "${rowStart}"`);
  act(() => {
    row.props.onPress();
  });
  act(() => {
    flushSheetWaitsForTest();
  });
}
