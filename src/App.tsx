/// <reference types="w3c-web-hid" />
import { useState, useRef, useEffect } from 'react'
import { parseGIF, decompressFrames, type ParsedFrame } from 'gifuct-js'
import './App.css'

interface KeyDef {
  id: string
  label: string
  width?: number
}

// Layout ANSI 75% chuẩn cho ATAS K81 (81 phím + Knob)
const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { id: 'k_esc', label: 'ESC' },
    { id: 'k_f1', label: 'F1' },
    { id: 'k_f2', label: 'F2' },
    { id: 'k_f3', label: 'F3' },
    { id: 'k_f4', label: 'F4' },
    { id: 'k_f5', label: 'F5' },
    { id: 'k_f6', label: 'F6' },
    { id: 'k_f7', label: 'F7' },
    { id: 'k_f8', label: 'F8' },
    { id: 'k_f9', label: 'F9' },
    { id: 'k_f10', label: 'F10' },
    { id: 'k_f11', label: 'F11' },
    { id: 'k_f12', label: 'F12' },
    { id: 'k_del', label: 'DEL' },
    { id: 'k_knob', label: 'KNOB', width: 1.2 },
  ],
  [
    { id: 'k_grave', label: '~ `' },
    { id: 'k_1', label: '1' },
    { id: 'k_2', label: '2' },
    { id: 'k_3', label: '3' },
    { id: 'k_4', label: '4' },
    { id: 'k_5', label: '5' },
    { id: 'k_6', label: '6' },
    { id: 'k_7', label: '7' },
    { id: 'k_8', label: '8' },
    { id: 'k_9', label: '9' },
    { id: 'k_0', label: '0' },
    { id: 'k_minus', label: '- _' },
    { id: 'k_equal', label: '= +' },
    { id: 'k_backspace', label: 'BACKSPACE', width: 2 },
    { id: 'k_pageup', label: 'PG UP' },
  ],
  [
    { id: 'k_tab', label: 'TAB', width: 1.5 },
    { id: 'k_q', label: 'Q' },
    { id: 'k_w', label: 'W' },
    { id: 'k_e', label: 'E' },
    { id: 'k_r', label: 'R' },
    { id: 'k_t', label: 'T' },
    { id: 'k_y', label: 'Y' },
    { id: 'k_u', label: 'U' },
    { id: 'k_i', label: 'I' },
    { id: 'k_o', label: 'O' },
    { id: 'k_p', label: 'P' },
    { id: 'k_lbracket', label: '[ {' },
    { id: 'k_rbracket', label: '] }' },
    { id: 'k_backslash', label: '\\ |', width: 1.5 },
    { id: 'k_pagedown', label: 'PG DN' },
  ],
  [
    { id: 'k_caps', label: 'CAPS', width: 1.75 },
    { id: 'k_a', label: 'A' },
    { id: 'k_s', label: 'S' },
    { id: 'k_d', label: 'D' },
    { id: 'k_f', label: 'F' },
    { id: 'k_g', label: 'G' },
    { id: 'k_h', label: 'H' },
    { id: 'k_j', label: 'J' },
    { id: 'k_k', label: 'K' },
    { id: 'k_l', label: 'L' },
    { id: 'k_semicolon', label: '; :' },
    { id: 'k_quote', label: '\' "' },
    { id: 'k_enter', label: 'ENTER', width: 2.25 },
    { id: 'k_end', label: 'END' },
  ],
  [
    { id: 'k_lshift', label: 'SHIFT', width: 2.25 },
    { id: 'k_z', label: 'Z' },
    { id: 'k_x', label: 'X' },
    { id: 'k_c', label: 'C' },
    { id: 'k_v', label: 'V' },
    { id: 'k_b', label: 'B' },
    { id: 'k_n', label: 'N' },
    { id: 'k_m', label: 'M' },
    { id: 'k_comma', label: '< ,' },
    { id: 'k_dot', label: '> .' },
    { id: 'k_slash', label: '? /' },
    { id: 'k_rshift', label: 'SHIFT', width: 1.75 },
    { id: 'k_up', label: '↑' },
  ],
  [
    { id: 'k_lctrl', label: 'CTRL', width: 1.25 },
    { id: 'k_win', label: 'WIN', width: 1.25 },
    { id: 'k_lalt', label: 'ALT', width: 1.25 },
    { id: 'k_space', label: 'SPACE', width: 6.25 },
    { id: 'k_ralt', label: 'ALT' },
    { id: 'k_fn', label: 'FN' },
    { id: 'k_left', label: '←' },
    { id: 'k_down', label: '↓' },
    { id: 'k_right', label: '→' },
  ],
]

