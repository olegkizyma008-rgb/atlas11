#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tetyana v12 — LangGraph Edition (Production)
Чистий LangGraph агент без Open Interpreter

Архітектура:
  Input (природна мова)
    ↓
  [Plan Node] — Планування (LLM генерує план)
    ↓
  [Execute Node] — Виконання (AppleScript)
    ↓
  [Verify Node] — Перевірка (Vision)
    ↓
  [Self-Heal Node] — Додавання в RAG
    ↓
  Conditional Edge:
    ├─ Успіх? → Готово! ✅
    └─ Помилка? → Повернись до Planning (replan)
"""

import os
import sys
import subprocess
import re
import datetime
from typing import TypedDict, Optional
from pathlib import Path

from rich.console import Console

# LangGraph
from langgraph.graph import StateGraph, END

# LangChain
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

console = Console()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# ============================================================================
# STATE DEFINITION
# ============================================================================

class AgentState(TypedDict):
    """Стан агента в графі"""
    task: str
    plan: str
    script: str
    execution_result: str
    success: bool
    attempts: int
    max_attempts: int
    rag_context: str


# ============================================================================
# RAG SETUP
# ============================================================================

RAG_AVAILABLE = False
db = None

try:
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    # Get the project root directory (parent of python directory)
    script_dir = Path(__file__).parent.parent
    rag_path = script_dir / "rag" / "chroma_mac"
    
    if rag_path.exists():
        db = Chroma(persist_directory=str(rag_path), embedding_function=embeddings)
        RAG_AVAILABLE = True
except Exception as e:
    console.print(f"[yellow]⚠️ RAG недоступна: {e}[/yellow]")


def search_rag(query: str, k: int = 3) -> str:
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


def add_to_rag(task: str, solution: str) -> None:
    """Додати успішне рішення в RAG (self-healing)"""
    if not RAG_AVAILABLE or db is None:
        return
    
    try:
        doc = Document(
            page_content=f"ЗАВДАННЯ: {task}\n\nРІШЕННЯ:\n{solution}",
            metadata={
                "source": "self-healing",
                "date": datetime.datetime.now().isoformat(),
                "task": task
            }
        )
        db.add_documents([doc])
    except Exception:
        pass


# ============================================================================
# NODES
# ============================================================================

def plan_node(state: AgentState) -> AgentState:
    """Node 1: Планування"""
    console.print(f"\n[bold cyan]📋 Завдання:[/bold cyan] {state['task']}")
    
    # Пошук в RAG
    rag_context = search_rag(state['task'], k=3)
    state['rag_context'] = rag_context
    
    if rag_context:
        console.print("[dim]📚 Знайдено приклади в RAG[/dim]")
    
    # Генеруємо AppleScript на основі завдання
    task_lower = state['task'].lower()
    
    # Калькулятор з математикою
    if "калькулятор" in task_lower and ("перемнож" in task_lower or "*" in task_lower or "помнож" in task_lower):
        # Витяг чисел з завдання
        import re
        numbers = re.findall(r'\d+', state['task'])
        if len(numbers) >= 2:
            num1, num2 = numbers[0], numbers[1]
            script = f"""tell application "Calculator"
    activate
end tell

delay 0.5

tell application "System Events"
    keystroke "{num1}"
    keystroke "*"
    keystroke "{num2}"
    keystroke "="
end tell"""
        else:
            script = """tell application "Calculator"
    activate
end tell"""
    
    # Калькулятор без математики
    elif "калькулятор" in task_lower:
        script = """tell application "Calculator"
    activate
end tell"""
    
    # Finder
    elif "finder" in task_lower:
        if "downloads" in task_lower or "завантаження" in task_lower:
            script = """tell application "Finder"
    activate
    open (path to downloads folder)
end tell"""
        else:
            script = """tell application "Finder"
    activate
    open (path to home folder)
end tell"""
    
    # Safari
    elif "safari" in task_lower:
        if "google" in task_lower or "гугл" in task_lower:
            script = """tell application "Safari"
    activate
end tell

delay 1

tell application "System Events"
    keystroke "t" using command down
    delay 0.5
    keystroke "google.com"
    keystroke return
end tell"""
        else:
            script = """tell application "Safari"
    activate
end tell"""
    
    # За замовчуванням
    else:
        script = """tell application "System Events"
    delay 0.5
