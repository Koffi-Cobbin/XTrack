import { useState, useRef, useEffect } from 'react'
import { runOCR, parseOCRResult } from '../lib/ocr.js'

export default function ReceiptCapture({ onResult, onCancel }) {
  const [mode, setMode] = useState('options') // options | camera | processing | preview
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [capturedImage, setCapturedImage] = useState(null)
  const [ocrResult, setOcrResult] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Attach stream once the video element is rendered in camera mode
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
      setError('Camera not supported in this browser. Please choose a photo from your gallery instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      setMode('camera') // video element renders now → useEffect attaches stream
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings, or choose a photo from your gallery.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Please choose a photo from your gallery.')
      } else {
        setError('Could not access camera. Try choosing a photo from your gallery instead.')
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
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    setCapturedImage(dataUrl)
    processImage(dataUrl)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setCapturedImage(dataUrl)
      processImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  async function processImage(dataUrl) {
    setMode('processing')
    setProgress(10)
    try {
      const progTimer = setInterval(() => {
        setProgress(p => Math.min(p + 8, 85))
      }, 800)
      const data = await runOCR(dataUrl)
      clearInterval(progTimer)
      setProgress(100)
      const parsed = parseOCRResult(data)
      setOcrResult(parsed)
      setMode('preview')
    } catch (err) {
      setError('Could not process image. Please try again or enter details manually.')
      setMode('options')
    }
  }

  function handleUseResult() {
    onResult({ ...ocrResult, receiptImage: capturedImage })
  }

  if (mode === 'options') return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button onClick={onCancel} style={backBtn}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Scan Receipt</h2>
      </div>

      {error && (
        <div style={{ background: 'var(--danger)11', border: '1px solid var(--danger)44', borderRadius: 12, padding: 14, fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧾</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Capture a receipt</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Take a photo of your receipt and xTrack will automatically extract the amount, merchant, and date.
        </div>
      </div>

      <button
        onClick={startCamera}
        style={{ ...primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <span style={{ fontSize: 20 }}>📷</span> Open Camera
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{ ...secondaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <span style={{ fontSize: 20 }}>🖼️</span> Choose from Gallery
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )

  if (mode === 'camera') return (
    <div style={{ position: 'relative', height: '100%', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ flex: 1, objectFit: 'cover', width: '100%' }}
      />

      {/* Receipt overlay guide */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          border: '2px solid rgba(108,99,255,0.8)',
          borderRadius: 8,
          width: '75%',
          height: '60%',
          boxShadow: '0 0 0 1000px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '24px 24px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      }}>
        <button onClick={() => { stopCamera(); setMode('options') }} style={{
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(4px)',
        }}>
          Cancel
        </button>

        <button
          onClick={capturePhoto}
          style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: '#fff',
            border: '4px solid rgba(255,255,255,0.5)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        />

        <button onClick={() => fileInputRef.current?.click()} style={{
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: 'blur(4px)',
        }}>
          Gallery
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )

  if (mode === 'processing') return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Reading receipt…</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Extracting amount, merchant and date</div>
      <div style={{ background: 'var(--bg-card)', borderRadius: 8, height: 6, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
          borderRadius: 8,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{progress}%</div>
    </div>
  )

  if (mode === 'preview') return (
    <div style={{ padding: '16px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setMode('options')} style={backBtn}>← Retake</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Review OCR Results</h2>
      </div>

      {/* Preview image */}
      {capturedImage && (
        <img
          src={capturedImage}
          alt="Receipt"
          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)' }}
        />
      )}

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Merchant', value: ocrResult?.description, icon: '🏪' },
          { label: 'Amount', value: ocrResult?.amount ? ocrResult.amount.toFixed(2) : null, icon: '💰' },
          { label: 'Date', value: ocrResult?.date, icon: '📅' },
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{row.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{row.label}</div>
              <div style={{ fontSize: 14, color: row.value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: row.value ? 600 : 400, marginTop: 2 }}>
                {row.value || 'Not detected'}
              </div>
            </div>
            {row.value && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        ℹ️ Fields highlighted in blue on the expense form were auto-filled. Review and correct them as needed.
      </div>

      <button onClick={handleUseResult} style={{ ...primaryBtn, marginBottom: 10 }}>
        Use These Results
      </button>
      <button onClick={onCancel} style={secondaryBtn}>
        Enter Manually Instead
      </button>
    </div>
  )

  return null
}

const backBtn = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--text-secondary)',
  fontSize: 14,
}

const primaryBtn = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  border: 'none',
}

const secondaryBtn = {
  width: '100%',
  padding: '12px',
  borderRadius: 12,
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: 14,
  border: '1px solid var(--border)',
}
