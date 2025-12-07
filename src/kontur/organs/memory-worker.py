#!/usr/bin/env python3
"""
Memory Worker - KONTUR Persistence Organ
Handles episodic, semantic, and heuristic memory storage and retrieval
Communicates via KPP protocol over STDIN/STDOUT
"""

import json
import sys
import time
import hashlib
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional


class MemoryWorker:
    """KONTUR Memory Organ - Persistent knowledge management"""

    def __init__(self):
        self.urn = "kontur://organ/memory"
        self.state = "READY"
        self.load_factor = 0.0
        self.heartbeat_counter = 0
        
        # In-memory storage for this worker instance
        # In production, this would be backed by Drizzle ORM
        self.episodic_memories = []  # Events and episodes
        self.semantic_memories = []  # Facts and knowledge
        self.heuristic_memories = []  # Learned patterns
        
        self.total_stored = 0
        self.total_recalled = 0

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
                    "uid": f"memory-{int(time.time() * 1000)}",
                    "timestamp": int(time.time() * 1000),
                    "ttl": 5000,
                    "integrity": "",
                    "priority": 4,
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
                    "op_code": "MEMORY_STORE"
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

    def store(self, memory_type: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Store a memory of specified type
        Types: episode, fact, heuristic
        """
        memory_id = f"{memory_type[:3]}-{int(time.time() * 1000)}"
        
        memory = {
            "id": memory_id,
            "type": memory_type,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
            "stored_at": int(time.time() * 1000)
        }

        # Store in appropriate collection
        if memory_type == "episode":
            self.episodic_memories.append(memory)
        elif memory_type == "fact":
            self.semantic_memories.append(memory)
        elif memory_type == "heuristic":
            self.heuristic_memories.append(memory)

        self.total_stored += 1
        self.load_factor = min(1.0, self.load_factor + 0.01)

        return {
            "stored": True,
            "memory_id": memory_id,
            "type": memory_type,
            "timestamp": memory["timestamp"]
        }

    def recall(self, query: str, memory_type: Optional[str] = None, limit: int = 5) -> Dict[str, Any]:
        """
        Recall memories matching query
        Optionally filtered by type
        """
        results = []

        # Search in appropriate collections
        collections = []
        if memory_type is None or memory_type == "episode":
            collections.extend(self.episodic_memories)
        if memory_type is None or memory_type == "fact":
            collections.extend(self.semantic_memories)
        if memory_type is None or memory_type == "heuristic":
            collections.extend(self.heuristic_memories)

        # Simple keyword matching
        query_lower = query.lower()
        for memory in collections:
            if query_lower in memory["content"].lower():
                results.append(memory)
                if len(results) >= limit:
                    break

        self.total_recalled += 1
        self.load_factor = max(0, self.load_factor - 0.005)

        return {
            "query": query,
            "memory_type": memory_type,
            "results": results,
            "count": len(results),
            "timestamp": datetime.now().isoformat()
        }

    def optimize(self) -> Dict[str, Any]:
        """
        Optimize memory - merge duplicates, consolidate heuristics
        Returns optimization stats
        """
        merged_count = 0
        deleted_count = 0

        # Simple deduplication - remove exact duplicates
        for collection in [self.episodic_memories, self.semantic_memories, self.heuristic_memories]:
            seen_contents = set()
            to_remove = []

            for i, memory in enumerate(collection):
                content_hash = hashlib.md5(memory["content"].encode()).hexdigest()
                if content_hash in seen_contents:
                    to_remove.append(i)
                    deleted_count += 1
                else:
                    seen_contents.add(content_hash)

            # Remove in reverse order to maintain indices
            for i in reversed(to_remove):
                collection.pop(i)
                merged_count += 1

        # Keep only top 3 heuristics (keep most recent)
        if len(self.heuristic_memories) > 3:
            sorted_heuristics = sorted(
                self.heuristic_memories,
                key=lambda x: x["stored_at"],
                reverse=True
            )
            deleted = len(self.heuristic_memories) - 3
            self.heuristic_memories = sorted_heuristics[:3]
            deleted_count += deleted
            merged_count += deleted

        self.load_factor = max(0, self.load_factor - 0.05)

        return {
            "optimized": True,
            "nodes_merged": merged_count,
            "nodes_deleted": deleted_count,
            "episodic_memories": len(self.episodic_memories),
            "semantic_memories": len(self.semantic_memories),
            "heuristic_memories": len(self.heuristic_memories),
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
                    "load_factor": self.load_factor,
                    "total_memories": len(self.episodic_memories) + len(self.semantic_memories) + len(self.heuristic_memories),
                    "total_stored": self.total_stored,
                    "total_recalled": self.total_recalled,
                    "heartbeat_seq": self.heartbeat_counter
                }
            )

    def run(self) -> None:
        """Main worker loop"""
        print(f"💾 Memory Worker started: {self.urn}", file=sys.stderr)
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
                    # Store memory
                    memory_type = payload.get("type", "fact")
                    content = payload.get("content", "")
                    metadata = payload.get("metadata")
                    
                    result = self.store(memory_type, content, metadata)
                    self.send_packet("EVENT", {
                        "memory_stored": result
                    })

                elif intent == "QUERY":
                    # Recall memory
                    query = payload.get("query", "")
                    memory_type = payload.get("type")
                    limit = payload.get("limit", 5)
                    
                    result = self.recall(query, memory_type, limit)
                    self.send_packet("RESPONSE", {
                        "recall_result": result
                    })

                elif intent == "EVOLVE":
                    # Optimize memory
                    result = self.optimize()
                    self.send_packet("EVENT", {
                        "optimization": result
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
        print(f"🛑 Memory Worker stopped after {packet_count} packets", file=sys.stderr)


if __name__ == "__main__":
    worker = MemoryWorker()
    worker.run()
