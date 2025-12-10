#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tetyana v12 — Advanced LangGraph with Real LLM Integration

Для складних завдань з реальною генерацією AppleScript через LLM
"""

import os
import sys
import subprocess
import re
import datetime
import json
from typing import TypedDict, Optional
from pathlib import Path

from rich.console import Console

# LangGraph
from langgraph.graph import StateGraph, END

# LangChain
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Для реальної LLM генерації (опціонально)
try:
    from langchain_openai import ChatOpenAI
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

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
    system_info: dict


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
    """Додати успішне рішення в RAG"""
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
# SYSTEM MONITORING
# ============================================================================

def get_system_info() -> dict:
    """Отримати інформацію про ресурси системи"""
    try:
        import psutil
        
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except ImportError:
        # Fallback якщо psutil не встановлено
        return {
            "cpu_percent": 0,
            "memory_percent": 0,
            "disk_percent": 0,
            "timestamp": datetime.datetime.now().isoformat()
        }


# ============================================================================
# LLM INTEGRATION
# ============================================================================

def generate_applescript_with_llm(task: str) -> str:
    """Генерувати AppleScript через LLM (якщо доступно)"""
    
    if not LLM_AVAILABLE:
        return generate_applescript_template(task)
    
    try:
        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        
        prompt = f"""Напиши AppleScript для виконання цього завдання на macOS:

Завдання: {task}

Вимоги:
1. Коректний синтаксис AppleScript
2. Обробка помилок
3. Затримки між діями (delay 0.5)
4. Клавіатурні комбінації де потрібно

Повертай тільки AppleScript код, без пояснень."""
        
        response = llm.invoke(prompt)
        script = response.content.strip()
        
        # Витяг AppleScript з відповіді
        if "```applescript" in script:
            match = re.search(r'```applescript\n(.*?)\n```', script, re.DOTALL)
            if match:
                return match.group(1)
        
        return script
    
    except Exception as e:
        console.print(f"[yellow]⚠️ LLM помилка: {e}[/yellow]")
        return generate_applescript_template(task)


def generate_applescript_template(task: str) -> str:
    """Генерувати AppleScript з шаблонів"""
    
    task_lower = task.lower()
    
    # Safari + Google
    if ("safari" in task_lower or "сафарі" in task_lower) and ("google" in task_lower or "гугл" in task_lower):
        return """tell application "Safari"
    activate
end tell

delay 1

tell application "System Events"
    keystroke "t" using command down
    delay 0.5
    keystroke "google.com"
    keystroke return
end tell"""
    
    # Safari + пошук
    elif ("safari" in task_lower or "сафарі" in task_lower) and ("пошук" in task_lower or "search" in task_lower):
        return """tell application "Safari"
    activate
end tell

delay 1

tell application "System Events"
    keystroke "t" using command down
    delay 0.5
    keystroke "google.com"
    keystroke return
end tell"""
    
    # Калькулятор + математика
    elif ("калькулятор" in task_lower or "calculator" in task_lower) and any(op in task_lower for op in ["перемнож", "помнож", "плюс", "мінус", "ділення", "*", "+", "-", "/"]):
        # Витяг чисел з завдання
        import re
        numbers = re.findall(r'\d+', task)
        if len(numbers) >= 2:
            num1, num2 = numbers[0], numbers[1]
            return f"""tell application "Calculator"
    activate
end tell

delay 1

tell application "System Events"
    keystroke "{num1}"
    delay 0.3
    keystroke "*"
    delay 0.3
    keystroke "{num2}"
    delay 0.3
    keystroke return
end tell"""
        else:
            return """tell application "Calculator"
    activate
end tell"""
    
    # Finder + Downloads
    elif ("finder" in task_lower or "файл" in task_lower) and ("downloads" in task_lower or "завантаження" in task_lower):
        return """tell application "Finder"
    activate
    open (path to downloads folder)
end tell"""
    
    # Google + фільм
    elif "гугл" in task_lower and ("фільм" in task_lower or "хатіко" in task_lower):
        return """tell application "Safari"
    activate
end tell

delay 1

tell application "System Events"
    keystroke "t" using command down
    delay 0.5
    keystroke "google.com"
    keystroke return
    delay 3
    keystroke "хатіко фільм онлайн"
    keystroke return
end tell"""
    
    # Клип на весь екран
    elif "клип" in task_lower and ("весь екран" in task_lower or "fullscreen" in task_lower):
        return """tell application "System Events"
    keystroke "f" using command down
end tell"""
    
    # Ресурси системи
    elif "ресурс" in task_lower or "монітор" in task_lower:
        return """tell application "Activity Monitor"
    activate
end tell"""
    
    # За замовчуванням
    else:
        return """tell application "System Events"
    delay 0.5
end tell"""


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
    
    # Генеруємо AppleScript
    console.print("[bold magenta]🤖 Генерація AppleScript...[/bold magenta]")
    script = generate_applescript_with_llm(state['task'])
    
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
            timeout=60
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
    
    # Отримати інформацію про ресурси
    state['system_info'] = get_system_info()
    
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
        "║  Tetyana v12 — Advanced LangGraph Edition      ║\n"
        "║  З реальною LLM генерацією AppleScript         ║\n"
        "╚════════════════════════════════════════════════╝"
        "[/bold magenta]"
    )
    
    if RAG_AVAILABLE:
        console.print("[green]✓ RAG база доступна[/green]")
    else:
        console.print("[yellow]⚠️ RAG база недоступна[/yellow]")
    
    if LLM_AVAILABLE:
        console.print("[green]✓ LLM доступна (OpenAI)[/green]")
    else:
        console.print("[yellow]⚠️ LLM недоступна (використовуються шаблони)[/yellow]")
    
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
        rag_context="",
        system_info={}
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
    
    if result['system_info']:
        console.print(f"\n[bold cyan]Ресурси системи:[/bold cyan]")
        console.print(f"  CPU: {result['system_info'].get('cpu_percent', 0):.1f}%")
        console.print(f"  Memory: {result['system_info'].get('memory_percent', 0):.1f}%")
        console.print(f"  Disk: {result['system_info'].get('disk_percent', 0):.1f}%")
    
    if result['execution_result']:
        console.print(f"  Результат: {result['execution_result']}")
    console.print("[bold green]═══════════════════════════════════════[/bold green]")


if __name__ == "__main__":
    main()
