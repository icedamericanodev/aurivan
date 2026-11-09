/** Secondary feature guidance, available offline without crowding the task. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { moveFocus } from '../lib/a11y';
import { Info, ICON_STROKE } from './icons';
import { Sheet } from './settings';
import { IconButton, T } from './ui';
import { space } from '../theme/tokens';

export function FeatureInfo({ title, label = `About ${title}`, color, inline = false, children }: {
  title: string;
  label?: string;
  /** Use the hero's text token when the trigger sits on a forest panel. */
  color?: string;
  /** Expand within an existing modal instead of presenting a second native modal. */
  inline?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const headingRef = useRef<View>(null);
  useEffect(() => {
    if (inline && open) return moveFocus(headingRef, 100);
  }, [inline, open]);
  const cancelFocus = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancelFocus.current?.(), []);
  const close = () => {
    setOpen(false);
    cancelFocus.current?.();
    cancelFocus.current = moveFocus(triggerRef, 400);
  };
  const content = (
    <>
      <IconButton
        ref={triggerRef}
        label={label}
        hint={inline ? 'Shows or hides feature information' : 'Opens feature information'}
        expanded={open}
        onPress={() => {
          if (open) close();
          else {
            cancelFocus.current?.();
            setOpen(true);
          }
        }}
        icon={(ink) => <Info size={22} color={color ?? ink} strokeWidth={ICON_STROKE} />}
      />
      {inline ? (
        open && <View style={{ marginBottom: space.md }}>
          <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={title}>
            <T v="headline">{title}</T>
          </View>
          {children}
        </View>
      ) : open ? (
        <Sheet visible onClose={close} title={title}>
          {children}
        </Sheet>
      ) : null}
    </>
  );
  return inline ? <View>{content}</View> : content;
}
