# Linux Server Setup - CSV Transformer

## Automatischer Service-Start (Empfohlen)

### Option 1: Systemd Service (für Ubuntu/Debian/CentOS)

1. **Service installieren:**
   ```bash
   chmod +x install-service.sh
   ./install-service.sh
   ```

2. **Service-Management:**
   ```bash
   # Status prüfen
   sudo systemctl status csv-transformer
   
   # Logs anzeigen
   sudo journalctl -u csv-transformer -f
   
   # Service stoppen/starten
   sudo systemctl stop csv-transformer
   sudo systemctl start csv-transformer
   ```

### Option 2: PM2 Process Manager

1. **PM2 installieren:**
   ```bash
   npm install -g pm2
   ```

2. **Application mit PM2 starten:**
   ```bash
   pm2 start "npm run dev -- --host 0.0.0.0 --port 8080" --name csv-transformer
   pm2 save
   pm2 startup
   ```

3. **PM2 Management:**
   ```bash
   pm2 status          # Status anzeigen
   pm2 logs            # Logs anzeigen
   pm2 restart csv-transformer
   pm2 stop csv-transformer
   ```

### Option 3: Screen/Tmux (Einfach)

1. **Mit Screen:**
   ```bash
   screen -S csv-transformer
   npm run dev -- --host 0.0.0.0 --port 8080
   # Ctrl+A, dann D zum Detachen
   
   # Wieder anhängen:
   screen -r csv-transformer
   ```

2. **Mit Tmux:**
   ```bash
   tmux new-session -d -s csv-transformer
   tmux send-keys -t csv-transformer "npm run dev -- --host 0.0.0.0 --port 8080" Enter
   
   # Session anzeigen:
   tmux attach -t csv-transformer
   ```

## Firewall-Konfiguration

```bash
# Port 8080 öffnen (Ubuntu/Debian)
sudo ufw allow 8080

# Port 8080 öffnen (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/csv-transformer
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

- **Port bereits belegt:** `sudo lsof -i :8080` um zu sehen welcher Prozess den Port verwendet
- **Logs prüfen:** Bei systemd service: `sudo journalctl -u csv-transformer -f`
- **Berechtigungen:** Stelle sicher, dass der User Schreibrechte im Projektverzeichnis hat