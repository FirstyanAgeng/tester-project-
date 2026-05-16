import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type KeyMap = Record<string, boolean>

type BallState = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

type PaddleState = {
  y: number
  score: number
}

const FIELD_WIDTH = 960
const FIELD_HEIGHT = 560
const PADDLE_WIDTH = 18
const PADDLE_HEIGHT = 120
const BALL_RADIUS = 10
const WIN_SCORE = 5
const PADDLE_SPEED = 8
const INITIAL_BALL_SPEED = 6.2
const HIT_SPEED_BOOST = 0.55
const MAX_BALL_SPEED = 13.5
const MAX_BOUNCE_ANGLE = Math.PI / 3

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const freshBall = (direction: number = 1): BallState => ({
  x: FIELD_WIDTH / 2,
  y: FIELD_HEIGHT / 2,
  vx: INITIAL_BALL_SPEED * direction,
  vy: (Math.random() * 4 - 2) || 1.2,
  radius: BALL_RADIUS,
})

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef<KeyMap>({})
  const requestRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const pausedRef = useRef(true)
  const winnerRef = useRef<string | null>(null)
  const ballRef = useRef<BallState>(freshBall(1))
  const leftRef = useRef<PaddleState>({ y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 })
  const rightRef = useRef<PaddleState>({
    y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    score: 0,
  })
  const [matchWinner, setMatchWinner] = useState<string | null>(null)
  const [scores, setScores] = useState({ left: 0, right: 0 })
  const [isPaused, setIsPaused] = useState(true)

  const statusText = useMemo(() => {
    if (matchWinner) {
      return `${matchWinner} menang. Tekan Space atau klik Main lagi untuk main ulang.`
    }

    return isPaused ? 'Siap serve. Tekan Space untuk memulai.' : 'Game berjalan.'
  }, [isPaused, matchWinner])

  useEffect(() => {
    pausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    winnerRef.current = matchWinner
  }, [matchWinner])

  const resetRound = (direction: number = 1) => {
    ballRef.current = freshBall(direction)
    setIsPaused(true)
  }

  const resetMatch = () => {
    leftRef.current = { y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 }
    rightRef.current = { y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 }
    setScores({ left: 0, right: 0 })
    setMatchWinner(null)
    resetRound(Math.random() > 0.5 ? 1 : -1)
  }

  const serveBall = () => {
    if (winnerRef.current) {
      resetMatch()
      return
    }

    if (pausedRef.current) {
      const direction = ballRef.current.vx >= 0 ? 1 : -1
      ballRef.current.vx = INITIAL_BALL_SPEED * direction
      ballRef.current.vy = (Math.random() * 4 - 2) || 1
      setIsPaused(false)
      return
    }

    setIsPaused(true)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        serveBall()
      }

      if (event.key.toLowerCase() === 'r') {
        resetMatch()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const resizeCanvas = () => {
      const parentWidth = canvas.parentElement?.clientWidth ?? FIELD_WIDTH
      const scale = Math.min(1, parentWidth / FIELD_WIDTH)
      const pixelRatio = window.devicePixelRatio || 1

      canvas.width = FIELD_WIDTH * pixelRatio
      canvas.height = FIELD_HEIGHT * pixelRatio
      canvas.style.width = `${FIELD_WIDTH * scale}px`
      canvas.style.height = `${FIELD_HEIGHT * scale}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const drawArena = () => {
      context.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)

      const gradient = context.createLinearGradient(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
      gradient.addColorStop(0, '#09111f')
      gradient.addColorStop(1, '#12314e')
      context.fillStyle = gradient
      context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)

      context.fillStyle = 'rgba(255, 255, 255, 0.06)'
      context.fillRect(FIELD_WIDTH / 2 - 3, 0, 6, FIELD_HEIGHT)

      context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
      context.lineWidth = 4
      context.strokeRect(20, 20, FIELD_WIDTH - 40, FIELD_HEIGHT - 40)

      context.setLineDash([16, 14])
      context.beginPath()
      context.moveTo(FIELD_WIDTH / 2, 24)
      context.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - 24)
      context.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      context.stroke()
      context.setLineDash([])

      const left = leftRef.current
      const right = rightRef.current
      const ball = ballRef.current

      context.fillStyle = '#f6d365'
      context.shadowColor = 'rgba(246, 211, 101, 0.45)'
      context.shadowBlur = 18

      context.beginPath()
      context.roundRect(40, left.y, PADDLE_WIDTH, PADDLE_HEIGHT, 10)
      context.fill()

      context.beginPath()
      context.roundRect(FIELD_WIDTH - 40 - PADDLE_WIDTH, right.y, PADDLE_WIDTH, PADDLE_HEIGHT, 10)
      context.fill()

      context.shadowBlur = 0
      context.beginPath()
      context.fillStyle = '#ffffff'
      context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      context.fill()

      if (winnerRef.current) {
        context.fillStyle = 'rgba(6, 10, 18, 0.55)'
        context.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
      }
    }

    const step = (timestamp: number) => {
      const lastTime = lastTimeRef.current || timestamp
      const delta = Math.min(2, (timestamp - lastTime) / 16.6667)
      lastTimeRef.current = timestamp

      const left = leftRef.current
      const right = rightRef.current
      const ball = ballRef.current
      const keys = keysRef.current

      if (!winnerRef.current && keys['w']) left.y -= PADDLE_SPEED * delta
      if (!winnerRef.current && keys['s']) left.y += PADDLE_SPEED * delta
      if (!winnerRef.current && keys['arrowup']) right.y -= PADDLE_SPEED * delta
      if (!winnerRef.current && keys['arrowdown']) right.y += PADDLE_SPEED * delta

      left.y = clamp(left.y, 24, FIELD_HEIGHT - 24 - PADDLE_HEIGHT)
      right.y = clamp(right.y, 24, FIELD_HEIGHT - 24 - PADDLE_HEIGHT)

      if (!pausedRef.current && !winnerRef.current) {
        ball.x += ball.vx * delta
        ball.y += ball.vy * delta

        if (ball.y - ball.radius <= 24 || ball.y + ball.radius >= FIELD_HEIGHT - 24) {
          ball.vy *= -1
          ball.y = clamp(ball.y, 24 + ball.radius, FIELD_HEIGHT - 24 - ball.radius)
        }

        const leftPaddleX = 40 + PADDLE_WIDTH
        const rightPaddleX = FIELD_WIDTH - 40 - PADDLE_WIDTH
        const leftHit =
          ball.x - ball.radius <= leftPaddleX &&
          ball.x - ball.radius >= leftPaddleX - 18 &&
          ball.y >= left.y &&
          ball.y <= left.y + PADDLE_HEIGHT
        const rightHit =
          ball.x + ball.radius >= rightPaddleX &&
          ball.x + ball.radius <= rightPaddleX + 18 &&
          ball.y >= right.y &&
          ball.y <= right.y + PADDLE_HEIGHT

        if (leftHit && ball.vx < 0) {
          const impact = (ball.y - (left.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2)
          const angle = impact * MAX_BOUNCE_ANGLE
          const speed = Math.min(MAX_BALL_SPEED, Math.hypot(ball.vx, ball.vy) + HIT_SPEED_BOOST)
          ball.vx = Math.cos(angle) * speed
          ball.vy = Math.sin(angle) * speed
          ball.x = leftPaddleX + ball.radius + 2
        }

        if (rightHit && ball.vx > 0) {
          const impact = (ball.y - (right.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2)
          const angle = impact * MAX_BOUNCE_ANGLE
          const speed = Math.min(MAX_BALL_SPEED, Math.hypot(ball.vx, ball.vy) + HIT_SPEED_BOOST)
          ball.vx = -Math.cos(angle) * speed
          ball.vy = Math.sin(angle) * speed
          ball.x = rightPaddleX - ball.radius - 2
        }

        if (ball.x < -60) {
          right.score += 1
          setScores({ left: left.score, right: right.score })
          if (right.score >= WIN_SCORE) {
            setMatchWinner('Pemain kanan')
          }
          resetRound(-1)
        }

        if (ball.x > FIELD_WIDTH + 60) {
          left.score += 1
          setScores({ left: left.score, right: right.score })
          if (left.score >= WIN_SCORE) {
            setMatchWinner('Pemain kiri')
          }
          resetRound(1)
        }
      }

      drawArena()
      requestRef.current = window.requestAnimationFrame(step)
    }

    resizeCanvas()
    drawArena()
    requestRef.current = window.requestAnimationFrame(step)
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (requestRef.current) {
        window.cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Simple Two Player Tennis</p>
          <h1>Tennis web lokal yang bisa dimainkan berdua</h1>
          <p className="intro">
            Main bareng di satu keyboard. Pemain kiri pakai <strong>W / S</strong>,
            pemain kanan pakai <strong>Up / Down</strong>. Raih 5 poin duluan untuk menang.
          </p>
        </div>

        <div className="scoreboard" aria-label="Skor pertandingan">
          <div className="score-card">
            <span>Pemain kiri</span>
            <strong>{scores.left}</strong>
          </div>
          <div className="score-divider">vs</div>
          <div className="score-card">
            <span>Pemain kanan</span>
            <strong>{scores.right}</strong>
          </div>
        </div>

        <div className="controls">
          <button type="button" className="primary-btn" onClick={serveBall}>
            {matchWinner ? 'Main lagi' : isPaused ? 'Serve / Start' : 'Pause'}
          </button>
          <button type="button" className="secondary-btn" onClick={resetMatch}>
            Reset skor
          </button>
          <p className="status">{statusText}</p>
        </div>
      </section>

      <section className="arena-wrap">
        <div className="arena-frame">
          <canvas ref={canvasRef} className="arena" aria-label="Lapangan tennis" />
        </div>
      </section>

      <section className="guide-grid">
        <div className="guide-card">
          <h2>Kontrol kiri</h2>
          <p>Gerakkan raket dengan <strong>W</strong> dan <strong>S</strong>.</p>
        </div>
        <div className="guide-card">
          <h2>Kontrol kanan</h2>
          <p>Gerakkan raket dengan <strong>Up</strong> dan <strong>Down</strong>.</p>
        </div>
        <div className="guide-card">
          <h2>Tujuan</h2>
          <p>Balikkan bola melewati lawan sampai salah satu mencapai 5 poin.</p>
        </div>
      </section>
    </main>
  )
}

export default App
