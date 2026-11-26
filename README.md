# ATAS K81 Pro Configurator

Enterprise hardware companion utility and lighting configuration engine for mechanical keyboards driven by the **YJS MicroChip** MCU (Vendor ID `0x5566`, Product ID `0x000A`), specifically tailored for the **ATAS K81** (75% ANSI layout with rotary knob).

---

## 1. System Architecture

The project employs a dual-tier architecture designed for low-latency hardware communication and seamless local prototyping:

```
[ Frontend Client (React 19 + TypeScript + Vite) ]
                     │
         ┌───────────┴───────────┐
         │ (HTTP Bridge / IPC)   │ (Fallback WebHID API)
         ▼                       ▼
[ Local Native Bridge ]      [ Chromium WebHID ]
  (/dev/hidraw5 r/w)         (Usage Page 0xFF00)
         │                       │
         └───────────┬───────────┘
                     │ Raw 64-byte Output Reports
                     ▼
       [ ATAS K81 Keyboard Hardware ]
```

- **Frontend Interface:** Built with React 19 and TypeScript, rendering an interactive 75% mechanical layout matrix that mirrors selected lighting modes and RGB colors in real-time.
- **Local Native Bridge (`vite.config.ts`):** Development server middleware interacting directly with Linux character device nodes (`/dev/hidraw*`), eliminating browser permission revocations during page reloads.
- **Rust Driver Core (`src-tauri/`):** Native Rust implementation utilizing `hidapi` and `parking_lot::Mutex` for thread-safe binary frame serialization, CRC-16 Modbus checksumming, and native binary distribution.

---

## 2. Hardware Protocol Specification

The YJS microcontroller expects fixed **64-byte HID Output Reports** (prefixed with Report ID `0x00`, yielding 65 bytes on the wire) dispatched via a mandatory four-step handshake sequence:

1. **Handshake 1:** `[0x55, 0x01]` (Wake-up / Handshake Initialization)
2. **Handshake 2:** `[0x55, 0x05, 0x00, 0x20, 0x20]` (Endpoint Buffer Alignment)
3. **Configuration Command:** `[0x55, 0x06, 0x00, Checksum, 0x20, ..., Mode, Brightness, Speed, ..., R, G, B]`
   - **Checksum Algorithm:** Additive sum of bytes at index `4..63` masked to 8-bit (`Sum & 0xFF`), stored at byte index `3`.
4. **Transaction Terminator:** `[0x55, 0x02]` (Commit Frame)

### Supported Hardware Animation Modes (Opcode `0x00` - `0x0B`)

| Opcode | Mode Name | Description |
| :--- | :--- | :--- |
| `0x06` | Fixed / Static | Solid static color across the matrix |
| `0x05` | Breathing | Smooth single-color breathing pulse |
| `0x00` | Wave Mode 1 | Horizontal rainbow wave cycle |
| `0x03` | Wave Mode 2 | Vertical / diagonal rainbow wave |
| `0x01` | Wave Light | Ambient directional flow |
| `0x02` | RGB Spectrum | Spectrum cycling across all keys |
| `0x07` | Proliferate / Ripple | Reactive keypress wave dispersal |
| `0x08` | One Line Radial | Linear radial streak animation |
| `0x09` | Shining Stars | Random per-key twinkle effect |
| `0x0A` | Ring Running | Circular rotational LED chase |
| `0x0B` | Runners Lamp | Linear column-based marquee chase |
| `0x04` | Mutant Cycle | Irregular dynamic strobe pattern |

---

## 3. Getting Started

### Prerequisites

- **Node.js** v20+ or **Bun** v1.2+
- **Rust** 1.80+ (stable toolchain)
- **Linux:** `libudev-dev` and `pkg-config`

### Local Development

1. **Clone repository:**
   ```bash
   git clone https://github.com/<your-username>/Keyboard-Setting.git
   cd Keyboard-Setting
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Linux udev permissions (one-time setup):**
   ```bash
   chmod +x scripts/setup-udev.sh
   ./scripts/setup-udev.sh
   ```
   *Disconnect and reconnect the keyboard Type-C cable afterward.*

4. **Start local interface:**
   ```bash
   bun dev
   ```
   Navigate to `http://localhost:5173/` in any Chromium browser.

5. **Execute native Rust diagnostics (optional):**
   ```bash
   cd src-tauri
   cargo run
   ```

---

## 4. Hardware Shortcuts & EEPROM Persistence

Commands issued over USB software alter volatile controller SRAM. When operating untethered over 2.4GHz wireless dongle or Bluetooth, the MCU resets to its internal EEPROM Flash state. Use physical firmware hotkeys to permanently commit profiles:

- `Fn + Enter`: Cycle static color presets (persists to onboard Flash across power cycles).
- `Fn + \`: Cycle through built-in lighting animation modes.
- `Fn + Up / Down`: Step brightness level up / down.
- `Fn + Left / Right`: Adjust animation flow speed.
- `Knob (Hold 3s)`: Toggle encoder mode between System Volume and Backlight Control.
- `Fn + Space (Hold 3s)`: Factory reset microcontroller state.

---

## 5. CI/CD & Automated Binary Releases

The repository is equipped with GitHub Actions workflows:

- **`.github/workflows/ci.yml`**: Validates TypeScript builds and executes `cargo check` on every pull request and push to `main`.
- **`.github/workflows/release.yml`**: Automatically triggered upon pushing semantic tags (`v*`). Builds native standalone executables for both **Windows x64 (`.exe`)** and **Linux x86_64** without requiring local cross-compilation environments.

To publish a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```
Artifacts will be packaged and attached directly to the GitHub Releases portal.

---

## 6. License

MIT License. Designed for personal and educational hardware exploration.
