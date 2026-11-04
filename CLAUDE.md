# Flitters web (this repo) — notes for any AI/dev working here

The owner is a beginner "vibe coder" working ONLY from a phone (Termux). Rules:
- Never ask them to run code/SQL that lives inside a zip. Deliver changed files in a zip and put every
  command (unzip, git, SQL to paste in Supabase) in the chat message, outside the zip.
- Their deploy flow: unzip over ~/sphere -> git add/commit/push -> Vercel builds.
- Native app (Expo, separate repo/zip) is the design reference. Web should match it: colors, features.

## Folder map (src/)
- app/            Next.js routes (page.js loads the app, auth/, stories/, privacy/, api/ ...)
- components/app/FlittersApp.js   the main shell (tabs, DM list, state). Still big; split further as screens are ported.
- components/common/   Avatar, Skeletons, Linkify, LinkPreviewCard, ReportModal, EmojiGrid, InAppToast, ErrorBoundary
- components/feed/     PostCard, CommentThread, QuotedPostPreview, AdCard, ReelPreviewCard, AnnouncementBanner
- components/chat/     MessageBubble, GroupChat, StickerTray, StickerMedia, VoiceMessage, ReplyBars
- components/profile/  UserProfileView, MyProfileView
- components/settings/ SettingsView, VerifyForm, ThemeToggleRow
- components/reels/ ReelsView · store/ StoreSection · pulse/ PulseTab · ai/ FlittersAI · admin/ AdminPanel · notifications/
- lib/             api.js, colors.js, constants.js, links.js, timeAgo.js, hooks/, media/, supabase/ (instance.js = shared client)

## Colors / theme (copied from native lib/theme.ts)
All colors live in src/app/globals.css as CSS variables, for dark (default) and [data-theme="light"].
- Use var(--primary), var(--like), var(--repost), var(--danger), var(--bg-app), var(--bg-card*), var(--text-*), var(--border-color*).
- rgba with a theme color: rgba(var(--primary-rgb),0.15)  (also --danger-rgb, --repost-rgb).
- Text on a colored button: '#fff'.
- EXCEPTION: colors that are DATA (user avatar_color, group color, pulse bg, palettes, anything saved to the
  database or written as `${color}88`) must stay real hex like '#5B9CF6' — var() does not work there.

## No full build available in the AI sandbox
npm registry is blocked there, so changes are checked with esbuild + a TypeScript undefined-variable scan,
not `next build`. If Vercel build fails, send the error text.

## Desktop layout rules
- >=900px: DesktopShell (sidebar) + .dk-main column. Phones are untouched (sidebar hidden by CSS).
- Any new full-screen `position:fixed` page must get className="dk-page" (or "dk-bar" for a fixed header/footer) so it stays inside the column. Phone-only floating things get "dk-hide".

## Feed
- For You uses the Supabase RPC feed_ranked (SQL in sql/ranked_feed.sql). If it is not installed the feed silently falls back to the old on-device ranking in loadPosts.
- Seen posts are saved to table post_views (lib/seen.js).

## Hashtags, saved posts, verification
- #tags in post text call openHashtag() (components/common/Linkify.js) which fires a window event `flitters:hashtag`; the shell (FlittersApp.js) listens and shows HashtagView. Saved screen is `showSaved`.
- Saved posts are stored only in localStorage `saved_posts_v1:<uid>` (max 100), same as native. No SQL needed.
- All verified/authentic badges go through components/common/VerifiedBadge.js. The big animated one (components/verify/AnimatedBadge.js) is only for the Get Verified page (GetVerifiedView). Billing is Google Play only; the web page just shows status and calls /api/billing/refresh.
- Videos: lib/videoPrefs.js makes only one feed video play at a time, shares one mute state, and holds the Autoplay setting (localStorage `flitters_autoplay`). Use `useExclusiveVideo` for any new feed video.
- Get Verified is crypto-only (no Play billing on web). Add Paystack by adding an entry to PAY_METHODS in components/verify/GetVerifiedView.js.
- Profile cover photos use profiles.cover_url (same as native); upload is in Settings > Edit Profile.
