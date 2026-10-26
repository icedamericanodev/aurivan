/**
 * The "What should we call you?" text field, used twice: in Settings → Your
 * name (mobile 1.23) and, since mobile 1.44, inline in Today's one name card
 * ("Name or nickname", components/beta.tsx). Onboarding no longer has it (1.41).
 *
 * Plain English:
 * - The learner types a first name or nickname. It is optional and stays on
 *   this phone (engine/displayName.ts has the one rule for what is kept).
 * - The field does NOT tidy the text while the learner types (that would eat
 *   the space they just typed between two words). It tidies it when they
 *   finish editing, and the screens save the tidied value.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { cleanDisplayName, MAX_DISPLAY_NAME } from '../engine/displayName';
import { radius, space, type as typeScale, maxScale } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui';

/** The helper line under the field, the same words wherever the field shows. */
export const NAME_HELPER = 'Only on this phone. It just helps us say hello.';

/** Shown instead of the helper when the typed text looks like a web address or an email. */
export const NAME_REJECTED = 'That looks like a web address or an email, so we leave it out. Try just your first name.';

export function DisplayNameField({
  value,
  onChange,
  onSubmit,
  label,
  helper = NAME_HELPER,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The keyboard's "Done" key. */
  onSubmit?: () => void;
  /**
   * Mobile 1.44: the words inside the empty field and the field's spoken name
   * (Today's card: "Name or nickname"). Left out: "Your first name" / "Your name", as before.
   */
  label?: string;
  /** The line under the field. null: none (Today's card already says it is kept on this device); a link is still explained. */
  helper?: string | null;
}) {
  const { c } = useTheme();
  // Grove §6: a focused field has a 1.5 `ink` outline.
  const [focused, setFocused] = useState(false);
  const rejected = value.trim() !== '' && cleanDisplayName(value) === '';
  const under = rejected ? NAME_REJECTED : helper;
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label ?? 'Your first name'}
        placeholderTextColor={c.muted}
        accessibilityLabel={label ?? 'Your name'}
        accessibilityHint={`Optional. Up to ${MAX_DISPLAY_NAME} characters. ${helper ?? 'Kept on this device only.'}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxFontSizeMultiplier={maxScale.body}
        // The field never takes more than the save keeps (an emoji uses two of these units, so it keeps even less).
        maxLength={MAX_DISPLAY_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        spellCheck={false}
        textContentType="givenName"
        autoComplete="name-given"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        onEndEditing={() => {
          // Text that cleans to nothing (a link, an email) stays visible, so the explanation under the field stays too.
          const clean = cleanDisplayName(value);
          if (clean !== value && (clean !== '' || value.trim() === '')) onChange(clean);
        }}
        style={[
          typeScale.body,
          { minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, paddingVertical: space.md, color: c.ink, backgroundColor: c.raised, borderColor: focused ? c.ink : c.control },
        ]}
      />
      {/* A name that looks like a web address or email is left out; say so instead of silently showing "Not set". */}
      <View accessibilityLiveRegion="polite" style={{ marginTop: under ? space.sm : 0 }}>
        {under ? <T v="meta">{under}</T> : null}
      </View>
    </View>
  );
}
