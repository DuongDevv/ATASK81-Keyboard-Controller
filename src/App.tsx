/// <reference types="w3c-web-hid" />
import { useState, useEffect } from 'react'
import './App.css'

interface KeyDef {
  id: string
  label: string
  width?: number
}

// ANSI 75% physical matrix topology for ATAS K81 (81 switches + rotary encoder)
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
    { id: 'k_up', label: 'UP' },
  ],
  [
    { id: 'k_lctrl', label: 'CTRL', width: 1.25 },
    { id: 'k_win', label: 'WIN', width: 1.25 },
    { id: 'k_lalt', label: 'ALT', width: 1.25 },
    { id: 'k_space', label: 'SPACE', width: 6.25 },
    { id: 'k_ralt', label: 'ALT' },
    { id: 'k_fn', label: 'FN' },
    { id: 'k_left', label: 'LEFT' },
    { id: 'k_down', label: 'DOWN' },
    { id: 'k_right', label: 'RIGHT' },
  ],
]

// Hardware lighting animation mode definitions supported by YJS MicroChip MCU
const FIRMWARE_MODES = [
  { id: 0x06, name: 'Fixed / Static' },
  { id: 0x05, name: 'Breathing' },
  { id: 0x00, name: 'Wave Mode 1' },
  { id: 0x03, name: 'Wave Mode 2' },
  { id: 0x01, name: 'Wave Light' },
  { id: 0x02, name: 'RGB Spectrum' },
  { id: 0x07, name: 'Proliferate / Ripple' },
  { id: 0x08, name: 'One Line Radial' },
  { id: 0x09, name: 'Shining Stars' },
  { id: 0x0a, name: 'Ring Running' },
  { id: 0x0b, name: 'Runners Lamp' },
  { id: 0x04, name: 'Mutant Cycle' },
]

