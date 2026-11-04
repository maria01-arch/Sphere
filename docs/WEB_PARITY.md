# Web vs Native — what is missing on web

Native = reference. Tick things as they are ported to web.

## Layout / navigation
- [ ] 5-tab floating pill bar like native: Home · Search · Notifications · Messages · Reels (web now: Home · Messages · Store · People · Alerts)
- [ ] Top bar with your avatar (opens Settings) + page title, hides on scroll with the tab bar
- [ ] Real routes instead of one hash page: /post/[id], /user/[id], /conversation/[id], /groups/[id], /hashtag/[tag], /saved, /settings, /edit-profile
- [ ] Offline page/banner + cached feed

## Feed & posts
- [x] "For You" ranked feed (feed_ranked SQL) + seen-posts tracking (post_views)  — needs the SQL from sql/ranked_feed.sql run once in Supabase
- [ ] Following-only interest setting
- [ ] Hashtag pages, saved/bookmarked posts, co-owners on posts
- [ ] Quote-repost modal, post share sheet, link-preview card parity, comment screen
- [ ] Ad impression/click tracking (adTracking)

## Messaging
- [ ] Pinned messages + pinned chats, chat themes, edited marker, message action overlay, jump-to-bottom
- [ ] New-message screen, switch account, typing in chat list, presence
- [ ] Group create/settings screens, join by tag (exists), group co-admin tools

## Profile / account
- [ ] Profile QR + scan, edit-profile screen, following/followers lists, get-verified + animated verified badges, billing
- [ ] Delete account, legal docs in-app, interests onboarding

## Reels
- [ ] Reel comments sheet (needs supabase_migration_reel_comments.sql), reel preview thumbs, video limits

## Misc
- [ ] Sounds (send/like/incoming), haptics n/a on web
- [ ] Remove fake TRENDING list in FlittersApp.js (hard-coded numbers) and use real hashtag data

## Done in round 2
- [x] Default 2D person avatar + broken-image fallback (components/common/Avatar.js)
- [x] Video posts in feed + composer (components/feed/PostVideo.js; limits 20s / 60s verified / 5min hard cap / 200MB)
- [x] Desktop layout: sidebar + centered column at >=900px (components/app/DesktopShell.js + DESKTOP LAYOUT block in globals.css), Enter-to-send in chats, wheel/arrow keys in Reels
