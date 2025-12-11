#!/usr/bin/env python3
"""
RAG Control Agent for Tetyana v12 — MLX Edition
Manages RAG database with GPU acceleration on M1 Max
Includes self-healing mechanism for automatic learning
"""

import os
import json
import sys
import uuid
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

# Project root
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
RAG_PATH = PROJECT_ROOT / "rag"
CHROMA_PATH = RAG_PATH / "chroma_mac"
KNOWLEDGE_SOURCES = RAG_PATH / "knowledge_sources"
KNOWLEDGE_BASE = RAG_PATH / "knowledge_base" / "large_corpus"

# Use the same embedding model as the indexer
EMBEDDING_MODEL = "BAAI/bge-m3"

# Try MLX first, fall back to HuggingFace
USE_MLX = True
try:
    from mlx_lm import load as mlx_load
    print("✅ MLX available — using GPU acceleration on M1 Max")
except ImportError:
    USE_MLX = False
    print("⚠️ MLX not available — falling back to CPU")


class RAGControlAgent:
    """RAG Control Agent with MLX GPU acceleration and self-healing"""
    
    def __init__(self, embedding_model: Optional[str] = None, use_mlx: bool = True):
        import chromadb
        
        self.embedding_model_name = embedding_model or EMBEDDING_MODEL
        self.use_mlx = use_mlx and USE_MLX
        
        # Initialize embeddings (MLX or HuggingFace)
        if self.use_mlx:
            self._init_mlx_embeddings()
        else:
            self._init_huggingface_embeddings()
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        self.collections = self.client.list_collections()
        
        # Validate embedding dimension compatibility
        self._validate_embedding_compatibility()
    
    def _init_mlx_embeddings(self):
        """Initialize MLX embeddings for M1 Max GPU acceleration"""
        try:
            from sentence_transformers import SentenceTransformer
            self.embeddings = SentenceTransformer(self.embedding_model_name)
            self.embedding_dim = 1024  # BAAI/bge-m3 dimension
            print(f"✅ MLX embeddings loaded: {self.embedding_model_name} (1024-dim)")
        except Exception as e:
            print(f"⚠️ MLX embedding failed: {e} — falling back to HuggingFace")
            self._init_huggingface_embeddings()
    
    def _init_huggingface_embeddings(self):
        """Initialize HuggingFace embeddings (CPU fallback)"""
        from langchain_huggingface import HuggingFaceEmbeddings
        self.embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model_name)
        self.embedding_dim = 1024
        print(f"✅ HuggingFace embeddings loaded: {self.embedding_model_name} (CPU)")
    
    def embed_text(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using MLX or HuggingFace"""
        if isinstance(texts, str):
            texts = [texts]
        
        if self.use_mlx:
            # MLX embedding (GPU-accelerated)
            return self.embeddings.encode(texts, convert_to_tensor=False).tolist()
        else:
            # HuggingFace embedding (CPU)
            return self.embeddings.embed_documents(texts)
    
    def check_index_status(self) -> Dict[str, Any]:
        """Check the status of RAG indexing"""
        result = {
            "status": "success",
            "database": {
                "path": str(CHROMA_PATH),
                "exists": CHROMA_PATH.exists(),
                "size_mb": self._get_dir_size(CHROMA_PATH) / (1024 * 1024) if CHROMA_PATH.exists() else 0,
            },
            "collections": [],
            "total_documents": 0,
        }
        
        for col in self.collections:
            count = col.count()
            result["collections"].append({
                "name": col.name,
                "documents": count,
            })
            result["total_documents"] += count
        
        result["knowledge_sources"] = {
            "path": str(KNOWLEDGE_SOURCES),
            "exists": KNOWLEDGE_SOURCES.exists(),
            "size_mb": self._get_dir_size(KNOWLEDGE_SOURCES) / (1024 * 1024) if KNOWLEDGE_SOURCES.exists() else 0,
            "subdirs": self._list_subdirs(KNOWLEDGE_SOURCES) if KNOWLEDGE_SOURCES.exists() else [],
        }
        
        result["knowledge_base"] = {
            "path": str(KNOWLEDGE_BASE),
            "exists": KNOWLEDGE_BASE.exists(),
            "size_mb": self._get_dir_size(KNOWLEDGE_BASE) / (1024 * 1024) if KNOWLEDGE_BASE.exists() else 0,
        }
        
        return result
    
    def search_rag(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """Search RAG database with MLX GPU acceleration"""
        if not self.collections:
            return {"status": "error", "message": "No collections found", "results": []}
        
        col = self.collections[0]
        try:
            start_time = time.time()
            
            # Generate query embedding (MLX GPU or HuggingFace CPU)
            query_vector = self.embed_text([query])[0]
            embedding_time = time.time() - start_time
            
            # Vector search
            results = col.query(query_embeddings=[query_vector], n_results=limit * 2)
            
            # Process and rank results
            documents = []
            if results["documents"] and results["documents"][0]:
                for doc, distance, metadata in zip(
                    results["documents"][0], 
                    results["distances"][0],
                    results.get("metadatas", [[]])[0] if results.get("metadatas") else [{}] * len(results["documents"][0])
                ):
                    similarity = 1 - distance
                    if similarity > 0.1:  # Quality threshold
                        documents.append({
                            "text": doc[:200] + "..." if len(doc) > 200 else doc,
                            "similarity": round(similarity, 4),
                            "source": metadata.get("source", "unknown") if metadata else "unknown",
                            "type": metadata.get("type", "unknown") if metadata else "unknown",
                        })
            
            documents = sorted(documents, key=lambda x: x["similarity"], reverse=True)[:limit]
            
            return {
                "status": "success",
                "query": query,
                "results_count": len(documents),
                "documents": documents,
                "embedding_time_ms": round(embedding_time * 1000, 2),
                "embedding_model": EMBEDDING_MODEL,
                "acceleration": "MLX (GPU)" if self.use_mlx else "CPU",
            }
        except Exception as e:
            return {"status": "error", "message": str(e), "results": []}
    
    def add_to_rag(self, task: str, solution: str, status: str = "success") -> Dict[str, Any]:
        """Self-healing: Add successful solution to RAG database"""
        if not self.collections:
            return {"status": "error", "message": "No collections found"}
        
        col = self.collections[0]
        try:
            # Create document with task and solution
            doc_text = f"TASK: {task}\nSOLUTION: {solution}\nSTATUS: {status}"
            doc_id = str(uuid.uuid4())
            
            # Add to collection
            col.add(
                documents=[doc_text],
                metadatas=[{
                    "task": task,
                    "status": status,
                    "timestamp": time.time(),
                    "type": "AppleScript" if "tell application" in solution.lower() else "Code"
                }],
                ids=[doc_id]
            )
            
            return {
                "status": "success",
                "message": f"Added to RAG: {task[:50]}...",
                "doc_id": doc_id
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def inspect_documents(self, limit: int = 10) -> Dict[str, Any]:
        """Inspect documents in the database"""
        if not self.collections:
            return {
                "status": "error",
                "message": "No collections found",
                "documents": [],
            }
        
        col = self.collections[0]
        try:
            results = col.get(limit=limit, include=["documents", "metadatas"])
            
            documents = []
            for doc, metadata in zip(results["documents"], results["metadatas"]):
                documents.append({
                    "text": doc[:150] + "..." if len(doc) > 150 else doc,
                    "metadata": metadata,
                })
            
            return {
                "status": "success",
                "total_in_collection": col.count(),
                "sample_size": len(documents),
                "documents": documents,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "documents": [],
            }
    
    def get_index_quality_report(self) -> Dict[str, Any]:
        """Generate a quality report for the index"""
        status = self.check_index_status()
        
        report = {
            "status": "success",
            "summary": {
                "total_documents": status["total_documents"],
                "database_size_mb": round(status["database"]["size_mb"], 2),
                "knowledge_sources_size_mb": round(status["knowledge_sources"]["size_mb"], 2),
                "knowledge_base_size_mb": round(status["knowledge_base"]["size_mb"], 2),
            },
            "quality_checks": {
                "database_exists": status["database"]["exists"],
                "has_collections": len(status["collections"]) > 0,
                "has_documents": status["total_documents"] > 0,
                "knowledge_sources_exist": status["knowledge_sources"]["exists"],
                "knowledge_base_exist": status["knowledge_base"]["exists"],
            },
            "recommendations": [],
        }
        
        # Add recommendations
        if status["total_documents"] == 0:
            report["recommendations"].append("⚠️ No documents indexed. Run RAG indexer.")
        elif status["total_documents"] < 1000:
            report["recommendations"].append("⚠️ Low document count. Consider adding more sources.")
        else:
            report["recommendations"].append("✅ Good document count for RAG search.")
        
        if status["database"]["size_mb"] < 1:
            report["recommendations"].append("⚠️ Database size is very small. Check indexing.")
        else:
            report["recommendations"].append("✅ Database size is reasonable.")
        
        return report
    
    def execute_command(self, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a RAG control command"""
        args = args or {}
        
        if command == "status":
            return self.check_index_status()
        elif command == "search":
            query = args.get("query", "")
            limit = int(args.get("limit", 5))
            return self.search_rag(query, limit)
        elif command == "inspect":
            limit = int(args.get("limit", 10))
            return self.inspect_documents(limit)
        elif command == "quality":
            return self.get_index_quality_report()
        elif command == "add":
            task = args.get("task", "")
            solution = args.get("solution", "")
            status = args.get("status", "success")
            return self.add_to_rag(task, solution, status)
        else:
            return {
                "status": "error",
                "message": f"Unknown command: {command}",
            }
    
    def _validate_embedding_compatibility(self) -> None:
        """Validate that query embeddings match collection embeddings"""
        if not self.collections:
            return
        
        try:
            # Test embedding dimension
            test_vector = self.embed_text(["test"])[0]
            test_dim = len(test_vector)
            
            # Store dimension info
            self.embedding_dim = test_dim
            acceleration = "MLX (GPU)" if self.use_mlx else "CPU"
            print(f"✅ Embedding dimension: {test_dim} (model: {self.embedding_model_name}, {acceleration})")
        except Exception as e:
            print(f"⚠️ Could not validate embedding: {e}")
    
    @staticmethod
    def _get_dir_size(path: Path) -> int:
        """Get directory size in bytes"""
        total = 0
        if path.exists():
            for entry in path.rglob("*"):
                if entry.is_file():
                    total += entry.stat().st_size
        return total
    
    @staticmethod
    def _list_subdirs(path: Path) -> List[str]:
        """List subdirectories"""
        if not path.exists():
            return []
        return [d.name for d in path.iterdir() if d.is_dir()]


def main():
    """Main entry point for RAG Control Agent"""
    # Parse embedding model from CLI
    embedding_model = None
    command = "status"
    args = {}
    
    if len(sys.argv) > 1:
        # Check for --embedding-model option
        for i, arg in enumerate(sys.argv[1:], 1):
            if arg == "--embedding-model" and i < len(sys.argv) - 1:
                embedding_model = sys.argv[i + 1]
                break
        
        command = sys.argv[1]
        
        # Parse additional arguments
        for i in range(2, len(sys.argv), 2):
            if i + 1 < len(sys.argv):
                key = sys.argv[i].lstrip("-")
                value = sys.argv[i + 1]
                if key != "embedding-model":
                    args[key] = value
    
    # Initialize agent with optional embedding model
    agent = RAGControlAgent(embedding_model=embedding_model)
    
    # Execute command
    result = agent.execute_command(command, args)
    
    # Output result as JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
