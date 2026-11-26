import fs from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function atasKeyboardPlugin(): Plugin {
  const findHidPath = (): string | null => {
    for (const p of ['/dev/hidraw5', '/dev/hidraw4', '/dev/hidraw3']) {
      if (fs.existsSync(p)) {
        try {
          const fd = fs.openSync(p, 'r+')
          fs.closeSync(fd)
          return p
        } catch {}
      }
    }
    return null
  }

  const sendPacket = (fd: number, payload: number[]) => {
    const buf = Buffer.alloc(65, 0)
    for (let i = 0; i < payload.length && i < 64; i++) {
      buf[i + 1] = payload[i]
    }
    fs.writeSync(fd, buf)
  }

  const sleepSync = (ms: number) => {
    const end = Date.now() + ms
    while (Date.now() < end) {}
  }

  return {
    name: 'atas-keyboard-native-bridge',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/led/status' && req.method === 'GET') {
          const path = findHidPath()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ connected: !!path, path }))
          return
        }

        if (req.url === '/api/led/apply' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const path = findHidPath() || '/dev/hidraw5'

              const mode = Number(data.mode ?? 0x06)
              const r = Number(data.r ?? 255)
              const g = Number(data.g ?? 0)
              const b = Number(data.b ?? 0)
              const brightness = Number(data.brightness ?? 255)
              const speed = Number(data.speed ?? 1)

              const fd = fs.openSync(path, 'w')

              // 1. Handshake 1
              sendPacket(fd, [0x55, 0x01])
              sleepSync(15)

              // 2. Handshake 2
              sendPacket(fd, [0x55, 0x05, 0x00, 0x20, 0x20])
              sleepSync(15)

              // 3. Command
              const cmd = new Array(64).fill(0)
              cmd[0] = 0x55
              cmd[1] = 0x06
              cmd[2] = 0x00
              cmd[4] = 0x20
              cmd[10] = mode
              cmd[11] = brightness
              cmd[12] = speed
              cmd[13] = 0x00
              cmd[14] = mode === 0x06 ? 0x00 : 0x01
              cmd[16] = r
              cmd[17] = g
              cmd[18] = b

              let sum = 0
              for (let i = 4; i < 64; i++) sum += cmd[i]
              cmd[3] = sum & 0xff

              sendPacket(fd, cmd)
              sleepSync(15)

              // 4. End sequence
              sendPacket(fd, [0x55, 0x02])

              fs.closeSync(fd)

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, path }))
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: errMsg }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), atasKeyboardPlugin()],
})
