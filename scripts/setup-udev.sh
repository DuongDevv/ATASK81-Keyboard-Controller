#!/bin/bash
set -e

# Grant non-root read/write access to YJS HID endpoints (VID 0x5566, PID 0x000A)
RULE_FILE="/etc/udev/rules.d/99-atas-k81.rules"

echo "[*] Configuring udev rule for ATAS K81 (VID: 5566, PID: 000a)..."

sudo tee "$RULE_FILE" > /dev/null << 'EOF'
# ATAS K81 / YJS MicroChip Mechanical Keyboard HID permission
KERNEL=="hidraw*", ATTRS{idVendor}=="5566", ATTRS{idProduct}=="000a", MODE="0666", GROUP="input"
SUBSYSTEM=="usb", ATTR{idVendor}=="5566", ATTR{idProduct}=="000a", MODE="0666", GROUP="input"
EOF

# Reload and trigger udev subsystem to apply newly registered rules
echo "[*] Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "[+] Configuration complete. Reconnect keyboard USB cable for rules to take effect."
