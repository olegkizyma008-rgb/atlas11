#!/usr/bin/env python3
"""
Voice Worker - KONTUR Voice I/O Organ
Handles speech synthesis (TTS) and speech recognition (STR)
Communicates via KPP protocol over STDIN/STDOUT
"""

import json
import sys
import time
import hashlib
import traceback
from datetime import datetime
from typing import Dict, Any, Optional


class VoiceWorker:
    """KONTUR Voice Organ - Speech I/O management"""

    def __init__(self):
        self.urn = "kontur://organ/voice"
        self.state = "READY"
        self.heartbeat_counter = 0
        
        # Voice metrics
        self.tts_requests = 0
        self.stt_requests = 0
        self.characters_synthesized = 0
        self.audio_duration_ms = 0

    def receive_packet(self) -> Optional[Dict[str, Any]]:
        """Read KPP packet from STDIN"""
        try:
            line = sys.stdin.readline()
            if not line:
                return None
            packet = json.loads(line)
            return packet
        except json.JSONDecodeError:
            return None
        except Exception as e:
            print(f"Error reading packet: {e}", file=sys.stderr)
            return None

    def send_packet(self, intent: str, payload: Dict[str, Any]) -> None:
        """Send KPP packet to STDOUT with integrity validation"""
        try:
            packet = {
                "nexus": {
                    "ver": "11.0",
                    "uid": f"voice-{int(time.time() * 1000)}",
                    "timestamp": int(time.time() * 1000),
                    "ttl": 5000,
                    "integrity": "",
                    "priority": 3,
                    "compressed": False,
                    "gravity_factor": 1.0
                },
                "route": {
                    "from": self.urn,
                    "to": "kontur://core/system"
                },
                "auth": {
                    "scope": 1  # USER scope
                },
                "instruction": {
                    "intent": intent,
                    "op_code": "VOICE_SPEAK"
                },
                "payload": payload
            }

            # Calculate integrity hash
            payload_str = json.dumps(payload, sort_keys=True)
            hash_obj = hashlib.sha256(payload_str.encode())
            packet["nexus"]["integrity"] = f"sha256-{hash_obj.hexdigest()}"

            print(json.dumps(packet))
            sys.stdout.flush()
        except Exception as e:
            print(f"Error sending packet: {e}", file=sys.stderr)

    def synthesize_speech(self, text: str, language: str = "uk") -> Dict[str, Any]:
        """
        Text-to-Speech synthesis
        Returns audio metadata
        """
        self.tts_requests += 1
        self.characters_synthesized += len(text)
        
        # Estimate audio duration: ~150 chars per minute = 250ms per char
        estimated_duration = len(text) * 250 / 1000
        self.audio_duration_ms += int(estimated_duration * 1000)
        
        return {
            "synthesized": True,
            "text": text[:100] + "..." if len(text) > 100 else text,
            "language": language,
            "audio_duration_ms": int(estimated_duration * 1000),
            "sample_rate_hz": 24000,
            "format": "mp3",
            "url": f"audio://{int(time.time())}.mp3"  # Simulated audio URL
        }

    def recognize_speech(self, audio_data: str, language: str = "uk") -> Dict[str, Any]:
        """
        Speech-to-Text recognition
        Returns recognized text
        """
        self.stt_requests += 1
        
        # Simulate different STT results
        simulated_results = {
            "привіт": "Привіт, як справи?",
            "план": "Створи план дій для інтеграції КОНТУР",
            "執行": "Виконай попередній план",
            "default": "Визнаний текст з аудіо"
        }
        
        recognized_text = simulated_results.get(audio_data[:5], simulated_results["default"])
        
        return {
            "recognized": True,
            "text": recognized_text,
            "language": language,
            "confidence": 0.92,
            "alternatives": [
                {"text": recognized_text, "confidence": 0.92},
                {"text": recognized_text + " додатково", "confidence": 0.78}
            ]
        }

    def stream_audio(self, text: str, language: str = "uk") -> Dict[str, Any]:
        """
        Stream audio chunks in real-time (Gemini Live simulation)
        """
        # Simulate streaming
        chunks = []
        words = text.split()
        
        for i, word in enumerate(words):
            chunk = {
                "index": i,
                "word": word,
                "audio_chunk": f"audio_chunk_{i}",
                "duration_ms": len(word) * 100,
                "timestamp_ms": i * len(word) * 100
            }
            chunks.append(chunk)
        
        return {
            "streaming": True,
            "text": text,
            "language": language,
            "chunks": chunks,
            "total_duration_ms": len(text) * 100,
            "stream_id": f"stream-{int(time.time())}"
        }

    def heartbeat(self) -> None:
        """Send periodic heartbeat to indicate liveness"""
        self.heartbeat_counter += 1
        if self.heartbeat_counter % 10 == 0:
            self.send_packet(
                "HEARTBEAT",
                {
                    "urn": self.urn,
                    "state": self.state,
                    "tts_requests": self.tts_requests,
                    "stt_requests": self.stt_requests,
                    "characters_synthesized": self.characters_synthesized,
                    "audio_duration_ms": self.audio_duration_ms,
                    "heartbeat_seq": self.heartbeat_counter
                }
            )

    def run(self) -> None:
        """Main worker loop"""
        print(f"🔊 Voice Worker started: {self.urn}", file=sys.stderr)
        self.state = "RUNNING"

        packet_count = 0

        while True:
            try:
                packet = self.receive_packet()
                if not packet:
                    break

                packet_count += 1
                
                # Handle different packet intents
                intent = packet.get("instruction", {}).get("intent")
                payload = packet.get("payload", {})

                if intent == "CMD":
                    # Text-to-Speech
                    text = payload.get("text", "")
                    language = payload.get("language", "uk")
                    
                    result = self.synthesize_speech(text, language)
                    self.send_packet("EVENT", {
                        "tts_complete": result
                    })

                elif intent == "QUERY":
                    # Speech-to-Text
                    audio_data = payload.get("audio", "")
                    language = payload.get("language", "uk")
                    
                    result = self.recognize_speech(audio_data, language)
                    self.send_packet("RESPONSE", {
                        "stt_result": result
                    })

                elif intent == "LEVITATE":
                    # Stream audio (Gemini Live)
                    text = payload.get("text", "")
                    language = payload.get("language", "uk")
                    
                    result = self.stream_audio(text, language)
                    self.send_packet("EVENT", {
                        "audio_stream": result,
                        "streaming": True
                    })

                elif intent == "HEARTBEAT":
                    # Respond to heartbeat
                    self.heartbeat()

                else:
                    # Unknown intent
                    self.send_packet("ERROR", {
                        "error": f"Unknown intent: {intent}",
                        "original_intent": intent
                    })

                # Periodic heartbeat every 10 packets
                self.heartbeat()

            except Exception as e:
                error_msg = f"Error in worker loop: {str(e)}\n{traceback.format_exc()}"
                print(error_msg, file=sys.stderr)
                self.send_packet("ERROR", {
                    "error": str(e),
                    "type": "WORKER_ERROR"
                })

        self.state = "STOPPED"
        print(f"🛑 Voice Worker stopped after {packet_count} packets", file=sys.stderr)


if __name__ == "__main__":
    worker = VoiceWorker()
    worker.run()
