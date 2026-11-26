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
    #[error("Không tìm thấy bàn phím ATAS K81 (0x{0:04X}:0x{1:04X}). Hãy cắm dây Type-C!")]
    DeviceNotFound(u16, u16),
    #[error("Lỗi giao tiếp tầng USB HID: {0}")]
    CommunicationError(String),
    #[error("Dữ liệu payload vượt quá kích thước frame cho phép ({0} > 57 bytes)")]
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
    // Bọc HidDevice trong parking_lot::Mutex bảo đảm hiệu năng cao và no-poisoning
    device: Mutex<Option<HidDevice>>,
}

impl KeyboardController {
    pub fn new() -> Self {
        Self {
            device: Mutex::new(None),
        }
    }

    /// Khởi tạo kết nối tới thiết bị
    pub fn connect(&self) -> Result<(), HidDriverError> {
        let api = HidApi::new().map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;
        
        let device = api
            .open(ATAS_VID, ATAS_PID)
            .map_err(|_| HidDriverError::DeviceNotFound(ATAS_VID, ATAS_PID))?;

        let mut dev_lock = self.device.lock();
        *dev_lock = Some(device);
        Ok(())
    }

    /// Liệt kê các endpoint/interface khả dụng của thiết bị
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

    /// Tính mã kiểm tra CRC-16 Modbus (Đảm bảo gói tin không bị nhiễu trên đường truyền USB)
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

    /// Đóng gói Frame nhị phân 64 Bytes chuẩn quy chuẩn Phase 2
    pub fn build_packet(&self, cmd: u8, seq_id: u8, payload: &[u8]) -> Result<[u8; PACKET_SIZE], HidDriverError> {
        if payload.len() > 57 {
            return Err(HidDriverError::PayloadTooLarge(payload.len()));
        }

        let mut packet = [0u8; PACKET_SIZE];
        packet[0] = 0x00;        // Report ID
        packet[1] = MAGIC_BYTE;  // 0x5A
        packet[2] = cmd;         // Mã lệnh
        packet[3] = seq_id;      // Sequence ID chống replay
        packet[4] = payload.len() as u8;

        // Copy dữ liệu payload vào mảng từ offset 5
        packet[5..5 + payload.len()].copy_from_slice(payload);

        // Tính CRC16 cho 62 bytes đầu tiên (từ packet[0] đến packet[61])
        let checksum = Self::calculate_crc16(&packet[0..62]);
        packet[62] = (checksum & 0xFF) as u8;        // Byte thấp
        packet[63] = ((checksum >> 8) & 0xFF) as u8; // Byte cao

        Ok(packet)
    }

    /// Gửi cấu hình LED xuống MCU
    pub fn apply_lighting(&self, config: &LedConfigPayload) -> Result<(), HidDriverError> {
        let mut dev_lock = self.device.lock();
        let device = dev_lock.as_mut().ok_or(HidDriverError::DeviceNotFound(ATAS_VID, ATAS_PID))?;

        // Payload quy ước: [mode, brightness, speed, r, g, b]
        let payload = [
            config.mode,
            config.brightness,
            config.speed,
            config.red,
            config.green,
            config.blue,
        ];

        let packet = self.build_packet(0x02, 0x01, &payload)?;

        // Ghi trực tiếp Feature Report xuống cổng USB HID
        device
            .send_feature_report(&packet)
            .map_err(|e| HidDriverError::CommunicationError(e.to_string()))?;

        Ok(())
    }
}
