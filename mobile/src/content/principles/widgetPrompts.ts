/**
 * Today's rule (home-screen widget, mobile 1.47): one prompt per principle,
 * in an exam question's voice, so the learner can answer it in their head
 * before tapping "Show the rule". The short form is for a 2×2 or 4×1 widget.
 *
 * Rules for these words:
 * - one situation and one question, answerable by the principle's rule;
 * - plain words: "the auditor" (not "IS auditor": the full role name is in
 *   the rule itself), no acronyms;
 * - the priority word in capitals only where the exam would use it;
 * - prompt at most 110 characters, short form at most 50
 *   (src/__tests__/widgets-content.test.ts checks every principle has one).
 */
export interface RulePrompt {
  ask: string;
  short: string;
}

export const RULE_PROMPTS: Record<string, RulePrompt> = {
  'recommend-dont-implement': {
    ask: 'Management asks the auditor to set up the missing control. What should the auditor do?',
    short: 'Asked to build the control. Your move?',
  },
  'independence-throughout': {
    ask: 'The auditor helped build the system that is now being audited. What must happen?',
    short: 'You helped build it. Can you audit it?',
  },
  'escalate-to-decision-owner': {
    ask: 'A manager pressures the auditor to drop a finding. Where does the auditor take it?',
    short: 'Pressed to drop a finding. Who next?',
  },
  'management-owns-risk': {
    ask: 'A risk is above appetite and nobody wants to fix it. Who decides to accept it?',
    short: 'Risk above appetite. Who accepts it?',
  },
  'governance-before-technology': {
    ask: 'The team wants to buy a security tool next month. What should come FIRST?',
    short: 'Buying a tool next month. What FIRST?',
  },
  'risk-sets-priority': {
    ask: 'There are ten areas to audit and little time. How does the auditor choose where to start?',
    short: 'Ten areas, little time. Where to start?',
  },
  'plan-before-testing': {
    ask: 'Fieldwork starts tomorrow. What should the auditor do FIRST?',
    short: 'Fieldwork tomorrow. What FIRST?',
  },
  'fit-method-to-objective': {
    ask: 'The auditor must show a control worked all year. Which kind of test fits?',
    short: 'Worked all year? Which test fits?',
  },
  'evidence-quality': {
    ask: 'A manager’s word, a system report, or a check the auditor did. Which is MOST reliable?',
    short: 'Which evidence is MOST reliable?',
  },
  'materiality-judgment': {
    ask: 'An error is small in dollars but repeats across thousands of records. Does it matter?',
    short: 'Small error, many records. Matters?',
  },
  'report-agree-follow-up': {
    ask: 'Management says the issue is already fixed. What should the auditor do next?',
    short: '“It’s fixed,” says management. Next?',
  },
  'root-cause-over-symptom': {
    ask: 'The same finding comes back every year. What should the fix aim at?',
    short: 'Same finding every year. Fix what?',
  },
  'prevent-before-detect': {
    ask: 'A new system is still being designed. Which kind of control is BEST to add now?',
    short: 'Still in design. Which control BEST?',
  },
  'compensating-controls-fallback': {
    ask: 'A small team can’t split duties between people. What does the auditor look for instead?',
    short: 'Can’t split duties. What instead?',
  },
  'least-privilege-and-sod': {
    ask: 'One person can both approve and pay invoices. What risk does the auditor report?',
    short: 'One person approves and pays. Risk?',
  },
  'proven-not-configured': {
    ask: 'The policy is approved and the tool is installed. Is that enough for the auditor?',
    short: 'Policy approved, tool installed. Enough?',
  },
  'people-contain-preserve': {
    ask: 'Ransomware is encrypting files right now. What comes FIRST?',
    short: 'Ransomware right now. What FIRST?',
  },
  'recover-by-business-priority': {
    ask: 'Several systems are down after a disaster. Which one is restored first?',
    short: 'Many systems down. Which first?',
  },
  'priority-word-decides': {
    ask: 'Two options are both true. What in the question decides between them?',
    short: 'Both options true. What decides?',
  },
  'final-two': {
    ask: 'You are down to two options, and one is part of the other. Which do you pick?',
    short: 'Final two, one inside the other. Pick?',
  },
  'answer-from-the-stem': {
    ask: 'The question says management has already accepted the risk. What changes?',
    short: 'Risk already accepted. What changes?',
  },
};
