#!/bin/bash
set -e

PI="admin_pi5@fahad-pi5.local"
REMOTE_DIR="/home/admin_pi5/dino-race"

echo "Syncing files to Pi..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '*.png' \
  --exclude 'screenshot*.mjs' \
  ./ "$PI:$REMOTE_DIR/"

echo "Setting up on Pi..."
ssh "$PI" << 'EOF'
cd ~/dino-race

# Install node deps
npm install --omit=dev

# Install and enable systemd service
sudo cp dino-race.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dino-race.service
sudo systemctl restart dino-race.service

echo ""
echo "Deployed! Service status:"
sudo systemctl status dino-race.service --no-pager -l
EOF

echo ""
echo "Done. Game running on Pi at http://fahad-pi5.local:3456"
echo "Set up Cloudflare Tunnel to expose it publicly."
