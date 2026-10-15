/**
 * Feedback board pieces (Uplift Phase 8, built OFF; spec §4.2 and
 * DESIGN_SYSTEM.md §19). Only the (cloud)/board screens and the cloud-only
 * entry rows use these, so with the flag off none of them ever renders.
 *
 * - Statuses use the soft Tag style and a glyph (○ ◔ ◑ ◕ ● ✓ – ⇢), never the
 *   correct-answer green or the wrong-answer red.
 * - The vote pill is 52×56 and says "Vote for: {title}. {n} votes. Voted."
 * - Learners' text is always plain <Text>: no link detection, no markdown, so
 *   a "javascript:" or "https://" string stays inert words.
 * - The ⋯ menu is a sheet of full-width buttons (Report, Block, and Edit /
 *   Withdraw on your own items). The chosen action runs once the menu has
 *   closed: iOS drops a second sheet or an alert opened in the same moment
 *   (fix round P8, UX H2).
 * - Screen readers hear a status's words, never its glyph (UX precision).
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { copy, type AccountCopyKey } from '../content/cloud/copy';
import type { PostCard, PostKind, PostStatus, ReportReason } from '../cloud/types';
import { boardReady, loadFeed, statusLabel, useBoard } from '../lib/board';
import { config } from '../lib/config';
import { useSettings } from '../store/settings';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, MessagesSquare } from './icons';
import { SettingsGroup, SettingsRow, Sheet } from './settings';
import { Button, ICON_SIZE, ListRow, NoteField, RadioRow, T } from './ui';

export const STATUS_GLYPH: Record<PostStatus, string> = {
  open: '○',
  under_review: '◔',
  planned: '◑',
  in_progress: '◕',
  shipped: '●',
  answered: '✓',
  not_planned: '–',
  duplicate: '⇢',
};

export const KINDS: readonly PostKind[] = ['content', 'idea', 'app', 'question'];
export const kindLabel = (k: PostKind) => copy(`board.type.${k}` as AccountCopyKey);

/** A post's status as a quiet tag: the glyph and its words (never green or red). Screen readers hear the words only. */
export function StatusTag({ status, shippedIn }: { status: PostStatus; shippedIn: string | null }) {
  const { c } = useTheme();
  const words = statusLabel(status, shippedIn);
  return (
    <View
      accessible
      accessibilityLabel={words}
      style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: c.soft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}
    >
      <T v="meta" color={c.ink}>{`${STATUS_GLYPH[status]} ${words}`}</T>
    </View>
  );
}

/** "KaiSip team", the badge next to a staff handle and on the official response. */
export function TeamBadge() {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.soft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <T v="caption" color={c.accentText}>{copy('board.team.badge')}</T>
    </View>
  );
}

