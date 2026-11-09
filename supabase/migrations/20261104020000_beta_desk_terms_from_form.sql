-- KaiSip Beta Desk: default terms = the live sign-up form (4 Nov 2026).
-- Applied eighth, after 20261104010000_beta_desk_feedback_route.sql. Append-only once applied.
--
-- The owner's live Google Form ("KaiSip Android Beta: Tester Registration")
-- is the source of truth: 14 consecutive days in the Android test, CISA-only
-- reward starting at activation, and "earlier registrants retain the
-- eligibility conditions offered when they registered". New testers get the
-- form's terms by default; earlier sign-ups keep the terms on their own record
-- (some include "or one piece of feedback", which the approval rule from
-- 20261104010000 still accepts). Nothing else changes.

alter table public.beta_desk_settings alter column terms_offered set default
  'Join the Android closed test before the public Google Play launch, stay opted in for at least 14 consecutive days and try the CISA content and app features. A technical problem that blocks testing does not disqualify you. Reward: 6 months of CISA premium content and mobile app study features, starting when your CISA access is activated. Other certifications are excluded.';
update public.beta_desk_settings
   set terms_offered = 'Join the Android closed test before the public Google Play launch, stay opted in for at least 14 consecutive days and try the CISA content and app features. A technical problem that blocks testing does not disqualify you. Reward: 6 months of CISA premium content and mobile app study features, starting when your CISA access is activated. Other certifications are excluded.'
 where id
   and terms_offered = 'Stay in the Android test on Google Play for 14 days, or send at least one genuine piece of feedback during the beta. Reward: 6 months of CISA Premium content and app features, starting when Premium launches. Other certifications are not included.';
