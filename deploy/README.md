# Production Deployment Guide — nepali.dibe.sh

Infrastructure configurations for hosting **Nepali Programming Language Studio**
at **`nepali.dibe.sh`** safely on a Linux VPS.

---

## 🏗 Architecture

```
Browser  ──►  nginx (443 / nepali.dibe.sh)
                 │  rate-limit, TLS, CSP, HSTS
                 ▼
           Next.js + PM2 (localhost:3000)
                 │  HOSTED_STUDIO=true
                 │  NEXT_PUBLIC_WEB_STUDIO=true
                 ▼
         /usr/local/bin/nepali   ← native Rust engine
              (sandbox mode only — no OS mode)
```

---

## 🛡️ Security Built-in

| Layer | Protection |
|---|---|
| **Nginx** | Rate-limiting, strict TLS, CSP, HSTS, file-leak blocks |
| **Next.js API** | `HOSTED_STUDIO=true` → hard-reject `mode=os` requests |
| **UI** | `NEXT_PUBLIC_WEB_STUDIO=true` → hides OS mode, file open/save |
| **Banner** | Informs users: "view/run/compile only" |
| **Sandbox** | Each execution in isolated `/tmp/nepali_sandbox_*` dir, cleaned after |

---

## 🚀 Quick Deployment

### Prerequisites (VPS — Ubuntu/Debian)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
# Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 1: Run automated deploy

```bash
git clone https://github.com/itSubeDibesh/Nepali-Programming-Language
cd Nepali-Programming-Language
chmod +x deploy/setup.sh
./deploy/setup.sh
```

### Step 2: Configure Nginx

```bash
sudo cp deploy/nginx/nepali-studio.conf /etc/nginx/sites-available/nepali-studio
sudo ln -sf /etc/nginx/sites-available/nepali-studio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: SSL (Certbot)

```bash
sudo certbot --nginx -d nepali.dibe.sh -d www.nepali.dibe.sh
```

---

## 📊 Management Commands

| Action | Command |
|---|---|
| View status | `pm2 status` |
| Live logs | `pm2 logs nepali-studio` |
| Restart | `pm2 restart nepali-studio` |
| Stop | `pm2 stop nepali-studio` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Renew SSL | `sudo certbot renew --dry-run` |

---

## 🖥 Desktop Installers

Build native installers (macOS .dmg, Linux .deb/.AppImage, Windows .msi):

```bash
./scripts/build-installers.sh
# Outputs → dist/
```

See [build-installers.sh](../scripts/build-installers.sh) for details.
