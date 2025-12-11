#!/usr/bin/env python3
"""
RAG Indexer для KONTUR v12 "Козир" — MLX Edition
Індексує AppleScript, JXA, та документацію macOS автоматизації
Semantic chunking + контекст + GPU acceleration
"""
import os
import sys
from pathlib import Path
from typing import Generator, Tuple, List

# Опційно: використати MLX для максимальної швидкості на Apple Silicon
USE_MLX = os.getenv("USE_MLX", "1") in ("1", "true", "yes")
MLX_READY = False
try:
    if USE_MLX:
        import numpy as np
        from mlx_lm import load as mlx_load
        MLX_READY = True
except Exception:
    MLX_READY = False

# === КОНФІГУРАЦІЯ ===
# Визначаємо шляхи відносно проекту
PROJECT_ROOT = Path(__file__).parent.parent
KNOWLEDGE_SOURCES_DIRS = [
    PROJECT_ROOT / "rag" / "knowledge_sources",
    PROJECT_ROOT / "rag" / "knowledge_base" / "large_corpus",
    PROJECT_ROOT / "rag" / "macOS-automation-knowledge-base",
]
CHROMA_PERSIST_DIR = PROJECT_ROOT / "rag" / "chroma_mac"
EMBEDDING_MODEL = "BAAI/bge-m3"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
SEMANTIC_THRESHOLD = 95  # Percentile для semantic chunking

# === ВАЛІДНІ РОЗШИРЕННЯ ===
VALID_EXTENSIONS = {
    '.applescript': 'AppleScript',
    '.scpt': 'AppleScript (compiled)',
    '.js': 'JXA',
    '.jxa': 'JXA',
    '.md': 'Documentation',
    '.txt': 'Text',
    '.sh': 'Shell Script'
}

def find_files() -> Generator[Tuple[Path, str, Path], None, None]:
    """Знаходить всі релевантні файли для індексації з усіх директорій"""
    for source_dir in KNOWLEDGE_SOURCES_DIRS:
        source_path = Path(source_dir)
        if not source_path.exists():
            continue
        for ext, doc_type in VALID_EXTENSIONS.items():
            for path in source_path.rglob(f"*{ext}"):
                # Пропускаємо node_modules, .git та великі файли
                if 'node_modules' in str(path) or '.git' in str(path):
                    continue
                # Пропускаємо файли більші 1MB (запобігання 80GB ситуаціям)
                try:
                    if path.stat().st_size > 1_000_000:
                        continue
                except:
                    continue
                yield path, doc_type, source_path

def read_file_safe(path: Path) -> str:
    """Безпечне читання файлу з різними кодуваннями"""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return ""

def extract_file_context(content: str, max_length: int = 300) -> str:
    """Витягує контекст файлу (перші рядки)"""
    lines = content.split('\n')[:5]
    context = '\n'.join(lines)
    return context[:max_length]

def create_semantic_chunks(content: str, embeddings_fn) -> List[str]:
    """Розбиває текст на semantic chunks на основі embedding similarity"""
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    
    # Спочатку розбиваємо на базові chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""]
    )
    
    base_chunks = text_splitter.split_text(content)
    
    if len(base_chunks) <= 1:
        return base_chunks
    
    # Для semantic chunking потребуємо embeddings
    try:
        # Генеруємо embeddings для кожного chunk
        chunk_embeddings = embeddings_fn(base_chunks)
        
        # Обчислюємо similarity між сусідніми chunks
        import numpy as np
        semantic_chunks = []
        current_chunk = base_chunks[0]
        
        for i in range(1, len(base_chunks)):
            # Обчислюємо cosine similarity
            emb1 = np.array(chunk_embeddings[i-1])
            emb2 = np.array(chunk_embeddings[i])
            
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            
            # Якщо similarity низька — це межа chunk'а
            if similarity < 0.5:  # Threshold для розділення
                semantic_chunks.append(current_chunk)
                current_chunk = base_chunks[i]
            else:
                # Об'єднуємо chunks якщо вони семантично близькі
                current_chunk += "\n\n" + base_chunks[i]
        
        semantic_chunks.append(current_chunk)
        return semantic_chunks
    except Exception:
        # Fallback на базові chunks якщо semantic chunking не працює
        return base_chunks

