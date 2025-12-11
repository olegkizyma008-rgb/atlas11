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
import shlex
import base64
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
# LLM HELPERS (Copilot gpt-4o with graceful fallback)
# ============================================================================


def call_copilot(prompt: str, model: str = "gpt-4.1", temperature: float = 0.2, timeout: int = 90) -> Optional[str]:
    """
    Виклик GitHub Copilot CLI (якщо доступний). Повертає текст або None.
    Очікується, що користувач має встановлений `copilot` CLI та токен.
    """
    copilot_bin = os.getenv("COPILOT_BIN", "copilot")
    try:
        # Copilot CLI current syntax (Dec 2025):
        #   copilot -p "<prompt>" --model gpt-4.1 --temperature 0.2 -s
        supported_models = {
            "gpt-4.1",
            "gpt-5",
            "gpt-5.1",
            "gpt-5.1-codex",
            "gpt-5.1-codex-max",
            "gpt-5.1-codex-mini",
            "gpt-5-mini",
            "claude-sonnet-4.5",
            "claude-haiku-4.5",
            "claude-opus-4.5",
            "claude-sonnet-4",
            "gemini-3-pro-preview",
        }
        model_to_use = model if model in supported_models else "gpt-4.1"

        cmd = [
            copilot_bin,
            "-p", prompt,
            "--model", model_to_use,
            "-s",  # silent mode: only agent response
            "--allow-all-tools",
            "--allow-all-paths",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        out = (result.stdout or "").strip()
        err = (result.stderr or "").strip()
        if out:
            return out
        if err:
            return err
        return None
    except Exception:
        return None


def _parse_steps_from_text(text: str) -> Optional[list]:
    """Спроба дістати JSON-масив рядків із відповіді Copilot."""
    import re
    import json
    if not text:
        return None
    candidates = [text]
    # Витягнути з ```json ... ``` або просто з першої дужки
    blocks = re.findall(r"```json\s*(.*?)```", text, re.DOTALL)
    if blocks:
        candidates.extend(blocks)
    bracket_match = re.search(r"(\[.*?\])", text, re.DOTALL)
    if bracket_match:
        candidates.append(bracket_match.group(1))
    for cand in candidates:
        try:
            data = json.loads(cand)
            if isinstance(data, list) and all(isinstance(s, str) for s in data):
                return [s.strip() for s in data if s and s.strip()]
        except Exception:
            continue
    return None


def plan_with_copilot(task: str) -> Optional[list]:
    """
    Викликає Copilot для розбиття завдання на серії однорідних дій.
    Формат очікуваної відповіді: JSON масив рядків.
    """
    prompt = f"""
Ти — планувальник macOS automation. Розбий завдання на серії однорідних дій (не дрібнити на мікрокроки).
Формат відповіді: JSON масив рядків, без пояснень.
Завдання: \"{task}\"
    Приклад: ["Відкрий Safari і перейдій на google.com", "Знайди запит ..."]
    """
    result = call_copilot(prompt, model=os.getenv("COPILOT_PLAN_MODEL", "gpt-4o"), temperature=0.2, timeout=60)
    steps = _parse_steps_from_text(result) if result else None

    # Якщо Copilot не дав валідний список або дав 1 довгий крок, пробуємо жорсткіший промпт для списку застосунків
    need_fallback = (steps is None or len(steps) <= 1) and ("," in task)
    if need_fallback:
        apps_tail = task.split(":", 1)[1] if ":" in task else task
        # Список назв застосунків
        apps = [a.strip(" .") for a in apps_tail.split(",") if a.strip()]
        if apps:
            # 1) Жорсткий промпт зі списком назви застосунків
            fallback_prompt = f"""
Ти — планувальник macOS automation. Є перелік застосунків (через кому). Поверни JSON масив кроків,
де кожен елемент — рядок у форматі "Open <AppName>" у тій самій послідовності. Тільки масив без пояснень.
Список: {apps_tail}
"""
            second = call_copilot(fallback_prompt, model=os.getenv("COPILOT_PLAN_MODEL", "gpt-4o"), temperature=0.1, timeout=60)
            steps = _parse_steps_from_text(second) if second else None

            # 2) Якщо все ще немає, передаємо Copilot готовий масив кроків і просимо повернути його як є
            if steps is None or len(steps) <= 1:
                app_steps = [f"Open {a}" for a in apps]
                strict_prompt = f'Return ONLY JSON array of step strings to open these apps in order, no text: {json.dumps(app_steps, ensure_ascii=False)}'
                strict_res = call_copilot(strict_prompt, model=os.getenv("COPILOT_PLAN_MODEL", "gpt-4o"), temperature=0.0, timeout=60)
                steps = _parse_steps_from_text(strict_res) if strict_res else None

    return steps if steps else None


def generate_code_with_copilot(step: str, rag_text: str) -> Optional[str]:
    """
    Виклик Copilot для генерації AppleScript з урахуванням RAG прикладів.
    """
    prompt = f"""
Ти — macOS automation інженер. Згенеруй AppleScript для кроку:
КРОК: \"{step}\"

Приклади з бази (можеш використати структури):
{rag_text[:4000]}

Вимоги:
- Тільки AppleScript код у ```applescript``` без пояснень.
- Дбайливо використовуй System Events / Google Chrome / Safari / Finder залежно від кроку.
"""
    result = call_copilot(prompt, model=os.getenv("COPILOT_CODE_MODEL", "gpt-4o"), temperature=0.2, timeout=90)
    if not result:
        return None
    # Витягнути блок applescript
    block = re.findall(r"```applescript\n(.*?)```", result, re.DOTALL)
    if block:
        return block[0].strip()
    if result and result.strip().lower().startswith("tell "):
        return result.strip()
    return None


def fallback_applescript(step: str) -> str:
    """
    Простий генератор AppleScript, якщо Copilot недоступний.
    Намагається відкрити/активувати зазначений застосунок.
    """
    import re

    # Шукаємо назву застосунку після "open"/"launch" або беремо останнє слово з великої
    app_name = None
    m = re.search(r"(open|launch)\s+([A-Za-z0-9 ._-]+)", step, re.IGNORECASE)
    if m:
        app_name = m.group(2).strip()
    else:
        # heuristic: слова з великої літери
        candidates = re.findall(r"\b([A-Z][A-Za-z0-9 ._-]+)\b", step)
        if candidates:
            app_name = candidates[-1].strip()
    if not app_name:
        app_name = "Calculator"

    return f'''tell application "{app_name}"
    activate
end tell'''


def vision_verify_with_copilot(step: str, screenshot_path: str) -> Optional[bool]:
    """
    Верифікація скріншоту через Copilot-vision (gpt-4o). Передаємо base64 (обрізаний) у промпт.
    """
    try:
        with open(screenshot_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        b64_short = b64[:50000]  # обмеження розміру
    except Exception:
        return None

    prompt = f"""
Ти перевіряєш виконання кроку macOS. Є скріншот у base64 нижче.
КРОК: \"{step}\"
Визнач, чи крок виконано. Відповідь: "yes" або "no".

SCREENSHOT_BASE64:
{b64_short}
"""
    result = call_copilot(prompt, model=os.getenv("COPILOT_VISION_MODEL", "gpt-4o"), temperature=0, timeout=90)
    if not result:
        return None
    text = result.strip().lower()
    if "yes" in text and "no" not in text:
        return True
    if "no" in text and "yes" not in text:
        return False
    return None

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
    # Try PyTorch + MPS for GPU acceleration on M1 Max
    USE_MPS_TETYANA = os.getenv("USE_MPS", "1") in ("1", "true", "yes")
    embeddings = None
    
    if USE_MPS_TETYANA:
        try:
            import torch
            from sentence_transformers import SentenceTransformer
            
            if torch.backends.mps.is_available():
                device = "mps"
                st_model = SentenceTransformer("BAAI/bge-m3", device=device)
                
                # Wrapper function for Chroma compatibility
                def mps_embed_fn(texts):
                    return st_model.encode(texts, convert_to_tensor=False).tolist()
                
                embeddings = mps_embed_fn
                console.print("[green]✅ PyTorch MPS available — using GPU acceleration on M1 Max[/green]")
                console.print("[green]✅ Embedding dimension: 1024 (model: BAAI/bge-m3, MPS (GPU))[/green]")
            else:
                raise Exception("MPS not available")
        except Exception as mps_err:
            console.print(f"[yellow]⚠️ MPS failed: {mps_err}. Falling back to HuggingFace.[/yellow]")
            embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    else:
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
    """Додати успішне рішення в RAG (self-healing з MPS GPU acceleration)"""
    try:
        # Import RAG Control Agent for self-healing with MPS
        from rag_control_agent import RAGControlAgent
        
        agent = RAGControlAgent(use_mps=True)
        result = agent.add_to_rag(task, code, status)
        
        if result.get("status") == "success":
            console.print(f"[green]✅ Self-healing: {result.get('message')}[/green]")
        else:
            console.print(f"[yellow]⚠️ Self-healing failed: {result.get('message')}[/yellow]")
    except Exception as e:
        console.print(f"[yellow]⚠️ Self-healing error: {e}[/yellow]")


# ============================================================================
# VISION TOOLS
# ============================================================================

def take_screenshot() -> str:
    """Зробити скріншот"""
    # Дозвіл на вимкнення Vision через ENV (для headless CLI)
    if os.getenv("VISION_DISABLE") in ("1", "true", "yes"):
        return ""
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
    
    # Розбиття на кроки (серії однорідних дій) через Copilot
    console.print("[bold magenta]🤖 Розбиття на кроки...[/bold magenta]")
    steps = plan_with_copilot(state['task']) or [state['task']]
    
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
    
    # Якщо є RAG — використовуємо Copilot з контекстом; якщо ні — fallback
    code_from_llm = None
    if rag_results:
        console.print("[dim]✓ Знайдено рішення в RAG[/dim]")
        code_from_llm = generate_code_with_copilot(state['current_step'], rag_results)
    else:
        console.print("[yellow]⚠️ RAG не знайшов рішення, генеруємо з нуля[/yellow]")
        code_from_llm = generate_code_with_copilot(state['current_step'], "")

    if code_from_llm:
        state['current_code'] = code_from_llm
    else:
        # fallback: згенерувати простий AppleScript для відкриття/активації app
        state['current_code'] = fallback_applescript(state['current_step'])
    
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
    """Node 4: Vision перевірка результату"""
    # Якщо вимкнено через ENV, пропускаємо vision
    if os.getenv("VISION_DISABLE") in ("1", "true", "yes"):
        console.print("[yellow]⚠️ Vision вимкнено (VISION_DISABLE=1)[/yellow]")
        return state

    screenshot = take_screenshot()
    if screenshot:
        state['screenshot_path'] = screenshot
        console.print(f"[dim]📸 Скріншот: {screenshot}[/dim]")

        # Верифікація через Copilot-vision (On-Demand)
        verify = vision_verify_with_copilot(state['current_step'], screenshot)
        if verify is False:
            state['error'] = "Vision check failed"
        elif verify is True:
            state['error'] = None
    
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
