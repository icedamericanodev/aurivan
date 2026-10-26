/**
 * Mobile 1.43: an idea scene's body split into a lead, a few parallel items and a closing line, so
 * the items can be drawn as a figure (components/lesson.tsx). Pure: exported for the content test,
 * which checks that `ideaListText(list)` is exactly the scene's original body (same words, only split).
 */
import type { IdeaList } from './types';

/** The item as it reads in the sentence ("authority to access people and records"). */
export const itemText = (item: string) => item.replace('|', '');

/** What the figure shows: the label (capitalised) and the rest of the words under it. */
export function itemParts(item: string): { label: string; note?: string } {
  const at = item.indexOf('|');
  const label = at < 0 ? item : item.slice(0, at);
  const note = at < 0 ? undefined : item.slice(at + 1).replace(/^[,;:]?\s*/, '');
  return { label: label.charAt(0).toUpperCase() + label.slice(1), ...(note ? { note } : {}) };
}

/**
 * The lead as shown above the figure. One that already ends in a colon ("The rules:") stays as it is;
 * one that runs on into the list ("It sets out the function’s") gets an ellipsis, so the reader carries
 * on into the items without a word being changed.
 */
export const leadText = (list: IdeaList) => (/:$/.test(list.lead) ? list.lead : `${list.lead}…`);

/** The body these parts make, word for word: "lead a, b, and c. close". */
export function ideaListText(list: IdeaList): string {
  const xs = list.items.map(itemText);
  const joined = xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')}${list.plainAnd ? ' and ' : ', and '}${xs[xs.length - 1]}`;
  return `${list.lead} ${joined}.${list.close ? ` ${list.close}` : ''}`;
}

/** The figure, said once: "A list of 4: Purpose; Responsibility; Authority, to access people and records; …". */
export function ideaListSpoken(list: IdeaList): string {
  const parts = list.items.map((it) => {
    const p = itemParts(it);
    return p.note ? `${p.label}, ${p.note}` : p.label;
  });
  return `A list of ${parts.length}: ${parts.join('; ')}.`;
}