// Standard quick-select color palette
const QUICK_PALETTE = [
  { name: 'Neon Purple', hex: '#9820CF' },
  { name: 'Cyber Pink', hex: '#EC4899' },
  { name: 'Aqua Cyan', hex: '#00FFCC' },
  { name: 'Deep Blue', hex: '#3B82F6' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Amber Orange', hex: '#F97316' },
  { name: 'Citrus Yellow', hex: '#FACC15' },
  { name: 'Pure White', hex: '#FFFFFF' },
]

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string>('#9820CF')
  const [selectedMode, setSelectedMode] = useState<number>(0x06)
  const [brightness, setBrightness] = useState<number>(100)
  const [speed, setSpeed] = useState<number>(1)
  const [deviceConnected, setDeviceConnected] = useState<boolean>(false)
  const [logMessage, setLogMessage] = useState<string>('Probing hardware bridge...')
  const [activeDevice, setActiveDevice] = useState<HIDDevice | null>(null)

  // Probe local Linux character device bridge on mount
  useEffect(() => {
    fetch('/api/led/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setDeviceConnected(true)
          setLogMessage(`[+] Connected: ATAS K81 detected at ${data.path} (Native Bridge)`)
        } else {
          setLogMessage('[*] Native Bridge offline. Connect Type-C cable or authorize WebHID.')
        }
      })
      .catch(() => {
        setLogMessage('Native Bridge unavailable, ready for WebHID handshake.')
      })
  }, [])

  // WebHID handshake fallback for environments lacking local fs/udev access
  const connectWebHID = async () => {
    if (!('hid' in navigator)) {
      setLogMessage('WebHID API unsupported. Please use a Chromium-based browser.')
      return
    }

    try {
      setLogMessage('Requesting device authorization...')
      const requested = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x5566, productId: 0x000a }],
      })

      if (!requested || requested.length === 0) {
        setLogMessage('[-] Device selection cancelled by user.')
        return
      }

      const allDevices = await navigator.hid.getDevices()
      const matching = allDevices.filter(
        (d) => d.vendorId === 0x5566 && d.productId === 0x000a
      )

      // Filter for Vendor-Defined interface (Usage Page 0xFF00)
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
        `[+] WebHID attached: ${targetDev.productName || 'ATAS K81'} (VID: 0x5566, PID: 0x000A)`
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLogMessage(`[-] WebHID error: ${errMsg}`)
    }
  }

  // Dispatch raw 64-byte frame with report ID 0x00 via Output Report
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

  // Commit lighting payload down to MCU (Native Bridge -> WebHID fallback)
  const applyLighting = async () => {
    const numColor = parseInt(selectedColor.replace('#', ''), 16)
    const r = (numColor >> 16) & 255
    const g = (numColor >> 8) & 255
    const b = numColor & 255
    const rawBrightness = Math.round((brightness / 100) * 255)
    let effectiveSpeed = Math.max(1, Math.min(speed, 4))

    // Static and cycle-locked modes enforce speed parameter = 1 to prevent MCU packet drop
    const fixedSpeedModes = [0x04, 0x05, 0x06, 0x07, 0x08, 0x09]
    if (fixedSpeedModes.includes(selectedMode)) effectiveSpeed = 1

    setLogMessage('[*] Dispatching lighting frame to ATAS K81...')

    // Attempt direct character device dispatch via Vite middleware bridge
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
            `[+] SUCCESS: Applied Mode 0x0${selectedMode.toString(16).toUpperCase()}, Color ${selectedColor.toUpperCase()} via ${resData.path}`
          )
          return
        }
      }
    } catch {
      // Fall through to browser WebHID on network/transport failure
    }

    // Fallback: Four-step handshake over WebHID interface
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

        // Checksum invariant: Sum of bytes 4..63 masked to 8-bit
        let sum = 0
        for (let i = 4; i < 64; i++) sum += cmd[i]
        cmd[3] = sum & 0xff

        await sendHidPacket(activeDevice, cmd)
        await delay(15)
        await sendHidPacket(activeDevice, [0x55, 0x02])

        setLogMessage(`[+] SUCCESS (WebHID): Payload committed to controller.`)
        return
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setLogMessage(`[-] WebHID transfer error: ${errMsg}`)
        return
      }
    }

    setLogMessage('[!] Device unreachable. Ensure Type-C cable is connected.')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <h1>ATAS K81 <span>PRO CONTROLLER</span></h1>
          <p className="subtitle">Enterprise Hardware LED & Firmware Companion Utility</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`btn-connect ${deviceConnected ? 'connected' : ''}`}
            onClick={connectWebHID}
          >
            {deviceConnected ? 'CONNECTED' : 'CONNECT DEVICE'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Virtual 75% mechanical layout visualizer */}
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
                        borderColor: '#ffffff44',
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

        {/* Control and configuration dashboard */}
        <aside className="control-panel">
          <div className="panel-group">
            <h3>Lighting Mode (12 Hardware Presets)</h3>
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
            <h3>Color Palette</h3>
            <div className="color-tools">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="color-picker-input"
              />
              <span className="color-hex">{selectedColor.toUpperCase()}</span>
            </div>
            
            {/* Quick palette buttons */}
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
            <h3>Brightness ({brightness}%)</h3>
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
            <h3>Animation Speed ({speed})</h3>
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
            onClick={applyLighting}
          >
            APPLY CONFIGURATION
          </button>

          {/* Flash memory persistence reference */}
          <div className="flash-guide-card">
            <h4>HARDWARE SHORTCUTS & EEPROM PERSISTENCE</h4>
            <p className="guide-desc">
              When operating over 2.4GHz wireless, configuration changes must be committed directly via hardware shortcuts to persist across power cycles:
            </p>
            <ul className="guide-list">
              <li><code>Fn + Enter</code> : Cycle static colors (persists to onboard Flash)</li>
              <li><code>Fn + \</code> : Cycle lighting modes</li>
              <li><code>Fn + Up / Down</code> : Adjust brightness level</li>
              <li><code>Fn + Left / Right</code> : Adjust animation speed</li>
              <li><code>Knob (Hold 3s)</code> : Toggle knob between Volume and Lighting mode</li>
              <li><code>Fn + Space (Hold 3s)</code> : Factory reset controller</li>
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