// Tọa độ chuẩn hóa (x: 0..1, y: 0..1) của từng switch
const KEY_COORDINATES: Record<string, { x: number; y: number }> = {}
const TOTAL_ROWS = KEYBOARD_ROWS.length
KEYBOARD_ROWS.forEach((row, rowIndex) => {
  let rowUnits = 0
  row.forEach((k) => (rowUnits += k.width || 1))

  let currentUnits = 0
  row.forEach((k) => {
    const width = k.width || 1
    const centerUnit = currentUnits + width / 2
    KEY_COORDINATES[k.id] = {
      x: centerUnit / rowUnits,
      y: (rowIndex + 0.5) / TOTAL_ROWS,
    }
    currentUnits += width
  })
})

const LED_MODES = [
  { id: 0x06, name: 'Cố định (Static)' },
  { id: 0x05, name: 'Nhịp thở (Breathing)' },
  { id: 0x00, name: 'Sóng cuộn 1 (Wave 1)' },
  { id: 0x03, name: 'Sóng cuộn 2 (Wave 2)' },
  { id: 0x02, name: 'Quang phổ RGB (Spectrum)' },
  { id: 0x07, name: 'Lan tỏa (Ripple)' },
  { id: 0x09, name: 'Sao lấp lánh (Shining)' },
  { id: 0x0a, name: 'Vòng xoay (Ring Running)' },
  { id: 0x0b, name: 'Đèn chạy (Runners Lamp)' },
]

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'firmware' | 'gif'>('gif')
  const [selectedColor, setSelectedColor] = useState<string>('#00ffcc')
  const [selectedMode, setSelectedMode] = useState<number>(0x06) // Default Static
  const [brightness, setBrightness] = useState<number>(100)
  const [speed, setSpeed] = useState<number>(1)
  const [keyColors, setKeyColors] = useState<Record<string, string>>({})
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [logMessage, setLogMessage] = useState<string>('Đang kiểm tra kết nối phần cứng...')
  const [activeDevice, setActiveDevice] = useState<HIDDevice | null>(null)

  // GIF Engine State
  const [isGifPlaying, setIsGifPlaying] = useState<boolean>(false)
  const [gifFileName, setGifFileName] = useState<string>('💓 Điện Tâm Đồ (aula_s75_ecg.gif)')
  const [gifFps, setGifFps] = useState<number>(18)
  const framesRef = useRef<ParsedFrame[]>([])
  const frameIndexRef = useRef<number>(0)
  const animationTimerRef = useRef<number | null>(null)
  const isPlayingRef = useRef<boolean>(false)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Khởi tạo nạp sẵn ECG Heartbeat khi vừa mở
  useEffect(() => {
    loadEcgPreset()

    fetch('/api/led/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setDeviceConnected(true)
          setLogMessage(`[+] ĐÃ TỰ ĐỘNG KẾT NỐI: ATAS K81 phát hiện tại ${data.path} (Native Bridge)`)
        } else {
          setLogMessage('[*] Native Bridge chưa mở. Hãy dùng nút WebHID để cấp quyền.')
        }
      })
      .catch(() => {
        setLogMessage('Sẵn sàng kết nối qua WebHID...')
      })

    return () => {
      clearInterval(animationTimerRef.current ?? undefined)
    }
  }, [])

  // Nạp ảnh GIF Điện Tâm Đồ ECG từ AULA S75 Pro
  const loadEcgPreset = async () => {
    stopGifStream()
    setGifFileName('💓 Điện Tâm Đồ AULA S75 Pro (289 frames, 900x341)')
    setLogMessage('[*] Đang giải mã 289 frames Điện Tâm Đồ AULA S75 Pro...')
    try {
      const res = await fetch('/aula_s75_ecg.gif')
      const buffer = await res.arrayBuffer()
      const parsedGif = parseGIF(buffer)
      const decompressed = decompressFrames(parsedGif, true)
      framesRef.current = decompressed
      frameIndexRef.current = 0
      setGifFps(18)
      setLogMessage(
        `[+] ĐÃ NẠP XONG 289 FRAMES ĐIỆN TÂM ĐỒ ECG! Tỉ lệ 900x341 khớp 100% layout 75%! Bấm "PHÁT GIF" ngay!`
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi nạp GIF: ${errMsg}`)
    }
  }

  // Nạp file purple_heart.gif được tạo từ code Python
  const loadHeartPreset = async () => {
    stopGifStream()
    setGifFileName('💜 Trái Tim Neon (purple_heart.gif)')
    setLogMessage('[*] Đang nạp file purple_heart.gif...')
    try {
      const res = await fetch('/purple_heart.gif')
      const buffer = await res.arrayBuffer()
      const parsedGif = parseGIF(buffer)
      const decompressed = decompressFrames(parsedGif, true)
      framesRef.current = decompressed
      frameIndexRef.current = 0
      setGifFps(15)
      setLogMessage(`[+] Đã nạp thành công 30 frames Trái Tim Neon! Bấm "PHÁT GIF" ngay!`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi nạp GIF: ${errMsg}`)
    }
  }

  // Kết nối WebHID thủ công nếu không chạy qua Native Bridge
  const connectWebHID = async () => {
    if (!('hid' in navigator)) {
      setLogMessage('Trình duyệt không hỗ trợ WebHID. Dùng Chrome/Edge/Brave.')
      return
    }

    try {
      setLogMessage('Đang mở hộp thoại chọn thiết bị...')
      const requested = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x5566, productId: 0x000a }],
      })

      if (!requested || requested.length === 0) {
        setLogMessage('[-] Bạn đã hủy chọn thiết bị.')
        return
      }

      const allDevices = await navigator.hid.getDevices()
      const matching = allDevices.filter(
        (d) => d.vendorId === 0x5566 && d.productId === 0x000a
      )

      let targetDev: HIDDevice = matching[0]
      for (const dev of matching) {
        if (dev.collections?.some((c) => c.usagePage === 0xff00)) {
          targetDev = dev
          break
        }
      }

      if (!targetDev.opened) {
        await targetDev.open()
      }

      setActiveDevice(targetDev)
      setDeviceConnected(true)
      setLogMessage(
        `[+] Đã kết nối WebHID: ${targetDev.productName || 'ATAS K81'} (VID: 0x5566, PID: 0x000A)`
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi WebHID: ${errMsg}`)
    }
  }

  const sendHidPacket = async (device: HIDDevice, payload: number[]) => {
    const packet = new Uint8Array(64)
    for (let i = 0; i < Math.min(payload.length, 64); i++) {
      packet[i] = payload[i]
    }

    try {
      await device.sendReport(0x00, packet)
    } catch {
      await device.sendFeatureReport(0x00, packet)
    }
  }

  // Tải preset thuật toán mẫu
  const loadPreset = (type: 'flame' | 'rainbow' | 'matrix' | 'neon') => {
    stopGifStream()
    const width = 32
    const height = 16
    const sampleFrames: ParsedFrame[] = []

    if (type === 'flame') {
      setGifFileName('🔥 Preset: Ngọn Lửa Cyberpunk')
      for (let f = 0; f < 24; f++) {
        const patch = new Uint8ClampedArray(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const heat = Math.sin(x * 0.35 + f * 0.4) * 0.5 + Math.cos(y * 0.5 - f * 0.3) * 0.5
            const intensity = Math.max(0, Math.min(1, heat + (1 - y / height) * 0.9))

            patch[idx] = Math.round(intensity * 255)
            patch[idx + 1] = Math.round(Math.pow(intensity, 2) * 140)
            patch[idx + 2] = Math.round(Math.max(0, 1 - intensity) * 60)
            patch[idx + 3] = 255
          }
        }
        sampleFrames.push({ dims: { left: 0, top: 0, width, height }, colorTable: [], delay: 50, disposalType: 1, patch })
      }
    } else if (type === 'rainbow') {
      setGifFileName('🌈 Preset: Sóng Cầu Vồng Dynamic')
      for (let f = 0; f < 30; f++) {
        const patch = new Uint8ClampedArray(width * height * 4)
        const offset = f / 30
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const hue = (x / width + offset) % 1
            patch[idx] = Math.round((Math.sin(hue * 6.28) * 0.5 + 0.5) * 255)
            patch[idx + 1] = Math.round((Math.sin(hue * 6.28 + 2.09) * 0.5 + 0.5) * 255)
            patch[idx + 2] = Math.round((Math.sin(hue * 6.28 + 4.18) * 0.5 + 0.5) * 255)
            patch[idx + 3] = 255
          }
        }
        sampleFrames.push({ dims: { left: 0, top: 0, width, height }, colorTable: [], delay: 50, disposalType: 1, patch })
      }
    } else if (type === 'matrix') {
      setGifFileName('⚡ Preset: Mưa Ký Tự Matrix')
      for (let f = 0; f < 20; f++) {
        const patch = new Uint8ClampedArray(width * height * 4)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const drop = ((y - f * 1.5 + x * 3) % height + height) % height
            const intensity = Math.max(0, 1 - drop / 5)
            patch[idx] = Math.round(intensity * 40)
            patch[idx + 1] = Math.round(intensity * 255)
            patch[idx + 2] = Math.round(intensity * 80)
            patch[idx + 3] = 255
          }
        }
        sampleFrames.push({ dims: { left: 0, top: 0, width, height }, colorTable: [], delay: 50, disposalType: 1, patch })
      }
    } else {
      setGifFileName('💖 Preset: Nhịp Tim Neon Pulse')
      for (let f = 0; f < 20; f++) {
        const patch = new Uint8ClampedArray(width * height * 4)
        const pulse = (Math.sin(f * 0.314) * 0.5 + 0.5)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            patch[idx] = Math.round(pulse * 255)
            patch[idx + 1] = Math.round(pulse * 30)
            patch[idx + 2] = Math.round(pulse * 200)
            patch[idx + 3] = 255
          }
        }
        sampleFrames.push({ dims: { left: 0, top: 0, width, height }, colorTable: [], delay: 50, disposalType: 1, patch })
      }
    }

    framesRef.current = sampleFrames
    frameIndexRef.current = 0
    setLogMessage(`[+] Đã tải preset: ${gifFileName}. Bấm "PHÁT GIF" để xem!`)
  }

  // Tải file GIF tùy ý từ máy tính
  const handleGifUpload = async (file: File) => {
    stopGifStream()
    setGifFileName(file.name)
    setLogMessage(`[*] Đang giải nén file GIF: ${file.name}...`)

    try {
      const buffer = await file.arrayBuffer()
      const parsedGif = parseGIF(buffer)
      const decompressed = decompressFrames(parsedGif, true)

      if (decompressed.length === 0) {
        setLogMessage('[-] File GIF không chứa frame hợp lệ.')
        return
      }

      framesRef.current = decompressed
      frameIndexRef.current = 0
      setLogMessage(`[+] Đã nạp ${decompressed.length} frames từ ${file.name}! Bấm "PHÁT GIF" ngay!`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi đọc file GIF: ${errMsg}`)
    }
  }

  // Bắt đầu phát luồng GIF
  const startGifStream = () => {
    if (framesRef.current.length === 0) {
      loadEcgPreset()
    }

    if (isPlayingRef.current) return
    isPlayingRef.current = true
    setIsGifPlaying(true)
    setLogMessage('[▶] ĐANG PHÁT GIF: Bàn phím đang sáng rực rỡ theo từng frame...')

    const interval = Math.round(1000 / gifFps)
    animationTimerRef.current = window.setInterval(async () => {
      const frames = framesRef.current
      if (frames.length === 0) return

      const frame = frames[frameIndexRef.current % frames.length]
      frameIndexRef.current++

      const canvas = previewCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = frame.dims.width
      canvas.height = frame.dims.height

      const imgData = ctx.createImageData(frame.dims.width, frame.dims.height)
      imgData.data.set(frame.patch)
      ctx.putImageData(imgData, 0, 0)

      // Sample màu cho 81 phím
      const newColors: Record<string, string> = {}
      let avgR = 0
      let avgG = 0
      let avgB = 0
      let keyCount = 0

      for (const [keyId, coord] of Object.entries(KEY_COORDINATES)) {
        const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(coord.x * canvas.width)))
        const py = Math.min(canvas.height - 1, Math.max(0, Math.floor(coord.y * canvas.height)))
        const pixel = ctx.getImageData(px, py, 1, 1).data

        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`
        newColors[keyId] = hex
        avgR += pixel[0]
        avgG += pixel[1]
        avgB += pixel[2]
        keyCount++
      }

      setKeyColors(newColors)

      // Gửi đồng bộ sang phím thật qua Native Bridge
      if (keyCount > 0) {
        const meanR = Math.round(avgR / keyCount)
        const meanG = Math.round(avgG / keyCount)
        const meanB = Math.round(avgB / keyCount)

        fetch('/api/led/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 0x06,
            r: meanR,
            g: meanG,
            b: meanB,
            brightness: Math.round((brightness / 100) * 255),
            speed: 1,
          }),
        }).catch(() => {})
      }
    }, interval)
  }

  const stopGifStream = () => {
    clearInterval(animationTimerRef.current ?? undefined)
    animationTimerRef.current = null
    isPlayingRef.current = false
    setIsGifPlaying(false)
    setLogMessage('[⏹] Đã dừng phát GIF.')
  }

  // Nạp cấu hình màu sang vi điều khiển (Ưu tiên Native Bridge -> Fallback WebHID)
  const sendFirmwareLighting = async () => {
    const numColor = parseInt(selectedColor.replace('#', ''), 16)
    const r = (numColor >> 16) & 255
    const g = (numColor >> 8) & 255
    const b = numColor & 255
    const rawBrightness = Math.round((brightness / 100) * 255)
    let effectiveSpeed = Math.max(1, Math.min(speed, 4))

    const fixedSpeedModes = [0x04, 0x05, 0x06, 0x07, 0x08, 0x09]
    if (fixedSpeedModes.includes(selectedMode)) effectiveSpeed = 1

    setLogMessage('[*] Đang gửi lệnh nạp màu tới bàn phím ATAS K81...')

    // CÁCH 1: Thử gửi qua Native Bridge
    try {
      const resp = await fetch('/api/led/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          r,
          g,
          b,
          brightness: rawBrightness,
          speed: effectiveSpeed,
        }),
      })

      if (resp.ok) {
        const resData = await resp.json()
        if (resData.success) {
          setDeviceConnected(true)
          setLogMessage(
            `[+] THÀNH CÔNG! Đã nạp Mode 0x0${selectedMode.toString(16).toUpperCase()}, Màu ${selectedColor.toUpperCase()} xuống cổng ${resData.path}!`
          )
          return
        }
      }
    } catch {
      // Fallback xuống WebHID nếu Native Bridge không phản hồi
    }

    // CÁCH 2: Fallback qua WebHID
    if (activeDevice && activeDevice.opened) {
      try {
        await sendHidPacket(activeDevice, [0x55, 0x01])
        await delay(15)
        await sendHidPacket(activeDevice, [0x55, 0x05, 0x00, 0x20, 0x20])
        await delay(15)

        const cmd = new Array(64).fill(0)
        cmd[0] = 0x55
        cmd[1] = 0x06
        cmd[2] = 0x00
        cmd[4] = 0x20
        cmd[10] = selectedMode
        cmd[11] = rawBrightness
        cmd[12] = effectiveSpeed
        cmd[13] = 0x00
        cmd[14] = selectedMode === 0x06 ? 0x00 : 0x01
        cmd[16] = r
        cmd[17] = g
        cmd[18] = b

        let sum = 0
        for (let i = 4; i < 64; i++) sum += cmd[i]
        cmd[3] = sum & 0xff

        await sendHidPacket(activeDevice, cmd)
        await delay(15)
        await sendHidPacket(activeDevice, [0x55, 0x02])

        setLogMessage(`[+] THÀNH CÔNG (WebHID)! Đã nạp cấu hình vào vi điều khiển!`)
        return
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setLogMessage(`[-] Lỗi WebHID: ${errMsg}`)
        return
      }
    }

    setLogMessage('[!] Chưa kết nối bàn phím. Hãy cắm dây Type-C hoặc bấm "KẾT NỐI ATAS K81"!')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <h1>ATAS K81 <span>STUDIO & GIF STREAMER</span></h1>
          <p className="subtitle">Chỉnh LED RGB & Phát ảnh GIF động chuyên nghiệp theo phong cách Hoàng Phúc Studio</p>
        </div>
        <div className="header-actions">
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'gif' ? 'active' : ''}`}
              onClick={() => setActiveTab('gif')}
            >
              🎬 PHÁT ẢNH GIF
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'firmware' ? 'active' : ''}`}
              onClick={() => setActiveTab('firmware')}
            >
              ⚙ CHẾ ĐỘ FIRMWARE
            </button>
          </div>
          <button
            type="button"
            className={`btn-connect ${deviceConnected ? 'connected' : ''}`}
            onClick={connectWebHID}
          >
            {deviceConnected ? '● ĐÃ KẾT NỐI (ATAS K81)' : '⚡ KẾT NỐI ATAS K81'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Bàn phím ảo 75% Layout */}
        <section className="keyboard-stage">
          <div className="keyboard-chassis">
            {KEYBOARD_ROWS.map((row) => (
              <div key={row[0].id} className="keyboard-row">
                {row.map((k) => {
                  const isKnob = k.id === 'k_knob'
                  const color = keyColors[k.id] || (selectedMode === 0x06 ? selectedColor : '#00ffcc')

                  return (
                    <button
                      key={k.id}
                      type="button"
                      className={`keycap ${isKnob ? 'knob' : ''}`}
                      style={{
                        flex: k.width || 1,
                        backgroundColor: color,
                        boxShadow: `0 0 16px ${color}aa, inset 0 0 10px rgba(255, 255, 255, 0.3)`,
                        borderColor: '#ffffff55',
                      }}
                      onClick={() => setKeyColors((prev) => ({ ...prev, [k.id]: selectedColor }))}
                    >
                      <span className="key-label">{k.label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Bảng điều khiển */}
        <aside className="control-panel">
          {activeTab === 'gif' ? (
            <>
              <div className="panel-group">
                <h3>1. Chọn Hiệu Ứng GIF</h3>
                
                <div className="preview-canvas-box">
                  <canvas ref={previewCanvasRef} className="preview-canvas" width={32} height={16} />
                  <span className="preview-label">Bản xem trước Frame</span>
                </div>

                <div className="preset-grid">
                  <button type="button" className="preset-pill highlight-ecg" onClick={loadEcgPreset}>
                    💓 Điện Tâm Đồ ECG (AULA S75 Pro)
                  </button>
                  <button type="button" className="preset-pill highlight-heart" onClick={loadHeartPreset}>
                    💜 Trái Tim Tím (purple_heart.gif)
                  </button>
                  <button type="button" className="preset-pill" onClick={() => loadPreset('flame')}>
                    🔥 Lửa Cyber
                  </button>
                  <button type="button" className="preset-pill" onClick={() => loadPreset('rainbow')}>
                    🌈 Cầu Vồng
                  </button>
                  <button type="button" className="preset-pill" onClick={() => loadPreset('matrix')}>
                    ⚡ Matrix Xanh
                  </button>
                  <button type="button" className="preset-pill" onClick={() => loadPreset('neon')}>
                    💖 Neon Pulse
                  </button>
                </div>

                <label className="file-dropzone">
                  <input
                    type="file"
                    accept=".gif,image/gif"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleGifUpload(e.target.files[0])
                      }
                    }}
                  />
                  <span>📁 Tải lên file .GIF khác từ máy</span>
                </label>
                <div className="gif-status">Đang chọn: <strong>{gifFileName}</strong></div>
              </div>

              <div className="panel-group">
                <h3>2. Tốc Độ ({gifFps} FPS)</h3>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={gifFps}
                  onChange={(e) => setGifFps(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="panel-group">
                <h3>3. Độ Sáng ({brightness}%)</h3>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="gif-action-row">
                {!isGifPlaying ? (
                  <button type="button" className="btn-apply pulse" onClick={startGifStream}>
                    ▶ PHÁT GIF LÊN BÀN PHÍM
                  </button>
                ) : (
                  <button type="button" className="btn-stop" onClick={stopGifStream}>
                    ⏹ DỪNG PHÁT GIF
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="panel-group">
                <h3>1. Chế độ Ánh Sáng (Firmware)</h3>
                <div className="mode-selector">
                  {LED_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`mode-btn ${selectedMode === mode.id ? 'active' : ''}`}
                      onClick={() => setSelectedMode(mode.id)}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="panel-group">
                <h3>2. Bảng Màu (Color Palette)</h3>
                <div className="color-tools">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="color-picker-input"
                  />
                  <span className="color-hex">{selectedColor.toUpperCase()}</span>
                </div>
              </div>

              <div className="panel-group">
                <h3>3. Độ Sáng ({brightness}%)</h3>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <div className="panel-group">
                <h3>4. Tốc Độ ({speed})</h3>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="slider"
                />
              </div>

              <button
                type="button"
                className="btn-apply"
                onClick={sendFirmwareLighting}
              >
                🚀 NẠP CẤU HÌNH VÀO PHÍM (APPLY)
              </button>
            </>
          )}
        </aside>
      </main>

      <footer className="console-log">
        <span className="log-prompt">&gt; TERMINAL:</span> {logMessage}
      </footer>
    </div>
  )
}
