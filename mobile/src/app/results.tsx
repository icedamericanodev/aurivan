/**
 * Build D: a timed mock shows a Pacing panel (components/pace.tsx) under
 * the stats; an untimed one is labelled and says pacing stats skip it.
 *
 * Results — score rings per domain (Grove v2 growth rings in domain tones,
 * replacing the old ring and bars), the stat row, and a question-by-question
 * review (your answer vs the best answer). "Practice what I missed"
 * turns mistakes straight into a new session.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { OptionCard } from '../components/quiz';
import { DomainRings } from '../components/journey';
import { PacingPanel } from '../components/pace';
import { BigNum, Button, Enter, Gap, Row, Screen, Section, Stat, StatRow, T, Tag } from '../components/ui';
import { getCertification } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { displayToOriginal, originalToDisplay, renderText } from '../engine/shuffle';
import { TIMING_LABEL } from '../engine/pace';
import { scoreSession, sessionPacing } from '../lib/finishSession';
import { trapTip } from '../engine/games/trapSpotter';
import { startFromIds } from '../lib/sessions';
import { useSession } from '../store/session';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Results() {
  const { c } = useTheme();
  const active = useSession((s) => s.active);
  const clear = useSession((s) => s.clear);
  const [openId, setOpenId] = useState<string | null>(null);
  const score = useMemo(() => (active ? scoreSession(active) : null), [active]);
  // Mock pacing: time used, median, checks, unanswered, last 10%, slowest domain.
  const pacing = useMemo(() => (active?.mode === 'mock' && active.deadline ? sessionPacing(active) : null), [active]);

  if (!active || !score) {
    return (
      <Screen>
        <T v="hero">No results to show.</T>
        <Gap />
        <Button label="Back to Today" onPress={() => router.replace('/home')} />
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

  const values = cert.domains.map((d) => {
    const b = score.byDomain[d.id];
    return b ? b.correct / b.total : null;
  });
  const minutes = Math.max(1, Math.round(((active.finishedAt ?? active.startedAt) - active.startedAt) / 60_000));

  return (
    <Screen edges={['top', 'bottom']}>
      <Enter i={0}>
        {/* Extra time and untimed mocks say so (standard time is the norm, so it isn't named). */}
        <T v="meta">{active.mode === 'mock' && active.timing && active.timing !== 'standard' ? `${active.title} · ${TIMING_LABEL[active.timing].toLowerCase()}` : active.title}</T>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>
          {pct >= 75 ? 'Strong work.' : pct >= 60 ? 'Getting there.' : 'Every miss is a lesson.'}
        </T>
      </Enter>

      {/* Score rings in domain tones (spec §10.1, Results 200): arc = this session's score per domain. */}
      <Enter i={1} style={{ marginTop: space.xl }}>
        <DomainRings
          cert={cert}
          values={values}
          legendValue={(i) => {
            const b = score.byDomain[cert.domains[i].id];
            return b ? `${b.correct}/${b.total}` : '–';
          }}
          accessibilityLabel={`Score ${pct} percent. ${cert.domains
            .map((d) => (score.byDomain[d.id] ? `${d.short} ${score.byDomain[d.id].correct} of ${score.byDomain[d.id].total}` : null))
            .filter(Boolean)
            .join(', ')}.`}
          center={
            <View style={{ alignItems: 'center' }}>
              <BigNum value={String(pct)} pct size={30} />
              <T v="caption" color={c.ink2}>score</T>
            </View>
          }
        />
        <T v="meta" style={{ marginTop: 14 }}>Each ring is a domain in this session. Thicker rings weigh more on the exam.</T>
      </Enter>

      <Enter i={2} style={{ marginTop: space.xl }}>
        <StatRow>
          {[
            <Stat key="a" value={`${score.correct}/${denominator}`} label="correct" />,
            <Stat key="b" value={String(missed.length)} label="to review" />,
            <Stat key="c" value={String(minutes)} label="minutes" />,
          ]}
        </StatRow>
        {active.mode === 'mock' && (
          <T v="meta" style={{ marginTop: space.md }}>
            Practice scores are not scaled exam scores. {cert.exam.passingNote}
          </T>
        )}
        {active.mode === 'mock' && !active.deadline && (
          <T v="meta" style={{ marginTop: space.sm }}>Untimed mock: your answers count toward readiness, and pacing stats leave it out.</T>
        )}
        {pacing && (
          <View style={{ marginTop: space.md }}>
            <PacingPanel pacing={pacing} cert={cert} />
          </View>
        )}
        <Gap h={space.xl} />
        {missed.length > 0 && (
          <>
            <Button label={`Practice the ${missed.length} I missed`} onPress={practiseMissed} />
            <Gap h={space.sm} />
          </>
        )}
        <Button kind="secondary" label="Done" onPress={done} />
      </Enter>

      <Section title="Review answers" />
      {active.questionIds.map((id, i) => {
        const q = findQuestion(active.certId, id);
        const perm = active.perms[id];
        if (!q || !perm) return null;
        const r = active.responses[id];
        const status = !r ? '○ Skipped' : r.correct ? '✓ Correct' : '✗ Missed';
        // Answered after Coach me: a small mark, since it counts half toward readiness.
        const assisted = Boolean(r?.assisted);
        const color = !r ? c.muted : r.correct ? c.correct : c.wrong;
        const open = openId === id;
        const picked = r ? displayToOriginal(r.display, perm) : undefined;
        const correctDisplay = originalToDisplay(q.correct, perm);
        return (
          // A list row with a hairline below, not a card (spec §5).
          <View key={id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`Question ${i + 1}, ${status}${assisted ? ', assisted' : ''}. Tap to ${open ? 'collapse' : 'expand'}`}
              onPress={() => setOpenId(open ? null : id)}
              style={({ pressed }) => ({ paddingVertical: 13, minHeight: 64, opacity: pressed ? 0.7 : 1 })}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="label" num>{`Question ${i + 1}`}</T>
                <Row gap={space.sm} style={{ flexShrink: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {assisted && <Tag label="Assisted" />}
                  <T v="label" color={color}>{status}</T>
                </Row>
              </Row>
              <T v="body" style={{ marginTop: space.xs }}>{open ? q.stem : `${q.stem.slice(0, 110)}${q.stem.length > 110 ? '…' : ''}`}</T>
            </Pressable>
            {open && (
              <View style={{ paddingBottom: space.lg }}>
                {r && !r.correct && picked && (
                  <OptionCard
                    letter={r.display}
                    text={q.options[picked] ?? ''}
                    state="wrong"
                    tag={`Your answer · ${r.display}`}
                    note={q.wrongExplanations[picked] ? renderText(q.wrongExplanations[picked]!, perm) : undefined}
                  />
                )}
                <OptionCard letter={correctDisplay} text={q.options[q.correct] ?? ''} state="correct" tag={`Best answer · ${correctDisplay}`} />
                <T v="headline">{`Why ${correctDisplay}`}</T>
                <T v="body" style={{ marginBottom: space.sm }}>{renderText(q.explanation, perm)}</T>
                {trapTip(q) !== '' && (
                  <T v="small" color={c.ink2}>
                    {trapTip(q).startsWith('Final two:') ? '' : 'Trap: '}
                    {renderText(trapTip(q), perm)}
                  </T>
                )}
              </View>
            )}
          </View>
        );
      })}
    </Screen>
  );
}
