#!/bin/bash
set -e

RULE_FILE="/etc/udev/rules.d/99-atas-k81.rules"

echo "[*] Thiết lập Udev rule cho ATAS K81 (VID: 5566, PID: 000a)..."

sudo tee "$RULE_FILE" > /dev/null << 'EOF'
# ATAS K81 / YJS MicroChip Mechanical Keyboard HID permission
KERNEL=="hidraw*", ATTRS{idVendor}=="5566", ATTRS{idProduct}=="000a", MODE="0666", GROUP="input"
SUBSYSTEM=="usb", ATTR{idVendor}=="5566", ATTR{idProduct}=="000a", MODE="0666", GROUP="input"
EOF

echo "[*] Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "[+] Hoàn tất! Hãy rút cáp bàn phím và cắm lại để rule có hiệu lực."
