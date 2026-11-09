import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { LabChoice, LabOutcomes, LabRange, LabTimeline } from '../../components/conceptLab';
import { CardHead, CardDivider, PageTitle } from '../../components/groveHub';
import { TopicCard } from '../../components/topicCard';
import { Button, PushedHeader, Screen, T } from '../../components/ui';
import { findLab, type ConceptLab } from '../../content/labs';
import { findLesson } from '../../content/lessons';
import { findQuestion } from '../../content/loader';
import { findNote } from '../../content/notes';
import { evaluateRecovery, formatClock, initialRecoveryState } from '../../engine/conceptLab';
import { useActiveCertId } from '../../lib/activeCert';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { safeDecode, openSessionFromStack } from '../../lib/actions';
import { moveFocus, sayLater } from '../../lib/a11y';
import { space } from '../../theme/tokens';

const stages = ['Explore', 'Experiment', 'Apply'] as const;
export default function LabDetail() {
  const certId = useActiveCertId();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lab = findLab(certId, typeof id === 'string' ? safeDecode(id) : undefined);
  if (!lab) return <EmptyScreen header="Concept Lab" fallback="/learn" title="Lab not found" body="This lab may not be available for your selected exam." primary={{ label: 'Browse labs', onPress: () => router.replace('/labs') }} />;
  return <RecoveryLab key={`${certId}:${lab.id}`} lab={lab} />;
}
function RecoveryLab({ lab }: { lab: ConceptLab }) {
  const [stage, setStage] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<View>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (stage > 0) return moveFocus(heading);
  }, [stage]);
  const [values, setValues] = useState(() => initialRecoveryState(lab.config));
  const [prediction, setPrediction] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const [precise, setPrecise] = useState(false);
  const [checked, setChecked] = useState(false);
  const challengeResult = evaluateRecovery(lab.challenge.recovery, lab.challenge.gap, lab.config);
  const result = evaluateRecovery(values.recovery, values.gap, lab.config);
  const lesson = findLesson(lab.lessonId);
  const note = findNote(lab.certId, lab.noteId);
  const practiceIds = (lab.questionIds ?? []).filter(id => findQuestion(lab.certId, id));
  const reset = () => {
    setValues(initialRecoveryState(lab.config)); setPrediction(null); setReveal(false);
    sayLater(`Scenario reset. ${evaluateRecovery(lab.config.initialRecovery, lab.config.initialGap, lab.config).summary}`);
  };
  const move = (n: number) => { setStage(n); };
  return <Screen scrollRef={scroll} edges={['top', 'bottom']} header={<PushedHeader title="Concept Lab" onBack={() => router.canGoBack() ? router.back() : router.replace('/labs')} />}>
    <T v="meta">Domain {lab.domainId} · Recovery objectives · {lab.minutes} min</T>
    <PageTitle title={lab.title} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.lg }}>
      {stages.map((s, i) => <Button key={s} kind="ghost" selected={stage === i} label={`${i + 1}. ${s}`} onPress={() => move(i)} />)}
    </View>
    <TopicCard testID="lab-topic-card">
      <View style={{ gap: space.lg }}>
        <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={`Part ${stage + 1} of 3. ${stages[stage]}`}><T v="title">{`Part ${stage + 1} · ${stages[stage]}`}</T></View>
        {stage === 0 && <>
          <T v="body">{lab.explore.rto}</T>
          <T v="body">{lab.explore.rpo}</T>
        </>}
        {stage === 0 && <>
          <View style={{ gap: space.md }}>
            <CardDivider />
            <CardHead title="A retailer goes offline" meta={`Outage · ${formatClock(lab.config.outageMinutes)}`} />
            <T v="body">{`Business-approved objectives: RTO ${lab.config.rto} minutes; RPO ${lab.config.rpo} minutes. Service must return by ${formatClock(lab.config.outageMinutes + lab.config.rto)}, with usable data from ${formatClock(lab.config.outageMinutes - lab.config.rpo)} or later.`}</T>
            {stage === 0 && <LabTimeline recovery={values.recovery} gap={values.gap} {...lab.config} />}
            <T v="meta">{`Restoration: ${result.restorationTime}. Latest usable data: ${result.recoveryPointTime}.`}</T>
          </View>
          <View style={{ gap: space.md }}>
            <CardDivider />
            <CardHead title="Recovery result" />
            <View testID="lab-result">
              <T v="label">{`${result.rtoMet ? '✓ RTO met' : '! RTO missed'} · ${result.downtime} / ${lab.config.rto} min`}</T>
              <T v="label">{`${result.rpoMet ? '✓ RPO met' : '! RPO missed'} · ${result.dataGap} / ${lab.config.rpo} min`}</T>
            </View>
            <View accessible accessibilityLiveRegion="polite">
              <T v="label">{`${result.rtoMet ? 'RTO met' : 'RTO missed'}. ${result.rpoMet ? 'RPO met' : 'RPO missed'}.`}</T>
            </View>
            <T v="body">{result.summary}</T>
            <T v="meta">A successful backup job alone does not prove recovery. Validate that the restored service and recovered data are usable. Reconcile transaction records to determine any actual loss.</T>
          </View>
        </>}
        {stage === 1 && <>
          <View testID="lab-experiment" style={{ gap: space.lg }}>
            <CardHead title="Try the concept" />
            <LabRange meaning="Minutes from outage to restored service" label="Actual recovery time" value={values.recovery} max={lab.config.maxRecovery} target={`Target RTO: ${lab.config.rto} minutes`} precise={precise} onChange={recovery => setValues(v => ({ ...v, recovery }))} />
            <LabRange meaning="Minutes before the outage" label="Age of latest usable data" value={values.gap} max={lab.config.maxGap} target={`Target RPO: ${lab.config.rpo} minutes`} precise={precise} onChange={gap => setValues(v => ({ ...v, gap }))} />
            <LabOutcomes recovery={values.recovery} gap={values.gap} rto={lab.config.rto} rpo={lab.config.rpo} />
            <T v="meta">Change recovery results; business limits stay fixed. At or below a limit means met.</T>
            <T v="meta">The data gap is potential loss, not confirmed missing orders.</T>
            <Button kind="ghost" label={precise ? 'Hide precise controls' : 'Show precise controls'} expanded={precise} onPress={() => setPrecise(v => !v)} />
            <Button kind="ghost" label={details ? 'Hide timeline and explanation' : 'Show timeline and explanation'} expanded={details} onPress={() => setDetails(v => !v)} />
            {details && <View style={{ gap: space.md }}>
              <T v="body">{`Outage: ${formatClock(lab.config.outageMinutes)}. Service restored: ${result.restorationTime}. Latest usable data: ${result.recoveryPointTime}.`}</T>
              <LabTimeline recovery={values.recovery} gap={values.gap} {...lab.config} />
              <T v="body">{result.summary}</T>
              <T v="meta">{`Orders from the last ${values.gap} minutes before the outage may be missing. Check transaction records to find any actual loss. This model assumes usable recovery data and service restoration are verified; a successful backup job alone is insufficient.`}</T>
            </View>}
          </View>
          <Button kind="ghost" label="Reset scenario" onPress={reset} />
            <View style={{ gap: space.md }}>
              <CardDivider />
              <CardHead title="Try this situation" meta="Optional prediction" />
              <T v="body">{`Before revealing: service returns after ${lab.challenge.recovery} minutes and the usable data gap is ${lab.challenge.gap} minutes. Which objectives are met?`}</T>
              {lab.challenge.options.map((s, i) => <LabChoice key={s} text={s} selected={prediction === i} onPress={() => { setPrediction(i); setReveal(false); }} />)}
              <Button kind="secondary" label="Reveal outcome" disabled={prediction === null} onPress={() => { setReveal(true); sayLater(challengeResult.summary); }} />
              {reveal && <T v="body">{prediction === lab.challenge.correctIndex ? 'Correct. ' : 'Compare each limit separately. '}{challengeResult.summary} This prediction does not change your experiment.</T>}
            </View>
        </>}
        {stage === 2 && <>
          <T v="body">{lab.apply.scenario}</T>
          {lab.apply.options.map((option, i) => <LabChoice key={option.text} text={option.text} selected={answer === i} onPress={() => { setAnswer(i); setChecked(false); }} />)}
          <Button label="Check reasoning" disabled={answer === null} onPress={() => { setChecked(true); sayLater(answer === lab.apply.correctIndex ? 'Reasoning checked. Both recovery objectives need evidence.' : 'Review the reasoning below.'); }} />
          {checked && answer !== null && <View style={{ gap: space.md }}><CardDivider /><CardHead title={answer === lab.apply.correctIndex ? 'Evidence before assurance' : 'Look at both objectives'} /><T v="body">{lab.apply.options[answer].feedback}</T><T v="meta">This lab does not record a practice answer or mark a lesson complete. You can revisit any stage.</T></View>}
          <T v="title" accessibilityRole="header">Keep exploring</T>
          {lesson?.certId === lab.certId && <Button kind="secondary" label="Read the related lesson" onPress={() => router.push(`/lesson/${lab.lessonId}`)} />}
          {note && <Button kind="secondary" label="Open the recovery study note" accessibilityHint="Includes the existing Practice this concept action" onPress={() => router.push(`/notes/subtopic/${lab.noteId}`)} />}
          {practiceIds.length > 0 && <Button kind="secondary" label="Practice recovery concepts" accessibilityHint="Optional practice using existing questions. Answers count toward progress." onPress={() => guardedStart(() => startFromIds(lab.certId, practiceIds, 'Recovery objectives'), openSessionFromStack)} />}
          <T v="meta">Original KaiSip scenario. Reviewed {lab.lastReviewed}. Source references:</T>
          {lab.references.map(r => <T key={r.url} v="meta">{r.title}{'\n'}{r.section}{'\n'}{r.url}</T>)}
        </>}
        {stage < 2 && <Button label={stage === 0 ? 'Experiment with recovery' : 'Apply your judgment'} onPress={() => move(stage + 1)} />}
      </View>
    </TopicCard>
  </Screen>;
}
