/**
 * "Report an issue" — the trust loop. A learner who spots a wrong key or a
 * confusing explanation can report it in two taps; the report carries the
 * question id so it can be fixed fast (target: triage ≤72h, fix ≤7 days).
 */
import { Alert, Linking } from 'react-native';
import { config } from './config';

export async function reportIssue(questionId: string, certName: string) {
  const subject = `Aurivan ${certName} issue: ${questionId}`;
  const body = `Question: ${questionId}\n\nWhat looks wrong?\n\n`;
  if (config.feedbackEmail) {
    const url = `mailto:${config.feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // fall through to the in-app note
    }
  }
  Alert.alert(
    'Thanks for flagging this',
    `Please include the question code ${questionId} when you contact us. Every report is reviewed, and fixes are listed in What’s New.`,
  );
}
