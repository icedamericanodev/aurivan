/** Small scenario-specific instruments. All state is temporary and stays outside learner progress. */
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { ExpansionLab } from '../content/labs/expansion';
import { findLesson } from '../content/lessons';
import { findNote } from '../content/notes';
import { findQuestion } from '../content/loader';
import { findPrinciple } from '../content/principles';
import {
  evaluateRoles, evaluateRisk, evaluateAuthority, evaluateWorkflow, evaluateDependencies,
  type RoleConfig, type RiskConfig, type AuthorityConfig, type WorkflowConfig, type DependencyConfig,
} from '../engine/conceptLabExpansion';
import { moveFocus, sayLater } from '../lib/a11y';
import { guardedStart, startFromIds } from '../lib/sessions';
import { openSessionFromStack } from '../lib/actions';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, PushedHeader, Screen, T } from './ui';
import { CardHead, CardDivider, PageTitle } from './groveHub';
import { TopicCard } from './topicCard';
import { LabChoice } from './conceptLab';

const stages = ['Explore', 'Experiment', 'Apply'] as const;
const stack = { gap: space.md };

export function ExpansionLabScreen({ lab }: { lab: ExpansionLab }) {
  const [stage, setStage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const heading = useRef<View>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (stage > 0) return moveFocus(heading);
  }, [stage]);
  const lesson = findLesson(lab.lessonId);
  const note = findNote(lab.certId, lab.noteId);
  const practice = (lab.questionIds ?? []).filter(id => findQuestion(lab.certId, id));
  const principles = (lab.principleIds ?? []).map(id => findPrinciple(lab.certId, id)).filter(p => p !== undefined);
  return <Screen scrollRef={scroll} edges={['top', 'bottom']} header={<PushedHeader title="Concept Lab" onBack={() => router.canGoBack() ? router.back() : router.replace('/labs')} />}>
    <T v="meta">{`Domain ${lab.domainId} · ${lab.minutes} min · Works offline`}</T>
    <PageTitle title={lab.title} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginVertical: space.lg }}>
      {stages.map((name, i) => <Button key={name} kind="ghost" label={`${i + 1}. ${name}`} selected={stage === i} onPress={() => setStage(i)} />)}
    </View>
    <TopicCard testID="lab-topic-card">
      <View style={{ gap: space.lg }}>
        <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={`Part ${stage + 1} of 3. ${stages[stage]}`}><T v="title">{`Part ${stage + 1} · ${stages[stage]}`}</T></View>
        {stage === 0 && <>
          <T v="body">{lab.objective}</T>
          {lab.explore.map(p => <T key={p} v="body">{p}</T>)}
          <Section title="Your workplace scenario"><T v="body">{lab.scenario}</T>{lab.interaction === 'authority-mapping' && <T v="label">Flawed draft assignments — correct these in Experiment</T>}<ModelPreview lab={lab} /></Section>
        </>}
        {/* Keep the experiment mounted across stages so a learner can compare their decisions. */}
        <View style={{ display: stage === 1 ? 'flex' : 'none', gap: space.lg }}>
          <Section title="Your challenge"><T v="body">{lab.challenge}</T></Section>
          <Experiment key={`${lab.id}:${attempt}`} lab={lab} />
          <Button kind="ghost" label="Reset scenario" onPress={() => { setAttempt(n => n + 1); sayLater('Scenario reset to its starting conditions.'); }} />
        </View>
        {stage === 2 && <>
          <T v="body">{lab.apply.scenario}</T>
          {lab.apply.options.map((option, i) => <LabChoice key={option.text} text={option.text} selected={answer === i} onPress={() => { setAnswer(i); setChecked(false); }} />)}
          <Button label="Check reasoning" disabled={answer === null} onPress={() => { setChecked(true); if (answer !== null) sayLater(lab.apply.options[answer].feedback); }} />
          {checked && answer !== null && <Section title={answer === lab.apply.correctIndex ? 'Reasoning supported' : 'Review the evidence'}>
            <T v="body">{lab.apply.options[answer].feedback}</T>
            <Button kind="ghost" label="Try the application again" onPress={() => { setAnswer(null); setChecked(false); }} />
          </Section>}
          <Section title="Takeaway"><T v="body">{lab.takeaway}</T><T v="meta">Lab exploration does not record a practice answer, change readiness or complete a lesson.</T></Section>
          <T v="title" accessibilityRole="header">Keep exploring</T>
          {lesson?.certId === lab.certId && <Button kind="secondary" label="Read the related lesson" onPress={() => router.push(`/lesson/${lab.lessonId}`)} />}
          {note && <Button kind="secondary" label="Open the related study note" onPress={() => router.push(`/notes/subtopic/${lab.noteId}`)} />}
          {principles.map(p => <Button key={p.id} kind="secondary" label={`Read principle: ${p.title}`} onPress={() => router.push(`/principles/${p.id}`)} />)}
          {practice.length > 0 && <Button kind="secondary" label="Practice this concept" accessibilityHint="Optional practice using existing questions. Answers count toward progress." onPress={() => guardedStart(() => startFromIds(lab.certId, practice, lab.title), openSessionFromStack)} />}
          {lab.interaction === 'dependency-simulation' && <Button kind="secondary" label="Explore RTO versus RPO" onPress={() => router.push('/labs/cisa-lab-rto-rpo')} />}
          <T v="meta">{`Original KaiSip scenario. Content review: ${lab.lastReviewed}. Source references:`}</T>
          {lab.references.map(r => <T key={r.url} v="meta">{`${r.title}\n${r.section}\n${r.url}`}</T>)}
        </>}
        {stage < 2 && <Button label={stage === 0 ? 'Try the experiment' : 'Apply your judgment'} onPress={() => setStage(stage + 1)} />}
      </View>
    </TopicCard>
  </Screen>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: space.md }}><CardDivider /><CardHead title={title} />{children}</View>;
}
function Feedback({ summary, findings }: { summary: string; findings: readonly string[] }) {
  return <Section title="What your decisions change">
    <View testID="expansion-outcome" accessibilityLiveRegion="polite" style={stack}><T v="label">{summary}</T>
      {findings.map((f, i) => <T key={`${i}:${f}`} v="body">{f}</T>)}
    </View>
  </Section>;
}
function NumberControl({ label, value, min = 0, max, step = 1, onChange, unit = '' }: { label: string; value: number; min?: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  return <View style={stack}>
    <T v="label">{`${label}: ${value}${unit ? ` ${unit}` : ''}`}</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Button kind="secondary" label={`− ${step}`} accessibilityLabel={`Decrease ${label}`} disabled={value <= min} onPress={() => { const next = Math.max(min, value - step); onChange(next); sayLater(`${label}: ${next} ${unit}`); }} style={{ flexGrow: 1 }} />
      <Button kind="secondary" label={`+ ${step}`} accessibilityLabel={`Increase ${label}`} disabled={value >= max} onPress={() => { const next = Math.min(max, value + step); onChange(next); sayLater(`${label}: ${next} ${unit}`); }} style={{ flexGrow: 1 }} />
    </View>
  </View>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Button kind="secondary" label={`${value ? '✓' : '○'} ${label}`} selected={value} onPress={() => onChange(!value)} />;
}
function Assignment({ label, choices, value, onChange }: { label: string; choices: readonly string[]; value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const control = useRef<View>(null);
  return <View style={stack}>
    <T v="label">{label}</T>
    <Button ref={control} kind="secondary" label={choices[value]} accessibilityLabel={`${label}: ${choices[value]}. Change assignment`} expanded={open} onPress={() => setOpen(v => !v)} />
    {open && choices.map((choice, i) => <LabChoice key={choice} text={choice} selected={value === i} onPress={() => { onChange(i); setOpen(false); moveFocus(control); }} />)}
  </View>;
}
function ModelPreview({ lab }: { lab: ExpansionLab }) {
  const { c } = useTheme();
  let rows: string[];
  switch (lab.interaction) {
    case 'role-permissions': rows = lab.config.duties.map((d, i) => `${d} → ${lab.config.people[lab.config.initialAssignments[i]]}`); break;
    case 'risk-allocation': rows = lab.config.areas.map(a => `${a.name} → ${a.hours} audit hours${a.mandatory ? ' · mandatory coverage' : ''}`); break;
    case 'authority-mapping': rows = lab.config.decisions.map((d, i) => `${d.label} → ${lab.config.roles[lab.config.initialAssignments[i]]}`); break;
    case 'control-workflow': rows = lab.config.initialOrder.map((id, i) => `${i + 1}. ${lab.config.steps[id]}`); break;
    case 'dependency-simulation': rows = lab.config.processes.map(p => `${p.dependencies.map(i => lab.config.systems[i].name).join(' + ')} → ${p.name}`); break;
  }
  return <View style={{ gap: space.sm }}>{rows.map(row => <View key={row} style={{ padding: space.md, backgroundColor: c.soft, borderRadius: 12 }}><T v="body">{row}</T></View>)}</View>;
}
function Experiment({ lab }: { lab: ExpansionLab }) {
  switch (lab.interaction) {
    case 'role-permissions': return <Roles config={lab.config} />;
    case 'risk-allocation': return <Risk config={lab.config} />;
    case 'authority-mapping': return <Authority config={lab.config} />;
    case 'control-workflow': return <Workflow config={lab.config} />;
    case 'dependency-simulation': return <Dependencies config={lab.config} />;
  }
}
function Roles({ config }: { config: RoleConfig }) {
  const [assignments, setAssignments] = useState(() => [...config.initialAssignments]);
  const [review, setReview] = useState(false);
  const result = evaluateRoles(assignments, review, config);
  return <View style={{ gap: space.lg }}>
    <Feedback {...result} />
    <Section title="Assign purchasing duties">
      {config.duties.map((d, i) => <Assignment key={d} label={d} choices={config.people} value={assignments[i]} onChange={value => setAssignments(a => a.map((old, j) => j === i ? value : old))} />)}
      <Toggle label="Add an independent detective review" value={review} onChange={setReview} />
      <T v="meta">The assigned transaction reviewer examines exception reports and supporting evidence. To be independent, that person must have no other purchasing duty. Detective review may reduce exposure; it does not prevent the transaction.</T>
    </Section>
  </View>;
}
function Risk({ config }: { config: RiskConfig }) {
  const [areas, setAreas] = useState(() => config.areas.map(a => ({ ...a })));
  const [selected, setSelected] = useState(() => config.areas.map(() => false));
  const [budget, setBudget] = useState(config.budget);
  const [editing, setEditing] = useState<number | null>(null);
  const result = evaluateRisk(areas, selected, budget);
  return <View style={{ gap: space.lg }}>
    <Feedback {...result} />
    <Section title="Your audit resources"><NumberControl label="Available audit hours" value={budget} max={200} step={10} unit="hours" onChange={setBudget} /><T v="meta">Educational scoring model: compare assumptions and mandatory coverage as well as scores. Selection proposes a plan; the charter-designated authority must approve the plan.</T><T v="label">{`${result.hours} / ${budget} hours allocated`}</T></Section>
    {areas.map((a, i) => <Section key={a.name} title={a.name}>
      <T v="label">{`Educational priority: ${result.scores[i]} · Cost: ${a.hours} hours`}</T>
      <Toggle label={`Include ${a.name}`} value={selected[i]} onChange={value => setSelected(s => s.map((old, j) => j === i ? value : old))} />
      <Button kind="ghost" label={`Adjust ${a.name} assumptions`} expanded={editing === i} onPress={() => setEditing(old => old === i ? null : i)} />
      {editing === i && (['impact', 'likelihood', 'control', 'incidents'] as const).map(key => <NumberControl key={key} label={`${a.name} ${key === 'control' ? 'control effectiveness' : key === 'incidents' ? 'prior incidents' : key === 'impact' ? 'business impact' : 'threat likelihood'}`} value={a[key]} min={key === 'incidents' || key === 'control' ? 0 : 1} max={key === 'control' ? 4 : 5} onChange={value => setAreas(old => old.map((area, j) => j === i ? { ...area, [key]: value } : area))} />)}
      <Toggle label={`Mandatory coverage for ${a.name}`} value={a.mandatory} onChange={value => setAreas(old => old.map((area, j) => j === i ? { ...area, mandatory: value } : area))} />
    </Section>)}
  </View>;
}
function Authority({ config }: { config: AuthorityConfig }) {
  const [assignments, setAssignments] = useState(() => [...config.initialAssignments]);
  const result = evaluateAuthority(assignments, config);
  return <View style={{ gap: space.lg }}><Feedback {...result} /><Section title="Map decision authority">
    <T v="meta">Use this fictional company’s stated governance structure. Other organizations may delegate authority differently.</T>
    {config.decisions.map((d, i) => <Assignment key={d.label} label={d.label} choices={config.roles} value={assignments[i]} onChange={value => setAssignments(a => a.map((old, j) => j === i ? value : old))} />)}
  </Section></View>;
}
function Workflow({ config }: { config: WorkflowConfig }) {
  const [order, setOrder] = useState(() => [...config.initialOrder]);
  const [emergency, setEmergency] = useState(false);
  const result = evaluateWorkflow(order, emergency, config);
  function move(index: number, delta: number) {
    setOrder(old => { const next = [...old]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  }
  return <View style={{ gap: space.lg }}>
    <Feedback {...result} />
    <Section title="Choose the change procedure"><Toggle label="Use the documented emergency procedure" value={emergency} onChange={setEmergency} /><T v="meta">Move steps with the buttons; dragging is not required. Emergency handling can defer selected normal steps, with appropriate emergency authorization and subsequent review.</T></Section>
    <Section title="Enabled workflow">
      {order.map((id, i) => <View key={id} style={stack}>
        <T v="label">{`${i + 1}. ${config.steps[id]}`}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Button kind="secondary" label="Move earlier" accessibilityLabel={`Move ${config.steps[id]} earlier`} disabled={i === 0} onPress={() => move(i, -1)} />
          <Button kind="secondary" label="Move later" accessibilityLabel={`Move ${config.steps[id]} later`} disabled={i === order.length - 1} onPress={() => move(i, 1)} />
          <Button kind="ghost" label="Disable" accessibilityLabel={`Disable ${config.steps[id]}`} onPress={() => setOrder(old => old.filter(step => step !== id))} />
        </View>
      </View>)}
      {!order.length && <T v="body">No steps enabled. Add a step below.</T>}
      {config.steps.map((step, i) => !order.includes(i) && <Button key={step} kind="secondary" label={`Add ${step}`} onPress={() => setOrder(old => [...old, i])} />)}
    </Section>
  </View>;
}
function Dependencies({ config }: { config: DependencyConfig }) {
  const [processes, setProcesses] = useState(() => config.processes.map(p => ({ ...p, dependencies: [...p.dependencies] })));
  const [restored, setRestored] = useState(() => config.systems.map(() => false));
  const [budget, setBudget] = useState(config.budget);
  const [duration, setDuration] = useState(config.duration);
  const result = evaluateDependencies(processes, restored, budget, duration, config);
  return <View style={{ gap: space.lg }}>
    <Feedback {...result} />
    <Section title="Illustrative recovery priority"><T v="body">{result.priorityOrder.map((index, rank) => `${rank + 1}. ${processes[index].name}`).join("\n")}</T><T v="meta">Criticality first, then modeled unserved financial exposure. Document business judgment, safety obligations and shared dependencies before deciding.</T></Section>
    <Section title="Outage and recovery resources">
      <NumberControl label="Interruption duration" value={duration} min={1} max={24} unit="hours" onChange={setDuration} />
      <NumberControl label="Recovery resource budget" value={budget} max={20} unit="units" onChange={setBudget} />
      <T v="label">{`${result.cost} / ${budget} resource units selected`}</T>
      <T v="meta">Compare a prospective period of disruption. A recovered service has zero unserved exposure for that period; recovery does not erase losses already incurred.</T>
      {config.systems.map((s, i) => <Toggle key={s.name} label={`Recover ${s.name} (${s.cost} units)`} value={restored[i]} onChange={value => setRestored(old => old.map((v, j) => j === i ? value : v))} />)}
    </Section>
    {processes.map((p, i) => <Section key={p.name} title={p.name}>
      <T v="label">{result.available[i] ? 'Dependencies ready' : 'Waiting for dependencies'}</T>
      <T v="body">{`Prospective unserved exposure: $${result.impacts[i].toLocaleString()} for the next ${duration} hours under this recovery selection.`}</T>
      <NumberControl label={`${p.name} operational criticality`} value={p.criticality} min={1} max={5} onChange={value => setProcesses(old => old.map((v, j) => j === i ? { ...v, criticality: value } : v))} />
      <NumberControl label={`${p.name} hourly financial impact`} value={p.hourlyLoss} max={10000} step={500} unit="dollars" onChange={value => setProcesses(old => old.map((v, j) => j === i ? { ...v, hourlyLoss: value } : v))} />
      <T v="meta">Required supporting systems (keep at least one; all selected dependencies must be restored):</T>
      {config.systems.map((s, index) => <Toggle key={s.name} label={`${p.name} needs ${s.name}`} value={p.dependencies.includes(index)} onChange={value => { if (!value && p.dependencies.length === 1) { sayLater('Keep at least one supporting system. Add another dependency before removing this one.'); return; } setProcesses(old => old.map((v, j) => j === i ? { ...v, dependencies: value ? [...v.dependencies, index] : v.dependencies.filter(d => d !== index) } : v)); }} />)}
    </Section>)}
  </View>;
}
