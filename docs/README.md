# Documentation & Specifications

Welcome to the Documentation Hub for **ATLAS 11 (KONTUR v11.0)**. 
This directory contains technical guides for the AI technologies powering the system, while the system architecture itself is documented in the `.agent` directory.

## Core Architecture
*   **[KONTUR Technical Specification](../.agent/KONTUR_TECH_SPEC.md)**: The definitive guide to the KONTUR v11.0 bio-cybernetic architecture, including Anti-Gravity protocols, Immune System (AEDS), and Generative AI layers.
*   **[KONTUR Project Overview](../.agent/kontur.md)**: Detailed project structure, file roadmap, and deployment guides for Google Cloud Run.

## AI Implementation Guides (Gemini API)
KONTUR relies heavily almost exclusively on Google's Gemini models for its cognitive functions. These guides serve as the reference for the "Cortex" implementation:

*   **[Speech-to-Text (STT)](STT.md)**: Using Gemini for audio analysis and transcription. Used by KONTUR's *Input Sensory Layer*.
*   **[Text-to-Speech (TTS)](TTS.md)**: Generating audio responses. Used by KONTUR's *Voice Synthesis Organ*.
*   **[Gemini Live API](jemeni_live.md)**: Real-time, low-latency voice interaction. This is the foundation for KONTUR's *Direct Neural Interface*.

## Integration Notes
The KONTUR system abstracts these APIs into "Organs" (isolated processes). 
- The **Cortex Brain** (`src/cortex/brain.ts`) uses the patterns described in `STT.md` and `TTS.md`.
- The **Active Listening Module** implements the WebSocket protocols detailed in `jemeni_live.md`.
