use std::fs::OpenOptions;
use std::io::Write;
use std::thread::sleep;
use std::time::Duration;

const MAGIC_BYTE: u8 = 0x55;

// Formats a 65-byte frame: Report ID (0x00) followed by 64-byte payload
fn build_packet(payload: &[u8]) -> [u8; 65] {
    let mut buf = [0u8; 65];
    buf[0] = 0x00;
    for (i, &b) in payload.iter().enumerate() {
        if i < 64 {
            buf[i + 1] = b;
        }
    }
    buf
}

// Constructs mode packet with 8-bit additive checksum over bytes 4..63
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

// Executes the four-step handshake sequence against target character device node
fn test_hidraw(path: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n[*] Probing endpoint: {}", path);
    let mut f = OpenOptions::new().read(true).write(true).open(path)?;

    // Step 1: Handshake initialization
    let hs1 = build_packet(&[0x55, 0x01]);
    let w1 = f.write(&hs1)?;
    println!("    -> HS1 dispatched ({} bytes)", w1);
    sleep(Duration::from_millis(15));

    // Step 2: Buffer alignment
    let hs2 = build_packet(&[0x55, 0x05, 0x00, 0x20, 0x20]);
    let w2 = f.write(&hs2)?;
    println!("    -> HS2 dispatched ({} bytes)", w2);
    sleep(Duration::from_millis(15));

    // Step 3: Command frame (Static Cyan test)
    let cmd = build_cmd(0x06, 0, 255, 255, 255, 1);
    let w3 = f.write(&cmd)?;
    println!("    -> CMD dispatched ({} bytes)", w3);
    sleep(Duration::from_millis(15));

    // Step 4: Transaction terminator
    let end = build_packet(&[0x55, 0x02]);
    let w4 = f.write(&end)?;
    println!("    -> END dispatched ({} bytes)", w4);

    println!("[+] Successfully committed transaction to {}", path);
    Ok(())
}

fn main() {
    println!("=== ATAS K81 HARDWARE DIAGNOSTIC ===");
    for path in &["/dev/hidraw3", "/dev/hidraw4", "/dev/hidraw5"] {
        if let Err(e) = test_hidraw(path) {
            eprintln!("[-] Error probing {}: {}", path, e);
        }
    }
}
