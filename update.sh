#!/bin/bash

# Ollama Flow - Update Script
# This script updates the application to the latest version

set -e

echo "🔄 Ollama Flow - Update Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Configuration
REPO_URL="https://github.com/jahartmann/ollama-flow.git"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# Check if we're in a git repository
check_git_repo() {
    if [ ! -d ".git" ]; then
        print_error "Nicht in einem Git-Repository. Bitte führen Sie das Update-Script im Projektverzeichnis aus."
        exit 1
    fi
    
    # Check if remote origin matches our repo
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ "$CURRENT_REMOTE" != *"jahartmann/ollama-flow"* ]]; then
        print_warning "Remote-Repository stimmt nicht überein. Erwartete: $REPO_URL"
        print_warning "Aktuell: $CURRENT_REMOTE"
        read -p "Trotzdem fortfahren? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Create backup of current state
create_backup() {
    print_info "Erstelle Backup der aktuellen Installation..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files
    if [ -f ".env.local" ]; then
        cp .env.local "$BACKUP_DIR/"
        print_status "Umgebungskonfiguration gesichert"
    fi
    
    if [ -d "node_modules" ]; then
        print_info "node_modules werden nicht gesichert (zu groß)"
    fi
    
    # Backup any custom configurations
    if [ -f "package.json" ]; then
        cp package.json "$BACKUP_DIR/"
    fi
    
    print_status "Backup erstellt in: $BACKUP_DIR"
}

# Check for uncommitted changes
check_uncommitted_changes() {
    if ! git diff-index --quiet HEAD --; then
        print_warning "Es gibt nicht-commitete Änderungen:"
        git status --porcelain
        echo
        read -p "Möchten Sie diese Änderungen vor dem Update stashen? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "Pre-update stash $(date)"
            print_status "Änderungen gestasht"
        else
            print_warning "Fortfahren ohne Stashing. Lokale Änderungen könnten überschrieben werden."
        fi
    fi
}

# Fetch and update from remote
update_code() {
    print_info "Lade neueste Version herunter..."
    
    # Fetch latest changes
    git fetch origin main
    
    # Get current and latest commit
    CURRENT_COMMIT=$(git rev-parse HEAD)
    LATEST_COMMIT=$(git rev-parse origin/main)
    
    if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
        print_status "Bereits auf der neuesten Version!"
        return 0
    fi
    
    print_info "Aktueller Commit: ${CURRENT_COMMIT:0:7}"
    print_info "Neuester Commit: ${LATEST_COMMIT:0:7}"
    
    # Show what will be updated
    echo
    print_info "Änderungen seit der letzten Version:"
    git log --oneline HEAD..origin/main | head -10
    echo
    
    read -p "Update auf die neueste Version durchführen? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Update abgebrochen."
        exit 0
    fi
    
    # Pull latest changes
    git pull origin main
    print_status "Code aktualisiert"
}

# Update dependencies
update_dependencies() {
    print_info "Aktualisiere Abhängigkeiten..."
    
    # Detect package manager
    if command -v bun >/dev/null 2>&1 && [ -f "bun.lockb" ]; then
        PACKAGE_MANAGER="bun"
        bun install
    elif command -v yarn >/dev/null 2>&1 && [ -f "yarn.lock" ]; then
        PACKAGE_MANAGER="yarn"
        yarn install
    elif command -v npm >/dev/null 2>&1; then
        PACKAGE_MANAGER="npm"
        npm install
    else
        print_error "Kein unterstützter Package Manager gefunden"
        exit 1
    fi
    
    print_status "Abhängigkeiten mit $PACKAGE_MANAGER aktualisiert"
}

# Build application
build_application() {
    print_info "Erstelle Produktions-Build..."
    
    case $PACKAGE_MANAGER in
        "bun")
            bun run build
            ;;
        "yarn")
            yarn build
            ;;
        "npm")
            npm run build
            ;;
    esac
    
    print_status "Build erfolgreich erstellt"
}

# Restart services (if running in production)
restart_services() {
    if command -v systemctl >/dev/null 2>&1; then
        print_info "Suche nach systemd-Services..."
        
        # Check for common service names
        SERVICES=("ollama-flow" "etl-platform" "node-app")
        FOUND_SERVICE=""
        
        for service in "${SERVICES[@]}"; do
            if systemctl is-active --quiet "$service" 2>/dev/null; then
                FOUND_SERVICE="$service"
                break
            fi
        done
        
        if [ -n "$FOUND_SERVICE" ]; then
            read -p "Service '$FOUND_SERVICE' gefunden. Neustarten? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sudo systemctl restart "$FOUND_SERVICE"
                print_status "Service '$FOUND_SERVICE' neugestartet"
            fi
        fi
    fi
    
    # Check for PM2 processes
    if command -v pm2 >/dev/null 2>&1; then
        PM2_PROCESSES=$(pm2 list --silent 2>/dev/null | grep -c "online" || echo "0")
        if [ "$PM2_PROCESSES" -gt 0 ]; then
            read -p "PM2-Prozesse gefunden. Neustarten? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                pm2 restart all
                print_status "PM2-Prozesse neugestartet"
            fi
        fi
    fi
}

# Cleanup old backups (keep last 5)
cleanup_backups() {
    print_info "Bereinige alte Backups..."
    
    # Count backup directories
    BACKUP_COUNT=$(find . -maxdepth 1 -name "backup_*" -type d | wc -l)
    
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        # Remove oldest backups, keep newest 5
        find . -maxdepth 1 -name "backup_*" -type d -printf '%T@ %p\n' | sort -n | head -n -5 | cut -d' ' -f2- | xargs rm -rf
        print_status "Alte Backups bereinigt"
    fi
}

# Main update process
main() {
    echo
    print_info "Starte Update-Prozess..."
    
    check_git_repo
    create_backup
    check_uncommitted_changes
    update_code
    update_dependencies
    
    # Ask if user wants to build
    read -p "Produktions-Build erstellen? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_application
    fi
    
    restart_services
    cleanup_backups
    
    echo
    print_status "🎉 Update erfolgreich abgeschlossen!"
    echo
    print_info "Backup verfügbar in: $BACKUP_DIR"
    print_info "Bei Problemen können Sie mit 'git log' die Änderungen einsehen"
    print_info "oder mit 'git reset --hard <commit>' zu einer früheren Version zurückkehren"
    echo
    
    # Show current version info
    if [ -f "package.json" ]; then
        VERSION=$(grep '"version"' package.json | cut -d'"' -f4 2>/dev/null || echo "unknown")
        print_info "Aktuelle Version: $VERSION"
    fi
    
    CURRENT_COMMIT=$(git rev-parse --short HEAD)
    print_info "Aktueller Commit: $CURRENT_COMMIT"
}

# Handle script interruption
trap 'print_error "Update unterbrochen"; exit 1' INT

# Run main function
main

print_status "Update-Prozess abgeschlossen! 🚀"