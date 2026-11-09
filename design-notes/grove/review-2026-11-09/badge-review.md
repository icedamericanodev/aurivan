# KaiSip milestone badges

Current direction: remove plants, pets, and Pocket Groves from the proposed learner experience. A quiet badge collection records work already completed during review. Earlier Grove and Kin artifacts in this review branch are superseded design history.

## Clickable review

Open `kaisip-badges.html`. Tap a badge to see its requirement. Use the clearly separated sample-progress button to simulate the next milestone and earn a badge. The You link shows the proposed compact entry and simpler five-area progress rows.

Matches the existing warm paper palette, Fraunces/Figtree typography, forest milestone panel, back navigation and simple rows. No character art, care tasks, currencies, streak penalties, blocking celebrations or animation. Badges stay outside the study flow. Six sample milestones illustrate the interaction; award rules require product review before implementation. Badges represent completed activity, not exam readiness or correctness.

Prototype storage is local to the preview. Sample milestone controls are not learning events. The five-area example is a fixed early-progress sample and does not update from badge simulations.

## Verification and scope

`node badge-prototype-check.cjs` validates selection, awarding, duplicate prevention, completion, navigation, saved-state restoration and malformed-state filtering. JavaScript syntax checked with Node. No browser layout test or production app test was run. This is a self-contained design prototype, not a production implementation; the app checkout and live study data were not changed.

Only embedded fonts contribute binary payload. No pet, grove or plant images are loaded. HTML is about 95 KB before compression; this is prototype size, not an installed-app measurement. Font licenses remain in `font-licenses.txt`.
