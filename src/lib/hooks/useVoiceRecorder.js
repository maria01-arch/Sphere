import { useEffect, useRef, useState } from 'react'

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const cleanup = () => {
    if(timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach(t=>t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    setRecording(false)
  }

  const start = async () => {
    if(typeof navigator==='undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert("Voice notes aren't supported in this browser/app.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true})
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mr = new MediaRecorder(stream, {mimeType})
      mr.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data) }
      mediaRecorderRef.current = mr
      mr.start()
      setSeconds(0)
      setRecording(true)
      timerRef.current = setInterval(()=>setSeconds(s=>s+1), 1000)
    } catch(err) {
      console.error('Voice note recording failed to start:', err)
      alert("Couldn't access the microphone — check your browser/app permissions.")
    }
  }

  // Resolves with {blob, duration} once the recorder has actually flushed
  // its last data chunk — resolving eagerly (e.g. right after calling
  // mr.stop()) can hand back a blob missing the tail end of the clip.
  const stop = () => new Promise(resolve => {
    const mr = mediaRecorderRef.current
    if(!mr || mr.state==='inactive') { cleanup(); resolve(null); return }
    const finalSeconds = seconds
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, {type: mr.mimeType||'audio/webm'})
      cleanup()
      resolve({blob, duration:finalSeconds})
    }
    mr.stop()
  })

  const cancel = () => {
    const mr = mediaRecorderRef.current
    if(mr && mr.state!=='inactive') { mr.onstop = null; mr.stop() }
    chunksRef.current = []
    cleanup()
  }

  useEffect(()=>()=>{ streamRef.current?.getTracks().forEach(t=>t.stop()) },[])

  return { recording, seconds, start, stop, cancel }
}
