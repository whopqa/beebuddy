# Main UI integration

Source: local `main`, commit `6bcea756afbb03f569a9d3dee062457221b1e926`.
Work branch: `integrate-main-ui`.

## Visual baseline

- Restore the main CSS, assets, layout, navigation and motion. `globals.css` and `figma-components.css` are the main baseline; `feature-support.css` contains supplementary styles for real auth and existing functional modules.
- `/` and `/home` use the original landing page, not the added dashboard.
- Community uses the original member directory and Explore screen. Account, editing, settings, notifications, security, billing and help use the main layouts.
- Admin screens, database models, migrations, API routes and existing feature modules remain intact.
- The added feed, matching, chat and community-management modules are no longer promoted in the original web navigation. Their routes/APIs remain available; this is presentation scope, not an access-control rule.

## Functional integration and deliberate differences

- Keep email/password auth, Google, email verification and reset/change password. Apple's original visual button is disabled because Apple login is not implemented.
- Account uses real profile data and avatar upload. Occupation now persists in the existing Profile column; no migration is needed. Profile details without data show an empty/Not set state instead of a demo person's data.
- Settings keeps real language/theme saves. Notification rows use real records and mark-read. Security uses actual session metadata and revocation.
- Community search uses the existing masked, maximum-three-profile preview API; Connect retains the original onboarding destination. Skills/availability are disabled because those search fields are not implemented. Explore uses real posts, likes, comments and share links.
- Preserve the four billing-card layout. Free/Explorer/Buddy+ map to FREE/VIP/PRO. Hive Pro is disabled/Coming soon. Prices and benefits come from the backend. PayOS is the actual checkout provider; card/address collection, PayPal and Apple Pay are disabled. Paid periods expire without automatic renewal.
- Real names, prices, counts, photos and empty/error states can differ from main's mock content. Native Google and PayOS provider screens are not controlled by main's CSS.

## Verification

- Frontend production build and backend TypeScript build.
- Backend unit tests, including profile occupation persistence.
- Visual and navigation smoke checks on the restored public web screens. Full signed-in flows and real payments still need a manual pass with configured services.

## Manual regression pass

1. Compare landing, drawer, hover/scroll effects and footer with main on desktop and a narrow viewport.
2. Login/signup/Google, email verification and reset password.
3. Open account; edit name, occupation, interests, habits, bio and avatar; save and refresh.
4. Open community, search interests, switch to Explore, like/comment/share.
5. Verify notifications and security sessions with an authenticated account.
6. Check real billing tiers and redirect to PayOS. Only transfer money when deliberately testing a real payment.
7. Confirm Admin moderation/audit/payment screens remain accessible to an Admin.