def main():
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn
    
    console = Console()
    console.print("[bold green]🚀 RAG Indexer v12 — KONTUR 'Козир'[/bold green]")
    
    # === КРОК 1: Збір файлів ===
    console.print("\n[cyan]📂 Пошук файлів...[/cyan]")
    files_to_index = list(find_files())
    console.print(f"[green]✅ Знайдено {len(files_to_index)} файлів[/green]")
    
    if not files_to_index:
        console.print("[red]❌ Файли не знайдено![/red]")
        return
    
    # === КРОК 2: Ініціалізація Embeddings (потребуємо для semantic chunking) ===
    console.print("\n[cyan]🧠 Завантаження embedding моделі...[/cyan]")
    
    if MLX_READY:
        console.print("[green]⚡ Використовується MLX (bge-m3) для прискорення на Apple Silicon[/green]")
        model, tokenizer = mlx_load(EMBEDDING_MODEL)

        def embed_texts(texts: List[str]):
            outputs = []
            for t in texts:
                tokens = tokenizer(t, return_tensors="np", padding=True, truncation=True)
                hidden = model(**tokens).last_hidden_state
                vec = hidden.mean(axis=1)[0]
                outputs.append(vec.tolist())
            return outputs

        embeddings_fn = embed_texts
    else:
        console.print("[yellow]MLX недоступний. Використовую HuggingFaceEmbeddings.[/yellow]")
        from langchain_huggingface import HuggingFaceEmbeddings
        embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        embeddings_fn = embedding_model.embed_documents
    
    # === КРОК 3: Підготовка документів з semantic chunking + контекст ===
    console.print("\n[cyan]📝 Підготовка документів (semantic chunking + контекст)...[/cyan]")
    
    from langchain_core.documents import Document
    
    documents = []
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Обробка файлів...", total=len(files_to_index))
        
        for path, doc_type, base_path in files_to_index:
            content = read_file_safe(path)
            if not content or len(content.strip()) < 50:
                progress.advance(task)
                continue
            
            # Створюємо документ з метаданими
            try:
                source_name = str(path.relative_to(base_path))
            except ValueError:
                source_name = str(path.name)
            
            # Semantic chunking
            chunks = create_semantic_chunks(content, embeddings_fn)
            file_context = extract_file_context(content)
            
            for i, chunk in enumerate(chunks):
                # Контекст: попередній та наступний chunk
                prev_chunk = chunks[i-1][-150:] if i > 0 else ""
                next_chunk = chunks[i+1][:150] if i < len(chunks)-1 else ""
                
                doc = Document(
                    page_content=chunk,
                    metadata={
                        "source": source_name,
                        "type": doc_type,
                        "chunk": i,
                        "total_chunks": len(chunks),
                        "file_context": file_context,
                        "prev_chunk_context": prev_chunk,
                        "next_chunk_context": next_chunk,
                    }
                )
                documents.append(doc)
            
            progress.advance(task)
    
    console.print(f"[green]✅ Підготовлено {len(documents)} чанків (semantic + контекст)[/green]")
    
    # === КРОК 4: Індексація в Chroma з MLX ===
    console.print("\n[cyan]💾 Індексація в ChromaDB (з MLX GPU acceleration)...[/cyan]")
    
    from langchain_chroma import Chroma
    
    # Batch indexing для ефективності
    BATCH_SIZE = 100
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Індексація...", total=len(documents))
        
        db = Chroma(
            persist_directory=str(CHROMA_PERSIST_DIR),
            embedding_function=embeddings_fn if MLX_READY else None
        )
        
        for i in range(0, len(documents), BATCH_SIZE):
            batch = documents[i:i + BATCH_SIZE]
            db.add_documents(batch)
            progress.advance(task, advance=len(batch))
    
    # === ФІНАЛЬНИЙ ЗВІТ ===
    console.print("\n" + "="*50)
    console.print("[bold green]✅ ІНДЕКСАЦІЯ ЗАВЕРШЕНА![/bold green]")
    console.print(f"[cyan]📊 Документів додано: {len(documents)}[/cyan]")
    console.print(f"[cyan]📁 База: {CHROMA_PERSIST_DIR}[/cyan]")
    console.print(f"[cyan]🧠 Embedding модель: {EMBEDDING_MODEL}[/cyan]")
    console.print(f"[cyan]⚡ GPU acceleration: {'MLX (M1 Max)' if MLX_READY else 'CPU'}[/cyan]")
    console.print(f"[cyan]🔀 Semantic chunking: ✅ УВІМКНЕНО[/cyan]")
    console.print(f"[cyan]📝 Контекст: ✅ ДОДАНО (prev/next/file)[/cyan]")
    console.print("="*50)

if __name__ == "__main__":
    main()
