/**
 * Support by email, the phone side (engine/support.ts writes the emails).
 *
 * How an email leaves the app (decided for mobile 1.7; support.md §2):
 * - We open the learner's OWN email app with `Linking.openURL('mailto:…')`,
 *   on iOS and Android. No new native module, so it can ship over the air.
 * - We never call `canOpenURL('mailto:')` first: without extra config it
 *   answers "no" on iOS (LSApplicationQueriesSchemes) and on Android 11+
 *   (<queries>), even when a mail app exists. We just try to open it.
 * - If it fails (no email app), the sheet shows the address and the whole
 *   message as selectable text, with the system Share sheet to paste it into
 *   any app. We never claim "sent": the mail app can't tell us.
 *
 * Nothing here talks to a server, and nothing is sent without the learner
 * pressing Send in their own email app.
 */
import Constants from 'expo-constants';
import { Linking, Platform, Share } from 'react-native';
import { getCertification } from '../content/certifications';
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { displayToOriginal, type Permutation } from '../engine/shuffle';
import { mailtoUrl, newRef, type AppInfo, type Email, type ReportTarget } from '../engine/support';
import { config } from './config';

/** "iOS 26", "Android 16" or "Web": the OS and its major version only. */
export function osLabel(os: string = Platform.OS, version: string | number = Platform.Version, release?: string): string {
  if (os === 'ios') return `iOS ${String(version).split('.')[0]}`;
  if (os === 'android') {
    // Android: the release ("16"), not the API level (36), which learners don't know.
    const rel = release ?? (Platform.OS === 'android' ? String((Platform.constants as { Release?: string }).Release ?? '') : '');
    return rel ? `Android ${rel.split('.')[0]}` : `Android API ${version}`;
  }
  return os === 'web' ? 'Web' : os;
}

/** The app version and OS for the email ("1.7.0", "iOS 26"). */
export function appInfo(): AppInfo {
  return { version: Constants.expoConfig?.version || 'unknown', os: osLabel() };
}

/** The certification's short name ("CISA") for subjects and the details block. */
export function certName(certId: string): string {
  return getCertification(certId)?.name ?? certId;
}

/** A fresh "R-7K2Q" for one report. */
export function makeRef(): string {
  return newRef(Math.random);
}

/**
 * Open the learner's email app with this message. Resolves 'opened' when
 * the phone accepted the link (we can't know if it was sent), or 'failed'
 * when no app could open it.
 */
export async function openEmail(email: Email, url = mailtoUrl(config.feedbackEmail, email)): Promise<'opened' | 'failed'> {
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'failed';
  }
}

/** The whole message as plain text, for the fallback's Share sheet and selectable box. */
export function emailAsText(email: Email, to = config.feedbackEmail): string {
  return `To: ${to}\nSubject: ${email.subject}\n\n${email.body}`;
}

/** The fallback: the system Share sheet with the whole message (paste it into any email app or webmail). */
export async function shareEmail(email: Email): Promise<void> {
  try {
    await Share.share({ message: emailAsText(email), title: email.subject });
  } catch {
    // Dismissed or unavailable: the text is still on screen to select.
  }
}

/**
 * A question as a report target. With `perm` (the letters were on screen),
 * the sheet can list the options as shown and the email names the
 * learner's pick by its ORIGINAL letter with the shown one in brackets.
 */
export function questionTarget(
  certId: string,
  q: PackQuestion,
  where: string,
  shown?: { perm: Permutation; pickedDisplay?: Letter },
  pickedOriginal?: Letter,
): ReportTarget {
  const domain = getCertification(certId)?.domains.find((d) => d.id === q.domainId);
  const perm = shown?.perm;
  return {
    kind: 'question',
    id: q.id,
    name: domain?.short,
    where,
    ...(perm
      ? {
          perm,
          pickedDisplay: shown.pickedDisplay,
          options: LETTERS.slice(0, perm.length).map((d) => ({ display: d, text: q.options[displayToOriginal(d, perm)] ?? '' })),
        }
      : {}),
    ...(pickedOriginal && !perm ? { pickedOriginal } : {}),
  };
}

/** What a Help deep link may open (aurivan://help?open=…); anything else opens nothing. */
export type HelpOpen = 'support' | 'feedback' | 'idea' | 'report';
export function helpOpenParam(v: unknown): HelpOpen | null {
  return v === 'support' || v === 'feedback' || v === 'idea' || v === 'report' ? v : null;
}

/**
 * Where a session question was reported from: "Practice · Quick 10",
 * "Mock review · Full mock". Nothing is said twice: a title that already
 * says it ("Practice · IS Audit") or that the place already names ("Review"
 * in Spaced review) isn't repeated.
 */
export function sessionWhere(place: 'Practice' | 'Spaced review' | 'Practice review' | 'Mock review', title: string): string {
  const t = title.trim();
  if (!t || place.toLowerCase().includes(t.toLowerCase())) return place;
  if (place === 'Practice' && /^practice\b/i.test(t)) return t;
  return `${place} · ${t}`;
}
