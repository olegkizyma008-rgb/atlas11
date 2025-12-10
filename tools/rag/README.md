# RAG Indexer (tools/rag)

This folder contains a minimal example script for indexing local knowledge into a vector store.

index_rag.py is intentionally lightweight — it performs a dry-run by default and includes an optional `--run` mode.

How to use:

1. Create a folder with knowledge files (markdown, text, html) e.g. `tools/rag/knowledge/`.
2. Create a Python venv and install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install chromadb langchain python-dotenv
```

3. Run a dry-run:

```bash
python3 tools/rag/index_rag.py --source ./tools/rag/knowledge --chroma-dir ./tools/rag/chroma_store
```

4. Run an indexing pass (after installing embeddings backend):

```bash
python3 tools/rag/index_rag.py --source ./tools/rag/knowledge --chroma-dir ./tools/rag/chroma_store --run
```

This example is meant as a starting point — refine embeddings, chunking and metadata for production.
