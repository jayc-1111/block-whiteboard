🏗 Project State & Cloud Guide
🔑 Core Idea

Our app uses two layers of state:
Cloud Service (Realtime) ↔ App State ↔ UI

AppState (appstate.js) = single source of truth for the UI.

CloudService (cloud-service.js) = single source of truth for the cloud database.

Database is realtime → any changes in the cloud automatically flow into AppState → UI.

👉 The UI never talks directly to the cloud.
👉 CloudService listens for realtime events and hydrates AppState.

📦 Files:
appstate.js

In-memory store for all UI-related state.

Provides:

AppState.get(key)

AppState.set(key, value)

AppState.onChange(key, callback)

AppState.offChange(key, callback)

UI always uses AppState for reads/writes.

cloud-service.js

Handles all cloud interactions.

Subscribes to realtime database changes (Appwrite).

Updates AppState when cloud sends changes.

Provides:

CloudService.loadBoards() (initial load)

CloudService.createBoard(name)

CloudService.updateBoardName(dbId, newName)

CloudService.deleteBoard(dbId)

CloudService.loadBoardContent(dbId)

CloudService.getDevMode() / setDevMode(value)

Realtime listeners for boards, folders, settings, etc.

🔄 Data Flow Examples:
App Initialization
CloudService.initializeSettings() → updates AppState
CloudService.loadBoards() → updates AppState
CloudService.subscribeToRealtime() → keeps AppState in sync
UI updates automatically via AppState.onChange()

User Toggles Dev Mode:
UI → AppState.set("dev_mode", true)
   → UI re-renders immediately
   → CloudService.setDevMode(true) → persists to cloud
   → Cloud realtime event confirms → AppState stays in sync

Realtime Database Update (from another client):
Cloud → CloudService (subscription event)
   → CloudService updates AppState
   → UI re-renders automatically

📜 Rules of the Road:

UI only talks to AppState.

No direct CloudService or DB calls from UI.

All cloud access + realtime subscriptions go through CloudService.

CloudService = the single entry point for Appwrite/database.

AppState is always hydrated and kept up-to-date by CloudService.

Initial load.

Realtime updates.

🚀 TL;DR:

AppState = in-memory truth (for UI)

CloudService = cloud truth (for persistence & realtime events)

UI → AppState → CloudService

CloudService → AppState (via realtime subscription)

That’s the whole architecture. 🎯