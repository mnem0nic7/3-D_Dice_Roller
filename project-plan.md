# 3D Dice Roller Project Plan

## Overview
A cross-platform 3D dice roller with realistic physics, customizable dice, and real-time multiplayer.

## Repository Structure
```
/ (repo root)
├─ client/               # React + TypeScript front end
├─ server/               # Node.js + Express + Socket.IO back end
├─ shared/               # Shared TypeScript types and utilities
├─ LICENSE
└─ README.md
``` 

## Technology Stack
- Front end: React, TypeScript, Vite, Three.js, cannon-es, Socket.IO client
- Back end: Node.js, TypeScript, Express, Socket.IO server, nodemon
- Shared: TypeScript types for roll messages, utility functions

## Milestones
1. ✅ Initial scaffolding - COMPLETED
   - ✅ Create folder structure
   - ✅ Basic TS configuration (tsconfig.json)
   - ✅ Install core dependencies
   - ✅ Basic Three.js scene with rotating cube
   - ✅ Express server with Socket.IO setup
2. ✅ Front-end setup - COMPLETED  
   - ✅ Render a single static d6 in the browser (rotating cube)
   - ✅ Add physics simulation with cannon-es
   - ✅ Implement dice roll animation and face detection
   - ✅ Click-to-roll interaction with physics-based rolling
   - ✅ Basic dice face detection based on final orientation
3. Back-end setup - IN PROGRESS  
   - ✅ Start Express server with WebSocket endpoint
   - 🔄 Verify Socket.IO connection from client
   - 🔄 Test roll message broadcasting
4. Dice physics
   - Integrate cannon-es, create rolling logic for a die
   - Implement face-detection on physics sleep
5. Multiplayer sync
   - Define roll message protocol in shared types
   - Broadcast roll events and mirror outcomes across clients
6. UI & customization
   - Build dice controls, presets, history panel
   - Implement color/texture/font customization
7. Deployment
   - PWA support and static hosting (Netlify/GitHub Pages)
   - Mobile wrapper with Capacitor/Cordova for iOS and Android
8. Future enhancements (AR, VR, advanced roll mechanics)
