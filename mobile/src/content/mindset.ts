/**
 * Mindset tips for the Practice tab's strip (Grove Phase 4, PHASE4.md 7.8 item 3 and O7).
 *
 * Plain English: the website rotates short "Mindset." tips on its Practice page. The phone will show
 * the same list once it is added to the phone's content pack, which waits for the owner's yes (O7).
 * Until then this returns no tips, and the strip on Practice hides itself (it is built, never empty).
 */
export function mindsetTipsFor(certId: string): readonly string[] {
  // No pack has tips yet; the id is kept so the call site stays the same once one does.
  void certId;
  return [];
}
