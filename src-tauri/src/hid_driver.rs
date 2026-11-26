use hidapi::{HidApi, HidDevice};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const ATAS_VID: u16 = 0x5566;
pub const ATAS_PID: u16 = 0x000A;
pub const PACKET_SIZE: usize = 64;
pub const MAGIC_BYTE: u8 = 0x5A;

#[derive(Error, Debug)]
pub enum HidDriverError {
    #[error("Device 0x{0:04X}:0x{1:04X} not found. Ensure USB cable is attached.")]
    DeviceNotFound(u16, u16),
    #[error("USB HID communication failure: {0}")]
    CommunicationError(String),
    #[error("Payload exceeds maximum allowable frame size ({0} > 57 bytes)")]
    PayloadTooLarge(usize),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedConfigPayload {
    pub mode: u8,
    pub brightness: u8, // 0 - 100
    pub speed: u8,      // 1 - 5
    pub red: u8,
    pub green: u8,
    pub blue: u8,
}

pub struct KeyboardController {
    // Thread-safe device handle guarded via parking_lot::Mutex (avoids lock poisoning overhead)
    device: Mutex<Option<HidDevice>>,
}

impl KeyboardController {
    pub fn new() -> Self {
        Self {
            device: Mutex::new(None),
        }
    }

    // Opens connection to target USB HID vendor/product endpoint
    pub fn connect(&self) -> Result<(), HidDriverError> {
        let api = HidApi::new().map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        
        let device = api
            .open(ATAS_VID, ATAS_PID)
            .map_err(|_| HidDriverError::DeviceNotFound(ATAS_VID, ATAS_PID))?;

        let mut dev_lock = self.device.lock();
        *dev_lock = Some(device);
        Ok(())
    }

    // Enumerates matching device descriptors and interface endpoints
    pub fn list_matching_devices() -> Result<Vec<String>, HidDriverError> {
        let api = HidApi::new().map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        let mut devices = Vec::new();

        for dev in api.device_list() {
            if dev.vendor_id() == ATAS_VID && dev.product_id() == ATAS_PID {
                devices.push(format!(
                    "Path: {:?}, Interface: {}, Usage Page: 0x{:04X}, Usage: 0x{:04X}",
                    dev.path(),
                    dev.interface_number(),
                    dev.usage_page(),
                    dev.usage()
                ));
            }
        }

        Ok(devices)
    }

    // Standard CRC-16 Modbus (polynomial 0xA001) for packet integrity verification
    pub fn calculate_crc16(data: &[u8]) -> u16 {
        let mut crc: u16 = 0xFFFF;
        for &byte in data {
            crc ^= byte as u16;
            for _ in 0..8 {
                if (crc & 0x0001) != 0 {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc >>= 1;
                }
            }
        }
        crc
    }

    // Encapsulates payload into structured 64-byte binary report frame
    pub fn build_packet(&self, cmd: u8, seq_id: u8, payload: &[u8]) -> Result<[u8; PACKET_SIZE], HidDriverError> {
        if payload.len() > 57 {
            return Err(HidDriverError::PayloadTooLarge(payload.len()));
        }

        let mut packet = [0u8; PACKET_SIZE];
        packet[0] = 0x00;        // Report ID
        packet[1] = MAGIC_BYTE;  // Magic synchronization byte
        packet[2] = cmd;         // Command opcode
        packet[3] = seq_id;      // Sequence ID (anti-replay)
        packet[4] = payload.len() as u8;

        packet[5..5 + payload.len()].copy_from_slice(payload);

        // Compute CRC16 over bytes 0..61 and append at tail
        let checksum = Self::calculate_crc16(&packet[0..62]);
        packet[62] = (checksum & 0xFF) as u8;
        packet[63] = ((checksum >> 8) & 0xFF) as u8;

        Ok(packet)
    }

    // Dispatches lighting payload to controller endpoint
    pub fn apply_lighting(&self, config: &LedConfigPayload) -> Result<(), HidDriverError> {
        let mut dev_lock = self.device.lock();
        let device = dev_lock.as_mut().ok_or(HidDriverError::DeviceNotFound(ATAS_VID, ATAS_PID))?;

        let payload = [
            config.mode,
            config.brightness,
            config.speed,
            config.red,
            config.green,
            config.blue,
        ];

        let packet = self.build_packet(0x02, 0x01, &payload)?;

        device
            .send_feature_report(&packet)
            .map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;

        Ok(())
    }
}
