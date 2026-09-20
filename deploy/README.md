# Production Deployment & Security Guide

This folder contains the production-ready infrastructure configurations for hosting the **Nepali Programming Language Studio** safely on Linux servers (Ubuntu/Debian, CentOS/RHEL, AlmaLinux, Arch).

---

## 🛡️ Security Protections Built-in

1. **Isolation & Mode Shielding**:
   - `HOSTED_STUDIO=true` environment variable is enforced.
   - Raw host OS filesystem execution is hidden from UI and rejected on backend.
   - Code executes in ephemeral scratch sandboxes (`/tmp/nepali_sandbox_*`) with automated per-session cleanup.

2. **Nginx Hardening**:
   - **Rate Limiting**: Dedicated rate limits for `/api/run` (15 req/min) and `/api/ask` (10 req/min) to prevent compute exhaustion / DDoS.
   - **Modern TLS**: TLSv1.2 & TLSv1.3 with strict ciphers, session tickets off, and OCSP stapling.
   - **Security Headers**: HSTS, strict CSP (Next.js + WASM allowed), X-Frame-Options DENY, nosniff, strict Referrer-Policy, and restricted Permissions-Policy.
   - **Payload Limits**: `client_max_body_size 2M` prevents memory exhaustion via huge POST requests.
   - **File Leak Defense**: Regex blocks all hidden files (`.git`, `.env`, `.cargo`) and source/config files (`.toml`, `.lock`, `.sqlite`, `.log`).

3. **PM2 Process Supervision**:
   - Cluster mode running across CPU cores.
   - Automatic restart on crash and memory ceiling (`max_memory_restart: 600M`).
   - Isolated log rotation in `/var/log/nepali-studio/`.

---

## 🚀 Quick Deployment Steps

### Step 1: Run Automated Build & PM2 Start
```bash
chmod +x deploy/setup.sh
./deploy/setup.sh
```

### Step 2: Configure Nginx
```bash
# 1. Copy config
sudo cp deploy/nginx/nepali-studio.conf /etc/nginx/sites-available/nepali-studio

# 2. Enable site
sudo ln -sf /etc/nginx/sites-available/nepali-studio /etc/nginx/sites-enabled/

# 3. Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Enable Free SSL with Certbot
```bash
sudo certbot --nginx -d your-domain.com
```

---

## 📊 Management Commands

| Action | Command |
|---|---|
| View Status | `pm2 status` |
| View Live Logs | `pm2 logs nepali-studio` |
| Restart Studio | `pm2 restart nepali-studio` |
| Stop Studio | `pm2 stop nepali-studio` |
| Reload Nginx | `sudo systemctl reload nginx` |
