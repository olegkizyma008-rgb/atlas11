#!/usr/bin/env python3
"""
Atlas Worker - Python-based KONTUR Organ
Handles Atlas planning logic via KPP packets
Communicates with Core via STDIN/STDOUT
"""

import json
import sys
import time
import uuid
from typing import Dict, Any, List

class AtlasWorker:
    def __init__(self):
        self.urn = "kontur://organ/atlas"
        self.state = "IDLE"
        self.load_factor = 0.0
        self.last_heartbeat = time.time()
        print(f"[ATLAS-WORKER] 🧠 Initialized: {self.urn}", file=sys.stderr)
        sys.stderr.flush()

    def receive_packet(self) -> Dict[str, Any]:
        """Read KPP packet from STDIN"""
        try:
            line = sys.stdin.readline()
            if not line:
                return None
            packet = json.loads(line)
            return packet
        except json.JSONDecodeError as e:
            print(f"[ATLAS-WORKER] JSON parse error: {e}", file=sys.stderr)
            return None

    def send_packet(self, packet: Dict[str, Any]) -> None:
        """Send KPP packet to STDOUT"""
        try:
            json.dump(packet, sys.stdout)
            sys.stdout.write('\n')
            sys.stdout.flush()
        except Exception as e:
            print(f"[ATLAS-WORKER] Send error: {e}", file=sys.stderr)
            sys.stderr.flush()

    def create_packet(
        self,
        to_urn: str,
        intent: str,
        payload: Dict[str, Any],
        from_urn: str = None
    ) -> Dict[str, Any]:
        """Create valid KPP packet"""
        if from_urn is None:
            from_urn = self.urn

        return {
            "nexus": {
                "ver": "11.0",
                "uid": str(uuid.uuid4()),
                "timestamp": int(time.time() * 1000),
                "ttl": 5000,
                "integrity": self.compute_integrity(payload),
                "priority": 5,
                "compressed": False,
                "gravity_factor": 1.0
            },
            "route": {
                "from": from_urn,
                "to": to_urn
            },
            "auth": {
                "scope": 50
            },
            "instruction": {
                "intent": intent,
                "op_code": "ATLAS_PLAN"
            },
            "payload": payload
        }

    def compute_integrity(self, payload: Dict[str, Any]) -> str:
        """Compute SHA256 hash of payload"""
        import hashlib
        payload_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_str.encode()).hexdigest()

    def plan(self, goal: str, context: Dict[str, Any] = None) -> List[str]:
        """Generate plan for goal"""
        print(f"[ATLAS-WORKER] Planning: {goal}", file=sys.stderr)
        
        steps = [
            "Analyze goal and context",
            "Query memory for similar tasks",
            "Decompose goal into subtasks",
            "Evaluate resource requirements",
            "Create execution schedule",
            "Verify safety constraints",
            "Emit plan_ready signal"
        ]
        
        return steps

    def heartbeat(self) -> Dict[str, Any]:
        """Send heartbeat packet"""
        self.last_heartbeat = time.time()
        return self.create_packet(
            "kontur://core/system",
            "HEARTBEAT",
            {
                "organ": self.urn,
                "state": self.state,
                "load_factor": self.load_factor,
                "timestamp": int(time.time() * 1000)
            }
        )

    def run(self) -> None:
        """Main worker loop"""
        print(f"[ATLAS-WORKER] Starting main loop", file=sys.stderr)
        sys.stderr.flush()
        
        heartbeat_count = 0
        
        while True:
            try:
                # Send periodic heartbeats
                heartbeat_count += 1
                if heartbeat_count % 10 == 0:
                    hb_packet = self.heartbeat()
                    self.send_packet(hb_packet)
                
                # Receive and process packets
                packet = self.receive_packet()
                if packet is None:
                    continue
                
                instruction = packet.get("instruction", {})
                op_code = instruction.get("op_code", "")
                payload = packet.get("payload", {})
                
                print(f"[ATLAS-WORKER] Received packet: {op_code}", file=sys.stderr)
                sys.stderr.flush()
                
                if op_code == "ATLAS_PLAN":
                    self.state = "BUSY"
                    self.load_factor = 0.5
                    
                    goal = payload.get("goal", "unknown")
                    context = payload.get("context", {})
                    
                    # Generate plan
                    steps = self.plan(goal, context)
                    
                    # Send response
                    response = self.create_packet(
                        packet.get("route", {}).get("from", "kontur://core/system"),
                        "RESPONSE",
                        {
                            "plan_id": str(uuid.uuid4()),
                            "goal": goal,
                            "steps": steps,
                            "status": "active"
                        },
                        from_urn=self.urn
                    )
                    
                    self.send_packet(response)
                    self.state = "IDLE"
                    self.load_factor = 0.0
                    
                elif op_code == "HEARTBEAT":
                    hb_response = self.heartbeat()
                    self.send_packet(hb_response)
                
                elif op_code == "SHUTDOWN":
                    print(f"[ATLAS-WORKER] Shutting down", file=sys.stderr)
                    sys.stderr.flush()
                    break
                
                time.sleep(0.01)
                
            except KeyboardInterrupt:
                print(f"[ATLAS-WORKER] Interrupted", file=sys.stderr)
                sys.stderr.flush()
                break
            except Exception as e:
                print(f"[ATLAS-WORKER] Error: {e}", file=sys.stderr)
                sys.stderr.flush()
                time.sleep(0.1)

if __name__ == "__main__":
    worker = AtlasWorker()
    worker.run()
