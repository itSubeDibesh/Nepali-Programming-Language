//! A real authoritative DNS server - a real, bound UDP `:53` listener
//! answering real DNS queries (verified with real `dig`), not an
//! in-memory table pretending to be a nameserver. Third and last item
//! of the services roadmap (fileserver, cache done first - see
//! CLAUDE.md). Built on `hickory-server` (a real, proven, audited DNS
//! protocol implementation - real wire-format parsing, not a hand-rolled
//! one) rather than reimplementing DNS from scratch.
//!
//! Zone and records come from `NEPALI_DNS_ZONE` (default
//! `nepalios.local`) and `NEPALI_DNS_RECORDS` (`name=ip,name=ip,...`,
//! e.g. `app=127.0.0.1,db=10.0.0.5` - each `name` becomes
//! `<name>.<zone>.`). A real, if minimal, authoritative zone - no
//! recursion, no upstream forwarding, honestly scoped to what this OS's
//! own service discovery needs.
use hickory_server::authority::{Catalog, ZoneType};
use hickory_server::proto::rr::rdata::A;
use hickory_server::proto::rr::{Name, RData, Record};
use hickory_server::server::ServerFuture;
use hickory_server::store::in_memory::InMemoryAuthority;
use std::env;
use std::net::Ipv4Addr;
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() {
    let zone = env::var("NEPALI_DNS_ZONE").unwrap_or_else(|_| "nepalios.local".to_string());
    let port = env::var("NEPALI_DNS_PORT").unwrap_or_else(|_| "53".to_string());
    let records_env = env::var("NEPALI_DNS_RECORDS").unwrap_or_default();

    let origin = Name::from_str(&format!("{zone}.")).unwrap_or_else(|e| {
        eprintln!("nepali-dnsserver: invalid zone '{zone}': {e}");
        std::process::exit(1);
    });

    let authority = InMemoryAuthority::empty(origin.clone(), ZoneType::Primary, false);

    let mut added = 0;
    for pair in records_env.split(',').filter(|s| !s.trim().is_empty()) {
        let Some((name, ip)) = pair.split_once('=') else {
            eprintln!("nepali-dnsserver: skipping malformed record '{pair}' (expected name=ip)");
            continue;
        };
        let Ok(ip) = Ipv4Addr::from_str(ip.trim()) else {
            eprintln!("nepali-dnsserver: skipping '{pair}': '{ip}' isn't a valid IPv4 address");
            continue;
        };
        let fqdn = match Name::from_str(&format!("{}.{zone}.", name.trim())) {
            Ok(n) => n,
            Err(e) => {
                eprintln!("nepali-dnsserver: skipping '{pair}': invalid name: {e}");
                continue;
            }
        };
        let record = Record::from_rdata(fqdn, 300, RData::A(A(ip)));
        authority.upsert(record, 0).await;
        added += 1;
    }

    let mut catalog = Catalog::new();
    catalog.upsert(origin.into(), Box::new(Arc::new(authority)));

    let addr = format!("0.0.0.0:{port}");
    let socket = match UdpSocket::bind(&addr).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("nepali-dnsserver: couldn't bind {addr}: {e}");
            std::process::exit(1);
        }
    };
    println!("nepali-dnsserver: sunirakheko {addr}, zone {zone} ({added} record(s))");

    let mut server = ServerFuture::new(catalog);
    server.register_socket(socket);
    if let Err(e) = server.block_until_done().await {
        eprintln!("nepali-dnsserver: server error: {e}");
        std::process::exit(1);
    }
}
