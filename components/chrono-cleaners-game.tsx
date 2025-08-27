"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Point {
  x: number
  y: number
}

interface GameItem {
  x: number
  y: number
  type: "trash" | "crystal" | "artifact"
  collected: boolean
  id: string
}

interface Paradox {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
  id: string
}

interface Player {
  x: number
  y: number
  pathIndex: number
  moving: boolean
  crystals: number
  score: number
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PLAYER_SIZE = 20
const ITEM_SIZE = 15
const PARADOX_SIZE = 25

export default function ChronoCleanersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameOver" | "levelComplete">("menu")
  const [currentLevel, setCurrentLevel] = useState(1)
  const [path, setPath] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [player, setPlayer] = useState<Player>({
    x: 100,
    y: 300,
    pathIndex: 0,
    moving: false,
    crystals: 0,
    score: 0,
  })
  const [items, setItems] = useState<GameItem[]>([])
  const [paradoxes, setParadoxes] = useState<Paradox[]>([])
  const [timeLeft, setTimeLeft] = useState(120)
  const [stars, setStars] = useState(0)
  const animationRef = useRef<number>()

  // Initialize level
  const initializeLevel = useCallback((level: number) => {
    const newItems: GameItem[] = []
    const newParadoxes: Paradox[] = []

    // Generate items based on level
    const itemCount = Math.min(5 + level * 2, 15)
    for (let i = 0; i < itemCount; i++) {
      newItems.push({
        x: Math.random() * (CANVAS_WIDTH - 100) + 50,
        y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
        type: Math.random() < 0.7 ? "trash" : Math.random() < 0.8 ? "crystal" : "artifact",
        collected: false,
        id: `item-${i}`,
      })
    }

    // Generate paradoxes
    const paradoxCount = Math.floor(level / 2)
    for (let i = 0; i < paradoxCount; i++) {
      newParadoxes.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        active: true,
        id: `paradox-${i}`,
      })
    }

