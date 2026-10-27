/**
 * The composer (spec §4.2 "Composer"), kaisip://board/new (and
 * ?edit=<post id> for your own post). The type chips, the title, the
 * details, "Link an item (optional)", "Posting as {handle} · Change", the
 * live leak card, the rules line, the guidelines and the not-affiliated
 * line.
 *
 * - Signed out: the sign-in sheet. Before the guidelines are accepted (or
 *   after they change): the gate. Nothing is sent before both. Opened
 *   directly ("Post publicly instead", a link), it waits until the phone
 *   knows who is signed in and has that learner's board facts, so an agreed
 *   learner is never sent to the gate by mistake (fix round P8, CR B1).
 * - The live check (a moment after typing stops) runs board-submit's own
 *   rules on the phone: near-verbatim text from a practice question
 *   disables Post and shows the leak card ("Report it privately" opens the
 *   private report on that question; nothing about it is shown; "Edit my
 *   post" goes to the field it is in); a recalled real-exam question shows a
 *   warning (a person checks it first). Both are announced to screen readers
 *   (UX H4). The bank's fingerprint is built when the composer opens, off
 *   the typing path (CR N9).
 * - Each draft has its own id, so a post whose reply was lost is posted
 *   once when sent again (QA BUG-1). Offline, the post is kept here as a
 *   draft (one, this account's) and the screen says so.
 * - A new member's post, or one the filters hold, waits for review: "Waiting
 *   for review", with why (focus moves to it).
 * - Posting is paused by staff: the card says so and Post is off.
 * Link parameters only prefill (an edit, a kind); nothing is posted
 * without a tap.
 */
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { BoardCard, KINDS, kindLabel, PostRow } from '../../../components/board';
import { useReportFlow } from '../../../components/support';
import { Button, Chip, ChipRow, NoteField, PushedHeader, Screen, T, TextField } from '../../../components/ui';
import type { Draft, PostCard, PostKind } from '../../../cloud/types';
import { getCertification } from '../../../content/certifications';
import { copy } from '../../../content/cloud/copy';
import { moveFocus, sayLater } from '../../../lib/a11y';
import { checkDraft, loadDraft, loadFeed, loadPost, needsGate, newClientId, postProblem, submitPost, useBoard, useBoardSession, warmLeakGuard, type DraftCheck } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';
import { useActiveCertId } from '../../../lib/activeCert';

