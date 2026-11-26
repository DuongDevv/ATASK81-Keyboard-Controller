use std::fs::OpenOptions;
use std::io::Write;
use std::thread::sleep;
use std::time::Duration;

const MAGIC_BYTE: u8 = 0x55;

fn build_packet(payload: &[u8]) -> [u8; 65] {
    let mut buf = [0u8; 65]; // Report ID (0x00) + 64 bytes
    buf[0] = 0x00;
    for (i, &b) in payload.iter().enumerate() {
        if i < 64 {
            buf[i + 1] = b;
        }
    }
    buf
}

fn build_cmd(mode: u8, r: u8, g: u8, b: u8, brightness: u8, speed: u8) -> [u8; 65] {
    let mut payload = [0u8; 64];
    payload[0] = MAGIC_BYTE;
    payload[1] = 0x06;
    payload[2] = 0x00;
    payload[4] = 0x20;
    payload[10] = mode;
    payload[11] = brightness;
    payload[12] = speed;
    payload[13] = 0x00;
    payload[14] = if mode == 0x06 { 0x00 } else { 0x01 };
    payload[16] = r;
    payload[17] = g;
    payload[18] = b;

    let mut sum: u32 = 0;
    for i in 4..64 {
        sum += payload[i] as u32;
    }
    payload[3] = (sum & 0xFF) as u8;

    build_packet(&payload)
}

fn test_hidraw(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n[*] Đang thử nghiệm gửi tới {}", path);
    let mut f = OpenOptions::new().read(true).write(true).open(path)?;

    // 1. Handshake 1: 55 01
    let hs1 = build_packet(&[0x55, 0x01]);
    let w1 = f.write(&hs1)?;
    println!("    -> Handshake 1 gửi {} bytes", w1);
    sleep(Duration::from_millis(15));

    // 2. Handshake 2: 55 05 00 20 20
    let hs2 = build_packet(&[0x55, 0x05, 0x00, 0x20, 0x20]);
    let w2 = f.write(&hs2)?;
    println!("    -> Handshake 2 gửi {} bytes", w2);
    sleep(Duration::from_millis(15));

    // 3. Command: Static Cyan (Mode 0x06, R=0, G=255, B=255)
    let cmd = build_cmd(0x06, 0, 255, 255, 255, 1);
    let w3 = f.write(&cmd)?;
    println!("    -> Command gửi {} bytes", w3);
    sleep(Duration::from_millis(15));

    // 4. End sequence: 55 02
    let end = build_packet(&[0x55, 0x02]);
    let w4 = f.write(&end)?;
    println!("    -> End sequence gửi {} bytes", w4);

    println!("[+] HOÀN TẤT GỬI TỚI {}!", path);
    Ok(())
}

fn main() {
    println!("=== ATAS K81 HARDWARE DIAGNOSTIC ===");
    for path in &["/dev/hidraw3", "/dev/hidraw4", "/dev/hidraw5"] {
        if let Err(e) = test_hidraw(path) {
            eprintln!("[-] Thất bại tại {}: {}", path, e);
        }
    }
}
