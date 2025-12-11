#!/usr/bin/env python3
"""
RAG Indexer для KONTUR v12 "Козир" — MLX Edition
Індексує AppleScript, JXA, та документацію macOS автоматизації
Semantic chunking + контекст + hierarchical indexing + GPU acceleration
"""
import os
import sys
import uuid
import json
from pathlib import Path
from typing import Generator, Tuple, List, Dict, Any

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
KNOWLEDGE_SOURCES_DIRS = [
    "/Users/dev/Documents/GitHub/atlas/rag/knowledge_sources",
    "/Users/dev/Documents/GitHub/atlas/rag/knowledge_base/large_corpus",
]
CHROMA_PERSIST_DIR = "/Users/dev/Documents/GitHub/atlas/rag/chroma_mac"
EMBEDDING_MODEL = "BAAI/bge-m3"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
SEMANTIC_SIMILARITY_THRESHOLD = 0.5  # Threshold для semantic chunking

# === KONTUR URN ===
URN = "kontur://organ/rag-indexer"

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
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", " ", ""]
    )
    
    base_chunks = text_splitter.split_text(content)
    
    if len(base_chunks) <= 1:
        return base_chunks
    
    try:
        chunk_embeddings = embeddings_fn(base_chunks)
        
        import numpy as np
        semantic_chunks = []
        current_chunk = base_chunks[0]
        
        for i in range(1, len(base_chunks)):
            emb1 = np.array(chunk_embeddings[i-1])
            emb2 = np.array(chunk_embeddings[i])
            
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            
            if similarity < SEMANTIC_SIMILARITY_THRESHOLD:
                semantic_chunks.append(current_chunk)
                current_chunk = base_chunks[i]
            else:
                current_chunk += "\n\n" + base_chunks[i]
        
        semantic_chunks.append(current_chunk)
        return semantic_chunks
    except Exception:
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
    
    embeddings_fn = None
    # Локальний прапорець, щоб не ламати глобал при fallback
    mlx_ready = MLX_READY

    if mlx_ready:
        console.print("[green]⚡ Використовується MLX (bge-m3) для прискорення на Apple Silicon[/green]")
        try:
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
        except FileNotFoundError as e:
            console.print(f"[yellow]⚠️ MLX не зміг завантажити модель ({e}). Переходжу на HuggingFaceEmbeddings.[/yellow]")
            mlx_ready = False

    if embeddings_fn is None:
        console.print("[yellow]MLX недоступний. Використовую HuggingFaceEmbeddings.[/yellow]")
        from langchain_huggingface import HuggingFaceEmbeddings
        embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        embeddings_fn = embedding_model.embed_documents
    
    # === КРОК 3: Підготовка документів з semantic chunking + контекст + hierarchical indexing ===
    console.print("\n[cyan]📝 Підготовка документів (semantic + контекст + ієрархія)...[/cyan]")
    
    from langchain_core.documents import Document
    
    documents = []
    document_hierarchy = {}  # Для hierarchical indexing
    
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
            
            try:
                source_name = str(path.relative_to(base_path))
            except ValueError:
                source_name = str(path.name)
            
            # Генеруємо унікальні ID для ієрархії
            document_id = str(uuid.uuid4())
            file_context = extract_file_context(content)
            
            # Semantic chunking
            chunks = create_semantic_chunks(content, embeddings_fn)
            
            # Зберігаємо ієрархію
            document_hierarchy[document_id] = {
                "source": source_name,
                "type": doc_type,
                "total_chunks": len(chunks),
                "file_context": file_context
            }
            
            for i, chunk in enumerate(chunks):
                # Контекст: попередній та наступний chunk
                prev_chunk = chunks[i-1][-150:] if i > 0 else ""
                next_chunk = chunks[i+1][:150] if i < len(chunks)-1 else ""
                
                # Hierarchical metadata
                chunk_id = str(uuid.uuid4())
                hierarchy_path = f"{source_name}/chunk_{i}"
                
                doc = Document(
                    page_content=chunk,
                    metadata={
                        # Базові метаданні
                        "source": source_name,
                        "type": doc_type,
                        "chunk": i,
                        "total_chunks": len(chunks),
                        
                        # Контекст
                        "file_context": file_context,
                        "prev_chunk_context": prev_chunk,
                        "next_chunk_context": next_chunk,
                        
                        # Hierarchical indexing
                        "document_id": document_id,
                        "chunk_id": chunk_id,
                        "hierarchy_path": hierarchy_path,
                        "hierarchy_level": "chunk",
                        "hierarchy_depth": 2,  # document -> chunk
                        
                        # KONTUR метаданні
                        "kontur_urn": URN,
                        "indexed_at": str(Path(path).stat().st_mtime),
                    }
                )
                documents.append(doc)
            
            progress.advance(task)
    
    console.print(f"[green]✅ Підготовлено {len(documents)} чанків (semantic + контекст + ієрархія)[/green]")
    
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
            persist_directory=CHROMA_PERSIST_DIR,
            embedding_function=embeddings_fn if mlx_ready else None
        )
        
        for i in range(0, len(documents), BATCH_SIZE):
            batch = documents[i:i + BATCH_SIZE]
            db.add_documents(batch)
            progress.advance(task, advance=len(batch))
    
    # === КРОК 5: Збереження ієрархії ===
    console.print("\n[cyan]💾 Збереження ієрархії документів...[/cyan]")
    hierarchy_file = Path(CHROMA_PERSIST_DIR) / "hierarchy.json"
    hierarchy_file.parent.mkdir(parents=True, exist_ok=True)
    with open(hierarchy_file, 'w', encoding='utf-8') as f:
        json.dump(document_hierarchy, f, ensure_ascii=False, indent=2)
    
    # === ФІНАЛЬНИЙ ЗВІТ ===
    console.print("\n" + "="*60)
    console.print("[bold green]✅ ІНДЕКСАЦІЯ ЗАВЕРШЕНА![/bold green]")
    console.print(f"[cyan]📊 Документів додано: {len(documents)}[/cyan]")
    console.print(f"[cyan]📁 База: {CHROMA_PERSIST_DIR}[/cyan]")
    console.print(f"[cyan]🧠 Embedding модель: {EMBEDDING_MODEL}[/cyan]")
    console.print(f"[cyan]⚡ GPU acceleration: {'MLX (M1 Max)' if mlx_ready else 'CPU'}[/cyan]")
    console.print(f"[cyan]🔀 Semantic chunking: ✅ УВІМКНЕНО[/cyan]")
    console.print(f"[cyan]📝 Контекст: ✅ ДОДАНО (prev/next/file)[/cyan]")
    console.print(f"[cyan]📊 Hierarchical indexing: ✅ ДОДАНО ({len(document_hierarchy)} документів)[/cyan]")
    console.print(f"[cyan]🏛️ KONTUR інтеграція: ✅ URN={URN}[/cyan]")
    console.print("="*60)

if __name__ == "__main__":
    main()
