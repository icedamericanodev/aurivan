/**
 * The guidelines gate (spec §4.3 "Guidelines gate", version 2026-11),
 * aurivan://board/guidelines. Shown before the first post, comment or vote,
 * and again whenever the guidelines version changes (Apple 1.2 and Google
 * Play UGC: an unskippable, version-stamped consent before posting).
 *
 * - "Before you post": the rules, zero tolerance, "No real exam questions.
 *   Ever.", "We review reports within 24 hours.", the not-affiliated line
 *   (the exam's own notice), and the full guidelines page when this build
 *   has its address.
 * - "Choose how you appear": a pseudonym by default (Quiet Cedar 214, "New
 *   name" for another) or a name the learner types (checked on the phone,
 *   and again by the server). "Your email address is never shown."
 * - The box "I agree to the community guidelines" (unticked), then "I
 *   agree, continue", or "Not now". Nothing is sent before the tap.
 * - Opened from the board's foot or the composer's link while already
 *   agreed: the rules to read, and "Done". From "Posting as … · Change":
 *   the name choice, with the box.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { communityUrl, openCommunityPage } from '../../../components/board';
import { Button, CheckRow, PushedHeader, RadioRow, Screen, Section, T, TextField } from '../../../components/ui';
import { getCertification } from '../../../content/certifications';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { checkHandle } from '../../../engine/moderation';
import { moveFocus } from '../../../lib/a11y';
import { handleProblem, joinBoard, needsGate, openBoard, suggestPseudonym, useBoard } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { useSettings } from '../../../store/settings';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

const RULES: AccountCopyKey[] = [
  'board.gate.rule.kind',
  'board.gate.rule.exam',
  'board.gate.rule.ours',
  'board.gate.rule.copyright',
  'board.gate.rule.private',
  'board.gate.rule.spam',
  'board.gate.rule.topic',
];

export default function Guidelines() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ then?: string; name?: string }>();
  const then = params.then === 'compose' ? 'compose' : params.then === 'back' ? 'back' : null;
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? getCertification('cisa')!;
  const signedIn = useAccount((s) => s.signedIn);
  const me = useBoard((s) => s.me);
  const settings = useBoard((s) => s.settings);
  const [pseudonym, setPseudonym] = useState(() => (me?.handleKind === 'pseudonym' ? me.handle : suggestPseudonym()));
  const [choice, setChoice] = useState<'pseudonym' | 'chosen'>(me?.handleKind === 'chosen' ? 'chosen' : 'pseudonym');
  const [chosen, setChosen] = useState(me?.handleKind === 'chosen' ? me.handle : '');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  useEffect(() => {
    moveFocus(titleRef, 350);
    if (!settings) void openBoard(signedIn);
  }, [settings, signedIn]);

  // Agreeing is needed (or a new name was asked for); otherwise this is the rules to read.
  const agreeMode = signedIn && (needsGate(me, settings) || params.name === '1');
  const updated = !!me && !!settings && me.guidelinesVersion !== settings.guidelinesVersion;
  const handle = choice === 'pseudonym' ? pseudonym : chosen.trim();
  const local = choice === 'chosen' && chosen.trim() ? checkHandle(chosen.trim()) : null;
  const ready = agreed && !busy && !!handle && local === null;

  const go = async () => {
    if (!ready) return;
    setBusy(true);
    setProblem(null);
    const r = await joinBoard(handle, choice);
    setBusy(false);
    if (!r.ok) return setProblem(handleProblem(r.code, r.detail));
    if (then === 'compose') router.replace('/board/new');
    else back();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={back} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('board.gate.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('board.gate.title')}</T>
      </View>
      {updated && <AccountNotice text={copy('board.gate.updated')} />}
      <T v="body" style={{ marginTop: space.md }}>{copy('board.gate.intro')}</T>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {RULES.map((k) => (
          <View key={k} style={{ flexDirection: 'row', gap: space.sm }}>
            <T v="body" color={c.accentText}>•</T>
            <T v="body" style={{ flex: 1 }}>{copy(k)}</T>
          </View>
        ))}
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy('board.gate.review')}</T>
      <T v="meta" style={{ marginTop: space.md }}>{cert.trademarkNotice}</T>
      {communityUrl() ? (
        <Button kind="ghost" label={copy('board.gate.full')} accessibilityHint={copy('hint.browser')} onPress={openCommunityPage} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      ) : null}

      {agreeMode ? (
        <>
          <Section title={copy('board.gate.appear')} />
          <RadioRow title={copy('board.gate.pseudonym', { handle: pseudonym })} checked={choice === 'pseudonym'} onPress={() => setChoice('pseudonym')} />
          <Button
            kind="ghost"
            label={copy('board.gate.newName')}
            onPress={() => {
              setPseudonym((p) => suggestPseudonym(p));
              setChoice('pseudonym');
            }}
            style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
          />
          <RadioRow title={copy('board.gate.chosen')} checked={choice === 'chosen'} onPress={() => setChoice('chosen')} last />
          {choice === 'chosen' && (
            <View style={{ marginTop: space.sm }}>
              <TextField
                label={copy('board.gate.chosen.field')}
                value={chosen}
                onChangeText={setChosen}
                maxLength={24}
                autoCapitalize="words"
                problem={local ? handleProblem('invalid', `handle_${local}`) : null}
              />
            </View>
          )}
          <T v="meta" style={{ marginTop: space.sm }}>{copy('board.gate.email')}</T>
          <View style={{ marginTop: space.md }}>
            <CheckRow label={copy('board.gate.agree')} checked={agreed} onPress={() => setAgreed((v) => !v)} last />
          </View>
          <Button label={busy ? copy('board.gate.busy') : copy('board.gate.go')} disabled={!ready} onPress={() => void go()} style={{ marginTop: space.lg }} />
          {problem && <AccountNotice text={problem} />}
          <Button kind="ghost" label={copy('board.gate.later')} onPress={back} disabled={busy} style={{ alignSelf: 'center', marginTop: space.sm }} />
        </>
      ) : (
        <Button kind="secondary" label={copy('board.held.done')} onPress={back} style={{ marginTop: space.xl }} />
      )}
    </Screen>
  );
}
