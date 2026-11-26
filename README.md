# ATAS K81 Pro Configurator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20Windows-lightgrey.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61dafb.svg)]()
[![Backend](https://img.shields.io/badge/Backend-Rust%20%7C%20Tauri-orange.svg)]()
[![Hardware Protocol](https://img.shields.io/badge/Protocol-USB%20HID%2064B-green.svg)]()

Cross-platform hardware companion utility and RGB lighting configurator for mechanical keyboards driven by the **YJS MicroChip** MCU (Vendor ID `0x5566`, Product ID `0x000A`), specifically tailored for the **ATAS K81** (75% ANSI layout with rotary knob).

---

## 1. Project Structure

```
Keyboard-Setting/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automated frontend & Rust build validation
│       └── release.yml            # Multi-platform native release workflow (Windows .exe & Linux)
├── scripts/
│   └── setup-udev.sh              # Linux udev permission setup for non-root HID access
├── src/
│   ├── App.tsx                    # Main React 19 interface & WebHID controller
│   ├── App.css                    # Industrial dark-theme layout & keycap styles
│   └── declarations.d.ts          # WebHID & environment type declarations
├── src-tauri/
│   ├── Cargo.toml                 # Rust dependencies (hidapi, parking_lot, serde)
│   └── src/
│       ├── hid_driver.rs          # Low-level USB HID driver & packet serializer
│       └── main.rs                # Standalone native diagnostic CLI tool
├── vite.config.ts                 # Local Native Bridge middleware (/dev/hidraw*)
└── README.md
```

---

## 2. System Architecture

The project employs a hybrid architecture designed to balance rapid web prototyping with native hardware access:

```
┌─────────────────────────────────────────────────────────────┐
│       Frontend Client (React 19 + TypeScript + Vite)        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
    (Vite HTTP Middleware)             (Direct WebHID API)
               ▼                               ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│    Local Native Bridge      │  │      Chromium WebHID       │
│      (/dev/hidraw*)         │  │   (Usage Page: 0xFF00)     │
└──────────────┬──────────────┘  └─────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │ Raw 64-Byte Output Reports
                               ▼
        ┌──────────────────────────────────────────────┐
        │        ATAS K81 Keyboard Hardware            │
        │        (YJS MicroChip 0x5566:0x000A)         │
        └──────────────────────────────────────────────┘
```

- **Frontend Client:** Interactive 75% mechanical layout rendered in React 19, synchronizing lighting mode selection, color picking, and parameter controls in real time.
- **Local Native Bridge (`vite.config.ts`):** Development server middleware that writes directly to Linux character device nodes (`/dev/hidraw*`), avoiding browser-level permission revocations across page reloads.
- **Rust Backend Core (`src-tauri/`):** Standalone native binary and future Tauri desktop backend. Utilizes `hidapi` wrapped in `parking_lot::Mutex` for thread-safe hardware transactions, compiled to standalone executables across Linux and Windows.
- **WebHID Fallback:** Browser-native hardware communication layer providing zero-install driver access on Chromium-based browsers.

---

## 3. Hardware Protocol Specification

Communication with the YJS microcontroller operates via fixed **64-byte HID Output Reports** (prefixed with Report ID `0x00`, resulting in a 65-byte wire buffer). The firmware enforces a synchronous four-step handshake sequence:

1. **Step 1 (Wake-up / Handshake Init):** `[0x55, 0x01]`
2. **Step 2 (Buffer Alignment):** `[0x55, 0x05, 0x00, 0x20, 0x20]`
3. **Step 3 (Configuration Payload):** `[0x55, 0x06, 0x00, Checksum, 0x20, ..., Mode, Brightness, Speed, ..., R, G, B]`
   - **Checksum Algorithm:** 8-bit additive sum over bytes `4..63` masked to 8-bit (`sum(bytes[4..64]) & 0xFF`), placed at byte index `3`.
4. **Step 4 (Transaction Terminator):** `[0x55, 0x02]`

### Hardware Animation Modes (Opcodes `0x00` - `0x0B`)

| Opcode | Mode Name | Description |
| :--- | :--- | :--- |
| `0x00` | Wave Mode 1 | Horizontal rainbow wave cycle |
| `0x01` | Wave Light | Ambient directional flow |
| `0x02` | RGB Spectrum | Spectrum cycling across the entire matrix |
| `0x03` | Wave Mode 2 | Diagonal rainbow wave sequence |
| `0x04` | Mutant Cycle | Irregular dynamic strobe pattern |
| `0x05` | Breathing | Smooth single-color breathing pulse |
| `0x06` | Fixed / Static | Solid static color across all keys |
| `0x07` | Proliferate / Ripple | Reactive wave dispersal from pressed keys |
| `0x08` | One Line Radial | Linear radial streak animation |
| `0x09` | Shining Stars | Random per-key twinkle effect |
| `0x0A` | Ring Running | Circular rotational LED chase |
| `0x0B` | Runners Lamp | Linear column-based marquee chase |

---

## 4. Getting Started

### Prerequisites

- **Bun** v1.2+ (or **Node.js** v20+)
- **Rust** stable toolchain (v1.80+)
- **Linux system libraries:** `libudev-dev` and `pkg-config`

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/Keyboard-Setting.git
   cd Keyboard-Setting
   ```

2. **Install frontend dependencies:**
   ```bash
   bun install
   ```

3. **Configure Linux udev permissions (one-time setup):**
   ```bash
   chmod +x scripts/setup-udev.sh
   ./scripts/setup-udev.sh
   ```
   *Disconnect and reconnect the keyboard Type-C cable for the rule to apply.*

4. **Launch the web configurator:**
   ```bash
   bun dev
   ```
   Open `http://localhost:5173/` in any Chromium-based browser.

5. **Run native Rust hardware diagnostics (CLI):**
   ```bash
   cd src-tauri
   cargo run
   ```
   This compiles and runs the standalone diagnostic tool, probing `/dev/hidraw*` endpoints and applying a verification payload directly to the controller.

---

## 5. Troubleshooting (Linux HID Permissions)

If the device is connected via Type-C but the configurator displays `Device unreachable`:

1. **Verify active character device nodes:**
   ```bash
   ls -la /dev/hidraw*
   ```
   Ensure the device nodes bound to `5566:000a` possess `crw-rw-rw-` permissions.

2. **Verify USB attachment:**
   ```bash
   lsusb | grep "5566:000a"
   ```
   Expected output: `ID 5566:000a YJS MicroChip Mechanical Keyboard`.

3. **Reload udev rules manually:**
   ```bash
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```

---

## 6. Stock Firmware Shortcuts (On-Device Hotkeys)

> **Note:** These are built-in hardware shortcuts provided by the factory microcontroller firmware, operating independently of the companion application:

- `Fn + Enter`: Cycle static color presets (**commits directly to onboard Flash EEPROM**, ensuring persistence across 2.4GHz wireless power cycles).
- `Fn + \`: Cycle through built-in lighting animation modes.
- `Fn + Up / Down`: Adjust LED brightness level.
- `Fn + Left / Right`: Adjust animation flow speed.
- `Knob (Hold 3s)`: Toggle rotary encoder between System Volume and Backlight Control.
- `Fn + Space (Hold 3s)`: Factory reset microcontroller state.

---

## 7. CI/CD & Automated Releases

The repository includes automated GitHub Actions pipelines:

- **`.github/workflows/ci.yml`**: Triggers on pull requests and commits to `main`, validating TypeScript builds and verifying the Rust backend crate (`cargo check`).
- **`.github/workflows/release.yml`**: Triggers automatically upon pushing a semantic version tag (`v*`). Builds standalone release binaries for both **Windows x64 (`.exe`)** and **Linux x86_64** without requiring a local cross-compilation toolchain.

To trigger an automated multi-platform release:
```bash
git tag v1.0.0
git push origin v1.0.0
```
Compiled standalone binaries will be packaged and attached to the GitHub Releases section.

---

## 8. License

MIT License. Designed for personal and educational hardware exploration.
