---
description: ATLAS5 "KONTUR 2.0" Architecture: The Trinity System (Atlas, Tetyana, Grisha) on a KONTUR Kernel.
---

# ATLAS5 "KONTUR 2.0" Architecture (Final Blueprint)

## The Trinity Philosophy
The System is composed of **Three Distinct Agents** (The Trinity) and a **Technical Kernel** (KONTUR).
1.  **ATLAS** (The Head): Planning, Memory, Imagination.
2.  **TETYANA** (The Hands): Execution, Tooling, File IO.
3.  **GRISHA** (The Senses): Security, Oversight, Vision.

---

## 1. The "Capsule" Standard
Every Component is a **Capsule** that contains its own Law (`contract.ts`), Reality (`index.ts`), and Simulation (`ghost.ts`).

### Directory Structure
```text
/src/modules/<name>/
├── contract.ts    <-- THE LAW (Zod Schemas).
├── index.ts       <-- THE REALITY (Logic).
├── ghost.ts       <-- THE GHOST (Mock for Testing).
├── schema.ts      <-- THE DATA (Drizzle Tables, if needed).
└── test/          <-- THE LAB (Unit Tests).
```

### Module Types
*   **Agent Capsules**: Have a Persona (`src/modules/atlas`).
*   **System Capsules**: Have Utility, used by Agents (`src/modules/memory`).

---

## 2. Agent Capabilities & Ownership

### 🔵 ATLAS (The Planner)
*   **Role**: Orchestrates the entire lifecycle.
*   **Owns**:
    *   **Memory System** (`src/modules/memory`): The storage of Identity & Context.
    *   **Oracle Engine** (Internal): The ability to *Simulate* a plan.

### 🔴 TETYANA (The Executor)
*   **Role**: Interacts with the World.
*   **Owns**:
    *   **The Forge** (`src/modules/forge`): Synthesizes (writes) new tools on the fly.
    *   **Standard Tools**: Access to `fs`, `shell`, `network`.

### 👁️ GRISHA (The Observer)
*   **Role**: Biometric & Security Oversight.
*   **Owns**:
    *   **Vision System**: Gemini Live / Screenshot analysis.
    *   **The Sentinel**: Constitution enforcement.

---

## 3. System Topology

### 🟣 KONTUR (The Kernel)
*   **Location**: `src/kontur`
*   **Role**: The Motherboard.
*   **Technologies**:
    *   **Synapse**: The Reactive Event Bus (**RxJS**) connecting the Trinity.
    *   **Gateway**: Exposes signals to UI via **tRPC** (`electron-trpc`).

### 🟡 THE SHELL (Electron)
*   **Host**: `src/main` (Electron) initializes KONTUR.
*   **UI**: `src/renderer` (React) connects via tRPC to visualize the Trinity's state.
*   **Design**: Strictly follows `docs/electron-web` sketches.

---

## 4. Development Workflow (The "Ghost" Method)

**Scenario: Improving ATLAS's Memory**
1.  **Target**: `src/modules/memory` (System Capsule).
2.  **Action**: Optimize `index.ts` (Real Implementation).
3.  **Verify**: Run `npm test` inside the module.
4.  **Result**: ATLAS (The Agent) automatically inherits the speed boost.

**Scenario: Training TETYANA**
1.  **Target**: `src/modules/tetyana` (Agent Capsule).
2.  **Action**: Add error handling logic to `index.ts`.
3.  **Verify**: Use `TetyanaGhost` in integration tests to ensure stability.

---

## Summary of File Structure
```text
/
  /src
    /kontur        <-- KERNEL (Synapse, Registry)
    /modules
       /atlas      <-- AGENT (Head)
       /tetyana    <-- AGENT (Hands)
       /grisha     <-- AGENT (Eyes)
       /memory     <-- SYSTEM CAPSULE (Tool for Atlas)
       /forge      <-- SYSTEM CAPSULE (Tool for Tetyana)
    /main          <-- ELECTRON HOST
    /renderer      <-- REACT UI
```
