# Design System Audit

> **KaiSip note (read first).** Frozen, trimmed copy of Expo's
> `expo-design-system/references/audit.md` (expo/skills, commit d5caf7f, MIT;
> see `README.md` and `LICENSE-expo.txt`). It is a **review checklist only**.
> Grove (`docs/mobile/DESIGN_SYSTEM.md`) and `mobile/src/theme/tokens.ts`
> always win on conflict; Grove is the "existing system" this audit measures
> against, never something to replace.
>
> Changed for KaiSip: the shell command blocks are now tables of search
> patterns for the Grep tool, filled in with KaiSip's real folders and Grove's
> spacing scale; the Tailwind check is removed (we use plain `StyleSheet`);
> references to Expo's own `SKILL.md` component contract point to Grove's
> component recipes instead. Nothing here tells you to run a command.

Measure how far the app has drifted from a single visual source of truth, then document or extend components with a consistent template.

Run the audit **before** proposing changes. Report findings first; apply fixes only when asked.

## 0. Directories (KaiSip)

- **Source directories:** `mobile/src/app`, `mobile/src/components` (plus `mobile/src/lib` and `mobile/src/engine` for logic, which hold no styles).
- **Theme location:** `mobile/src/theme/` (`tokens.ts`, `useTheme.ts`). Exclude it from every hit below.
- **The existing system:** Grove, plain `StyleSheet` with `boxShadow` strings and one theme entry point. Audit against Grove's token names and scale; adapt or skip a check rather than reporting a false violation.

## 1. Token coverage checks

Each hit outside the theme directory is a candidate for tokenization - not automatically a violation (a one-off with an explaining comment is allowed).

| Check | Pattern (regex, `*.ts` / `*.tsx`) | Notes |
|---|---|---|
| Hardcoded hex colours | `#[0-9a-fA-F]{3,8}\b` | Grove's fixed badge enamels and the brand lockup are documented exceptions (DESIGN_SYSTEM §3) |
| Raw font size | `fontSize:` | Should come from the type ramp (`<T>` variants) |
| Spacing outside the scale | `(padding\|margin\|gap)[A-Za-z]*:\s*[0-9]+` | Grove's scale is `space` in `tokens.ts`: 4, 8, 12, 16, 20, 24, 28, 32, 48. Flag other values; if one keeps recurring, propose adding it to the scale |
| Raw border radius | `borderRadius:` | Should use `radius` tokens (8, 16, 24, 28, pill) |
| Legacy shadows | `shadow(Color\|Offset\|Opacity\|Radius)\|elevation:` | Grove draws `cardShadow` with `boxShadow`; `elevation: 1` is allowed only through `CARD_LIFT` / `cardLiftFor` for Android API < 28, and `raisedShadow` only on the Segmented thumb |
| Theme entry points | More than one `theme.ts` / `theme/index.ts` | There must be exactly one entry point (`useTheme()`) |
| Tappables without accessibility | Files with `<Pressable` but no `accessibilityRole` or `accessibilityLabel` | Inspect each control; text or forwarded props may supply labels |

Then run the candidate checks in `expo-native-slop.md`. Inspect the rendered result: token checks alone cannot establish readable dark mode, spacing hierarchy, or appropriate shadows.

## 2. Scoring

Turn raw hit counts into a comparable score so runs can be tracked over time. The denominator is the source lines of code (`*.ts` and `*.tsx` in the source directories).

For each category: **score = escapes per 100 source lines** (hits / SLOC x 100, one decimal).

| Score per category | Reading |
|---|---|
| < 0.5 | Healthy - fix opportunistically |
| 0.5 - 2.0 | Drifting - schedule cleanup for the worst files |
| > 2.0 | Systemic - the token or component for this category is missing or unused; fix the system first (see §5) |

Report the per-category scores in the summary. The highest-scoring category is usually the first migration target.

## 3. Component completeness

For each component in `mobile/src/components/`, check it against Grove's component recipes (DESIGN_SYSTEM §6 and §11):

| Check | Pass condition |
|---|---|
| Variants | Visual intent is a `variant` prop, not boolean soup (`isPrimary`, `isGhost`) |
| Sizes | Sizes map to spacing/typography tokens |
| Pressed state | Tappable components give pressed feedback via a `Pressable` style function (Grove: `usePressScale`) |
| Disabled / loading | Handled, and disabled blocks `onPress` |
| Style override | Accepts `style`, merged last |
| Accessibility | Role and applicable disabled/busy/selected state exposed; label survives loading and identifies icon-only controls; touch target at least 44pt (48dp Android; Grove uses 48pt) |
| Tokens only | No literals that duplicate a theme value |

## 4. Report format

```markdown
## Design System Audit

### Summary
Screens reviewed: [X] | Components reviewed: [X] | Issues: [X]

### Token coverage
| Category | Tokens defined | Escapes found | Score (per 100 SLOC) | Worst offenders |
|---|---|---|---|---|
| Colors | [X] | [X] hardcoded hex | [X.X] | [files] |
| Spacing | [X] | [X] non-step values | [X.X] | [files] |
| Typography | [X] | [X] raw fontSize | [X.X] | [files] |
| Radius / shadows / motion | [X] | [X] | [X.X] | [files] |

### Component completeness
| Component | Variants | States | Overrides | Tokens | Notes |
|---|---|---|---|---|---|
| Button | OK | missing pressed | OK | OK | ... |

### Extraction candidates
Views repeated across 2 or more screens that are still colocated or duplicated:
1. [view] - appears in [screens] - suggested name: [Component]

### Priority actions
1. [Highest-leverage fix - usually the most-duplicated escaped value]
2. ...
```

## 5. Adopting incrementally

An app with dozens of escapes is migrated in order, never big-bang. A big-bang conversion produces one huge unreviewable diff and usually stalls half-done.

1. **Tokens first.** If a value keeps recurring outside the scale, propose it as a Grove token (with its contrast ratio, for colours) before converting call sites.
2. **Typography before spacing.** Convert raw `fontSize` to the type ramp first: it is the highest-visibility win and touches the fewest layout decisions. Then spacing, then colours, then radius/shadows.
3. **Convert one worst-offender file completely** and use it as the reference pattern for the rest of the migration.
4. **Then convert per-screen**, one screen per commit, re-checking the patterns scoped to that screen.
5. **Re-run the audit after each phase** and record the scores from §2 - they should fall monotonically.

## 6. Documenting an existing component

```markdown
## Component: [Name]

[What it is and when to use it - one paragraph.]

### Variants
| Variant | Use when |
|---|---|
| primary | The screen's single main action |

### Props
| Prop | Type | Default | Notes |
|---|---|---|---|

### States
default / pressed / disabled / loading - visual + behavior for each.

### Accessibility
Role, touch target, screen reader label.

### Do / Don't
| Do | Don't |
|---|---|
| [best practice] | [anti-pattern seen in this repo] |
```

## 7. Proposing a new component

Before designing a new primitive, prove the existing set can't cover it:

```markdown
## Proposed: [Name]

### Problem
[The repeated need, and the 2 or more screens that have it.]

### Why existing components aren't enough
| Closest component | What's shared | What's missing |
|---|---|---|

### API
Props table (variant / size / state / style only - content via children).

### Tokens used
Colors: [...] Spacing: [...] Typography: [...] Radius: [...]

### Open questions
[Decisions that need a human, e.g. does this need a destructive variant?]
```

If the "what's missing" column is empty for any row, extend that component's variants instead of adding a new one.
