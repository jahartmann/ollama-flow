#!/bin/bash

# CSV Transformer Service Installation Script
# This script sets up the application to run continuously as a systemd service

echo "🚀 Setting up CSV Transformer as a Linux service..."

# Get the current directory
APP_DIR=$(pwd)
USER=$(whoami)

# Create the systemd service file
sudo tee /etc/systemd/system/csv-transformer.service > /dev/null <<EOF
[Unit]
Description=CSV Transformer Web Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStartPre=/usr/bin/npm install
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 8080
Restart=always
RestartSec=10
Environment=NODE_ENV=development

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=csv-transformer

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start at boot
sudo systemctl enable csv-transformer.service

# Start the service
sudo systemctl start csv-transformer.service

echo "✅ Service installed and started!"
echo ""
echo "📋 Useful commands:"
echo "   Start service:    sudo systemctl start csv-transformer"
echo "   Stop service:     sudo systemctl stop csv-transformer"
echo "   Restart service:  sudo systemctl restart csv-transformer"
echo "   View status:      sudo systemctl status csv-transformer"
echo "   View logs:        sudo journalctl -u csv-transformer -f"
echo "   Disable service:  sudo systemctl disable csv-transformer"
echo ""
echo "🌐 Your application should now be running at: http://your-server-ip:8080"
echo "   The service will automatically restart if it crashes and start on system boot."