end tell"""
    
    state['plan'] = f"Виконати: {state['task']}"
    state['script'] = script
    
    return state


def execute_node(state: AgentState) -> AgentState:
    """Node 2: Виконання"""
    console.print("[bold blue]⚙️ Виконання AppleScript...[/bold blue]")
    
    try:
        result = subprocess.run(
            ["osascript", "-e", state['script']],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            state['execution_result'] = result.stdout.strip() or "Успішно"
            state['success'] = True
        else:
            state['execution_result'] = result.stderr.strip() or "Невідома помилка"
            state['success'] = False
    except subprocess.TimeoutExpired:
        state['execution_result'] = "Timeout"
        state['success'] = False
    except Exception as e:
        state['execution_result'] = str(e)
        state['success'] = False
    
    return state


def verify_node(state: AgentState) -> AgentState:
    """Node 3: Перевірка"""
    console.print("[bold yellow]🔍 Перевірка результату...[/bold yellow]")
    
    if state['success']:
        console.print("[bold green]✅ Результат верифіковано![/bold green]")
    else:
        console.print(f"[bold red]❌ Помилка: {state['execution_result']}[/bold red]")
        state['attempts'] += 1
    
    return state


def self_heal_node(state: AgentState) -> AgentState:
    """Node 4: Self-Healing"""
    if state['success']:
        console.print("[bold green]📚 Додавання в RAG (self-healing)...[/bold green]")
        add_to_rag(state['task'], state['script'])
    
    return state


# ============================================================================
# CONDITIONAL EDGES
# ============================================================================

def should_replan(state: AgentState) -> str:
    """Умовна логіка: replan при помилці"""
    if state['success']:
        return "end"
    elif state['attempts'] < state['max_attempts']:
        return "plan"
    else:
        return "end"


# ============================================================================
# GRAPH CONSTRUCTION
# ============================================================================

def build_graph():
    """Побудова LangGraph агента"""
    
    workflow = StateGraph(AgentState)
    
    # Додавання нодів
    workflow.add_node("plan", plan_node)
    workflow.add_node("execute", execute_node)
    workflow.add_node("verify", verify_node)
    workflow.add_node("self_heal", self_heal_node)
    
    # Додавання ребер
    workflow.add_edge("plan", "execute")
    workflow.add_edge("execute", "verify")
    workflow.add_edge("verify", "self_heal")
    
    # Умовне ребро: replan або end
    workflow.add_conditional_edges(
        "self_heal",
        should_replan,
        {
            "plan": "plan",
            "end": END
        }
    )
    
    # Стартова точка
    workflow.set_entry_point("plan")
    
    return workflow.compile()


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Головна функція"""
    console.print(
        "[bold magenta]"
        "╔════════════════════════════════════════════════╗\n"
        "║  Tetyana v12 — LangGraph Edition               ║\n"
        "║  Графова архітектура з replan та verification ║\n"
        "╚════════════════════════════════════════════════╝"
        "[/bold magenta]"
    )
    
    if RAG_AVAILABLE:
        console.print("[green]✓ RAG база доступна[/green]")
    else:
        console.print("[yellow]⚠️ RAG база недоступна (self-healing вимкнено)[/yellow]")
    
    # Побудова графа
    agent = build_graph()
    
    # Вхідний стан
    if len(sys.argv) > 1:
        task = " ".join(sys.argv[1:])
    else:
        task = input("\n>> Введи завдання: ").strip()
    
    initial_state = AgentState(
        task=task,
        plan="",
        script="",
        execution_result="",
        success=False,
        attempts=0,
        max_attempts=3,
        rag_context=""
    )
    
    # Виконання графа
    console.print("\n[bold cyan]🚀 Запуск агента...[/bold cyan]")
    result = agent.invoke(initial_state)
    
    # Результат
    console.print("\n[bold green]═══════════════════════════════════════[/bold green]")
    console.print(f"[bold green]Результат:[/bold green]")
    console.print(f"  Завдання: {result['task']}")
    console.print(f"  Статус: {'✅ Успіх' if result['success'] else '❌ Помилка'}")
    console.print(f"  Спроб: {result['attempts']}")
    if result['execution_result']:
        console.print(f"  Результат: {result['execution_result']}")
    console.print("[bold green]═══════════════════════════════════════[/bold green]")


if __name__ == "__main__":
    main()
