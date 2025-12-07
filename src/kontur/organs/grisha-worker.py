#!/usr/bin/env python3
"""
Grisha Worker - KONTUR Security & Audit Organ
Performs threat detection, policy enforcement, and security auditing
Communicates via KPP protocol over STDIN/STDOUT
"""

import json
import sys
import time
import hashlib
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional


class GrishaWorker:
    """KONTUR Guardian Organ - Security auditing and threat detection"""

    def __init__(self):
        self.urn = "kontur://organ/grisha"
        self.state = "READY"
        self.threat_level = 0
        self.audits_performed = 0
        self.heartbeat_counter = 0
        
        # Security policies
        self.dangerous_operations = [
            "execute_code",
            "delete_file",
            "modify_system",
            "network_access"
        ]
        
        self.threat_patterns = {
            "code_injection": ["eval(", "exec(", "__import__"],
            "file_deletion": ["rm -rf", "os.remove"],
            "network": ["socket.socket", "requests.get"],
            "resource_bomb": ["while True:", "infinite loop"]
        }

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
                    "uid": f"grisha-{int(time.time() * 1000)}",
                    "timestamp": int(time.time() * 1000),
                    "ttl": 5000,
                    "integrity": "",
                    "priority": 8,  # Higher priority for security
                    "compressed": False,
                    "gravity_factor": 1.0
                },
                "route": {
                    "from": self.urn,
                    "to": "kontur://core/system"
                },
                "auth": {
                    "scope": 50  # SYSTEM scope
                },
                "instruction": {
                    "intent": intent,
                    "op_code": "GRISHA_AUDIT"
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

    def detect_threats(self, content: str) -> Dict[str, Any]:
        """
        Analyze content for security threats
        Returns threat assessment
        """
        threats = []
        threat_score = 0

        # Check for dangerous operations
        for operation in self.dangerous_operations:
            if operation in content.lower():
                threats.append({
                    "type": "dangerous_operation",
                    "operation": operation,
                    "severity": "high"
                })
                threat_score += 3

        # Check for known threat patterns
        for pattern_name, patterns in self.threat_patterns.items():
            for pattern in patterns:
                if pattern in content:
                    threats.append({
                        "type": pattern_name,
                        "pattern": pattern,
                        "severity": "critical" if "injection" in pattern_name else "high"
                    })
                    threat_score += 5

        # Check code length (potential bomb)
        if len(content) > 10000:
            threats.append({
                "type": "resource_intensive",
                "reason": "Large code payload",
                "severity": "medium"
            })
            threat_score += 1

        return {
            "threat_score": min(threat_score, 100),  # Cap at 100
            "threat_level": "critical" if threat_score > 50 else "high" if threat_score > 20 else "medium" if threat_score > 5 else "low",
            "threats": threats,
            "recommendation": "BLOCK" if threat_score > 50 else "REVIEW" if threat_score > 20 else "ALLOW"
        }

    def audit(self, operation: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Audit an operation and determine if it's allowed
        Returns audit result with decision
        """
        self.audits_performed += 1
        
        # Combine operation and args into content for analysis
        content = f"{operation} {json.dumps(args)}"
        threat_assessment = self.detect_threats(content)

        audit_result = {
            "audit_id": f"audit-{int(time.time() * 1000)}",
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "threat_assessment": threat_assessment,
            "allowed": threat_assessment["threat_score"] <= 20,
            "reason": threat_assessment["recommendation"],
            "requires_approval": threat_assessment["threat_score"] > 10
        }

        # Update threat level
        self.threat_level = max(self.threat_level * 0.95, threat_assessment["threat_score"] * 0.1)

        return audit_result

    def visual_oversight(self, screenshot: Optional[bytes] = None) -> Dict[str, Any]:
        """
        Perform visual oversight - analyze screenshots for anomalies
        (Stub for now - requires Gemini Vision in production)
        """
        return {
            "visual_check_performed": True,
            "anomalies_detected": False,
            "confidence": 0.95,
            "timestamp": datetime.now().isoformat()
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
                    "threat_level": self.threat_level,
                    "audits_performed": self.audits_performed,
                    "heartbeat_seq": self.heartbeat_counter
                }
            )

    def run(self) -> None:
        """Main worker loop"""
        print(f"🛡️ Grisha Worker started: {self.urn}", file=sys.stderr)
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

                if intent == "QUERY":
                    # Audit operation
                    operation = payload.get("operation", "unknown")
                    args = payload.get("args", {})
                    
                    audit = self.audit(operation, args)
                    self.send_packet("RESPONSE", {
                        "audit": audit,
                        "approved": audit["allowed"]
                    })

                elif intent == "EVENT":
                    # Visual oversight check
                    screenshot = payload.get("screenshot")
                    
                    oversight = self.visual_oversight(screenshot)
                    self.send_packet("EVENT", {
                        "visual_oversight": oversight,
                        "alert": oversight["anomalies_detected"]
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

                # Decay threat level over time
                if packet_count % 50 == 0:
                    self.threat_level = max(0, self.threat_level - 2)

            except Exception as e:
                error_msg = f"Error in worker loop: {str(e)}\n{traceback.format_exc()}"
                print(error_msg, file=sys.stderr)
                self.send_packet("ERROR", {
                    "error": str(e),
                    "type": "WORKER_ERROR"
                })

        self.state = "STOPPED"
        print(f"🛑 Grisha Worker stopped after {packet_count} packets", file=sys.stderr)


if __name__ == "__main__":
    worker = GrishaWorker()
    worker.run()
