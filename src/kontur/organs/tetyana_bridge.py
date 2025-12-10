#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# =============================================================================
# KONTUR Agent Bridge — ATLAS v12 Integration
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================
"""
KONTUR Protocol Bridge для TETYANA v12
Інтеграція LangGraph агента з KONTUR архітектурою (KPP Protocol, Synapse)
"""

import json
import sys
from typing import Dict, Any, Optional
from pathlib import Path

from rich.console import Console

# Імпортуємо основний агент
from tetyana_agent import (
    AgentState, 
    build_graph, 
    RAG_AVAILABLE, 
    REDIS_AVAILABLE, 
    VISION_AVAILABLE
)

console = Console()


# ============================================================================
# KONTUR PACKET STRUCTURE (KPP Protocol)
# ============================================================================

class KONTURPacket:
    """KONTUR пакет для комунікації через KPP Protocol"""
    
    def __init__(self, 
                 packet_type: str,
                 source: str = "tetyana-agent",
                 destination: str = "kontur-core",
                 payload: Optional[Dict[str, Any]] = None,
                 metadata: Optional[Dict[str, Any]] = None):
        self.packet_type = packet_type
        self.source = source
        self.destination = destination
        self.payload = payload or {}
        self.metadata = metadata or {}
        self.status = "pending"
    
    def to_dict(self) -> Dict[str, Any]:
        """Конвертувати пакет в словник"""
        return {
            "type": self.packet_type,
            "source": self.source,
            "destination": self.destination,
            "payload": self.payload,
            "metadata": self.metadata,
            "status": self.status
        }
    
    def to_json(self) -> str:
        """Конвертувати пакет в JSON"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# ============================================================================
# KONTUR AGENT BRIDGE
# ============================================================================

class KONTURAgentBridge:
    """Бридж для інтеграції TETYANA v12 з KONTUR архітектурою"""
    
    def __init__(self):
        self.agent = build_graph()
        self.console = console
    
    def create_request_packet(self, task: str) -> KONTURPacket:
        """Створити KONTUR пакет для завдання"""
        return KONTURPacket(
            packet_type="TASK_REQUEST",
            payload={
                "task": task,
                "engine": "tetyana-v12-langgraph",
                "capabilities": {
                    "rag": RAG_AVAILABLE,
                    "redis": REDIS_AVAILABLE,
                    "vision": VISION_AVAILABLE
                }
            },
            metadata={
                "protocol": "KPP",
                "version": "1.0",
                "timestamp": str(Path(__file__).stat().st_mtime)
            }
        )
    
    def create_response_packet(self, 
                              result: Dict[str, Any],
                              status: str = "success") -> KONTURPacket:
        """Створити KONTUR пакет з результатом"""
        packet = KONTURPacket(
            packet_type="TASK_RESPONSE",
            payload={
                "task": result.get("task", ""),
                "steps": result.get("steps", []),
                "current_step": result.get("current_step", ""),
                "execution_result": result.get("execution_result", ""),
                "error": result.get("error"),
                "screenshot_path": result.get("screenshot_path", "")
            },
            metadata={
                "status": status,
                "steps_count": len(result.get("steps", [])),
                "rag_context_available": bool(result.get("rag_context", ""))
            }
        )
        packet.status = status
        return packet
    
    def execute_task(self, task: str, verbose: bool = False) -> KONTURPacket:
        """Виконати завдання через KONTUR протокол"""
        
        # Створити запит пакет
        request_packet = self.create_request_packet(task)
        
        if verbose:
            self.console.print(f"[dim]📦 KONTUR Request:[/dim]")
            self.console.print(request_packet.to_json())
        
        # Виконати завдання
        try:
            initial_state = AgentState(
                task=task,
                steps=[],
                current_step_idx=0,
                current_step="",
                current_code="",
                messages=[],
                execution_result="",
                error=None,
                screenshot_path="",
                thread_id="kontur-" + str(hash(task))[:8],
                rag_context=""
            )
            
            result = self.agent.invoke(initial_state)
            
            # Створити відповідь пакет
            response_packet = self.create_response_packet(result, "success")
            
            if verbose:
                self.console.print(f"[dim]📦 KONTUR Response:[/dim]")
                self.console.print(response_packet.to_json())
            
            return response_packet
        
        except Exception as e:
            self.console.print(f"[red]❌ Помилка: {e}[/red]")
            error_packet = self.create_response_packet(
                {"task": task, "error": str(e)},
                "error"
            )
            return error_packet


# ============================================================================
# SYNAPSE EVENT EMITTER (для Synapse шини подій)
# ============================================================================

class SynapseEventEmitter:
    """Емітер подій для Synapse шини"""
    
    def __init__(self):
        self.listeners = {}
    
    def on(self, event: str, callback):
        """Підписатися на подію"""
        if event not in self.listeners:
            self.listeners[event] = []
        self.listeners[event].append(callback)
    
    def emit(self, event: str, data: Any):
        """Емітувати подію"""
        if event in self.listeners:
            for callback in self.listeners[event]:
                callback(data)


# ============================================================================
# MAIN KONTUR AGENT
# ============================================================================

def main():
    """Головна функція для KONTUR інтеграції"""
    
    console.print(
        "[bold cyan]"
        "╔════════════════════════════════════════════════╗\n"
        "║  TETYANA v12 — KONTUR Protocol Bridge         ║\n"
        "║  KPP Protocol + Synapse Integration           ║\n"
        "╚════════════════════════════════════════════════╝"
        "[/bold cyan]"
    )
    
    # Ініціалізація бриджа
    bridge = KONTURAgentBridge()
    
    # Отримати завдання
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        task = input("\n>> Введи завдання: ").strip()
    
    # Виконати завдання через KONTUR протокол
    console.print("\n[bold cyan]🚀 Запуск через KONTUR протокол...[/bold cyan]")
    response_packet = bridge.execute_task(task, verbose=False)
    
    # Вивести результат
    console.print("\n[bold green]═══════════════════════════════════════[/bold green]")
    console.print(f"[bold green]KONTUR Response:[/bold green]")
    console.print(response_packet.to_json())
    console.print("[bold green]═══════════════════════════════════════[/bold green]")


if __name__ == "__main__":
    main()

# =============================================================================
# ATLAS v12 — Автономний агент macOS
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================
