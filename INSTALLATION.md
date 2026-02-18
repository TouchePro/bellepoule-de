# Installation Guide

This guide covers how to download, install, and run BellePoule Modern on Windows, macOS, and Linux.

## 📥 System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space
- **Network**: Internet connection for updates and remote scoring

### Recommended Requirements

- **Operating System**: Windows 11, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM**: 8 GB or more
- **Storage**: 1 GB free space
- **Processor**: Modern multi-core CPU
- **Display**: 1920x1080 resolution or higher

## 🚀 Quick Install (Recommended)

### Step 1: Download

1. Go to the [latest releases page](https://github.com/klinnex/bellepoule-modern/releases/tag/latest)
2. Download the appropriate file for your platform:

| Platform    | Architecture | File                                               | Size   |
| ----------- | ------------ | -------------------------------------------------- | ------ |
| **Windows** | x64          | `BellePoule.Modern-X.X.X-build.XX-portable.exe`    | ~80 MB |
| **macOS**   | x64          | `BellePoule.Modern-X.X.X-build.XX.dmg`             | ~75 MB |
| **Linux**   | x64          | `BellePoule.Modern-X.X.X-build.XX-x86_64.AppImage` | ~80 MB |
| **Linux**   | ARM64        | `BellePoule.Modern-X.X.X-build.XX-arm64.AppImage`  | ~75 MB |

### Step 2: Install

#### Windows

1. **Portable Version (Recommended)**:

   ```bash
   # Download and run directly - no installation required
   BellePoule.Modern-X.X.X-build.XX-portable.exe
   ```

2. **Alternative: Installation Version**:
   - Download the setup version if available
   - Run the installer
   - Follow the installation wizard
   - Launch from Start Menu

#### macOS

1. Open the downloaded `.dmg` file
2. Drag BellePoule Modern to your Applications folder
3. Right-click the app and select "Open" (first time only to bypass Gatekeeper)
4. Launch from Applications folder

#### Linux

1. **AppImage (Recommended)**:

   ```bash
   # Make executable
   chmod +x BellePoule.Modern-X.X.X-build.XX-x86_64.AppImage

   # Run directly
   ./BellePoule.Modern-X.X.X-build.XX-x86_64.AppImage
   ```

2. **Installation Option**:

   ```bash
   # Move to Applications directory
   sudo mv BellePoule.Modern-X.X.X-build.XX-x86_64.AppImage /opt/BellePouleModern/

   # Create desktop entry
   sudo ln -s /opt/BellePouleModern/BellePoule.Modern.AppImage /usr/local/bin/bellepoule
   ```

## 🔧 Advanced Installation

### From Source (Developers)

#### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 9 or higher
- **Git**: For cloning the repository

#### Installation Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/klinnex/bellepoule-modern.git
   cd bellepoule-modern
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the application**:

   ```bash
   npm run build
   ```

4. **Run in development mode**:

   ```bash
   npm start
   ```

5. **Create distributables** (optional):

   ```bash
   # Build for current platform
   npm run package

   # Build for specific platforms
   npm run package:win    # Windows
   npm run package:mac    # macOS
   npm run package:linux  # Linux
   ```

### Development Environment Setup

For contributors who want to develop BellePoule Modern:

1. **Install VS Code** (recommended)
2. **Install extensions**:
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier
   - Reactjs Code Snippets
   - GitLens

3. **Configure VS Code**:

   ```json
   {
     "typescript.preferences.includePackageJsonAutoImports": "on",
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode"
   }
   ```

4. **Development workflow**:

   ```bash
   # Watch for changes
   npm run dev

   # Build main process only
   npm run build:main

   # Build renderer only
   npm run build:renderer
   ```

## 🌐 Network Configuration

### Firewall Settings

BellePoule Modern uses the following ports:

- **Port 8066**: Remote scoring web server (optional)
- **Automatic updates**: Port 443 (HTTPS)

Configure your firewall to allow these connections if needed.

### Proxy Configuration

If you're behind a corporate proxy:

1. **Environment variables**:

   ```bash
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

2. **npm configuration**:
   ```bash
   npm config set proxy http://proxy.company.com:8080
   npm config set https-proxy http://proxy.company.com:8080
   ```

## 📱 Mobile/Tablet Setup (Remote Scoring)

For remote scoring functionality, you need additional devices:

### Requirements

- **Tablets/Smartphones**: iOS 12+ or Android 8+
- **Browser**: Chrome, Safari, Firefox, or Edge
- **Network**: Same WiFi network as the main computer
- **Screen Size**: Minimum 7" recommended

### Setup Steps

1. Install BellePoule Modern on your main computer
2. Connect all devices to the same WiFi network
3. Start remote scoring from the main interface
4. Access the web interface from tablets using the provided URL

## 🗂️ File Locations

### Windows

- **Application Data**: `%APPDATA%/bellepoule-modern/`
- **Logs**: `%APPDATA%/bellepoule-modern/logs/`
- **Database**: Documents/BellePouleModern/

### macOS

- **Application Data**: `~/Library/Application Support/bellepoule-modern/`
- **Logs**: `~/Library/Logs/bellepoule-modern/`
- **Database**: `~/Documents/BellePouleModern/`

### Linux

- **Application Data**: `~/.config/bellepoule-modern/`
- **Logs**: `~/.local/share/bellepoule-modern/logs/`
- **Database**: `~/Documents/BellePouleModern/`

## 🔄 Updates

### Automatic Updates

- BellePoule Modern checks for updates on startup
- You'll be notified when a new version is available
- Updates are downloaded and installed automatically

### Manual Updates

1. Download the latest version from GitHub releases
2. Replace your current installation
3. Your data and competitions will be preserved

## 🛠️ Troubleshooting

### Common Installation Issues

#### Windows

**"Windows Defender SmartScreen prevented an app from starting"**

- Click "More info" then "Run anyway"
- This is normal for new unsigned applications

**"Application won't start"**

- Install Microsoft Visual C++ Redistributable
- Update your graphics drivers
- Run as Administrator

#### macOS

**"App can't be opened because Apple cannot check it for malicious software"**

- Right-click the app and select "Open"
- Click "Open" in the dialog
- This only needs to be done once

**"App quits immediately on launch"**

- Check System Preferences > Security & Privacy
- Allow the app to run
- Install from App Store if available

#### Linux

**"Permission denied"**

- Make the AppImage executable: `chmod +x BellePoule.Modern.AppImage`
- Check file permissions with `ls -la`

**"Missing dependencies"**

- Install required packages:

  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xvfb libatspi2.0-0 libdrm2 libxcomposite-dev libxdamage1 libxrandr2 libgbm1 libxkbcommon0 libasound2

  # Fedora
  sudo dnf install gtk3 libnotify nss libXtst Xvfb at-spi2-core libdrm libXcomposite libXdamage libXrandr libgbm libxkbcommon alsa-lib
  ```

### Performance Issues

- Close other applications
- Increase virtual memory
- Update graphics drivers
- Check disk space

### Network Issues

- Disable VPN temporarily
- Check firewall settings
- Restart your router
- Try wired connection instead of WiFi

## 📞 Support

### Getting Help

- **Documentation**: [GitHub Wiki](https://github.com/klinnex/bellepoule-modern/wiki)
- **Issues**: [GitHub Issues](https://github.com/klinnex/bellepoule-modern/issues)
- **Discussions**: [GitHub Discussions](https://github.com/klinnex/bellepoule-modern/discussions)

### Bug Reports

1. Use the built-in bug reporter: **Menu > Help > Report Bug** (Ctrl+Shift+I)
2. Include your system information and steps to reproduce
3. Attach logs if available

### Feature Requests

1. Check existing issues first
2. Create a new issue with "Feature Request" label
3. Provide detailed description and use case

---

**🎉 Congratulations!** You've successfully installed BellePoule Modern. Check out the [User Manual](User-Manual) for next steps on creating and managing competitions.