/** The vote pill: 52×56, ▲ over the count. A tap votes or takes the vote back. Faded when voting is off (a locked or waiting post). */
export function VotePill({ title, count, voted, onPress, disabled }: { title: string; count: number; voted: boolean; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy('board.vote.a11y', { title, n: String(count), state: copy(voted ? 'board.vote.on' : 'board.vote.off') })}
      accessibilityHint={copy(voted ? 'board.hint.unvote' : 'board.hint.vote')}
      accessibilityState={{ selected: voted, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 52,
        minHeight: 56,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: voted ? c.ink : c.line,
        backgroundColor: voted ? c.ink : pressed ? c.soft : c.raised,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <T v="label" color={voted ? c.bg : c.ink}>▲</T>
      <T v="label" num color={voted ? c.bg : c.ink}>{String(count)}</T>
    </Pressable>
  );
}

const commentsLine = (n: number) => (n === 0 ? copy('board.comments.none') : n === 1 ? copy('board.comments.one') : copy('board.comments.many', { n: String(n) }));

/**
 * One post in a list: the vote pill, the title, "Idea · ◑ Planned · Quiet
 * Cedar 214", the comments line. Your own post that waits for review says
 * "Waiting for review" instead of its status (not "Open" beside it).
 */
export function PostRow({ post, onVote, last }: { post: PostCard; onVote?: () => void; last?: boolean }) {
  const { c } = useTheme();
  const waiting = post.visibility === 'pending';
  const status = waiting ? copy('board.held.title') : statusLabel(post.status, post.shippedIn);
  const who = post.isTeam ? copy('board.team.badge') : post.authorHandle;
  const meta = [kindLabel(post.kind), waiting ? status : `${STATUS_GLYPH[post.status]} ${status}`, who];
  const second = post.teamReplied ? `${commentsLine(post.commentCount)} · ${copy('board.teamReplied')}` : commentsLine(post.commentCount);
  return (
    <View style={{ flexDirection: 'row', gap: space.md, paddingVertical: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line, alignItems: 'flex-start' }}>
      {onVote ? <VotePill title={post.title} count={post.voteCount} voted={post.voted} onPress={onVote} /> : null}
      <Pressable
        accessibilityRole="button"
        // The words only: the status glyph isn't read out.
        accessibilityLabel={`${post.title}. ${[kindLabel(post.kind), status, who].join(', ')}. ${second}`}
        accessibilityHint={copy('board.hint.post')}
        onPress={() => router.push({ pathname: '/board/[id]', params: { id: post.id } })}
        style={({ pressed }) => ({ flex: 1, minHeight: 56, justifyContent: 'center', borderRadius: radius.md, backgroundColor: pressed ? c.soft : 'transparent' })}
      >
        <T v="headline">{post.title}</T>
        <T v="meta" style={{ marginTop: 2 }}>{meta.join(' · ')}</T>
        <T v="meta">{second}</T>
      </Pressable>
    </View>
  );
}

export interface MenuItem {
  label: string;
  onPress: () => void;
  danger?: boolean;
}

/** How long the ⋯ menu takes to close before its action runs (its fade, plus a little). */
export const MENU_CLOSE_MS = 350;

/**
 * The ⋯ menu as a sheet: one full-width button per action. The action runs
 * once the menu has closed (UX H2: on iOS, a Report sheet or a Block alert
 * opened while this one is still closing is dropped).
 */
export function ItemMenu({ visible, title, items, onClose }: { visible: boolean; title: string; items: MenuItem[]; onClose: () => void }) {
  const chosen = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (visible || !chosen.current) return;
    const run = chosen.current;
    chosen.current = null;
    const t = setTimeout(run, MENU_CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose} title={title} closeLabel={copy('board.menu.cancel')}>
      {items.map((it) => (
        <Button
          key={it.label}
          kind={it.danger ? 'danger' : 'secondary'}
          label={it.label}
          onPress={() => {
            chosen.current = it.onPress;
            onClose();
          }}
          style={{ marginTop: space.sm }}
        />
      ))}
    </Sheet>
  );
}

/** The ⋯ button that opens it (48pt). */
export function MenuButton({ onPress, label = copy('board.menu.a11y') }: { onPress: () => void; label?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={copy('board.hint.menu')}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: pressed ? c.soft : 'transparent' })}
    >
      <T v="headline" color={c.ink}>⋯</T>
    </Pressable>
  );
}

export const REPORT_REASONS: readonly ReportReason[] = ['exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic', 'other'];

/** The Report sheet: one reason (required), an optional note, Send; then the thanks line. */
export function ReportSheet({
  visible,
  kind,
  onClose,
  onSend,
}: {
  visible: boolean;
  kind: 'post' | 'comment' | 'member';
  onClose: () => void;
  onSend: (reason: ReportReason, note: string) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const close = () => {
    setReason(null);
    setNote('');
    setSent(false);
    onClose();
  };
  const title = copy(kind === 'post' ? 'board.report.title.post' : kind === 'comment' ? 'board.report.title.comment' : 'board.report.title.member');
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={title}
      closeLabel={sent ? copy('board.held.done') : copy('board.menu.cancel')}
      footer={
        sent ? null : (
          <Button
            label={copy('board.report.send')}
            disabled={!reason}
            onPress={() => {
              if (!reason) return;
              onSend(reason, note);
              setSent(true);
            }}
          />
        )
      }
    >
      {sent ? (
        <T v="body" accessibilityRole="text">
          {kind === 'member' ? copy('board.report.done.member') : copy('board.report.done', { item: copy(kind === 'comment' ? 'board.item.comment' : 'board.item.post') })}
        </T>
      ) : (
        <>
          {REPORT_REASONS.map((r, i) => (
            <RadioRow key={r} title={copy(`board.report.reason.${r}` as AccountCopyKey)} checked={reason === r} onPress={() => setReason(r)} last={i === REPORT_REASONS.length - 1} />
          ))}
          <View style={{ marginTop: space.md }}>
            <NoteField value={note} onChangeText={setNote} placeholder={copy('board.report.note')} accessibilityLabel={copy('board.report.note')} maxLength={500} />
          </View>
        </>
      )}
    </Sheet>
  );
}

