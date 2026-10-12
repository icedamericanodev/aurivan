/**
 * The composer (spec §4.2 "Composer"), aurivan://board/new (and
 * ?edit=<post id> for your own post). The type chips, the title, the
 * details, "Link an item (optional)", "Posting as {handle} · Change", the
 * live leak card, the rules line, the guidelines and the not-affiliated
 * line.
 *
 * - Signed out: the sign-in sheet. Before the guidelines are accepted (or
 *   after they change): the gate. Nothing is sent before both.
 * - The live check (a moment after typing stops) runs board-submit's own
 *   rules on the phone: near-verbatim text from a practice question
 *   disables Post and shows the leak card ("Report it privately" opens the
 *   private report on that question; nothing about it is shown); a recalled
 *   real-exam question shows a warning (a person checks it first).
 * - Offline, the post is kept here as a draft (one) and the screen says so.
 * - A new member's post, or one the filters hold, waits for review: "Waiting
 *   for review", with why.
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
import { checkDraft, loadDraft, loadFeed, loadPost, needsGate, postProblem, submitPost, useBoard, type DraftCheck } from '../../../lib/board';
import { useAccount } from '../../../store/account';
import { useSettings } from '../../../store/settings';
import { space } from '../../../theme/tokens';
import { useTheme } from '../../../theme/useTheme';

const ITEM_REF = /^(q|note|lesson|card|app):[A-Za-z0-9_.:#-]{1,80}$/;
const NO_CHECK: DraftCheck = { bank: false, questionId: null, recall: false, reject: null };
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
  const params = useLocalSearchParams<{ edit?: string; kind?: string }>();
  const editId = typeof params.edit === 'string' ? params.edit : undefined;
  const certId = useSettings((s) => s.activeCertId);
  const cert = getCertification(certId) ?? getCertification('cisa')!;
  const signedIn = useAccount((s) => s.signedIn);
  const me = useBoard((s) => s.me);
  const settings = useBoard((s) => s.settings);
  const initialKind = KINDS.find((k) => k === params.kind) ?? 'idea';
  const [kind, setKind] = useState<PostKind>(initialKind);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [itemRef, setItemRef] = useState('');
  const [checked, setChecked] = useState<{ key: string; result: DraftCheck } | null>(null);
  const [dupes, setDupes] = useState<PostCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const titleRef = useRef<TextInput>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/board'));

  // Prefill: your own post (an edit), or the draft kept offline.
  useEffect(() => {
    let live = true;
    void (async () => {
      if (editId) {
        const r = await loadPost(editId);
        if (live && r.ok && me && r.post.authorId === me.userId) {
          setKind(r.post.kind);
          setTitle(r.post.title);
          setBody(r.post.body);
          setItemRef(r.post.itemRef ?? '');
        }
        return;
      }
      const d = await loadDraft();
      if (live && d) {
        setKind(d.kind);
        setTitle(d.title);
        setBody(d.body);
        setItemRef(d.itemRef ?? '');
      }
    })();
    return () => {
      live = false;
    };
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // The live check: a moment (400 ms) after typing stops.
  const text = `${title}\n${body}`;
  const ref = itemRef.trim() || null;
  const empty = !title.trim() && !body.trim();
  const newMember = (me?.approvedPosts ?? 0) === 0;
  const checkKey = `${cert.id}|${ref ?? ''}|${newMember}|${text}`;
  useEffect(() => {
    if (empty) return;
    // The first check also builds the bank's fingerprint (once a session, from the bundled questions).
    const t = setTimeout(() => setChecked({ key: checkKey, result: checkDraft(cert.id, text, ref, newMember) }), 400);
    return () => clearTimeout(t);
  }, [checkKey, empty, cert.id, text, ref, newMember]);
  // Until the latest words are checked, the last answer stays on screen and Post waits.
  const check = empty ? NO_CHECK : (checked?.result ?? NO_CHECK);
  const checking = !empty && checked?.key !== checkKey;

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

  if (!signedIn) return <Redirect href="/account/sign-in" />;
  if (settings && needsGate(me, settings)) return <Redirect href={{ pathname: '/board/guidelines', params: { then: 'compose' } }} />;

  const paused = settings?.postingOpen === false;
  const titleShort = title.trim().length > 0 && title.trim().length < 8;
  const refBad = ref !== null && !ITEM_REF.test(ref);
  const canPost = !busy && !paused && !check.bank && !checking && title.trim().length >= 8 && !refBad;

  const post = async () => {
    if (!canPost) return;
    setBusy(true);
    setProblem(null);
    const d: Draft = { kind, title, body, cert: cert.id, ...(ref ? { itemRef: ref } : {}) };
    const r = await submitPost(d, editId);
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
        <T v="display" accessibilityRole="header" style={{ marginTop: space.sm }}>{copy('board.held.title')}</T>
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
        <BoardCard tone="soft">
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
        <NoteField value={body} onChangeText={setBody} placeholder={copy('board.compose.details')} accessibilityLabel={copy('board.compose.details')} maxLength={2000} />
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
          <Button kind="ghost" label={copy('board.leak.edit')} onPress={() => titleRef.current?.focus()} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
        </BoardCard>
      ) : check.recall ? (
        <BoardCard>
          <T v="small" color={c.ink}>{copy('board.leak.recall')}</T>
        </BoardCard>
      ) : check.reject ? (
        <BoardCard>
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
