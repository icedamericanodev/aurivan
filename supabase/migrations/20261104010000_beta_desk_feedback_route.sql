-- KaiSip Beta Desk: a tester also qualifies with feedback (4 Nov 2026).
-- Applied seventh, after 20261104000000_beta_desk.sql. Append-only once applied.
--
-- Why: the published promise (kaisip.com/beta, the sign-up form, and
-- marketing/BETA_PROGRAM.md "Who qualifies", approved 4 Nov 2026) is
--   "stay in the Android test for 14 days, OR send at least one piece of
--    feedback during the beta".
-- The first Beta Desk migration allowed approval only by the 14-day route.
-- The owner chose to keep the published promise (privacy review, 4 Nov 2026).
--
-- Approval now needs the terms on record AND one of two routes:
--   1. 14 days: a Google Play opt-in, approval on or after opt-in + 14 days,
--      and a passed participation check (continuous, or a technical gap the
--      owner accepted);
--   2. feedback: a feedback date recorded, and approval on or after it.
-- The reward is six months of CISA Premium (owner decision, 4 Nov 2026); the
-- default terms say so, in the published wording.

alter table public.beta_testers drop constraint beta_testers_approval_rules;
alter table public.beta_testers add constraint beta_testers_approval_rules check (
  completion <> 'approved' or (
    length(btrim(terms_offered)) > 0
    and (
      (opted_in_on is not null
        and approved_on >= opted_in_on + 14
        and participation in ('continuous', 'interrupted_technical'))
      or (last_feedback_on is not null
        and approved_on >= last_feedback_on))));

alter table public.beta_desk_settings alter column terms_offered set default
  'Stay in the Android test on Google Play for 14 days, or send at least one genuine piece of feedback during the beta. Reward: 6 months of CISA Premium content and app features, starting when Premium launches. Other certifications are not included.';
-- The settings row still holds the first default (nobody has edited it yet): move it to the new wording.
update public.beta_desk_settings
   set terms_offered = 'Stay in the Android test on Google Play for 14 days, or send at least one genuine piece of feedback during the beta. Reward: 6 months of CISA Premium content and app features, starting when Premium launches. Other certifications are not included.'
 where id
   and terms_offered = 'Stay opted in to the Google Play beta for 14 days in a row and send feedback. Reward: 6 months of CISA premium content and app features. Other certifications are not included.';
