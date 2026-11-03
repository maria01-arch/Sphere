
// Solid "read-receipt blue" for the sender's own chat bubbles — replaces
// the old blue/purple gradient, matching the flatter WhatsApp/Messenger
// bubble look rather than the gradient used elsewhere in the app's UI.
export const TICK_BLUE = '#0B93F6'

export const COLORS = ['#FF6B35','#00C9A7','#845EF7','#F7B731','#FF4757','#5B9CF6','#A29BFE','#FD79A8']

export const getColor = (id) => COLORS[(id?.charCodeAt(0)||0) % COLORS.length]
