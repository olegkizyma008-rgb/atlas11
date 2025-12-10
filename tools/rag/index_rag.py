#!/usr/bin/env python3
"""
Minimal RAG indexing helper (example)

This script is intentionally small and dependency-light so it can be used
as a starting point for building a fuller indexer. It performs a dry-run
if required libraries are missing and prints clear instructions for next steps.

Intended usage:
  python3 tools/rag/index_rag.py --source ./knowledge --chroma-dir ./chroma_store

Note: Production-grade behavior (embedding, vector DB, LangChain) should be
implemented by adding dependencies such as chromadb, langchain and a
pluggable embedder (OpenAI / local encoder / etc).
"""

from __future__ import annotations

import argparse
import os
import sys


def dry_run(source_dir: str, chroma_dir: str) -> None:
    print("DRY RUN: index_rag.py")
    print("Source directory:", source_dir)
    print("Chroma (target) directory:", chroma_dir)

    if not os.path.exists(source_dir):
        print("  Warning: source directory not found. Create it and add docs to index.")
    else:
        count = 0
        for root, _, files in os.walk(source_dir):
            for f in files:
                if f.lower().endswith(('.md', '.txt', '.pdf', '.html')):
                    count += 1
        print(f"  Detected {count} candidate files to index")

    if not os.path.exists(chroma_dir):
        print("  Chroma store does not exist — it will be created on the first run")


def main() -> int:
    parser = argparse.ArgumentParser(prog="index_rag", description="Minimal RAG indexing helper")
    parser.add_argument("--source", default="./knowledge", help="Path to local knowledge files to index")
    parser.add_argument("--chroma-dir", default="./chroma_store", help="Destination vector DB directory")
    parser.add_argument("--run", action="store_true", help="Perform a real indexing run (requires dependencies)")
    args = parser.parse_args()

    # quick dry-run
    dry_run(args.source, args.chroma_dir)

    if not args.run:
        print("\nTo perform indexing, run with --run after installing required packages:")
        print("  python3 -m pip install chromadb langchain python-dotenv")
        print("Then re-run: python3 tools/rag/index_rag.py --source ./knowledge --chroma-dir ./chroma_store --run")
        return 0

    # Try to do a minimal indexed run using chromadb (if available)
    try:
        import chromadb
        from chromadb.utils import embedding_functions
    except Exception as e:
        print("Required runtime packages not found or failed to import:", e)
        print("Install chromadb + embedding backend (see README).")
        return 2

    print("Starting indexing run — this is a minimal example, adapt for your environment.")

    # NOTE: This example does not perform embeddings itself, which usually require
    # an embedding model (OpenAI, HuggingFace, etc). For a production setup
    # implement an embedding function and pass it to the Chroma client.

    client = chromadb.Client()
    print("Connected to chromadb client (default configuration)")

    # Very small example: create a collection and store small docs as-is
    col = client.create_collection(name="atlas_knowledge")

    docs = []
    metadatas = []
    ids = []

    for root, _, files in os.walk(args.source):
        for f in files:
            p = os.path.join(root, f)
            if f.lower().endswith(('.md', '.txt', '.html')):
                try:
                    with open(p, 'r', encoding='utf-8') as fh:
                        txt = fh.read()
                except Exception:
                    txt = f"<unable to read {p}>"
                docs.append(txt[:10000])
                metadatas.append({"source": p})
                ids.append(os.path.relpath(p, args.source))

    if not docs:
        print("No documents found to index — exiting")
        return 0

    print(f"Indexing {len(docs)} documents...")
    try:
        col.add(ids=ids, documents=docs, metadatas=metadatas)
        print("Indexing complete — check your Chroma store and adapt embeddings for production.")
    except Exception as e:
        print("Indexing failed:", e)
        return 3

    return 0


if __name__ == '__main__':
    sys.exit(main())
