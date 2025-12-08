# ATLAS-KONTUR: The Unified Organism

> "The Body provides the means; the Mind provides the meaning."

## 1. Conceptual Vision

**ATLAS-KONTUR** is not merely a software application with chatbots; it is a **cybernetic organism** designed to simulate a living digital entity. The system architecture mimics biological principles, distinguishing between the neurological infrastructure (The Body) and the agentic cognition (The Mind).

### The Body: KONTUR (v11.0)
**KONTUR** is the nervous system. It handles signals, reflexes, sensory input, and motor output. It does not "think"—it reacts, transmits, and executes.
- **Core (Dispatcher)**: The spinal cord. Routes billion-scale signals between organs using the `Nexus` protocol.
- **Synapse**: The sensory bridge. Connects the user interface (Skin/Eyes) to the deep internals.
- **Organs**: Modular functional units (Vision, Voice, Motor/System Control) that perform specific tasks.

### The Mind: ATLAS
**ATLAS** is the consciousness. It resides within the body, interpreting sensory data from Kontur and issuing high-level commands.
- **Atlas (The Self)**: Planning, reasoning, strategy.
- **Tetyana (The Hands)**: Executive function, tool usage, file manipulation.
- **Grisha (The Eyes)**: Visual cortex, security monitoring, threat detection.

---

## 2. Deep Integration Architecture

In the unified model, the application does not "start services"; it **awakes**.

```mermaid
graph TD
    User((User)) <-->|Sensory Input/Output| UI[Electron UI / Synapse]
    UI <-->|Synaptic Bridge| Core[KONTUR Core]
    
    subgraph "The Organism"
        Core <-->|Motor Nerve| System[System Organ]
        Core <-->|Auditory Nerve| Voice[Voice Organ]
        Core <-->|Optic Nerve| Vision[Grisha/Vision Organ]
        
        Core <-->|Cortex Connection| Brain[Unified Brain]
        
        subgraph "Consciousness (Capsules)"
            Brain -- Real-Time Intelligence --> Atlas[ATLAS Agent]
            Brain -- Execution Intelligence --> Tetyana[TETYANA Agent]
            Brain -- Security Analysis --> Grisha[GRISHA Agent]
        end
    end
```

### The Unification Protocol (`DeepIntegrationSystem`)
The system is brought to life via the `DeepIntegrationSystem`. This kernel:
1.  **Boots the Core**: Establishes the message bus.
2.  **Spawns Organs**: Activates capabilities (Python workers, System control).
3.  **Wakes the Agents**: Initializes the Capsules (ATLAS, TETYANA, GRISHA) and connects them to the **Unified Brain (Gemini 2.0 Flash Thinking)**.
4.  **Syncs Synapses**: Binds the Electron UI to the internal state.

### Flux of Information (The Intelligence Loop)
1.  **Perception**: `GrishaObserver` (Vision) or `VoiceCapsule` (Hearing) captures raw data.
2.  **Transmission**: Data travels via `Synapse` to `Core`.
3.  **Cognition**:
    *   `UnifiedBrain` receives the signal.
    *   It engages the **Deep Reasoning Loop** (English internal monologue).
    *   It formulates a plan using available tools (MCP).
4.  **Reaction**: Agents decide an action (Speak, Execute Command) based on the plan.
5.  **Execution**: `Core` routes the command to `SystemOrgan` or `VoiceOrgan`.

## 3. Localization & Compliance
- **Internal Dialect (The Thought)**: `English` (Strict System-Level).
    - All logs, tool names, code comments, and **Internal Chain-of-Thought** must be in English.
    - This ensures maximum reasoning capability and compatibility with LLM logic.
- **External Voice (The Speech)**: `Ukrainian` (Strict User-Level).
    - All TTS (Text-to-Speech), `response` fields, and UI labels must be in **Ukrainian**.
    - No English should ever leak to the user interface.

## 4. Intelligence Standards (Maximum Level)
- **Zero-Mock Policy**: No simulated reasoning. All decisions come from the VLM/LLM.
- **Zero-Failure Architecture**:
    - "Misses" are unacceptable.
    - If a tool fails, the Brain must **re-plan** and try an alternative strategy.
    - Network glitches must be handled with silent retries.
- **Chain of Thought**: Every complex action must be preceded by a transparent reasoning step (visible in logs/internals, hidden from user).
