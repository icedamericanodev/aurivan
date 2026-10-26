# Native Slop: Named Anti-Pattern Tells

> **KaiSip note (read first).** Frozen, trimmed copy of Expo's `native-slop.md`
> (expo/skills, commit d5caf7f, MIT; see `README.md` and `LICENSE-expo.txt`).
> It is a **review checklist only**. Grove (`docs/mobile/DESIGN_SYSTEM.md`) and
> `mobile/src/theme/tokens.ts` always win on conflict. A hit is a question to
> ask, never an automatic fix.
>
> Changed for KaiSip: the "Native instead" cells that pushed SF Symbols /
> Material icons, the system font, platform semantic colours, `@expo/ui`,
> `NativeTabs`, the native stack header and `react-native-keyboard-controller`
> are replaced with Grove's answer (marked *KaiSip*). The shell command block
> is now a table of search patterns for the Grep tool. Nothing here tells you
> to run a command or install a package.

Recurring mistakes in generated React Native apps, with names, observable tells, and preferred replacements. Use these as review prompts: explain what harms the task, readability, or platform behavior. A card, font, gradient, or onboarding flow is not a defect by itself; respect the user's brief and existing design system. Interaction failures such as obscured inputs or false-empty states still need fixing.

## The 20 tells

| # | Name | The tell (observable) | Native instead |
|---|---|---|---|
| 1 | **The Web Modal** | A custom centered dialog for picking or composing that ignores keyboard space and platform dismissal | *KaiSip:* Grove's `Sheet` / `ChoiceSheet` (DESIGN_SYSTEM §6) or a full-screen page sheet for longer flows; native alerts only for consequential confirmations |
| 2 | **The X-Button Sheet** | A sheet closed only by an "X" in the top corner - no grab handle, no swipe-to-dismiss | *KaiSip:* Grove's `Sheet` closes by its Close / Cancel / Done button, a tap on the dim, Android Back and the VoiceOver escape gesture, and has no drag handle by design (§6). Flag a sheet that lacks any of those exits |
| 3 | **Emoji Iconography** | Emoji as tab icons, buttons, or empty-state art | *KaiSip:* Lucide plus Grove's own botanical glyphs (24 grid, 1.75 stroke; DESIGN_SYSTEM §7), one family across both platforms |
| 4 | **The Purple-Gradient Hero** | A decorative gradient intro pushes useful content and the primary task below the fold | Lead task screens with useful content under a navigation title; keep a hero when it serves the requested experience (*KaiSip:* the one forest hero panel per screen is deliberate) |
| 5 | **The Floating Pill Tab Bar** | A custom rounded, inset, drop-shadowed tab bar hovering above the home indicator | *KaiSip:* Grove's flat tab bar (56 + safe area, `bg` fill, 1px `line` top border; §6) is custom by design. Flag only drift from that spec |
| 6 | **Inter Everywhere** | An arbitrary downloaded font replaces the app's typography, with missing weights or poor readability | *KaiSip:* Fraunces and Figtree only, chosen by `fontFamily` from the type ramp (§1-2); verify weights, readability and scaling. Any other font is the tell |
| 7 | **Everything's a Card** | Every list row and section wrapped in its own white rounded shadowed card; cards nested inside cards | Grouping via background + hairlines, not boxes (*KaiSip:* Grove §5 surface rules: default is no card, never nest) |
| 8 | **Shadowboxing** | Heavy drop shadows (opacity at least 0.15, radius at least 10) doing hierarchy's job on white-on-white surfaces | 2-3 tokened elevation levels; hierarchy from the type ramp and grouping. iOS is a low-shadow platform (*KaiSip:* one `cardShadow`, light mode, L2 cards only) |
| 9 | **Wireframe Borders** | A 1px gray `borderWidth` outlining every container - usually Tailwind's `#E5E7EB` from web muscle memory | Spacing and surface contrast; hairlines only as list separators (`StyleSheet.hairlineWidth`, the theme's `line` token) |
| 10 | **alert() Confirmation** | Alerts interrupt routine undoable actions, report success, or replace field validation | Native confirmation alert for uncommon irreversible actions; undo for routine reversible ones. Field errors stay inline; success updates the UI |
| 11 | **The Hand-Rolled Header** | `headerShown: false` plus a `<Text>` title and custom back button - losing large-title collapse, back-swipe, and scroll-to-top | *KaiSip:* the custom `ScreenTitle` / `PushedHeader` are deliberate (§6 Header). Check they keep back-swipe, Android Back, the 44pt hit area and a screen-reader header |
| 12 | **16-Everything** | The same 16px padding on every axis at every level; section gaps equal row gaps, so proximity carries no meaning | The spacing scale with distinct steps: row gap < group gap < section gap |
| 13 | **The Squish Reflex** | `scale: 0.96` press feedback on *every* touchable - including full-width list rows - or `TouchableOpacity`'s washed-out flash | Rows highlight (background change); buttons scale slightly or dim; `Pressable` with per-role feedback (*KaiSip:* `usePressScale`, §8.4). Never `TouchableOpacity` |
| 14 | **The Grand Entrance** | Staggered `FadeInDown.delay(i * 100)` on every list and screen, replaying on every visit | Entrance animation only for rare/first-time moments (see `expo-animation.md`'s frequency gate); routine screens just appear |
| 15 | **The Onboarding Carousel** | Generic promotional slides delay the first useful screen without collecting required setup or teaching necessary concepts | Start with useful content and contextual guidance; retain onboarding that serves required setup or the user's brief |
| 16 | **Cross-Platform Costume** | One platform wearing the other's uniform: a FAB or ripple in an iOS-idiom app; iOS back-chevrons, large titles, or iOS-styled switches on Android | Each platform gets its own HIG's idiom - or a deliberate, documented platform-neutral treatment (*KaiSip:* Grove is the documented platform-neutral treatment) |
| 17 | **Safe-Area Collision** | Content under the notch/Dynamic Island or home indicator - or hand-patched with `marginTop: 50` | Headers/tab bars handle it; otherwise `contentInsetAdjustmentBehavior="automatic"` or safe-area-context insets |
| 18 | **Dark-Mode Amnesia** | Hardcoded `#fff` / `#000` / gray hexes; the app breaks - or half-breaks - the moment the OS theme flips | *KaiSip:* Grove tokens from `useTheme()`, every colour a declared light/dark pair in `tokens.ts`; not platform semantic colours |
| 19 | **The Spinner Blink** | A full-screen centered `ActivityIndicator` between every state, or "No items yet" flashing while the first fetch resolves | Four-state screens: loading is not empty, keep stale content while revalidating, `RefreshControl`, skeletons for slow initial loads with a known layout |
| 20 | **Keyboard Blindness** | The focused input or the submit button disappears behind the keyboard; buttons above a keyboard need two taps | Keep the focused field and its submit button visible; `keyboardShouldPersistTaps="handled"` for forms/search, `"always"` when unhandled taps must also keep the keyboard open (*KaiSip:* `react-native-keyboard-controller` is not installed; adding it needs the owner's approval) |

For confirmation choices, follow Apple's Human Interface Guidelines on alerts: uncommon irreversible actions warrant confirmation; routine undoable actions generally do not.

## Search patterns for the greppable tells

Use these with the Grep tool over `mobile/src` (exclude `mobile/src/theme/`). They find candidates, not verified defects. Two hit classes:

- **review-each** - legitimate uses exist; check each hit against the tell's description.
- **advisory** - hits only suggest the tell; confirm on a screenshot.

| Class | Pattern (regex, `*.tsx`) | Tell |
|---|---|---|
| review-each | `TouchableOpacity\|TouchableHighlight\|TouchableWithoutFeedback` | #13 The Squish Reflex (Pressable only) |
| review-each | `fontFamily:` outside the theme | #6 Inter Everywhere (may reference a valid Grove font token) |
| review-each | `<Modal` | #1 The Web Modal |
| review-each | `Alert\.alert` | #10 alert() Confirmation |
| review-each | `LinearGradient\|experimental_backgroundImage` | #4 The Purple-Gradient Hero |
| review-each | `headerShown:\s*false` | #11 The Hand-Rolled Header (expected in KaiSip; check the header keeps its behaviours) |
| review-each | `tabBarStyle` | #5 The Floating Pill Tab Bar |
| advisory | Emoji presentation characters (`\p{Emoji_Presentation}`, or U+FE0F) | #3 Emoji Iconography (content strings may contain emoji; glyph-as-icon is the tell) |

`expo-design-audit.md` §1 finds related token candidates for #18 Dark-Mode Amnesia, #12 16-Everything, and #8 Shadowboxing. Token compliance does not prove readable dark mode, useful spacing hierarchy, or restrained shadows; inspect the rendered screen too.

Screenshot-only tells (no search precise enough to trust): #2 X-Button Sheet, #7 Everything's a Card, #9 Wireframe Borders, #15 Onboarding Carousel, #16 Cross-Platform Costume, #17 Safe-Area Collision. Three more need a running app: #14 The Grand Entrance (re-enter a screen), #19 The Spinner Blink (watch the first load and a refetch), #20 Keyboard Blindness (keyboard open). Check #16 on both platforms.
