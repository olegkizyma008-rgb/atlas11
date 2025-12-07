#!/usr/bin/env python3
"""
Tetyana Worker - KONTUR Execution Organ
Handles tool execution, code generation, and operation synthesis
Communicates via KPP protocol over STDIN/STDOUT
"""

import json
import sys
import time
import hashlib
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional


class TetyanaWorker:
    """KONTUR Execution Organ - Executes tools, synthesizes operations"""

    def __init__(self):
        self.urn = "kontur://organ/tetyana"
        self.state = "READY"
        self.load_factor = 0.0
        self.heartbeat_counter = 0
        self.tools_executed = []

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
                    "uid": f"tetyana-{int(time.time() * 1000)}",
                    "timestamp": int(time.time() * 1000),
                    "ttl": 5000,
                    "integrity": "",
                    "priority": 5,
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
                    "op_code": "TETYANA_EXEC"
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

    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool and return result
        Simulates tool execution for now
        """
        self.load_factor += 0.1
        
        result = {
            "tool": tool_name,
            "status": "success",
            "output": f"Executed {tool_name} with args {args}",
            "timestamp": int(time.time() * 1000),
            "execution_time_ms": 50
        }

        # Simulate different tool behaviors
        if tool_name == "write_file":
            result["output"] = f"✅ File written: {args.get('path', 'unknown')}"
        elif tool_name == "execute_code":
            result["output"] = f"✅ Code executed:\n{args.get('code', '')[:100]}"
        elif tool_name == "api_call":
            result["output"] = f"✅ API call made to {args.get('endpoint', 'unknown')}"
        else:
            result["output"] = f"✅ Tool {tool_name} completed successfully"

        self.tools_executed.append({
            "tool": tool_name,
            "timestamp": result["timestamp"]
        })

        return result

    def synthesize_operation(self, goal: str, steps: List[str]) -> Dict[str, Any]:
        """
        Synthesize multi-step operation from goal and plan
        Returns executable operation structure
        """
        operation = {
            "id": f"op-{int(time.time() * 1000)}",
            "goal": goal,
            "steps": steps,
            "synthesized_at": datetime.now().isoformat(),
            "operations": []
        }

        # Convert steps to executable operations
        for i, step in enumerate(steps):
            op = {
                "index": i,
                "description": step,
                "tool": "execute_step",
                "args": {"step": step},
                "depends_on": list(range(0, i))  # Linear dependency chain
            }
            operation["operations"].append(op)

        return operation

    def heartbeat(self) -> None:
        """Send periodic heartbeat to indicate liveness"""
        self.heartbeat_counter += 1
        if self.heartbeat_counter % 10 == 0:
            self.send_packet(
                "HEARTBEAT",
                {
                    "urn": self.urn,
                    "state": self.state,
                    "load_factor": self.load_factor,
                    "tools_executed": len(self.tools_executed),
                    "heartbeat_seq": self.heartbeat_counter
                }
            )

    def run(self) -> None:
        """Main worker loop"""
        print(f"🚀 Tetyana Worker started: {self.urn}", file=sys.stderr)
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
                    # Execute tool
                    tool_name = payload.get("tool")
                    tool_args = payload.get("args", {})
                    
                    result = self.execute_tool(tool_name, tool_args)
                    self.send_packet("EVENT", {
                        "execution_complete": True,
                        "result": result
                    })

                elif intent == "QUERY":
                    # Synthesize operation from goal
                    goal = payload.get("goal", "")
                    steps = payload.get("steps", [])
                    
                    operation = self.synthesize_operation(goal, steps)
                    self.send_packet("RESPONSE", {
                        "operation": operation,
                        "ready_for_execution": True
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

                # Reset load factor periodically
                if packet_count % 100 == 0:
                    self.load_factor = max(0, self.load_factor - 0.05)

            except Exception as e:
                error_msg = f"Error in worker loop: {str(e)}\n{traceback.format_exc()}"
                print(error_msg, file=sys.stderr)
                self.send_packet("ERROR", {
                    "error": str(e),
                    "type": "WORKER_ERROR"
                })

        self.state = "STOPPED"
        print(f"🛑 Tetyana Worker stopped after {packet_count} packets", file=sys.stderr)


if __name__ == "__main__":
    worker = TetyanaWorker()
    worker.run()
