#!/usr/bin/env python3
"""
KONTUR Worker Organ - Python Process
Handles general computation tasks via KPP protocol
"""

import sys
import json
import time
import uuid
import hashlib
import io
import random
import os

URN = "kontur://organ/worker"
LOAD_FACTOR = 0.1
ENERGY_USAGE = 0.0


def compute_integrity(payload):
    """Compute SHA256 integrity hash"""
    payload_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(payload_str.encode()).hexdigest()


def send_packet(packet):
    """Send KPP packet via stdout"""
    payload_str = json.dumps(packet['payload'], sort_keys=True)
    packet['nexus']['integrity'] = compute_integrity(packet['payload'])
    print(json.dumps(packet), flush=True)


def create_packet(from_urn, to_urn, intent, payload, op_code='RESPONSE'):
    """Factory to create KPP packet"""
    return {
        "nexus": {
            "ver": "11.0",
            "uid": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "ttl": 5000,
            "integrity": "",
            "priority": 5,
            "compressed": False,
            "quantum_state": {"amp1": random.random(), "amp2": random.random()}
        },
        "route": {"from": from_urn, "to": to_urn},
        "auth": {"scope": 1},
        "instruction": {"intent": intent, "op_code": op_code},
        "payload": payload,
        "health": {
            "load_factor": LOAD_FACTOR,
            "state": "IDLE",
            "energy_usage": ENERGY_USAGE
        }
    }


def main():
    """Main worker loop"""
    global LOAD_FACTOR, ENERGY_USAGE

    # Setup stdout/stdin for proper JSON handling
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

    print(f"[WORKER] Starting organ: {URN}", file=sys.stderr, flush=True)

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            req = json.loads(line)
            intent = req['instruction']['intent']
            op_code = req['instruction']['op_code']

            # Handle heartbeat
            if intent == 'HEARTBEAT':
                pong = create_packet(
                    URN,
                    req['route']['from'],
                    'HEARTBEAT',
                    {},
                    'PONG'
                )
                send_packet(pong)
                continue

            # Process command
            if intent == 'CMD' or op_code == 'EXECUTE':
                LOAD_FACTOR = 0.5
                ENERGY_USAGE += 0.1

                try:
                    # Safe execution context (limited builtins)
                    exec_locals = {}
                    task = req['payload'].get('task', 'pass')
                    exec(task, {"__builtins__": {}}, exec_locals)
                    result = str(exec_locals)
                except Exception as e:
                    result = f"Error executing task: {str(e)}"

                resp = create_packet(
                    URN,
                    req['route'].get('reply_to', req['route']['from']),
                    'RESPONSE',
                    {
                        "msg": result,
                        "task": req['payload'].get('task', ''),
                        "swarm_neighbors": [f"{URN}_swarm_{i}" for i in range(3)]
                    },
                    'RESULT'
                )
                LOAD_FACTOR = 0.1
                resp['health']['load_factor'] = LOAD_FACTOR
                send_packet(resp)
                continue

            # Default response
            resp = create_packet(
                URN,
                req['route'].get('reply_to', req['route']['from']),
                'RESPONSE',
                {
                    "msg": f"Processed {op_code}",
                    "payload": req['payload']
                },
                'OK'
            )
            send_packet(resp)

        except json.JSONDecodeError as e:
            print(f"[WORKER] JSON Parse error: {e}", file=sys.stderr, flush=True)
            LOAD_FACTOR = 0.9
            ENERGY_USAGE += 0.2
        except Exception as e:
            print(f"[WORKER] Error: {e}", file=sys.stderr, flush=True)
            LOAD_FACTOR = 0.9
            ENERGY_USAGE += 0.2


if __name__ == "__main__":
    main()
