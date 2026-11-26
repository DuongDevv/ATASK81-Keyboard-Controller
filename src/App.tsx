/// <reference types="w3c-web-hid" />
import { useState, useEffect } from 'react'
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

// 12 Chế độ LED chuẩn xác theo vi điều khiển YJS MicroChip của ATAS K81
const FIRMWARE_MODES = [
  { id: 0x06, name: 'Cố định (Fixed / Static)' },
  { id: 0x05, name: 'Nhịp thở (Breathing)' },
  { id: 0x00, name: 'Sóng cuộn 1 (Wave Mode 1)' },
  { id: 0x03, name: 'Sóng cuộn 2 (Wave Mode 2)' },
  { id: 0x01, name: 'Sóng ánh sáng (Wave Light)' },
  { id: 0x02, name: 'Quang phổ RGB (Spectrum)' },
  { id: 0x07, name: 'Lan tỏa (Proliferate / Ripple)' },
  { id: 0x08, name: 'Tia đơn tâm (One Line Radial)' },
  { id: 0x09, name: 'Sao lấp lánh (Shinning)' },
  { id: 0x0a, name: 'Vòng xoay (Ring Running)' },
  { id: 0x0b, name: 'Đèn chạy (Runners Lamp)' },
  { id: 0x04, name: 'Đột biến (Mutant)' },
]

// Bảng màu nhanh
const QUICK_PALETTE = [
  { name: 'Tím Neon', hex: '#9820CF' },
  { name: 'Hồng Cyber', hex: '#EC4899' },
  { name: 'Xanh Ngọc', hex: '#00FFCC' },
  { name: 'Xanh Biển', hex: '#3B82F6' },
  { name: 'Đỏ Lửa', hex: '#EF4444' },
  { name: 'Cam Rực', hex: '#F97316' },
  { name: 'Vàng Chanh', hex: '#FACC15' },
  { name: 'Trắng Băng', hex: '#FFFFFF' },
]

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string>('#9820CF') // Mặc định màu tím người dùng thích
  const [selectedMode, setSelectedMode] = useState<number>(0x06) // Mặc định chế độ tĩnh
  const [brightness, setBrightness] = useState<number>(100)
  const [speed, setSpeed] = useState<number>(1)
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [logMessage, setLogMessage] = useState<string>('Đang kiểm tra kết nối phần cứng...')
  const [activeDevice, setActiveDevice] = useState<HIDDevice | null>(null)

  // Tự động kiểm tra Native Bridge (kết nối trực tiếp qua Linux /dev/hidraw5)
  useEffect(() => {
    fetch('/api/led/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setDeviceConnected(true)
          setLogMessage(`[+] ĐÃ KẾT NỐI: Phát hiện ATAS K81 tại ${data.path} (Native Bridge)`)
        } else {
          setLogMessage('[*] Native Bridge chưa sẵn sàng. Hãy cắm dây Type-C hoặc dùng WebHID.')
        }
      })
      .catch(() => {
        setLogMessage('Sẵn sàng kết nối qua WebHID...')
      })
  }, [])

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

  // Nạp cấu hình màu sang vi điều khiển (Ưu tiên Native Bridge -> Fallback WebHID)
  const applyLighting = async () => {
    const numColor = parseInt(selectedColor.replace('#', ''), 16)
    const r = (numColor >> 16) & 255
    const g = (numColor >> 8) & 255
    const b = numColor & 255
    const rawBrightness = Math.round((brightness / 100) * 255)
    let effectiveSpeed = Math.max(1, Math.min(speed, 4))

    const fixedSpeedModes = [0x04, 0x05, 0x06, 0x07, 0x08, 0x09]
    if (fixedSpeedModes.includes(selectedMode)) effectiveSpeed = 1

    setLogMessage('[*] Đang gửi lệnh nạp cấu hình xuống ATAS K81...')

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
      // Fallback
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
          <h1>ATAS K81 <span>PRO CONTROLLER</span></h1>
          <p className="subtitle">Phần mềm cấu hình Đèn LED & Quản lý Firmware ATAS K81 Chuẩn Doanh Nghiệp</p>
        </div>
        <div className="header-actions">
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
        {/* Bàn phím ảo 75% Layout - Phát sáng rực rỡ theo màu đã chọn */}
        <section className="keyboard-stage">
          <div className="keyboard-chassis">
            {KEYBOARD_ROWS.map((row) => (
              <div key={row[0].id} className="keyboard-row">
                {row.map((k) => {
                  const isKnob = k.id === 'k_knob'

                  return (
                    <button
                      key={k.id}
                      type="button"
                      className={`keycap ${isKnob ? 'knob' : ''}`}
                      style={{
                        flex: k.width || 1,
                        backgroundColor: selectedColor,
                        boxShadow: `0 0 16px ${selectedColor}aa, inset 0 0 10px rgba(255, 255, 255, 0.3)`,
                        borderColor: '#ffffff55',
                      }}
                      onClick={() => applyLighting()}
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
          <div className="panel-group">
            <h3>1. Chế độ Ánh Sáng (12 Firmware Modes)</h3>
            <div className="mode-selector">
              {FIRMWARE_MODES.map((mode) => (
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
            
            {/* 8 Nút chọn màu nhanh */}
            <div className="quick-palette-grid">
              {QUICK_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`palette-chip ${selectedColor.toUpperCase() === c.hex ? 'active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                />
              ))}
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
            <h3>4. Tốc Độ Hiệu Ứng ({speed})</h3>
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
            className="btn-apply pulse"
            onClick={applyLighting}
          >
            🚀 NẠP CẤU HÌNH VÀO PHÍM (APPLY)
          </button>

          {/* Cẩm Nang Phím Tắt Lưu Vào Flash Onboard */}
          <div className="flash-guide-card">
            <h4>💡 CẨM NANG LƯU MÀU KHI DÙNG KHÔNG DÂY</h4>
            <p className="guide-desc">
              Khi dùng đầu USB 2.4G không dây, hãy dùng phím tắt phần cứng để chip lưu vĩnh viễn vào bộ nhớ Flash:
            </p>
            <ul className="guide-list">
              <li><code>Fn + Enter</code> : Đổi màu cố định (Bấm đến màu Tím là lưu vĩnh viễn!)</li>
              <li><code>Fn + \</code> : Đổi qua lại giữa các hiệu ứng LED</li>
              <li><code>Fn + ↑ / ↓</code> : Tăng / giảm độ sáng</li>
              <li><code>Fn + ← / →</code> : Tăng / giảm tốc độ chạy LED</li>
              <li><code>Giữ núm 3s</code> : Đổi giữa chỉnh Volume & Chỉnh LED</li>
              <li><code>Fn + Space</code> : Giữ 3 giây để khôi phục mặc định (Reset)</li>
            </ul>
          </div>
        </aside>
      </main>

      <footer className="console-log">
        <span className="log-prompt">&gt; TERMINAL:</span> {logMessage}
      </footer>
    </div>
  )
}
