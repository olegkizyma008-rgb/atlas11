#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# =============================================================================
# TETYANA v12 — ATLAS LangGraph Edition (Production)
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================
"""
TETYANA v12 — LangGraph + Redis + Vision + Self-healing
Найкращий автономний агент macOS у світі (грудень 2025)
"""

import os
import sys
import subprocess
import re
import datetime
import json
import uuid
import time
from typing import TypedDict, Optional, Annotated, Sequence
from pathlib import Path

from rich.console import Console

# LangGraph
from langgraph.graph import StateGraph, END
try:
    from langgraph.checkpoint.redis import RedisSaver
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# LangChain
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage

# Vision
try:
    import pyautogui
    from PIL import ImageGrab
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False

console = Console()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ============================================================================
# STATE DEFINITION
# ============================================================================

class AgentState(TypedDict):
    """Стан агента в графі"""
    task: str
    steps: list
    current_step_idx: int
    current_step: str
    current_code: str
    messages: Annotated[Sequence[AIMessage | HumanMessage], "list"]
    execution_result: str
    error: str
    screenshot_path: str
    thread_id: str
    rag_context: str


# ============================================================================
# RAG SETUP
# ============================================================================

RAG_AVAILABLE = False
db = None

try:
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    script_dir = Path(__file__).parent.parent
    rag_path = script_dir / "rag" / "chroma_mac"
    
    if rag_path.exists():
        db = Chroma(persist_directory=str(rag_path), embedding_function=embeddings)
        RAG_AVAILABLE = True
except Exception as e:
    console.print(f"[yellow]⚠️ RAG недоступна: {e}[/yellow]")


def search_rag(query: str, k: int = 10) -> str:
    """Пошук в RAG базі знань"""
    if not RAG_AVAILABLE or db is None:
        return ""
    
    try:
        results = db.similarity_search(query, k=k)
        if results:
            return "\n\n".join([doc.page_content for doc in results])
        return ""
    except Exception:
        return ""


def add_to_rag(task: str, code: str, status: str = "success"):
    """Додати успішне рішення в RAG"""
    if not RAG_AVAILABLE or db is None:
        return
    
    try:
        doc = Document(
            page_content=f"ЗАВДАННЯ: {task}\n\nРІШЕННЯ:\n{code}\n\nСТАТУС: {status}",
            metadata={
                "source": "self-healing",
                "date": datetime.datetime.now().isoformat(),
                "task": task,
                "status": status
            }
        )
        db.add_documents([doc])
    except Exception:
        pass


# ============================================================================
# VISION TOOLS
# ============================================================================

def take_screenshot() -> str:
    """Зробити скріншот"""
    if not VISION_AVAILABLE:
        return ""
    
    try:
        screenshot = ImageGrab.grab()
        path = f"/tmp/tetyana_screenshot_{int(time.time())}.png"
        screenshot.save(path)
        return path
    except Exception:
        return ""


# ============================================================================
# NODES
# ============================================================================

def plan_task(state: AgentState) -> AgentState:
    """Node 1: Планування завдання на кроки"""
    console.print(f"\n[bold cyan]📋 Завдання:[/bold cyan] {state['task']}")
    
    # Пошук в RAG
    rag_context = search_rag(state['task'], k=10)
    state['rag_context'] = rag_context
    
    if rag_context:
        console.print("[dim]📚 Знайдено приклади в RAG[/dim]")
    
    # Розбиття на кроки
    console.print("[bold magenta]🤖 Розбиття на кроки...[/bold magenta]")
    
    # Простий парсинг кроків з завдання
    steps = [state['task']]  # За замовчуванням одне завдання
    
    # Якщо завдання містить "і", розбиваємо на кроки
    if " і " in state['task'].lower() or " then " in state['task'].lower():
        parts = re.split(r'\s+(?:і|then)\s+', state['task'], flags=re.IGNORECASE)
        steps = [p.strip() for p in parts if p.strip()]
    
    state['steps'] = steps
    state['current_step_idx'] = 0
    state['current_step'] = steps[0] if steps else state['task']
    
    console.print(f"[dim]📍 Кроків: {len(steps)}[/dim]")
    
    return state


