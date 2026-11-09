/** Small fictional models, not official risk scores or organizational mandates. No persistence. */
export interface RoleConfig { people: readonly string[]; duties: readonly string[]; initialAssignments: readonly number[]; conflicts: readonly { duties: readonly [number, number]; reason: string }[] }
export interface RiskArea { name: string; impact: number; likelihood: number; control: number; incidents: number; hours: number; mandatory: boolean }
export interface RiskConfig { areas: readonly RiskArea[]; budget: number }
export interface AuthorityConfig { roles: readonly string[]; decisions: readonly { label: string; expectedRole: number; reason: string }[]; initialAssignments: readonly number[] }
export interface WorkflowConfig { steps: readonly string[]; initialOrder: readonly number[] }
export interface BusinessProcess { name: string; criticality: number; hourlyLoss: number; dependencies: readonly number[] }
export interface DependencyConfig { systems: readonly { name: string; cost: number }[]; processes: readonly BusinessProcess[]; budget: number; duration: number }
function integer(value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError('Scenario value outside supported range');
}
function assignmentsValid(values: readonly number[], count: number, roles: number) {
  if (values.length !== count || roles < 1) throw new RangeError('Scenario assignment count is invalid');
  values.forEach(v => integer(v, 0, roles - 1));
}
export function evaluateRoles(assignments: readonly number[], independentReview: boolean, config: RoleConfig) {
  if (config.duties.length !== 5) throw new RangeError('Purchasing scenario requires five duties');
  assignmentsValid(assignments, config.duties.length, config.people.length);
  const findings = config.conflicts.filter(rule => {
    rule.duties.forEach(i => integer(i, 0, config.duties.length - 1));
    return assignments[rule.duties[0]] === assignments[rule.duties[1]];
  }).map(rule => rule.reason);
  const reviewerIndependent = assignments.slice(0, 4).every(person => person !== assignments[4]);
  const reviewEffective = independentReview && reviewerIndependent;
  if (independentReview && !reviewerIndependent) findings.push('The transaction reviewer also performs a transaction duty. This is not an independent review in this scenario.');
  return { findings, reviewEffective, summary: `${findings.length} control concerns. ${reviewEffective ? 'An independent daily review adds detective coverage; it does not prevent an improper payment or eliminate collusion.' : 'Separate approvals prevent one person acting alone. A timely independent review can add detective coverage.'} Assess materiality, review evidence and management acceptance of residual risk.` };
}
export function evaluateRisk(areas: readonly RiskArea[], selected: readonly boolean[], budget: number) {
  integer(budget, 0, 1000);
  if (!areas.length || areas.length !== selected.length) throw new RangeError('Audit area selection is invalid');
  const scores = areas.map(a => {
    integer(a.impact, 1, 5); integer(a.likelihood, 1, 5); integer(a.control, 0, 4); integer(a.incidents, 0, 5); integer(a.hours, 1, 1000);
    return a.impact * a.likelihood * (5 - a.control) + a.incidents * 5;
  });
  const hours = areas.reduce((sum, a, i) => sum + (selected[i] ? a.hours : 0), 0);
  const findings = areas.flatMap((a, i) => a.mandatory && !selected[i] ? [`${a.name}: mandatory coverage is missing, regardless of score.`] : []);
  if (hours > budget) findings.push(`The proposed plan exceeds the budget by ${hours - budget} hours. Escalate resource or scope trade-offs.`);
  const omitted = scores.filter((_, i) => !selected[i]);
  if (omitted.length && scores.some((score, i) => selected[i] && !areas[i].mandatory && score < Math.max(...omitted))) findings.push('A lower-scored discretionary area is selected while a higher-scored area is omitted. Document a business justification.');
  return { scores, hours, findings, summary: `${hours} of ${budget} audit hours allocated. Educational priority = impact × likelihood × (5 − control effectiveness) + 5 × prior incidents. These ordinal inputs guide discussion; they are not probabilities or an ISACA formula. Validate assumptions and obtain the required audit-plan approval.` };
}
export function evaluateAuthority(assignments: readonly number[], config: AuthorityConfig) {
  assignmentsValid(assignments, config.decisions.length, config.roles.length);
  const findings = config.decisions.flatMap((d, i) => { integer(d.expectedRole, 0, config.roles.length - 1); return assignments[i] === d.expectedRole ? [] : [`${d.label}: ${d.reason}`]; });
  return { findings, summary: `${config.decisions.length - findings.length} of ${config.decisions.length} responsibilities match this company's charter. Management owns risk and controls; internal audit independently evaluates them. Different organizations may delegate authority differently.` };
}
/** Step indices: request, assess, authorize, test, approve deployment, implement, review. */
export function evaluateWorkflow(order: readonly number[], emergency: boolean, config: WorkflowConfig) {
  if (config.steps.length !== 7 || new Set(order).size !== order.length) throw new RangeError('Invalid workflow');
  order.forEach(i => integer(i, 0, 6));
  const findings: string[] = [];
  [0, 1, 2, 4, 5, 6].forEach(i => { if (!order.includes(i)) findings.push(`${config.steps[i]} is missing: retain authorization, traceability and post-change accountability.`); });
  if (!order.includes(3)) findings.push(emergency ? 'Testing omitted: document why predeployment testing was constrained, use proportionate checks and verify promptly afterward.' : 'Testing missing: approval alone does not establish that the update works safely.');
  const before = (a: number, b: number) => order.includes(a) && order.includes(b) && order.indexOf(a) > order.indexOf(b);
  const pairs: [number, number][] = emergency ? [[0, 5], [1, 5], [2, 5], [4, 5], [5, 6]] : [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
  pairs.forEach(([a, b]) => { if (before(a, b)) findings.push(`${config.steps[a]} must precede ${config.steps[b]} under this scenario's ${emergency ? 'documented emergency' : 'normal'} procedure.`); });
  if (emergency && before(3, 6)) findings.push('Complete deferred testing before closing the subsequent review.');
  return { findings, summary: emergency ? 'Emergency procedure: record the request, proportionate impact assessment and delegated emergency approval before deployment. Testing may be deferred when justified; retain rollback arrangements and subsequent testing and review.' : 'Normal procedure: assess and authorize the change, test it, approve deployment, implement, then verify and review. A sequence alone is not evidence that the controls operated.' };
}
export function evaluateDependencies(processes: readonly BusinessProcess[], restored: readonly boolean[], budget: number, duration: number, config: DependencyConfig) {
  integer(budget, 0, 100); integer(duration, 0, 72);
  if (restored.length !== config.systems.length || !processes.length) throw new RangeError('Invalid recovery scenario');
  config.systems.forEach(s => integer(s.cost, 1, 100));
  const available = processes.map(p => {
    integer(p.criticality, 1, 5); integer(p.hourlyLoss, 0, 1000000);
    if (!p.dependencies.length || new Set(p.dependencies).size !== p.dependencies.length) throw new RangeError('Invalid dependencies');
    p.dependencies.forEach(i => integer(i, 0, config.systems.length - 1));
    return p.dependencies.every(i => restored[i]);
  });
  const impacts = processes.map((p, i) => available[i] ? 0 : p.hourlyLoss * duration);
  const cost = config.systems.reduce((sum, s, i) => sum + (restored[i] ? s.cost : 0), 0);
  const findings = processes.flatMap((p, i) => available[i] ? [] : [`${p.name}: unavailable until ${p.dependencies.filter(j => !restored[j]).map(j => config.systems[j].name).join(' and ')} recover. Criticality ${p.criticality}/5; illustrative future financial exposure $${impacts[i]}.`]);
  if (cost > budget) findings.unshift(`Recovery requires ${cost} resource units but only ${budget} are available.`);
  const priorityOrder = processes.map((_, i) => i).sort((a, b) => processes[b].criticality - processes[a].criticality || impacts[b] - impacts[a] || a - b);
  return { findings, available, impacts, cost, priorityOrder, summary: `${available.filter(Boolean).length} of ${processes.length} business processes supported; ${cost}/${budget} resource units selected. Exposure estimates a further ${duration} hours of interruption for processes still unsupported after this proposed recovery wave. It is prospective exposure, not loss already incurred. Illustrative priority ranks operational criticality first, then prospective financial exposure; actual decisions require documented business judgment. Criticality captures nonfinancial effects; shared dependencies and safety obligations can outweigh revenue. BIA requirements inform RTO/RPO; this model does not set either objective.` };
}
