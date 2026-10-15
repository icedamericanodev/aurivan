/**
 * The "What should we call you?" text field, used twice: on the optional
 * onboarding step and in Settings → Your name (mobile 1.23).
 *
 * Plain English:
 * - The learner types a first name or nickname. It is optional and stays on
 *   this phone (engine/displayName.ts has the one rule for what is kept).
 * - The field does NOT tidy the text while the learner types (that would eat
 *   the space they just typed between two words). It tidies it when they
 *   finish editing, and the screens save the tidied value.
 */
import { TextInput, View } from 'react-native';
import { cleanDisplayName, MAX_DISPLAY_NAME } from '../engine/displayName';
import { radius, space, type as typeScale, maxScale } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui';

/** The helper line under the field, the same words wherever the field shows. */
export const NAME_HELPER = 'Only on this phone. It just helps us say hello.';

export function DisplayNameField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The keyboard's "Done" key. */
  onSubmit?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Your first name"
        placeholderTextColor={c.muted}
        accessibilityLabel="Your name"
        accessibilityHint={`Optional. Up to ${MAX_DISPLAY_NAME} characters. ${NAME_HELPER}`}
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
          const clean = cleanDisplayName(value);
          if (clean !== value) onChange(clean);
        }}
        style={[
          typeScale.body,
          { minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: space.lg, paddingVertical: space.md, color: c.ink, backgroundColor: c.raised, borderColor: c.control },
        ]}
      />
      <T v="meta" style={{ marginTop: space.sm }}>{NAME_HELPER}</T>
    </View>
  );
}
