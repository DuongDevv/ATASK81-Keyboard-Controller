use hidapi::{HidApi, HidDevice};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::thread::sleep;
use std::time::Duration;
use thiserror::Error;

pub const ATAS_VID: u16 = 0x5566;
pub const ATAS_PID: u16 = 0x000A;
pub const PACKET_SIZE: usize = 64;
pub const FRAME_SIZE: usize = 65; // Report ID (0x00) + 64-byte payload
pub const MAGIC_BYTE: u8 = 0x55;

#[derive(Error, Debug)]
pub enum HidDriverError {
    #[error("Device 0x{0:04X}:0x{1:04X} not found. Ensure USB cable is attached.")]
    DeviceNotFound(u16, u16),
    #[error("USB HID communication failure: {0}")]
    CommunicationError(String),
    #[error("Payload exceeds maximum allowable frame size ({0} > 64 bytes)")]
    PayloadTooLarge(usize),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedConfigPayload {
    pub mode: u8,
    pub brightness: u8, // 0 - 255
    pub speed: u8,      // 1 - 4
    pub red: u8,
    pub green: u8,
    pub blue: u8,
}

pub struct KeyboardController {
    // Thread-safe device handle guarded via parking_lot::Mutex
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

    // Computes 8-bit additive sum checksum over bytes 4..63 (YJS MCU protocol invariant)
    pub fn calculate_checksum(payload: &[u8; PACKET_SIZE]) -> u8 {
        let mut sum: u32 = 0;
        for i in 4..64 {
            sum += payload[i] as u32;
        }
        (sum & 0xFF) as u8
    }

    // Formats a 65-byte buffer: Report ID (0x00) followed by 64-byte payload
    pub fn wrap_report(payload: &[u8]) -> Result<[u8; FRAME_SIZE], HidDriverError> {
        if payload.len() > PACKET_SIZE {
            return Err(HidDriverError::PayloadTooLarge(payload.len()));
        }

        let mut frame = [0u8; FRAME_SIZE];
        frame[0] = 0x00; // Report ID
        frame[1..1 + payload.len()].copy_from_slice(payload);
        Ok(frame)
    }

    // Assembles 64-byte mode configuration command frame
    pub fn build_mode_command(config: &LedConfigPayload) -> [u8; PACKET_SIZE] {
        let mut payload = [0u8; PACKET_SIZE];
        payload[0] = MAGIC_BYTE; // 0x55
        payload[1] = 0x06;       // Mode command opcode
        payload[2] = 0x00;
        payload[4] = 0x20;       // Command prefix
        payload[10] = config.mode;
        payload[11] = config.brightness;
        payload[12] = config.speed;
        payload[13] = 0x00;
        payload[14] = if config.mode == 0x06 { 0x00 } else { 0x01 };
        payload[16] = config.red;
        payload[17] = config.green;
        payload[18] = config.blue;

        payload[3] = Self::calculate_checksum(&payload);
        payload
    }

    // Dispatches four-step handshake protocol down to device via interrupt OUT endpoint
    pub fn apply_lighting(&self, config: &LedConfigPayload) -> Result<(), HidDriverError> {
        let mut dev_lock = self.device.lock();
        let device = dev_lock.as_mut().ok_or(HidDriverError::DeviceNotFound(ATAS_VID, ATAS_PID))?;

        // Step 1: Handshake initialization
        let hs1 = Self::wrap_report(&[0x55, 0x01])?;
        device.write(&hs1).map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        sleep(Duration::from_millis(15));

        // Step 2: Buffer alignment
        let hs2 = Self::wrap_report(&[0x55, 0x05, 0x00, 0x20, 0x20])?;
        device.write(&hs2).map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        sleep(Duration::from_millis(15));

        // Step 3: Configuration command frame
        let cmd_payload = Self::build_mode_command(config);
        let cmd = Self::wrap_report(&cmd_payload)?;
        device.write(&cmd).map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        sleep(Duration::from_millis(15));

        // Step 4: Transaction terminator
        let end = Self::wrap_report(&[0x55, 0x02])?;
        device.write(&end).map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;

        Ok(())
    }
}
