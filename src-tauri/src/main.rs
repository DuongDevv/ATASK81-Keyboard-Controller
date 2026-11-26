mod hid_driver;

use hid_driver::{KeyboardController, LedConfigPayload, ATAS_PID, ATAS_VID};

fn main() {
    println!("=== ATAS K81 HARDWARE CONTROLLER ===");
    println!("Đang quét tìm thiết bị (VID: 0x{:04X}, PID: 0x{:04X})...", ATAS_VID, ATAS_PID);

    match KeyboardController::list_matching_devices() {
        Ok(devices) => {
            if devices.is_empty() {
                println!("[!] Không tìm thấy bàn phím ATAS K81 nào qua cổng USB HID.");
                println!("    Gợi ý: Cắm dây Type-C trực tiếp và kiểm tra switch kết nối.");
            } else {
                println!("[+] Tìm thấy {} interface tương thích:", devices.len());
                for dev in &devices {
                    println!("    - {}", dev);
                }
            }
        }
        Err(e) => {
            eprintln!("[-] Lỗi khi quét HID device: {}", e);
        }
    }

    let controller = KeyboardController::new();
    match controller.connect() {
        Ok(_) => {
            println!("[+] Đã kết nối thành công tới ATAS K81!");
            println!("[*] Đang thử nghiệm cấu hình LED (Mode: Static Red)...");
            let test_payload = LedConfigPayload {
                mode: 1,
                brightness: 80,
                speed: 3,
                red: 255,
                green: 0,
                blue: 0,
            };
            match controller.apply_lighting(&test_payload) {
                Ok(_) => println!("[+] Đã gửi gói tin LED thành công!"),
                Err(e) => eprintln!("[-] Không thể gửi gói tin LED: {}", e),
            }
        }
        Err(e) => {
            println!("[*] Trạng thái kết nối: {}", e);
            println!("    (Lưu ý: Trên Linux cần phân quyền udev rules nếu chạy không phải quyền root)");
        }
    }
}
