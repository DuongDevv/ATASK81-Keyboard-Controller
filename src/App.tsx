/// <reference types="w3c-web-hid" />
import { useState } from 'react'
import './App.css'

interface KeyDef {
  id: string
  label: string
  width?: number // relative key width (1 = 1u)
}

// Layout ANSI 75% chuẩn cho ATAS K81 (81 phím + Knob)
const KEYBOARD_ROWS: KeyDef[][] = [
  // Hàng F
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
  // Hàng số
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
  // Hàng QWERTY
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
  // Hàng ASDF
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
  // Hàng ZXCV
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
  // Hàng Bottom
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

const LED_MODES = [
  { id: 1, name: 'Static (Cố định)' },
  { id: 2, name: 'Breathing (Thở)' },
  { id: 3, name: 'Wave (Sóng cầu vồng)' },
  { id: 4, name: 'Ripple (Lan tỏa)' },
  { id: 5, name: 'Custom Per-Key (Từng phím)' },
]

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string>('#00ffcc')
  const [selectedMode, setSelectedMode] = useState<number>(1)
  const [brightness, setBrightness] = useState<number>(80)
  const [speed, setSpeed] = useState<number>(3)
  const [keyColors, setKeyColors] = useState<Record<string, string>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [logMessage, setLogMessage] = useState<string>('Chờ kết nối thiết bị ATAS K81...')
  const [hidDevice, setHidDevice] = useState<HIDDevice | null>(null)

  // Kết nối WebHID trực tiếp từ trình duyệt
  const connectWebHID = async () => {
    if (!('hid' in navigator)) {
      setLogMessage('Trình duyệt không hỗ trợ WebHID API. Dùng Chrome/Edge hoặc chạy app Desktop.')
      return
    }

    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x5566, productId: 0x000a }],
      })

      if (devices.length > 0) {
        const dev = devices[0]
        await dev.open()
        setHidDevice(dev)
        setDeviceConnected(true)
        setLogMessage(`[+] Đã kết nối thành công: ${dev.productName} (0x5566:0x000A)`)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi kết nối WebHID: ${errMsg}`)
    }
  }

  // Khi bấm vào 1 phím trên bàn phím ảo
  const handleKeyClick = (keyId: string) => {
    setActiveKey(keyId)
    setKeyColors((prev) => ({
      ...prev,
      [keyId]: selectedColor,
    }))
  }

  // Chuyển mã hex thành RGB bytes
  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace('#', '')
    const num = parseInt(cleaned, 16)
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    }
  }

  // Gửi cấu hình LED xuống thiết bị
  const sendConfigToKeyboard = async () => {
    const rgb = hexToRgb(selectedColor)
    setLogMessage(`[*] Đang truyền cấu hình LED xuống MCU: Mode=${selectedMode}, Brightness=${brightness}%...`)

    if (hidDevice && hidDevice.opened) {
      try {
        // Tạo Frame 64 Bytes chuẩn Enterprise
        const packet = new Uint8Array(64)
        packet[0] = 0x5a // Magic Byte
        packet[1] = 0x02 // CMD: SET_GLOBAL_LED
        packet[2] = 0x01 // SEQ ID
        packet[3] = 0x06 // Length
        packet[4] = selectedMode
        packet[5] = brightness
        packet[6] = speed
        packet[7] = rgb.r
        packet[8] = rgb.g
        packet[9] = rgb.b

        await hidDevice.sendFeatureReport(0x00, packet)
        setLogMessage('[+] Đã gửi cấu hình thành công qua cổng WebHID!')
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setLogMessage(`[-] Lỗi khi bắn packet HID: ${errMsg}`)
      }
    } else {
      setLogMessage('[!] Chưa kết nối trực tiếp bàn phím qua WebHID. Hãy bấm nút "Kết nối ATAS K81".')
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <h1>ATAS K81 <span>PRO CONFIGURATOR</span></h1>
          <p className="subtitle">Enterprise Keyboard Engine & RGB Customizer</p>
        </div>
        <div className="status-badge">
          <button
            type="button"
            className={`btn-connect ${deviceConnected ? 'connected' : ''}`}
            onClick={connectWebHID}
          >
            {deviceConnected ? '● ĐÃ KẾT NỐI (ATAS K81)' : '⚡ KẾT NỐI ATAS K81 (WebHID)'}
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
                  const color = keyColors[k.id] || (selectedMode === 1 ? selectedColor : '#222')
                  const isSelected = activeKey === k.id

                  return (
                    <button
                      key={k.id}
                      type="button"
                      className={`keycap ${isKnob ? 'knob' : ''} ${isSelected ? 'active' : ''}`}
                      style={{
                        flex: k.width || 1,
                        boxShadow: `0 0 12px ${color}88, inset 0 0 6px ${color}55`,
                        borderColor: isSelected ? '#fff' : `${color}aa`,
                      }}
                      onClick={() => handleKeyClick(k.id)}
                    >
                      <span className="key-label">{k.label}</span>
                      <span className="led-indicator" style={{ backgroundColor: color }} />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* Thanh công cụ điều khiển LED */}
        <aside className="control-panel">
          <div className="panel-group">
            <h3>1. Chế độ Ánh Sáng (Lighting Mode)</h3>
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
              max="5"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="slider"
            />
          </div>

          <button
            type="button"
            className="btn-apply"
            onClick={sendConfigToKeyboard}
          >
            🚀 NẠP CẤU HÌNH VÀO PHÍM (APPLY)
          </button>
        </aside>
      </main>

      <footer className="console-log">
        <span className="log-prompt">&gt; TERMINAL:</span> {logMessage}
      </footer>
    </div>
  )
}
