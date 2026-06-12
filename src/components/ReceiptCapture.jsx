import { useState, useRef, useEffect } from 'react'

export default function ReceiptCapture({ onResult, onCancel }) {
  const [mode, setMode] = useState('options') // options | camera | captured
  const [error, setError] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported. Choose a photo from your gallery.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setMode('camera')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Check your browser settings, or choose from gallery.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Choose a photo from your gallery.')
      } else {
        setError('Could not access camera. Choose a photo from your gallery instead.')
      }
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const maxDim = 1200
    let w = video.videoWidth, h = video.videoHeight
    if (w > maxDim || h > maxDim) {
      if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
      else { w = Math.round(w * maxDim / h); h = maxDim }
    }
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setCapturedImage(dataUrl)
    setMode('captured')
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    stopCamera()
    const reader = new FileReader()
    reader.onload = ev => {
      setCapturedImage(ev.target.result)
      setMode('captured')
    }
    reader.readAsDataURL(file)
  }

  if (mode === 'options') return (
    <div style={overlayWrap}>
      <div style={sheet}>
        <div style={handleBar} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Attach Receipt</h2>
          <button onClick={onCancel} style={closeBtn}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger)18', border: '1px solid var(--danger)44', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', marginBottom: 16, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={startCamera} style={optionCard}>
            <span style={{ fontSize: 36 }}>📷</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>Camera</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Take a photo</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={optionCard}>
            <span style={{ fontSize: 36 }}>🖼️</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>Gallery</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Choose existing</span>
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )

  if (mode === 'camera') return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ flex: 1, objectFit: 'cover', width: '100%' }}
      />

      {/* Receipt guide frame */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          border: '2px solid rgba(245,166,35,0.85)',
          borderRadius: 8,
          width: '78%',
          height: '62%',
          boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
        }} />
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 24px 44px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
      }}>
        <button onClick={() => { stopCamera(); setMode('options') }} style={camTextBtn}>Cancel</button>

        <button onClick={capturePhoto} style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#fff', border: '5px solid rgba(255,255,255,0.4)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          flexShrink: 0,
        }} />

        <button onClick={() => fileInputRef.current?.click()} style={camTextBtn}>Gallery</button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )

  if (mode === 'captured') return (
    <div style={overlayWrap}>
      <div style={sheet}>
        <div style={handleBar} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Receipt Photo</h2>
          <button onClick={onCancel} style={closeBtn}>✕</button>
        </div>

        <img
          src={capturedImage}
          alt="Receipt"
          style={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)', background: '#111', marginBottom: 16 }}
        />

        <button onClick={() => onResult(capturedImage)} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
          color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 10,
        }}>
          Use this photo
        </button>
        <button onClick={() => { setCapturedImage(null); setMode('options') }} style={{
          width: '100%', padding: '11px', borderRadius: 12,
          background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
          border: '1px solid var(--border)',
        }}>
          Retake
        </button>
      </div>
    </div>
  )

  return null
}

const overlayWrap = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
}

const sheet = {
  width: '100%', maxWidth: 480,
  background: 'var(--bg-elevated)',
  borderRadius: '20px 20px 0 0',
  padding: '12px 20px 40px',
  boxShadow: '0 -4px 40px rgba(0,0,0,0.4)',
}

const handleBar = {
  width: 40, height: 4, borderRadius: 2,
  background: 'var(--border)',
  margin: '0 auto 20px',
}

const closeBtn = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '6px 10px',
  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
}

const optionCard = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '20px 12px',
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
}

const camTextBtn = {
  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
  border: 'none', color: '#fff',
  borderRadius: 8, padding: '10px 16px',
  fontSize: 13, fontWeight: 600,
}
