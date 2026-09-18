//! Real cache access via a real `redis-server` process, over a real
//! network connection (`redis` crate) - services roadmap item 2 in
//! CLAUDE.md (fileserver done first). No in-process fallback: if there's
//! no real Redis to connect to, `क्यास_राख्नुहोस्`/`क्यास_ल्याउनुहोस्`/
//! `क्यास_हटाउनुहोस्` fail with a clear error rather than silently
//! degrading to an in-memory map that would stop being a real "cache"
//! the moment a second process needed to share it.
use nepali_core::HostCache;
use redis::Commands;
use std::cell::RefCell;

/// Connects lazily, on the first real cache call - not eagerly at
/// interpreter startup, which would print a warning (or add real
/// connect latency) every time the shell starts even for sessions that
/// never touch the cache. Once connected, the same real connection is
/// reused for later calls rather than reconnecting each time.
pub struct RedisCache {
    url: String,
    conn: RefCell<Option<redis::Connection>>,
}

impl RedisCache {
    pub fn new(url: String) -> Self {
        RedisCache { url, conn: RefCell::new(None) }
    }

    fn with_conn<T>(
        &self,
        f: impl FnOnce(&mut redis::Connection) -> redis::RedisResult<T>,
    ) -> Result<T, String> {
        let mut guard = self.conn.borrow_mut();
        if guard.is_none() {
            let client = redis::Client::open(self.url.as_str())
                .map_err(|e| format!("क्यास: '{}' अवैध redis URL: {e}", self.url))?;
            let conn = client
                .get_connection()
                .map_err(|e| format!("क्यास: '{}' मा redis-server सँग जोड्न सकिएन: {e}", self.url))?;
            *guard = Some(conn);
        }
        let conn = guard.as_mut().expect("just set above");
        f(conn).map_err(|e| e.to_string())
    }
}

impl HostCache for RedisCache {
    fn set(&self, key: &str, value: &str, ttl_seconds: u64) -> Result<(), String> {
        if ttl_seconds > 0 {
            self.with_conn(|conn| conn.set_ex::<_, _, ()>(key, value, ttl_seconds))
        } else {
            self.with_conn(|conn| conn.set::<_, _, ()>(key, value))
        }
    }

    fn get(&self, key: &str) -> Result<Option<String>, String> {
        self.with_conn(|conn| conn.get(key))
    }

    fn delete(&self, key: &str) -> Result<(), String> {
        self.with_conn(|conn| conn.del::<_, ()>(key))
    }
}

/// Real automated coverage for the cache bridge - same reasoning as
/// `host_python.rs`'s tests, but this one needs a real `redis-server` to
/// talk to. Rather than requiring one to already be running (like the
/// manual verification during development did), the test starts its own
/// real `redis-server` subprocess on a dedicated test-only port and
/// tears it down afterward - self-contained, but still a real external
/// server, not an in-process fake standing in for one. Requires
/// `redis-server` on `$PATH` to run (the same real requirement this
/// bridge has in production - no in-process fallback, see the module
/// doc above); panics with an actionable message if it's missing rather
/// than silently skipping.
#[cfg(test)]
mod tests {
    use super::*;
    use std::process::{Child, Command, Stdio};
    use std::time::Duration;

    struct TestRedisServer {
        child: Child,
        port: u16,
    }

    impl TestRedisServer {
        fn start() -> Self {
            let port = 16399; // fixed test-only port, distinct from redis's default 6379
            let child = Command::new("redis-server")
                .args(["--port", &port.to_string(), "--daemonize", "no", "--save", "", "--appendonly", "no"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .expect(
                    "redis-server isn't on $PATH - install it to run this test \
                     (e.g. `brew install redis` or `apt install redis-server`), \
                     the same real requirement this bridge has in production",
                );
            std::thread::sleep(Duration::from_millis(300)); // real startup time to bind the port
            TestRedisServer { child, port }
        }

        fn url(&self) -> String {
            format!("redis://127.0.0.1:{}", self.port)
        }
    }

    impl Drop for TestRedisServer {
        fn drop(&mut self) {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }

    #[test]
    fn real_redis_set_get_delete_and_ttl() {
        let server = TestRedisServer::start();
        let cache = RedisCache::new(server.url());

        cache.set("greeting", "नमस्ते क्यास!", 0).unwrap();
        assert_eq!(cache.get("greeting").unwrap(), Some("नमस्ते क्यास!".to_string()));

        assert_eq!(cache.get("no-such-key").unwrap(), None, "a real miss must be None, not an error");

        cache.delete("greeting").unwrap();
        assert_eq!(cache.get("greeting").unwrap(), None);

        cache.set("temp", "soon gone", 1).unwrap();
        assert_eq!(cache.get("temp").unwrap(), Some("soon gone".to_string()));
        std::thread::sleep(Duration::from_millis(1200));
        assert_eq!(cache.get("temp").unwrap(), None, "real TTL expiry, not just delete");
    }

    #[test]
    fn connecting_to_a_dead_server_is_a_real_error() {
        // Nothing listening here - a real connection failure, not a
        // silent no-op.
        let cache = RedisCache::new("redis://127.0.0.1:1".to_string());
        assert!(cache.set("k", "v", 0).is_err());
    }
}
