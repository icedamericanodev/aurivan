/**
 * SHOTS=cloud only (the web screenshot build, never a phone): react-native-web's
 * `Alert.alert` does nothing, so the sync warnings that live in system alerts
 * (sign-out's "isn't in your account yet", the Reset alert while syncing) could
 * not be seen in the screenshots. This draws a plain system-style dialog in the
 * page instead, with working buttons. cloud/runtime.on.ts installs it only when
 * EXPO_PUBLIC_AURIVAN_SHOTS=1 and Platform.OS is 'web', next to the memory
 * backend, so no store build and no phone ever runs it.
 */
import { Alert, type AlertButton } from 'react-native';

export function installShotsAlert(): void {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const wrap = doc.createElement('div');
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-label', title);
    Object.assign(wrap.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '99999' });
    const card = doc.createElement('div');
    Object.assign(card.style, { background: '#f2f2f7', color: '#000', borderRadius: '14px', width: '290px', fontFamily: '-apple-system, system-ui, sans-serif', textAlign: 'center', overflow: 'hidden' });
    const head = doc.createElement('div');
    head.textContent = title;
    Object.assign(head.style, { fontWeight: '600', fontSize: '17px', padding: '18px 16px 4px' });
    const body = doc.createElement('div');
    body.textContent = message ?? '';
    Object.assign(body.style, { fontSize: '13px', lineHeight: '1.35', padding: '0 16px 16px' });
    const row = doc.createElement('div');
    Object.assign(row.style, { display: 'flex', borderTop: '1px solid #c6c6c8' });
    (buttons?.length ? buttons : [{ text: 'OK' }]).forEach((b, i) => {
      const btn = doc.createElement('button');
      btn.textContent = b.text ?? 'OK';
      Object.assign(btn.style, {
        flex: '1',
        padding: '11px 8px',
        fontSize: '17px',
        background: 'transparent',
        border: 'none',
        borderLeft: i ? '1px solid #c6c6c8' : 'none',
        color: b.style === 'destructive' ? '#d70015' : '#0a64d8',
        fontWeight: b.style === 'cancel' ? '600' : '400',
      });
      btn.onclick = () => {
        wrap.remove();
        b.onPress?.();
      };
      row.appendChild(btn);
    });
    card.append(head, body, row);
    wrap.appendChild(card);
    doc.body.appendChild(wrap);
  };
}
