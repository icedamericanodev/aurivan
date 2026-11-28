# KaiSip emails for Kit

The KaiSip email design for Kit (the email service the waitlist uses) and the
first emails written for it. Start with `KIT_STEPS.md`: it is written for the
owner, step by step. Nobody on the project can log in to Kit, so the owner
pastes these in herself.

- `kaisip-kit-template.html`: the reusable shell (header, body styles, footer).
- `emails/`: the wording for each email, as HTML for the message slot and as plain text.
- `previews/`: how they should look.
- `_build/`: the script that generated the snippets, logo and previews (the
  stand-in preview fonts are not kept in the repo).
- The one image the emails load is `assets/email/kaisip-email-logo-forest.png`,
  published at `https://kaisip.com/assets/email/kaisip-email-logo-forest.png`.
  Never rename or remove it: sent emails keep pointing at that address.

Made 28 Nov 2026. Not tested in Kit or a real inbox yet; `KIT_STEPS.md` lists
what could not be checked.
