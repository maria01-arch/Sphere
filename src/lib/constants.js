import { CheckCircle2, Globe, Heart, MessageCircle, MessageSquare, Repeat2, User } from 'lucide-react'

// Reaction picker emoji set — shown as a scrollable grid in the message
// action sheet (both DM and group chat).
export const QUICK_REACTIONS = [
  '👍','❤️','😂','😮','😢','🔥','👏','💯','🙏','😍',
  '😊','😁','😅','🤣','🥹','😉','😘','😎','🤩','🥳',
  '😇','🙃','😴','😭','😡','🤬','🤯','🥵','🥶','😱',
  '🤔','🤨','😐','🙄','😬','🤫','🤗','🤝','👌','✌️',
  '🤞','👀','💪','🫶','💔','⭐','✨','🎉','🎊',
  '🥰','😆','🤤','😷','🤢','🤮','👋','🖤','💙','💚'
]

// A sticker renders as bare media (no bubble chrome), WhatsApp/Telegram-style.
// sticker_url ending in a video extension plays as a silent looping clip.
export const VIDEO_EXT = /\.(mp4|webm|mov)$/i

// preventDefault on contextmenu + the touch-callout/drag/select CSS below
// stop the browser's native "save/share image" popup from firing on a long
// press. Without this, that native popup and the app's own long-press timer
// (which opens the reaction sheet) fight over the same gesture and the page
// stops responding until the user dismisses the native menu — which reads
// as the whole app freezing.
export const NO_CALLOUT_STYLE = {
  WebkitTouchCallout:'none', WebkitUserSelect:'none', userSelect:'none',
  WebkitUserDrag:'none', KhtmlUserSelect:'none', MozUserSelect:'none', msUserSelect:'none'
}

// ── STICKER TRAY (shared by DM + GroupChat) ─────────────────────────────────
// Sticker packs are shared/public (anyone can browse & send from any pack,
// like Telegram) but a user can only add stickers to their own pack (created
// automatically on first open). Media is uploaded to the existing 'avatars'
// storage bucket under a stickers/ prefix — no new bucket needed.
// Lets the user pick a start point and a clip length (max 10s) out of a
// longer video before it becomes a sticker, previewing the loop live, then
// re-encodes just that window to webm via canvas + MediaRecorder (silent —
// stickers autoplay muted anyway, so no audio track is captured).
export const STICKER_MAX_SECONDS = 10

// Reporting mechanism required by Google Play's Child Safety Standards
// policy — the published policy page can't just claim this exists, so it
// has to actually work. Child safety is deliberately the first, visually
// distinct option rather than buried alphabetically.
export const REPORT_REASONS = [
  {id:'child_safety', label:'Child sexual abuse or exploitation', urgent:true},
  {id:'nudity_sexual', label:'Nudity or sexual content'},
  {id:'violence', label:'Violence or dangerous behavior'},
  {id:'harassment', label:'Harassment or bullying'},
  {id:'hate_speech', label:'Hate speech'},
  {id:'spam', label:'Spam or scam'},
  {id:'other', label:'Something else'},
]

export const STORE_CATEGORIES = ['Electronics','Fashion','Services','Food','Home','Vehicles','Other']

// Shared between NotificationsPanel and the in-app toast — the
// notifications table has a `type` column, not a plain text message, so
// both places that render a notification need the same type→text mapping.
export const NOTIF_TYPE_INFO = {
  like:{icon:<Heart size={16} fill="var(--danger)" color="var(--danger)"/>,text:'liked your post'},
  comment:{icon:<MessageCircle size={16}/>,text:'commented on your post'},
  follow:{icon:<User size={16}/>,text:'started following you'},
  repost:{icon:<Repeat2 size={16}/>,text:'reposted your flit'},
  welcome:{icon:<Globe size={16}/>,text:'Welcome to Flitters!'},
  follow_request:{icon:<User size={16}/>,text:'sent you a follow request'},
  follow_accepted:{icon:<CheckCircle2 size={16}/>,text:'accepted your follow request'},
  mention:{icon:<MessageSquare size={16}/>,text:'tagged you in a post'},
}
