# नेपाली प्रोग्रामिङ भाषा — Release Notes & Changelog (v1.0.0)

## Overview
This release brings real physical directory linking, zero-state workspace support, full workspace directory mobility, a completely revamped AI diagnostic & neural reasoning engine, native OS clipboard integration, Devanagari numerals in the editor gutter, and dynamic bytecode inspection across Web Studio and Desktop apps.

---

## 🌟 Key Updates & Improvements

### 1. Real Physical Directory Linking (Desktop & Web)
- **Direct Hard Drive Linking**: Open actual directories from your computer via native desktop OS folder dialog (`open_native_directory`) or HTML5 File System Access API (`showDirectoryPicker`).
- **Real-Time Disk Syncing**: Edits and auto-saves write directly back to the physical files on disk (`save_native_file` / `saveRealFile`).
- **Linked Directory Header & Controls**: Real-time path display, one-click re-sync (`🔄`), and unlink (`✕`) controls.

### 2. Zero-State Workspace (0 Files / 0 Folders)
- **Empty Workspace Support**: Workspace can now have 0 files or folders without errors, crashing, or forced placeholder fallbacks.
- **Zero-Canvas Screen**: Intuitive empty screen with quick action cards to create a new file, link an actual directory, or explore 34+ curated examples.
- **Flexible Workspace Reset**: Option to completely clear workspace or restore default templates.

### 3. Workspace Directory & File Mobility
- **Drag-and-Drop Relocation**: Move files smoothly between subdirectories, into nested folders, or drop into the root workspace drop zone.
- **Context Menu Relocation**: Right-click tabs or sidebar files to "Move to Root" (`मूल फोल्डरमा सार्नुहोस्`) or "Move to Folder..." (`फोल्डरमा सार्नुहोस्`) with instant folder creation.
- **Active State Persistence**: All directory moves, renames, and active editor tabs persist automatically in local storage without losing open work.

### 4. Intelligent AI Diagnostics & Generative Assistant
- **Zero Hardcoded Canned Responses**: Replaced static templates with true contextual AST-level diagnostics and neural generative AI.
- **Deep Syntax & Error Diagnosis**:
  - Automatically identifies syntax errors (e.g. stray tokens after statement delimiters like `);WebAssembly।`).
  - Detects undefined variables and misplaced keywords with precise line numbers and actionable Nepali explanations.
  - Returns surgically corrected, executable code snippets.
- **Multi-Model Generative AI**: Supports resilient fallback across `openai`, `qwen-coder`, and `mistral` endpoints with local semantic AST reasoning fallback.

### 5. Editor & UI Enhancements
- **Devanagari Numerals**: Line numbers now render authentic Devanagari numerals (`१, २, ३...`) when Nepali script mode is active.
- **Universal Clipboard Support**: Reliable copy/paste actions across Web Studio and Tauri Desktop via native IPC clipboard bridge (`xclip`/`pbpaste`/Tauri API).
- **Dynamic Bytecode Disassembly**: Real-time VM disassembly compiled on-the-fly for any user program instead of static placeholders.
- **Update Checker**: Built-in automatic release version check with non-intrusive notification modal for desktop and web users.

---

## 🧪 Verification & Stability
- **170+ Rust Tests Passing**: `crates/nepali-core` test suites fully green (AST, VM, closures, recursion, sandbox, conditions, tour).
- **Zero-Error Studio Build**: `npm --prefix studio run build` compiles cleanly with Next.js 14 production optimizations.
