/**
 * Your study (mobile 1.15, PHASE5.md §2.5): the screen a learner from before
 * 1.15 opens from Today's one "Fit your plan" card ("Set it up").
 *
 * The same controls as Settings → Your study: how long they can study most
 * days, where they're starting from, and the Exam-focused plan. Nothing
 * changes until Save. Save rebuilds today's plan if nothing in it is ticked
 * yet; otherwise today's plan stays and tomorrow's fits (said on screen
 * before the learner saves). Cancel changes nothing, and the card stays
 * until it is answered or dismissed.
 */
import { backOr } from '../lib/actions';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YourStudy } from '../components/fit';
import { StickyFooter } from '../components/quiz';
import { Button, PushedHeader, T } from '../components/ui';
import { examFocusedOf, KEEP_TODAY_LINE, type DailyMinutes, type Familiarity } from '../engine/fit';
import { sayLater } from '../lib/a11y';
import { changeFit, planUntouched } from '../lib/activity';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Fit() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  // Start from what is saved (an old daily goal reads as minutes: 40 a day → 45 min).
  const [minutes, setMinutes] = useState<DailyMinutes>(() => dailyMinutesOf(useSettings.getState()));
  const [familiarity, setFamiliarity] = useState<Familiarity | undefined>(() => useSettings.getState().familiarity);
  // undefined = not touched here: the switch follows the familiarity row until the learner flips it.
  const [examFocused, setExamFocused] = useState<boolean | undefined>(() => useSettings.getState().examFocused);
  const [footerH, setFooterH] = useState(140);
  const kept = !planUntouched(useProgress((p) => p.days[cert.id]));

  const save = () => {
    const r = changeFit(cert.id, { dailyMinutes: minutes, ...(familiarity ? { familiarity } : {}), ...(examFocused !== undefined ? { examFocused } : {}) });
    // A Save with no change still answers the card.
    if (useSettings.getState().fitPrompt !== 'answered') useSettings.setState({ fitPrompt: 'answered' });
    sayLater(r.keptToday ? 'Saved. Tomorrow’s plan will fit.' : 'Saved. Today’s plan now fits.');
    backOr('/home');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title="Your study" onBack={() => backOr('/home')} />
        <T v="meta" style={{ marginTop: space.sm }}>Tell us how long you have and where you’re starting from, so Today’s plan fits your time. You can change these any time in Settings.</T>
        <YourStudy
          minutes={minutes}
          familiarity={familiarity}
          examFocused={examFocusedOf({ familiarity, examFocused })}
          onMinutes={setMinutes}
          onFamiliarity={setFamiliarity}
          onExamFocused={setExamFocused}
          keptLine={kept ? KEEP_TODAY_LINE : null}
        />
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button label="Save" onPress={save} />
        <Button kind="ghost" label="Cancel" onPress={() => backOr('/home')} />
      </StickyFooter>
    </SafeAreaView>
  );
}