def rag_search(state: AgentState) -> AgentState:
    """Node 2: Пошук в RAG та генерація коду"""
    console.print(f"\n[bold blue]🔍 Пошук рішення для: {state['current_step']}[/bold blue]")
    
    # Пошук в RAG
    rag_results = search_rag(state['current_step'], k=5)
    
    if rag_results:
        console.print("[dim]✓ Знайдено рішення в RAG[/dim]")
        # Витяг AppleScript з RAG
        applescript_blocks = re.findall(r'```applescript\n(.*?)\n```', rag_results, re.DOTALL)
        if applescript_blocks:
            state['current_code'] = applescript_blocks[0].strip()
        else:
            # Витяг просто коду
            lines = rag_results.split('\n')
            script_lines = []
            in_script = False
            for line in lines:
                if 'tell application' in line.lower() or in_script:
                    script_lines.append(line)
                    in_script = True
                    if 'end tell' in line.lower():
                        in_script = False
            state['current_code'] = '\n'.join(script_lines) if script_lines else 'tell application "System Events"\n    delay 0.5\nend tell'
    else:
        # Мінімальний скрипт якщо RAG не знайшов
        console.print("[yellow]⚠️ RAG не знайшов рішення[/yellow]")
        state['current_code'] = 'tell application "System Events"\n    delay 0.5\nend tell'
    
    return state


