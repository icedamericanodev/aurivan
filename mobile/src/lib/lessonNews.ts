/**
 * Lessons the learner finished in the lesson player during THIS app session
 * that Learn has not shown yet (in memory only, never saved).
 *
 * Learn draws a lesson's ✓ as the learner comes back only for these. A
 * lesson that arrives any other way (a backup restore, a certification
 * switch, a later sync) is simply shown done, still: nothing was just
 * finished (QA PR #42, bug 2).
 */
const finished = new Set<string>();

/** The player: this lesson was just finished for the first time. */
export function noteLessonFinished(lessonId: string): void {
  finished.add(lessonId);
}

/** Learn: was this lesson finished in the player since Learn last looked? */
export function wasJustFinished(lessonId: string): boolean {
  return finished.has(lessonId);
}

/** Learn, once it has looked (on mount and each time it comes back into view): the news is shown. */
export function clearFinishedLessons(): void {
  finished.clear();
}
