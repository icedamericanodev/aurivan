/**
 * Today's own pieces (mobile 1.23, mockup A): the streak pill in the header
 * and the three stat tiles under the readiness row. Spec: DESIGN_SYSTEM.md
 * §11 "Today". Theme tokens only; Fraunces for numbers and names, Figtree for
 * words.
 */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { DomainInfo } from '../content/types';
import { LARGE_TEXT, radius, serifNumeral, space, statWord } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, Sprig } from './icons';
import { Pop, type Growth } from './motion';
import { BigNum, CARD_LIFT, Card, ICON_SIZE, T, useFontScale } from './ui';

// ── Streak pill: "<sprig> 6 day streak" ──────────────────────────────
/**
 * The streak, as an outlined pill (a raised surface in light, a 1.5 `line`
 * outline in dark: the same two looks as an L2 card). Spoken as one stop:
 * "6-day streak". The numeral rolls +1 on a new day's first study and the
 * sprig pops once (motion.tsx useGrowth; still under Reduce Motion).
 */
export function StreakPill({ streak, growth }: { streak: number; growth?: Growth }) {
  const { c, isDark } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${streak}-day streak`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          minHeight: 40,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          backgroundColor: c.raised,
          borderColor: isDark ? c.line : 'transparent',
        },
        !isDark && CARD_LIFT,
      ]}
    >
      <Pop trigger={growth?.play ? growth.run : undefined} spring="leaf">
        <Sprig size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />
      </Pop>
      <BigNum
        value={String(streak)}
        size={20}
        color={c.clay}
        roll={growth ? { play: growth.play, from: String(growth.from[0] ?? ''), run: growth.run } : undefined}
      />
      <T v="meta" color={c.ink2}>day streak</T>
    </View>
  );
}

// ── Stat tiles: answered · accuracy · weakest area ───────────────────
/** What a tile with nothing to say yet shows: honest, never a zero that looks like a score. */
const NOT_YET = 'Not yet';

/**
 * Three quiet tiles under the readiness row. They are facts, never a score:
 * - answered: every question the learner has answered (the same count You shows);
 * - accuracy: the same number You's "Accuracy" shows, the share whose LATEST
 *   try was right ("Accuracy counts your latest try at each question");
 * - weakest area: the readiness focus domain, only once the range has enough
 *   data to say anything (the focus of a brand-new learner is just Domain 1).
 * Never hours studied and never a single readiness percent. At large text the
 * tiles become a list (label left, value right) so nothing squeezes.
 */
export function StatTiles({
  answered,
  accuracy,
  weakest,
}: {
  answered: number;
  /** 0–100, or null when nothing has been answered. */
  accuracy: number | null;
  /** The readiness focus domain, or null until there is enough data. */
  weakest: DomainInfo | null;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const tiles: { key: string; label: string; spoken: string; value: ReactNode; flex?: number }[] = [
    {
      key: 'answered',
      label: 'answered',
      spoken: `Answered: ${answered}`,
      value: <BigNum value={String(answered)} size={30} />,
    },
    {
      key: 'accuracy',
      label: 'accuracy',
      spoken: accuracy === null ? 'Accuracy: not yet' : `Accuracy: ${accuracy} percent`,
      value: accuracy === null ? <Word text={NOT_YET} /> : <BigNum value={String(accuracy)} pct size={30} />,
    },
    {
      key: 'weakest',
      label: 'weakest area',
      spoken: weakest ? `Weakest area: ${weakest.name}` : 'Weakest area: not yet',
      value: weakest ? <Word text={weakest.tile ?? weakest.short} /> : <Word text={NOT_YET} />,
      flex: 1.2,
    },
  ];
  return (
    <View testID="today-tiles" style={{ flexDirection: stacked ? 'column' : 'row', gap: space.sm, marginTop: space.xl }}>
      {tiles.map((t) => (
        <Card
          key={t.key}
          style={{ flex: stacked ? undefined : (t.flex ?? 1), minWidth: 0, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.lg }}
        >
          <View
            accessible
            accessibilityLabel={t.spoken}
            style={stacked ? { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md } : { flex: 1 }}
          >
            {stacked ? (
              <>
                <T v="meta" color={c.ink2} style={{ flexShrink: 1 }}>{t.label}</T>
                <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{t.value}</View>
              </>
            ) : (
              <>
                {t.value}
                <T v="meta" color={c.ink2} style={{ marginTop: space.xs }}>{t.label}</T>
              </>
            )}
          </View>
        </Card>
      ))}
    </View>
  );
}

/** A tile's value in words (a domain's short name, "Not yet"): Fraunces 20, the number's voice at word size, bottom-aligned with the numerals beside it. */
function Word({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: serifNumeral(30).lineHeight, justifyContent: 'flex-end' }}>
      <Text maxFontSizeMultiplier={1.3} style={[statWord, { color: c.ink }]}>
        {text}
      </Text>
    </View>
  );
}