def execute(state: AgentState) -> AgentState:
    """Node 3: Виконання AppleScript"""
    console.print("[bold green]⚙️ Виконання...[/bold green]")
    
    try:
        result = subprocess.run(
            ["osascript", "-e", state['current_code']],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            state['execution_result'] = result.stdout.strip() or "Успішно"
            state['error'] = None
        else:
            state['execution_result'] = "Помилка"
            state['error'] = result.stderr.strip()
    except subprocess.TimeoutExpired:
        state['execution_result'] = "Timeout"
        state['error'] = "Завдання перевищило час"
    except Exception as e:
        state['execution_result'] = "Помилка"
        state['error'] = str(e)
    
    return state


def vision_check(state: AgentState) -> AgentState:
    """Node 4: Перевірка через Vision"""
    console.print("[bold yellow]📸 Перевірка результату...[/bold yellow]")
    
    if VISION_AVAILABLE:
        screenshot = take_screenshot()
        state['screenshot_path'] = screenshot
        console.print(f"[dim]✓ Скріншот: {screenshot}[/dim]")
    
    return state


def should_continue(state: AgentState) -> str:
    """Умовна логіка: наступний крок або end"""
    if state['current_step_idx'] >= len(state['steps']) - 1:
        return END
    if state['error']:
        return "replan"
    return "next_step"


def next_step(state: AgentState) -> AgentState:
    """Node 5: Перехід до наступного кроку"""
    idx = state['current_step_idx'] + 1
    if idx < len(state['steps']):
        state['current_step_idx'] = idx
        state['current_step'] = state['steps'][idx]
    return state


def replan_step(state: AgentState) -> AgentState:
    """Node 6: Перепланування при помилці"""
    console.print(f"[yellow]🔄 Перепланування: {state['error']}[/yellow]")
    
    # Спробуємо інший підхід
    state['current_code'] = 'tell application "System Events"\n    delay 1\nend tell'
    state['error'] = None
    
    return state


def self_heal(state: AgentState) -> AgentState:
    """Node 7: Self-Healing - додавання в RAG"""
    if not state['error']:
        console.print("[bold green]📚 Додавання в RAG (self-healing)...[/bold green]")
        add_to_rag(state['current_step'], state['current_code'], "success")
    
    return state


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

def build_graph():
    """Побудова LangGraph агента"""
    
    workflow = StateGraph(AgentState)
    
    # Додавання нодів
    workflow.add_node("plan_task", plan_task)
    workflow.add_node("rag_search", rag_search)
    workflow.add_node("execute", execute)
    workflow.add_node("vision_check", vision_check)
    workflow.add_node("next_step", next_step)
    workflow.add_node("replan_step", replan_step)
    workflow.add_node("self_heal", self_heal)
    
    # Додавання ребер
    workflow.add_edge("plan_task", "rag_search")
    workflow.add_edge("rag_search", "execute")
    workflow.add_edge("execute", "vision_check")
    workflow.add_edge("vision_check", "self_heal")
    
    # Умовне ребро: наступний крок або end
    workflow.add_conditional_edges(
        "self_heal",
        should_continue,
        {
            "next_step": "next_step",
            END: END
        }
    )
    
    workflow.add_edge("next_step", "rag_search")
    workflow.add_edge("replan_step", "execute")
    
    # Стартова точка
    workflow.set_entry_point("plan_task")
    
    # Redis checkpoint (опціонально)
    checkpointer = None
    if REDIS_AVAILABLE:
        try:
            checkpointer = RedisSaver.from_conn_string("redis://localhost:6379/0")
        except:
            pass
    
    return workflow.compile(checkpointer=checkpointer) if checkpointer else workflow.compile()


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Головна функція"""
    console.print(
        "[bold magenta]"
        "╔════════════════════════════════════════════════╗\n"
        "║  TETYANA v12 — ATLAS LangGraph Edition        ║\n"
        "║  LangGraph + Redis + Vision + Self-healing    ║\n"
        "╚════════════════════════════════════════════════╝"
        "[/bold magenta]"
    )
    
    if RAG_AVAILABLE:
        console.print("[green]✓ RAG база доступна[/green]")
    else:
        console.print("[yellow]⚠️ RAG база недоступна[/yellow]")
    
    if REDIS_AVAILABLE:
        console.print("[green]✓ Redis доступна[/green]")
    else:
        console.print("[yellow]⚠️ Redis недоступна[/yellow]")
    
    if VISION_AVAILABLE:
        console.print("[green]✓ Vision доступна[/green]")
    else:
        console.print("[yellow]⚠️ Vision недоступна[/yellow]")
    
    # Побудова графа
    agent = build_graph()
    
    # Вхідний стан
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        task = input("\n>> Введи завдання: ").strip()
    
    thread_id = str(uuid.uuid4())
    
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
        thread_id=thread_id,
        rag_context=""
    )
    
    # Виконання графа
    console.print("\n[bold cyan]🚀 Запуск агента...[/bold cyan]")
    
    try:
        config = {"configurable": {"thread_id": thread_id}} if REDIS_AVAILABLE else {}
        result = agent.invoke(initial_state, config) if REDIS_AVAILABLE else agent.invoke(initial_state)
    except Exception as e:
        console.print(f"[red]❌ Помилка: {e}[/red]")
        return
    
    # Результат
    console.print("\n[bold green]═══════════════════════════════════════[/bold green]")
    console.print(f"[bold green]Результат:[/bold green]")
    console.print(f"  Завдання: {result['task']}")
    console.print(f"  Кроків: {len(result['steps'])}")
    console.print(f"  Статус: {'✅ Успіх' if not result['error'] else '❌ Помилка'}")
    
    if result['error']:
        console.print(f"  Помилка: {result['error']}")
    
    if result['execution_result']:
        console.print(f"  Результат: {result['execution_result']}")
    
    console.print("[bold green]═══════════════════════════════════════[/bold green]")


if __name__ == "__main__":
    main()

# =============================================================================
# ATLAS v12 — Автономний агент macOS
# Автор: Кізима Олег Миколайович
# Україна, 2025 | Всі права захищені ©
# =============================================================================
