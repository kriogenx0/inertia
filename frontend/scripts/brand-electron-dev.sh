#!/bin/bash
# Running `electron .` in dev mode launches the raw Electron.app binary from
# node_modules, which is branded "Electron" (name, icon) out of the box —
# only the electron-builder packaged app (see npm run electron:build-mac)
# picks up our own branding. This patches the local copy's Info.plist and
# icon to match, so dev mode shows "Inertia" too. It's re-run via
# `postinstall` since node_modules is reset on every `npm install`.
set -e

# Only macOS ships PlistBuddy, and only a macOS-downloaded Electron dist is
# actually branded via Info.plist — Electron's Linux dist (e.g. installed
# inside the Docker frontend image/container) also happens to contain an
# Electron.app subfolder, so checking for that dir alone isn't enough.
[ "$(uname -s)" = "Darwin" ] || exit 0
command -v /usr/libexec/PlistBuddy >/dev/null 2>&1 || exit 0

ELECTRON_APP="$(dirname "$0")/../node_modules/electron/dist/Electron.app"
[ -d "$ELECTRON_APP" ] || exit 0

PLIST="$ELECTRON_APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName Inertia" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Inertia" "$PLIST"

cp "$(dirname "$0")/../build/icon.icns" "$ELECTRON_APP/Contents/Resources/electron.icns"

# Clear the icon cache and touch the bundle so macOS/Finder/Dock pick up the
# new name and icon instead of a stale cached one.
touch "$ELECTRON_APP"
