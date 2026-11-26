/// <reference types="w3c-web-hid" />
import { useState } from 'react'
import './App.css'

interface KeyDef {
  id: string
  label: string
  width?: number
}

// Layout ANSI 75% chuẩn cho ATAS K81
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

// Mapping 12 chế độ chuẩn firmware ATAS YJS MCU
const LED_MODES = [
  { id: 0x06, name: 'Cố định (Static)' },
  { id: 0x05, name: 'Nhịp thở (Breathing)' },
  { id: 0x00, name: 'Sóng cuộn 1 (Wave 1)' },
  { id: 0x03, name: 'Sóng cuộn 2 (Wave 2)' },
  { id: 0x02, name: 'Quang phổ RGB (Spectrum)' },
  { id: 0x07, name: 'Lan tỏa (Proliferate / Ripple)' },
  { id: 0x09, name: 'Sao lấp lánh (Shining)' },
  { id: 0x0A, name: 'Vòng xoay (Ring Running)' },
  { id: 0x0B, name: 'Đèn chạy (Runners Lamp)' },
]

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string>('#9820cf')
  const [selectedMode, setSelectedMode] = useState<number>(0x00) // Default Wave 1
  const [brightness, setBrightness] = useState<number>(80) // 0-100%
  const [speed, setSpeed] = useState<number>(3) // 1-4
  const [keyColors, setKeyColors] = useState<Record<string, string>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [logMessage, setLogMessage] = useState<string>('Sẵn sàng kết nối ATAS K81...')
  const [activeDevice, setActiveDevice] = useState<HIDDevice | null>(null)

  // Kết nối WebHID với tự động tìm Interface Vendor-Defined (0xFF00)
  const connectWebHID = async () => {
    if (!('hid' in navigator)) {
      setLogMessage('Trình duyệt không hỗ trợ WebHID API. Hãy dùng Chrome/Edge/Brave.')
      return
    }

    try {
      setLogMessage('Đang mở hộp thoại chọn thiết bị...')
      const requested = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x5566, productId: 0x000a }],
      })

      if (!requested || requested.length === 0) {
        setLogMessage('[-] Người dùng đã hủy chọn thiết bị.')
        return
      }

      // Lấy tất cả thiết bị đã được cấp quyền
      const allDevices = await navigator.hid.getDevices()
      const matching = allDevices.filter(
        (d) => d.vendorId === 0x5566 && d.productId === 0x000a
      )

      // Ưu tiên chọn interface có Usage Page 0xFF00 (Vendor-defined)
      let targetDev: HIDDevice = matching[0]
      for (const dev of matching) {
        const hasVendorPage = dev.collections?.some((c) => c.usagePage === 0xff00)
        if (hasVendorPage) {
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
        `[+] Đã kết nối thành công: ${targetDev.productName || 'ATAS K81'} (VID: 0x5566, PID: 0x000A)`
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi kết nối WebHID: ${errMsg}`)
    }
  }

  // Helper gửi gói tin 64 byte qua Output Report (sendReport) với fallback sendFeatureReport
  const sendHidPacket = async (device: HIDDevice, payload: number[]) => {
    const packet = new Uint8Array(64)
    for (let i = 0; i < Math.min(payload.length, 64); i++) {
      packet[i] = payload[i]
    }

    try {
      // Cách 1: Gửi qua Output Report (Endpoint Interrupt Out 64 bytes)
      await device.sendReport(0x00, packet)
    } catch {
      // Fallback: Thử Feature Report nếu thiết bị yêu cầu
      await device.sendFeatureReport(0x00, packet)
    }
  }

  // Quy trình gửi cấu hình LED 4 bước chuẩn ATAS / YJS Firmware
  const sendConfigToKeyboard = async () => {
    if (!activeDevice || !activeDevice.opened) {
      setLogMessage('[!] Chưa kết nối bàn phím. Vui lòng bấm nút "KẾT NỐI ATAS K81" trước!')
      return
    }

    try {
      setLogMessage('[*] Đang gửi handshake & nạp cấu hình LED...')

      // 1. Handshake 1: [0x55, 0x01]
      await sendHidPacket(activeDevice, [0x55, 0x01])
      await delay(15)

      // 2. Handshake 2: [0x55, 0x05, 0x00, 0x20, 0x20]
      await sendHidPacket(activeDevice, [0x55, 0x05, 0x00, 0x20, 0x20])
      await delay(15)

      // 3. Gói tin cấu hình chính (0x55 0x06)
      const numColor = parseInt(selectedColor.replace('#', ''), 16)
      const r = (numColor >> 16) & 255
      const g = (numColor >> 8) & 255
      const b = numColor & 255

      const rawBrightness = Math.round((brightness / 100) * 255)
      let effectiveSpeed = Math.max(1, Math.min(speed, 4))

      // Một số mode cố định tốc độ = 1 theo firmware specification
      const fixedSpeedModes = [0x04, 0x05, 0x06, 0x07, 0x08, 0x09]
      if (fixedSpeedModes.includes(selectedMode)) {
        effectiveSpeed = 1
      }

      const cmd = new Array(64).fill(0)
      cmd[0] = 0x55
      cmd[1] = 0x06
      cmd[2] = 0x00
      cmd[4] = 0x20
      cmd[10] = selectedMode
      cmd[11] = rawBrightness
      cmd[12] = effectiveSpeed
      cmd[13] = 0x00
      cmd[14] = selectedMode === 0x06 ? 0x00 : 0x01 // 0x00 cho static, 0x01 cho dynamic
      cmd[16] = r
      cmd[17] = g
      cmd[18] = b

      // Checksum = Tổng từ index 4 đến 63 & 0xFF
      let sum = 0
      for (let i = 4; i < 64; i++) {
        sum += cmd[i]
      }
      cmd[3] = sum & 0xff

      await sendHidPacket(activeDevice, cmd)
      await delay(15)

      // 4. End sequence: [0x55, 0x02]
      await sendHidPacket(activeDevice, [0x55, 0x02])

      setLogMessage(
        `[+] THÀNH CÔNG! Đã nạp cấu hình LED vào vi điều khiển: Mode=0x0${selectedMode.toString(16).toUpperCase()}, Màu=${selectedColor.toUpperCase()}, Độ sáng=${brightness}%`
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] Lỗi gửi lệnh xuống bàn phím: ${errMsg}`)
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
                  const color = keyColors[k.id] || (selectedMode === 0x06 ? selectedColor : '#00ffcc')
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
                      onClick={() => {
                        setActiveKey(k.id)
                        setKeyColors((prev) => ({ ...prev, [k.id]: selectedColor }))
                      }}
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

        {/* Bảng điều khiển */}
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
              max="4"
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
