# Pianew Tiles - Mobile Rhythm Game

A musical rhythm game for Android inspired by Piano Tiles 2. Tap falling tiles in perfect rhythm with beautiful melodies. Optimized for performance with 60 FPS gameplay and minimal latency.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Project Structure](#project-structure)
- [Performance Specifications](#performance-specifications)
- [Troubleshooting](#troubleshooting)
- [Legal](#legal)

## 🎮 Overview

**Pianew Tiles** is a mobile rhythm game that challenges players to tap falling tiles in perfect synchronization with musical melodies. The game features:

- **4-column gameplay** with intuitive touch controls
- **Real-time audio synthesis** using Tone.js
- **Star rating system** (1-3 stars based on performance)
- **Detailed statistics** tracking (precision, perfect hits, total touches)
- **Persistent data storage** for scores and settings
- **Haptic feedback** for enhanced immersion
- **Smooth particle effects** and visual feedback

## ✨ Features

### Gameplay
- 4 vertical columns with falling tiles
- Tiles descend at increasing speeds (3-8 units per frame)
- Target line at 100px from bottom for precision timing
- Two hit types: PERFECT (±30px = +10 pts) and GOOD (±80px = +5 pts)
- Game over on missed tiles or incorrect taps

### Audio System
- Real-time synthesis using Tone.js PolySynth
- 40-note melody: "Twinkle Twinkle Little Star"
- Spawn interval: 700ms between tiles
- Error sound on failed taps
- Adjustable music and effects volume

### User Interface
- Main menu with play button
- Interactive tutorial (4 steps)
- Pause functionality during gameplay
- Settings panel with volume controls
- Game over screen with statistics
- Best score tracking

### Performance
- **60 FPS target** on mid-range devices (2020+)
- **Touch latency** < 50ms
- **Memory usage** < 150MB
- **Initial load time** < 3 seconds
- **APK size** < 60MB

### Data Persistence
- Best score and stars earned
- User settings (volume, effects, vibration)
- Total games played
- All data stored locally using Capacitor Preferences

## 📱 Requirements

### Minimum Requirements
- **Android:** 8.0 (API 26) or higher
- **RAM:** 150MB minimum
- **Storage:** 60MB for APK
- **Screen:** Touch-enabled display

### Recommended
- **Android:** 10.0 (API 29) or higher
- **RAM:** 2GB or more
- **Device:** Mid-range or flagship (2020+)

### Development Requirements
- **Node.js:** v14.21.3 or v16.20.2+
- **npm/pnpm:** Latest version
- **Android SDK:** For building APK
- **Java Development Kit (JDK):** For Gradle builds

## 🚀 Installation

### Prerequisites

1. Install Node.js (v14.21.3 or higher)
2. Install pnpm: `npm install -g pnpm`
3. Install Android SDK and configure ANDROID_HOME environment variable
4. Install Java Development Kit (JDK 11 or higher)

### Setup

```bash
# Clone or extract the project
cd pianew-tiles

# Install dependencies
pnpm install

# Build the web assets
pnpm build

# Sync with Capacitor
pnpm exec cap sync
```

## 💻 Development

### Running Development Server

```bash
# Start the development server
pnpm dev

# The app will be available at http://localhost:3000
```

### Project Structure

```
pianew-tiles/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Main menu screen
│   │   │   ├── Game.tsx            # Gameplay screen
│   │   │   └── NotFound.tsx        # 404 page
│   │   ├── hooks/
│   │   │   └── useGameStorage.ts   # Game data persistence hook
│   │   ├── components/
│   │   │   └── ErrorBoundary.tsx   # Error handling
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx    # Theme management
│   │   ├── App.tsx                 # Main app component
│   │   ├── main.tsx                # React entry point
│   │   └── index.css               # Global styles
│   ├── public/
│   │   └── images/                 # App assets
│   └── index.html                  # HTML template
├── android/                         # Native Android project
│   ├── app/
│   │   └── src/main/assets/public/ # Web assets for Android
│   └── build.gradle                # Android build configuration
├── docs/                            # Documentation
│   ├── privacy-policy.md           # Privacy policy
│   ├── terms-of-service.md         # Terms of service
│   └── store-descriptions.md       # Google Play Store content
├── capacitor.config.ts             # Capacitor configuration
├── package.json                    # Project dependencies
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite build configuration
```

## 🔨 Building

### Build Web Assets

```bash
# Build for production
pnpm build

# Output: dist/ directory with optimized assets
```

### Build Android APK

```bash
# Sync web assets to Android project
pnpm exec cap sync

# Build APK (debug)
cd android
./gradlew assembleDebug

# Build APK (release - requires keystore)
./gradlew assembleRelease

# Build AAB (Android App Bundle - for Play Store)
./gradlew bundleRelease
```

### Generate Keystore for Release Build

```bash
# Generate keystore (one-time setup)
keytool -genkey -v -keystore pianew-tiles.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias pianew-tiles-key

# Configure gradle.properties with keystore path and credentials
```

## ⚙️ Performance Specifications

### Frame Rate
- **Target:** 60 FPS constant
- **Minimum:** 30 FPS on low-end devices
- **Monitoring:** FPS counter visible in-game during development

### Touch Latency
- **Target:** < 50ms
- **Achieved through:** Optimized touch handlers and requestAnimationFrame
- **Testing:** Use Chrome DevTools Performance tab

### Memory Usage
- **Target:** < 150MB
- **Actual (typical):** 80-120MB
- **Monitoring:** Android Studio Profiler

### Load Time
- **Initial load:** < 3 seconds
- **Game restart:** < 1 second
- **Optimized through:** Code splitting and asset compression

### APK Size
- **Target:** < 60MB
- **Actual:** ~45-50MB
- **Includes:** React, Tone.js, Capacitor, UI components

## 🎯 Game Mechanics

### Tile Spawning
- **Spawn interval:** 700ms
- **Columns:** 4 (equal width)
- **Tile height:** 120px
- **Initial speed:** 3 units/frame
- **Acceleration:** 0.001 units/frame²
- **Max speed:** 8 units/frame

### Scoring System
- **Perfect hit** (distance < 30px): +10 points
- **Good hit** (distance < 80px): +5 points
- **Miss or late tap:** Game Over

### Star Rating
- **3 stars:** Score ≥ 80% of max (320+ points)
- **2 stars:** Score ≥ 50% of max (200+ points)
- **1 star:** Score < 50% of max

### Precision Calculation
```
Precision = (Perfect Hits / Total Touches) × 100%
```

## 🔧 Troubleshooting

### App Won't Start
- **Check:** Android version (minimum 8.0)
- **Check:** Available storage (minimum 60MB)
- **Solution:** Clear app cache and reinstall

### Audio Not Playing
- **Check:** Device volume is not muted
- **Check:** Audio permissions are granted
- **Solution:** Restart the app and device

### Low FPS or Stuttering
- **Check:** Device RAM (minimum 150MB available)
- **Check:** Background apps consuming resources
- **Solution:** Close background apps, restart device

### Touch Not Responding
- **Check:** Screen is clean and dry
- **Check:** Touch latency in settings
- **Solution:** Recalibrate touch screen in device settings

### Data Not Saving
- **Check:** Device storage is not full
- **Check:** App permissions for storage
- **Solution:** Clear app data and reinstall

## 📊 Testing

### Manual Testing Checklist

- [ ] App installs without errors
- [ ] Main menu displays correctly
- [ ] Play button navigates to game
- [ ] Tiles spawn and fall smoothly
- [ ] Touch detection works accurately
- [ ] Score updates correctly
- [ ] Audio plays without lag
- [ ] Vibration works (if enabled)
- [ ] Settings save and persist
- [ ] Game over screen displays stats
- [ ] Best score is tracked
- [ ] App runs at 60 FPS

### Performance Testing

```bash
# Use Android Studio Profiler
# 1. Open Android Studio
# 2. Connect device or start emulator
# 3. Run: ./gradlew installDebug
# 4. Open Profiler and monitor:
#    - CPU usage
#    - Memory usage
#    - Frame rate
#    - Battery drain
```

## 📝 Configuration

### Capacitor Configuration

Edit `capacitor.config.ts` to customize:
- App name and ID
- Splash screen settings
- Plugin configurations
- Platform-specific settings

### Game Balance

Adjust gameplay parameters in `client/src/pages/Game.tsx`:
- `SPAWN_INTERVAL`: Tile spawn rate (ms)
- `INITIAL_FALL_SPEED`: Starting tile speed
- `FALL_ACCELERATION`: Speed increase per frame
- `PERFECT_DISTANCE`: Perfect hit threshold (px)
- `GOOD_DISTANCE`: Good hit threshold (px)

## 🎨 Customization

### Theming

Edit `client/src/index.css` to customize:
- Color palette (purple-blue gradient)
- Typography and fonts
- Spacing and sizing
- Dark/light mode

### UI Components

Modify `client/src/pages/Game.tsx` for:
- Button styles and positions
- Canvas dimensions
- Modal designs
- Settings panel layout

## 📦 Deployment

### Google Play Store

1. **Prepare assets:**
   - App icon (512x512 PNG)
   - Screenshots (5-8 images)
   - Feature graphic (1024x500 PNG)
   - Privacy policy and terms

2. **Create Play Store listing:**
   - App name: "Pianew Tiles"
   - Category: Games > Casual
   - Content rating: Everyone (PEGI 3)
   - Target audience: Everyone

3. **Upload build:**
   - Generate signed AAB using Gradle
   - Upload to Play Console
   - Complete store listing
   - Submit for review

4. **Monitor:**
   - Track crash reports
   - Monitor user reviews
   - Update based on feedback

## 🔐 Legal

- **Privacy Policy:** See `docs/privacy-policy.md`
- **Terms of Service:** See `docs/terms-of-service.md`
- **Licenses:** 
  - React: MIT
  - Tone.js: MIT
  - Capacitor: MIT
  - Tailwind CSS: MIT

## 📞 Support

For issues, questions, or feedback:

**Email:** support@pianew.app

## 📄 License

Pianew Tiles is proprietary software. All rights reserved.

---

**Pianew Tiles Development Team**  
*Tap the Rhythm, Master the Game!* 🎵
