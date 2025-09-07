// === APPWRITE BOARD STRUCTURE FIX ===
// This script fixes issues with the board schema to ensure compatibility
// It helps diagnose and repair problems with board documents

console.log('🔧 Loading Appwrite board structure fix script...');

// Use configuration already declared in appwrite-config.js - avoid redeclaration
// const APPWRITE_CONFIG = window.APPWRITE_CONFIG || { ... } // ← REMOVED to fix redeclaration error

// Debug utilities - Use unique name to avoid conflicts
const debugBoardFix = window.Debug?.appwrite || {
    info: (msg, data) => console.log(`🔷 BOARD FIX: ${msg}`, data || ''),
    error: (msg, error) => console.error(`❌ BOARD FIX ERROR: ${msg}`, error),
    warn: (msg, data) => console.warn(`⚠️ BOARD FIX: ${msg}`, data || ''),
    step: (msg) => console.log(`👉 BOARD FIX: ${msg}`),
    detail: (msg, data) => console.log(`📋 BOARD FIX: ${msg}`, data || ''),
    start: (msg) => console.log(`🚀 BOARD FIX: ${msg}`),
    done: (msg) => console.log(`✅ BOARD FIX: ${msg || 'Operation completed'}`)}