const ITEM_REF = /^(q|note|lesson|card|app):[A-Za-z0-9_.:#-]{1,80}$/;
const NO_CHECK: DraftCheck = { bank: false, field: null, questionId: null, recall: false, reject: null };
/** The 2 longest words of a title: what "Similar posts" searches for. */
const dupeQuery = (title: string) =>
  title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .sort((a, b) => b.length - a.length)
    .slice(0, 2)
    .join(' ');

export default function Compose() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ edit?: string; kind?: string; body?: string }>();
  const editId = typeof params.edit === 'string' ? params.edit : undefined;
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? getCertification('cisa')!;
  const signedIn = useAccount((s) => s.signedIn);
  const known = useAccount((s) => s.known);
  const me = useBoard((s) => s.me);
  const settings = useBoard((s) => s.settings);
  // Opened directly (a link or "Post publicly instead"): load the session the board would have.
  const ready = useBoardSession(signedIn);
  const initialKind = KINDS.find((k) => k === params.kind) ?? 'idea';
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [title, setTitle] = useState('');
  // "Post publicly instead" carries what was typed in the feedback sheet (a prefill only).
  const carried = typeof params.body === 'string' && !editId ? params.body.slice(0, 2000) : '';
  const [body, setBody] = useState(carried);
  const [itemRef, setItemRef] = useState('');
  const [checked, setChecked] = useState<{ key: string; result: DraftCheck } | null>(null);
  const [dupes, setDupes] = useState<PostCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);
  const bodyRef = useRef<TextInput>(null);
  const heldRef = useRef<View>(null);
  // This draft's id: made on the first Post and kept (from a saved draft too), so a retry is the same post.
  const clientId = useRef<string | null>(null);
  // A second tap before the first one's answer sends nothing (QA O1).
  const sendingRef = useRef(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  // The bank's fingerprint, built once the screen has opened (not on the first keystroke).
  useEffect(() => {
    const task = warmLeakGuard(cert.id);
    return () => task.cancel();
  }, [cert.id]);

  // Prefill: the draft kept offline (on open), or your own post for an edit (once the learner is known).
  const myId = me?.memberId;
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || (editId && !myId)) return;
    prefilled.current = true;
    let live = true;
    void (async () => {
      if (editId) {
        const r = await loadPost(editId);
        if (live && r.ok && r.post.authorId === myId) {
          setKind(r.post.kind);
          setTitle(r.post.title);
          setBody(r.post.body);
          setItemRef(r.post.itemRef ?? '');
        }
        return;
      }
      const d = await loadDraft();
      // A draft kept offline wins over nothing; words carried from the feedback sheet aren't replaced by an old draft.
      if (live && d && !carried) {
        setKind(d.kind);
        setTitle(d.title);
        setBody(d.body);
        setItemRef(d.itemRef ?? '');
        clientId.current = d.clientId ?? null;
      }
    })();
    return () => {
      live = false;
    };
  }, [editId, myId, carried]);

  // The live check: a moment (400 ms) after typing stops.
  const text = `${title}\n${body}`;
  const ref = itemRef.trim() || null;
  const empty = !title.trim() && !body.trim();
  const newMember = (me?.approvedPosts ?? 0) === 0;
  const checkKey = `${cert.id}|${ref ?? ''}|${newMember}|${text}`;
  useEffect(() => {
    if (empty) return;
    const t = setTimeout(() => setChecked({ key: checkKey, result: checkDraft(cert.id, text, ref, newMember) }), 400);
    return () => clearTimeout(t);
  }, [checkKey, empty, cert.id, text, ref, newMember]);
  // Until the latest words are checked, the last answer stays on screen and Post waits.
  const check = empty ? NO_CHECK : (checked?.result ?? NO_CHECK);
  const checking = !empty && checked?.key !== checkKey;

  // The leak card and the recall warning are said aloud when they appear (UX H4).
  useEffect(() => {
    if (check.bank) sayLater(`${copy('board.leak.title')}. ${copy('board.leak.body')}`);
  }, [check.bank]);
  useEffect(() => {
    if (check.recall && !check.bank) sayLater(copy('board.leak.recall'));
  }, [check.recall, check.bank]);
  // "Waiting for review": focus moves to it.
  useEffect(() => {
    if (held) moveFocus(heldRef, 350);
  }, [held]);

  // Similar posts, from the title (never for an edit).
  const q = useMemo(() => dupeQuery(title), [title]);
  const lookForDupes = !editId && q.length >= 4 && title.trim().length >= 8;
  useEffect(() => {
    if (!lookForDupes) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await loadFeed({ cert: cert.id, tab: 'top', search: q });
      if (live && r.ok) setDupes(r.items.slice(0, 3));
    }, 600);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, lookForDupes, cert.id]);

  const privateReport = useReportFlow(cert.id, { kind: 'question', id: check.questionId ?? '', where: copy('board.title') });

  // Nothing (no redirect either) until the phone knows who is signed in.
  if (!known) return <Screen edges={['top', 'bottom']}><PushedHeader icon="close" onBack={back} /></Screen>;
  if (!signedIn) return <Redirect href="/account/sign-in" />;
  // The gate only once this learner's own facts are in (an agreed learner is never sent there by mistake).
  if (ready && me !== undefined && needsGate(me, settings)) return <Redirect href={{ pathname: '/board/guidelines', params: { then: 'compose' } }} />;

  const paused = settings?.postingOpen === false;
  const titleShort = title.trim().length > 0 && title.trim().length < 8;
  const refBad = ref !== null && !ITEM_REF.test(ref);
  const canPost = !busy && !paused && !check.bank && !checking && title.trim().length >= 8 && !refBad;

  const post = async () => {
    if (!canPost || sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    setProblem(null);
    if (!editId && !clientId.current) clientId.current = newClientId();
    const d: Draft = { kind, title, body, cert: cert.id, ...(ref ? { itemRef: ref } : {}), ...(editId ? {} : { clientId: clientId.current! }) };
    const r = await submitPost(d, editId);
    sendingRef.current = false;
    setBusy(false);
    if (!r.ok) return setProblem(postProblem(r.code, r.detail));
    if (r.visibility === 'pending') {
      setHeld(r.holdReason === 'recall' ? copy('board.held.recall') : r.holdReason === 'new_member' ? copy('board.held.body') : copy('board.held.words'));
      return;
    }
    router.replace({ pathname: '/board/[id]', params: { id: r.id } });
  };

  if (held) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PushedHeader icon="close" onBack={() => router.replace('/board')} />
        <View ref={heldRef} accessible accessibilityRole="header" accessibilityLabel={copy('board.held.title')} style={{ marginTop: space.sm }}>
          <T v="display">{copy('board.held.title')}</T>
        </View>
        <T v="body" style={{ marginTop: space.md }}>{held}</T>
        <Button label={copy('board.held.done')} onPress={() => router.replace('/board/activity')} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" title={copy(editId ? 'board.compose.edit' : 'board.compose.title')} onBack={back} />
      {paused && <AccountNotice text={copy('board.reject.paused')} />}

      <T v="label" style={{ marginTop: space.md }}>{copy('board.compose.type')}</T>
      <View style={{ marginTop: space.sm }}>
        <ChipRow>
          {KINDS.map((k) => (
            <Chip key={k} label={kindLabel(k)} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </ChipRow>
      </View>
      {kind === 'content' && ref?.startsWith('q:') && (
        <BoardCard tone="soft" grouped>
          <T v="small" color={c.ink}>{copy('board.compose.private')}</T>
        </BoardCard>
      )}

      <View style={{ marginTop: space.md }}>
        <TextField
          ref={titleRef}
          label={copy('board.compose.titleField')}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          help={copy('board.compose.titleHint')}
          problem={titleShort ? copy('board.compose.titleShort') : null}
          autoCapitalize="sentences"
        />
      </View>
      <T v="label" style={{ marginTop: space.md }}>{copy('board.compose.details')}</T>
      <View style={{ marginTop: space.xs }}>
        <NoteField ref={bodyRef} value={body} onChangeText={setBody} placeholder={copy('board.compose.details')} accessibilityLabel={copy('board.compose.details')} maxLength={2000} />
      </View>
      <View style={{ marginTop: space.md }}>
        <TextField
          label={copy('board.compose.link')}
          value={itemRef}
          onChangeText={setItemRef}
          maxLength={84}
          autoCapitalize="none"
          help={copy('board.compose.link.hint')}
          problem={refBad ? copy('board.compose.link.bad') : null}
        />
      </View>

      {lookForDupes && dupes.length > 0 && (
        <View style={{ marginTop: space.md }}>
          <T v="label">{copy('board.compose.dupes')}</T>
          {dupes.map((p, i) => (
            <PostRow key={p.id} post={p} last={i === dupes.length - 1} />
          ))}
        </View>
      )}

      {/* The live leak card: blocked (Post off) or a warning. */}
      {check.bank ? (
        <BoardCard title={copy('board.leak.title')}>
          <T v="small" color={c.ink} style={{ marginTop: space.xs }}>{copy('board.leak.body')}</T>
          {check.questionId && <Button kind="secondary" label={copy('board.leak.report')} onPress={privateReport.open} style={{ marginTop: space.sm }} />}
          <Button
            kind="ghost"
            label={copy('board.leak.edit')}
            onPress={() => (check.field === 'body' ? bodyRef : titleRef).current?.focus()}
            style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
          />
        </BoardCard>
      ) : check.recall ? (
        <BoardCard grouped>
          <T v="small" color={c.ink}>{copy('board.leak.recall')}</T>
        </BoardCard>
      ) : check.reject ? (
        <BoardCard grouped>
          <T v="small" color={c.ink}>{copy(check.reject === 'links' ? 'board.reject.links' : 'board.reject.words')}</T>
        </BoardCard>
      ) : null}
      {checking && (title.trim() || body.trim()) ? <T v="meta" style={{ marginTop: space.sm }}>{copy('board.compose.checking')}</T> : null}

      {me && (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: space.lg }}>
          <T v="small">{copy('board.compose.as', { handle: me.handle })}</T>
          <Button kind="ghost" label={copy('board.compose.change')} accessibilityLabel={`${copy('board.compose.change')}, ${copy('board.gate.appear')}`} onPress={() => router.push({ pathname: '/board/guidelines', params: { then: 'back', name: '1' } })} />
        </View>
      )}
      <Button label={busy ? copy('board.compose.posting') : copy(editId ? 'board.compose.save' : 'board.compose.post')} disabled={!canPost} onPress={() => void post()} style={{ marginTop: space.md }} />
      {problem && <AccountNotice text={problem} />}
      <T v="meta" style={{ marginTop: space.lg }}>{copy('board.compose.rules')}</T>
      <Button kind="ghost" label={copy('board.foot.rules')} onPress={() => router.push('/board/guidelines')} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      <T v="meta">{cert.trademarkNotice}</T>
      {privateReport.sheet}
    </Screen>
  );
}