    setItems(newItems)
    setParadoxes(newParadoxes)
    setPlayer((prev) => ({ ...prev, x: 100, y: 300, pathIndex: 0, moving: false }))
    setPath([])
    setTimeLeft(120)
    setStars(0)
  }, [])

  // Start game
  const startGame = () => {
    setGameState("playing")
    initializeLevel(currentLevel)
  }

  // Handle mouse/touch events for path drawing
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height

    let clientX, clientY
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX || 0
      clientY = e.touches[0]?.clientY || 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || player.moving) return

    const coords = getCanvasCoordinates(e)
    setIsDrawing(true)
    setPath([coords])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || gameState !== "playing") return

    const coords = getCanvasCoordinates(e)
    setPath((prev) => [...prev, coords])
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (path.length > 1) {
      setPlayer((prev) => ({ ...prev, moving: true, pathIndex: 0 }))
    }
  }

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return

    const gameLoop = () => {
      // Move player along path
      setPlayer((prev) => {
        if (!prev.moving || path.length === 0) return prev

        const target = path[prev.pathIndex]
        if (!target) return prev

        const dx = target.x - prev.x
        const dy = target.y - prev.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 5) {
          // Reached current point, move to next
          if (prev.pathIndex < path.length - 1) {
            return { ...prev, pathIndex: prev.pathIndex + 1 }
          } else {
            // Reached end of path
            return { ...prev, moving: false }
          }
        } else {
          // Move towards target
          const speed = 3
          const moveX = (dx / distance) * speed
          const moveY = (dy / distance) * speed
          return { ...prev, x: prev.x + moveX, y: prev.y + moveY }
        }
      })

      // Move paradoxes
      setParadoxes((prev) =>
        prev.map((paradox) => {
          if (!paradox.active) return paradox

          const newX = paradox.x + paradox.vx
          const newY = paradox.y + paradox.vy
          let newVx = paradox.vx
          let newVy = paradox.vy

          // Bounce off walls
          if (newX <= 0 || newX >= CANVAS_WIDTH) newVx = -newVx
          if (newY <= 0 || newY >= CANVAS_HEIGHT) newVy = -newVy

          return {
            ...paradox,
            x: Math.max(0, Math.min(CANVAS_WIDTH, newX)),
            y: Math.max(0, Math.min(CANVAS_HEIGHT, newY)),
            vx: newVx,
            vy: newVy,
          }
        }),
      )

      // Check item collection
      setItems((prev) =>
        prev.map((item) => {
          if (item.collected) return item

          const dx = item.x - player.x
          const dy = item.y - player.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < PLAYER_SIZE) {
            setPlayer((p) => ({
              ...p,
              crystals: p.crystals + (item.type === "crystal" ? 2 : 1),
              score: p.score + (item.type === "artifact" ? 50 : item.type === "crystal" ? 20 : 10),
            }))
            return { ...item, collected: true }
          }

          return item
        }),
      )

      // Check paradox collision
      const paradoxCollision = paradoxes.some((paradox) => {
        if (!paradox.active) return false
        const dx = paradox.x - player.x
        const dy = paradox.y - player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance < (PLAYER_SIZE + PARADOX_SIZE) / 2
      })

      if (paradoxCollision) {
        setGameState("gameOver")
        return
      }

      // Check level completion
      const allItemsCollected = items.every((item) => item.collected)
      if (allItemsCollected && items.length > 0) {
        const timeBonus = Math.max(0, timeLeft - 60)
        const finalStars = timeLeft > 90 ? 3 : timeLeft > 60 ? 2 : 1
        setStars(finalStars)
        setPlayer((prev) => ({ ...prev, score: prev.score + timeBonus * 5 }))
        setGameState("levelComplete")
        return
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, path, player.x, player.y, items, paradoxes, timeLeft])

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState("gameOver")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid pattern
    ctx.strokeStyle = "#16213e"
    ctx.lineWidth = 1
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }

    if (gameState === "playing") {
      // Draw path
      if (path.length > 1) {
        ctx.strokeStyle = "#00ff88"
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(path[0].x, path[0].y)
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw items
      items.forEach((item) => {
        if (item.collected) return

        ctx.save()
        ctx.translate(item.x, item.y)

        if (item.type === "trash") {
          ctx.fillStyle = "#ff6b6b"
          ctx.fillRect(-ITEM_SIZE / 2, -ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE)
        } else if (item.type === "crystal") {
          ctx.fillStyle = "#4ecdc4"
          ctx.beginPath()
          ctx.arc(0, 0, ITEM_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = "#ffd93d"
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5
            const x = (Math.cos(angle) * ITEM_SIZE) / 2
            const y = (Math.sin(angle) * ITEM_SIZE) / 2
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        }

        ctx.restore()
      })

      // Draw paradoxes
      paradoxes.forEach((paradox) => {
        if (!paradox.active) return

        ctx.save()
        ctx.translate(paradox.x, paradox.y)
        ctx.fillStyle = "#e74c3c"
        ctx.strokeStyle = "#c0392b"
        ctx.lineWidth = 2

        // Draw spinning triangle
        const time = Date.now() * 0.01
        ctx.rotate(time)
        ctx.beginPath()
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3
          const x = (Math.cos(angle) * PARADOX_SIZE) / 2
          const y = (Math.sin(angle) * PARADOX_SIZE) / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.restore()
      })

      // Draw player
      ctx.save()
      ctx.translate(player.x, player.y)
      ctx.fillStyle = "#00ff88"
      ctx.strokeStyle = "#00cc6a"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, PLAYER_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw vacuum effect if moving
      if (player.moving) {
        ctx.strokeStyle = "#00ff88"
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.beginPath()
        ctx.arc(0, 0, PLAYER_SIZE, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    }
  }, [gameState, path, player, items, paradoxes])

  const nextLevel = () => {
    setCurrentLevel((prev) => prev + 1)
    setGameState("playing")
    initializeLevel(currentLevel + 1)
  }

  const restartLevel = () => {
    setGameState("playing")
    initializeLevel(currentLevel)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="p-6 bg-gray-900 border-gray-700">
        {/* Game UI */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div className="flex gap-6">
            <span>Level: {currentLevel}</span>
            <span>
              ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
            <span>💎 {player.crystals}</span>
            <span>Score: {player.score}</span>
          </div>
          {gameState === "playing" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGameState("paused")}
              className="text-white border-gray-600"
            >
              Pause
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full border border-gray-600 rounded-lg cursor-crosshair"
            style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Game State Overlays */}
          {gameState === "menu" && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Chrono-Cleaners</h2>
                <p className="mb-6">Draw a path to guide your cleaner and vacuum up the anomalies!</p>
                <Button onClick={startGame} size="lg">
                  Start Mission
                </Button>
              </div>
            </div>
          )}

          {gameState === "paused" && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold mb-4">Mission Paused</h2>
                <div className="flex gap-4">
                  <Button onClick={() => setGameState("playing")}>Resume</Button>
                  <Button variant="outline" onClick={() => setGameState("menu")}>
                    Main Menu
                  </Button>
                </div>
              </div>
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Mission Failed!</h2>
                <p className="mb-4">A paradox disrupted the timeline!</p>
                <p className="mb-6">Final Score: {player.score}</p>
                <div className="flex gap-4">
                  <Button onClick={restartLevel}>Retry Mission</Button>
                  <Button variant="outline" onClick={() => setGameState("menu")}>
                    Main Menu
                  </Button>
                </div>
              </div>
            </div>
          )}

          {gameState === "levelComplete" && (
            <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold mb-4 text-green-400">Mission Complete!</h2>
                <div className="mb-4">{"⭐".repeat(stars)}</div>
                <p className="mb-4">Era cleaned successfully!</p>
                <p className="mb-6">Score: {player.score}</p>
                <div className="flex gap-4">
                  <Button onClick={nextLevel}>Next Era</Button>
                  <Button variant="outline" onClick={() => setGameState("menu")}>
                    Main Menu
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-400">
          <p>
            <strong>How to play:</strong> Draw a path with your mouse/finger to guide your Chrono-Cleaner. Collect all
            items while avoiding red paradoxes!
          </p>
          <p>
            <strong>Items:</strong> 🟥 Trash (+10 pts) • 🔵 Crystals (+20 pts) • ⭐ Artifacts (+50 pts)
          </p>
        </div>
      </Card>
    </div>
  )
}
