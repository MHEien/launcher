#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

extern "C" {
    fn host_log(ptr: *const u8, len: i32);
}

fn log(message: &str) {
    unsafe {
        host_log(message.as_ptr(), message.len() as i32);
    }
}

static mut HEAP: [u8; 4096] = [0; 4096];
static mut HEAP_PTR: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(size: i32) -> i32 {
    unsafe {
        let ptr = HEAP_PTR;
        HEAP_PTR += size as usize;
        if HEAP_PTR > HEAP.len() {
            return 0;
        }
        HEAP.as_ptr().add(ptr) as i32
    }
}

#[no_mangle]
pub extern "C" fn init() {
    log("Hello Plugin initialized!");
}

#[no_mangle]
pub extern "C" fn shutdown() {
    log("Hello Plugin shutting down...");
}

#[no_mangle]
pub extern "C" fn search(query_ptr: i32, query_len: i32) -> i32 {
    unsafe {
        HEAP_PTR = 0;
    }
    
    let _query = unsafe {
        core::slice::from_raw_parts(query_ptr as *const u8, query_len as usize)
    };
    
    log("Hello Plugin received search query");
    
    0
}
