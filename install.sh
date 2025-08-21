#!/bin/bash

# Ollama Flow - Installation Script
# This script installs and configures the Ollama Flow ETL Platform

set -e

echo "🚀 Ollama Flow - Installation Script"
echo "===================================="

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

# Set repository URL
REPO_URL="https://github.com/jahartmann/ollama-flow.git"
PROJECT_DIR="ollama-flow"

# Clone repository if not already cloned
clone_repository() {
    if [ ! -d "$PROJECT_DIR" ]; then
        print_info "Cloning Ollama Flow repository..."
        git clone "$REPO_URL" "$PROJECT_DIR"
        print_status "Repository cloned successfully"
    else
        print_status "Repository already exists"
    fi
    
    cd "$PROJECT_DIR"
    print_status "Changed to project directory: $(pwd)"
}

# Check if running on supported OS
check_os() {
    print_info "Checking operating system..."
    case "$(uname -s)" in
        Linux*)     MACHINE=Linux;;
        Darwin*)    MACHINE=Mac;;
        CYGWIN*)    MACHINE=Cygwin;;
        MINGW*)     MACHINE=MinGw;;
        *)          MACHINE="UNKNOWN:$(uname -s)"
    esac
    print_status "Detected OS: $MACHINE"
}

# Check if Node.js is installed
check_node() {
    print_info "Checking Node.js installation..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_status "Node.js found: $NODE_VERSION"
        
        # Check if version is >= 18
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            print_status "Node.js version is compatible"
        else
            print_error "Node.js version must be 18 or higher. Current: $NODE_VERSION"
            print_info "Please update Node.js from https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Node.js not found"
        print_info "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
}

# Check if npm or yarn is available
check_package_manager() {
    print_info "Checking package manager..."
    if command -v bun >/dev/null 2>&1; then
        PACKAGE_MANAGER="bun"
        print_status "Using Bun package manager"
    elif command -v yarn >/dev/null 2>&1; then
        PACKAGE_MANAGER="yarn"
        print_status "Using Yarn package manager"
    elif command -v npm >/dev/null 2>&1; then
        PACKAGE_MANAGER="npm"
        print_status "Using npm package manager"
    else
        print_error "No package manager found (npm, yarn, or bun required)"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    
    case $PACKAGE_MANAGER in
        "bun")
            bun install
            ;;
        "yarn")
            yarn install
            ;;
        "npm")
            npm install
            ;;
    esac
    
    print_status "Dependencies installed successfully"
}

# Check Ollama installation
check_ollama() {
    print_info "Prüfe Ollama-Verfügbarkeit..."
    
    read -p "Möchten Sie Ollama lokal installieren und konfigurieren? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Ollama-Installation übersprungen (externes Hosting)"
        print_warning "Stellen Sie sicher, dass Ihr Ollama-Server erreichbar ist:"
        print_info "- Standard: http://localhost:11434"
        print_info "- Oder konfigurieren Sie die URL in den Einstellungen"
        return 0
    fi
    
    if command -v ollama >/dev/null 2>&1; then
        print_status "Ollama gefunden"
        
        # Check if Ollama service is running
        if pgrep -x "ollama" > /dev/null; then
            print_status "Ollama-Service läuft bereits"
        else
            print_warning "Ollama ist installiert aber läuft nicht"
            print_info "Starte Ollama-Service..."
            if [ "$MACHINE" = "Linux" ]; then
                ollama serve &
                sleep 2
                print_status "Ollama-Service gestartet"
            else
                print_info "Bitte starten Sie Ollama manuell: 'ollama serve'"
            fi
        fi
        
        # Check available models
        print_info "Prüfe verfügbare Modelle..."
        MODELS=$(ollama list 2>/dev/null | tail -n +2 | wc -l)
        if [ "$MODELS" -gt 0 ]; then
            print_status "$MODELS Ollama-Modell(e) verfügbar"
            ollama list
        else
            print_warning "Keine Ollama-Modelle gefunden"
            read -p "Empfohlenes Modell herunterladen (llama3.2:latest)? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Lade Modell herunter (dies kann einige Minuten dauern)..."
                ollama pull llama3.2:latest
                print_status "Modell erfolgreich heruntergeladen"
            fi
        fi
    else
        print_warning "Ollama nicht gefunden"
        read -p "Ollama jetzt installieren? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installiere Ollama..."
            
            if [ "$MACHINE" = "Linux" ]; then
                curl -fsSL https://ollama.ai/install.sh | sh
                print_status "Ollama installiert"
                print_info "Starte Ollama-Service..."
                ollama serve &
                sleep 3
                print_info "Lade empfohlenes Modell herunter..."
                ollama pull llama3.2:latest
                print_status "Ollama-Setup abgeschlossen"
            elif [ "$MACHINE" = "Mac" ]; then
                print_info "Bitte laden Sie Ollama herunter: https://ollama.ai/download"
                print_info "Nach der Installation führen Sie aus: ollama pull llama3.2:latest"
            else
                print_info "Besuchen Sie https://ollama.ai/download für Installationsanweisungen"
            fi
        else
            print_info "Ollama-Installation übersprungen"
            print_info "Sie können Ollama später installieren oder einen externen Server verwenden"
        fi
    fi
}

# Create environment file
create_env() {
    print_info "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        cat > .env.local << EOF
# Ollama Flow Environment Configuration
# Generated by install script on $(date)

# Ollama Configuration
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_DEFAULT_MODEL=llama3.2:latest

# Application Settings
VITE_APP_NAME="Ollama Flow"
VITE_APP_VERSION="1.0.0"

# Development Settings
VITE_DEV_MODE=true
EOF
        print_status "Environment file created: .env.local"
    else
        print_status "Environment file already exists"
    fi
}

# Start development server
start_server() {
    print_info "🎉 Installation erfolgreich abgeschlossen!"
    echo ""
    echo "Nächste Schritte:"
    echo "1. Ollama-Server konfigurieren (falls extern gehostet):"
    echo "   - Öffnen Sie die Anwendung"
    echo "   - Gehen Sie zu Einstellungen"
    echo "   - Konfigurieren Sie die Ollama-Server-URL"
    echo "2. Entwicklungsserver starten:"
    
    case $PACKAGE_MANAGER in
        "bun")
            echo "   bun run dev"
            ;;
        "yarn")
            echo "   yarn dev"
            ;;
        "npm")
            echo "   npm run dev"
            ;;
    esac
    
    echo "3. Anwendung öffnen: http://localhost:5173"
    echo ""
    echo "📋 Wichtige Dateien:"
    echo "   - install.sh: Installations-Script"
    echo "   - update.sh: Update-Script für Konsole"
    echo "   - .env.local: Umgebungskonfiguration"
    echo ""
    
    read -p "Entwicklungsserver jetzt starten? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starte Entwicklungsserver..."
        case $PACKAGE_MANAGER in
            "bun")
                bun run dev
                ;;
            "yarn")
                yarn dev
                ;;
            "npm")
                npm run dev
                ;;
        esac
    fi
}

# Main installation process
main() {
    echo ""
    print_info "Checking if Git is available..."
    if ! command -v git >/dev/null 2>&1; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_status "Git found"
    
    check_os
    clone_repository
    check_node
    check_package_manager
    install_dependencies
    check_ollama
    create_env
    start_server
}

# Handle script interruption
trap 'print_error "Installation interrupted"; exit 1' INT

# Run main function
main

print_status "Setup complete! Happy coding! 🎉"