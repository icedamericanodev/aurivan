/**
 * Results — score, per-domain breakdown, and a question-by-question
 * review (your answer vs the best answer). "Practise what I missed"
 * turns mistakes straight into a new session.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, DomainDot, Gap, ProgressBar, Row, Screen, Stat, T } from '../components/ui';
import { domainColor, getCertification } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { displayToOriginal, originalToDisplay, renderText } from '../engine/shuffle';
import { scoreSession } from '../lib/finishSession';
import { trapTip } from '../engine/games/trapSpotter';
import { startFromIds } from '../lib/sessions';
import { useSession } from '../store/session';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Results() {
  const { c, isDark } = useTheme();
  const active = useSession((s) => s.active);
  const clear = useSession((s) => s.clear);
  const [openId, setOpenId] = useState<string | null>(null);
  const score = useMemo(() => (active ? scoreSession(active) : null), [active]);

  if (!active || !score) {
    return (
      <Screen>
        <T v="title">No results to show.</T>
        <Gap />
        <Button label="Back to Home" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  const cert = getCertification(active.certId)!;
  const denominator = active.mode === 'mock' ? score.total : Math.max(score.answered, 1);
  const pct = Math.round((score.correct / denominator) * 100);
  const missed = active.questionIds.filter((id) => active.responses[id] && !active.responses[id].correct);
  const done = () => {
    clear();
    router.replace('/home');
  };

  const practiseMissed = () => {
    const ids = [...missed];
    clear();
    if (startFromIds(cert.id, ids, 'Missed questions')) router.replace('/session');
    else router.replace('/home');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <T v="eyebrow">{active.title}</T>
      <Gap h={space.sm} />
      <T v="display">{pct >= 75 ? 'Strong work.' : pct >= 60 ? 'Getting there.' : 'Every miss is a lesson.'}</T>
      <Gap />
      <Card>
        <Row>
          <Stat value={`${pct}%`} label="score" color={pct >= 75 ? c.correct : pct >= 60 ? c.warning : c.wrong} />
          <Stat value={`${score.correct}/${denominator}`} label="correct" />
          <Stat value={String(missed.length)} label="to review" />
        </Row>
        {active.mode === 'mock' && (
          <>
            <Gap h={space.md} />
            <T v="meta" center>
              Practice scores are not scaled exam scores. {cert.exam.passingNote}
            </T>
          </>
        )}
      </Card>
      <Gap />

      <T v="title">By domain</T>
      <Gap h={space.sm} />
      {cert.domains
        .filter((d) => score.byDomain[d.id])
        .map((d) => {
          const b = score.byDomain[d.id];
          return (
            <View key={d.id} style={{ marginBottom: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={space.sm}>
                  <DomainDot domain={d} />
                  <T v="meta">{d.short}</T>
                </Row>
                <T v="meta" num>{`${b.correct}/${b.total}`}</T>
              </Row>
              <Gap h={space.xs} />
              <ProgressBar value={b.correct / b.total} color={domainColor(d.tone, isDark)} height={6} />
            </View>
          );
        })}

      {missed.length > 0 && (
        <>
          <Gap h={space.sm} />
          <Button label={`Practise the ${missed.length} I missed`} onPress={practiseMissed} />
        </>
      )}
      <Gap h={space.sm} />
      <Button kind="secondary" label="Done" onPress={done} />
      <Gap />

      <T v="title">Review answers</T>
      <Gap h={space.sm} />
      {active.questionIds.map((id, i) => {
        const q = findQuestion(active.certId, id);
        const perm = active.perms[id];
        if (!q || !perm) return null;
        const r = active.responses[id];
        const status = !r ? '○ Skipped' : r.correct ? '✓ Correct' : '✗ Missed';
        const color = !r ? c.muted : r.correct ? c.correct : c.wrong;
        const open = openId === id;
        const picked = r ? displayToOriginal(r.display, perm) : undefined;
        return (
          <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Question ${i + 1}, ${status}. Tap to ${open ? 'collapse' : 'expand'}`} onPress={() => setOpenId(open ? null : id)}>
            <Card style={{ marginBottom: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="label" num>{`Q${i + 1}`}</T>
                <T v="label" color={color}>{status}</T>
              </Row>
              <T v="body" style={{ marginTop: space.xs }}>{open ? q.stem : `${q.stem.slice(0, 110)}${q.stem.length > 110 ? '…' : ''}`}</T>
              {open && (
                <>
                  <Gap h={space.sm} />
                  {r && !r.correct && picked && (
                    <T color={c.wrong}>Your answer ({r.display}): {q.options[picked]}</T>
                  )}
                  <T color={c.correct}>Best answer ({originalToDisplay(q.correct, perm)}): {q.options[q.correct]}</T>
                  <Gap h={space.sm} />
                  <T v="body" color={c.text2}>{renderText(q.explanation, perm)}</T>
                  {trapTip(q) !== '' && (
                    <>
                      <Gap h={space.sm} />
                      <T v="meta">
                        {trapTip(q).startsWith('Final two:') ? '' : 'Trap: '}
                        {renderText(trapTip(q), perm)}
                      </T>
                    </>
                  )}
                </>
              )}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