/**
 * A tinted block for the composer's leak card, a held post and refusals
 * (tip tint: Grove keeps red for wrong answers). `grouped` reads it as one
 * element: only for words alone, never when it holds a button (the spoiler
 * card's "Show it" must stay reachable: CR B7).
 */
export function BoardCard({ title, children, tone = 'tip', grouped = false }: { title?: string; children: ReactNode; tone?: 'tip' | 'soft'; grouped?: boolean }) {
  const { c } = useTheme();
  return (
    <View accessible={grouped} style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: tone === 'tip' ? c.tipBg : c.soft }}>
      {title ? <T v="label" color={c.ink} accessibilityRole="header">{title}</T> : null}
      {children}
    </View>
  );
}

/** The official response: an accent left rule, "KaiSip team · official response", the words. */
export function OfficialCard({ body }: { body: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: space.lg, paddingLeft: space.md, borderLeftWidth: 3, borderLeftColor: c.accentText }}>
      <T v="caption" color={c.accentText}>{copy('board.team')}</T>
      <T v="body" style={{ marginTop: space.xs }}>{body}</T>
    </View>
  );
}

/** The community guidelines on the web (the draft page lives next to privacy.html: docs/legal/cloud/community.html). */
export function communityUrl(): string {
  return /privacy\.html$/.test(config.privacyUrl) ? config.privacyUrl.replace(/privacy\.html$/, 'community.html') : '';
}

/** The board's foot: the published contact, the guidelines, and the not-affiliated line (from the exam's own notice). */
export function BoardFooter({ trademarkNotice }: { trademarkNotice: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.line }}>
      <T v="small" selectable>{copy('board.foot.contact', { supportEmail: config.feedbackEmail })}</T>
      <Button kind="ghost" label={copy('board.foot.rules')} onPress={() => router.push('/board/guidelines')} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
      <T v="meta">{trademarkNotice}</T>
    </View>
  );
}

/**
 * What's New's thank-you line (cloud builds only): shown only when the board
 * has a shipped idea to thank people for (UX precision; never with the flag
 * off: boardReady() is false there, so nothing is asked).
 */
export function BoardCreditLine() {
  const certId = useSettings((s) => s.activeCertId);
  const [shipped, setShipped] = useState(false);
  useEffect(() => {
    if (!boardReady()) return;
    let live = true;
    void loadFeed({ cert: certId, tab: 'shipped' }).then((r) => {
      if (live && r.ok && r.items.length > 0) setShipped(true);
    });
    return () => {
      live = false;
    };
  }, [certId]);
  if (!shipped) return null;
  return <T v="meta" style={{ marginTop: space.xl }}>{copy('board.whatsnew.credit')}</T>;
}

/** Open the community guidelines page (when this build has its address). */
export function openCommunityPage() {
  const url = communityUrl();
  if (url) void Linking.openURL(url).catch(() => {});
}

// ── Entry points (cloud builds only) ──────────────────────────────────
/** You → Account: "Feedback board" (after the account row). */
export function BoardRow({ last }: { last?: boolean }) {
  const { c } = useTheme();
  const unread = useBoard((s) => s.unread);
  if (!boardReady()) return null;
  return (
    <ListRow
      icon={<MessagesSquare size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title={copy('board.you.title')}
      subtitle={copy('board.you.sub')}
      accessibilityLabel={`${copy('board.you.title')}. ${copy('board.you.sub')}${unread ? `. ${copy('board.activity.unread')}` : ''}`}
      accessibilityHint={copy('board.hint.open')}
      onPress={() => router.push('/board')}
      last={last}
    />
  );
}

/** The Send feedback sheet's "Post publicly instead ›" (its own light file: see boardLink.tsx). */
export { PostPubliclyLine } from './boardLink';

/** Settings → Feedback board: Your activity and Blocked learners. */
export function BoardSettingsGroup() {
  if (!boardReady()) return null;
  return (
    <SettingsGroup title={copy('board.settings.group')}>
      <SettingsRow title={copy('board.settings.activity')} onPress={() => router.push('/board/activity')} />
      <SettingsRow title={copy('board.settings.blocked')} onPress={() => router.push('/board/blocked')} last />
    </SettingsGroup>
  );
}
