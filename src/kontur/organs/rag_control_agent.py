#!/usr/bin/env python3
"""
RAG Control Agent for Tetyana v12
Manages RAG database, indexing, and knowledge base operations
"""

import os
import json
import sys
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


class RAGControlAgent:
    """RAG Control Agent with tools for database management"""
    
    def __init__(self, embedding_model: Optional[str] = None):
        # Initialize with LangChain Chroma for consistency with indexer
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_chroma import Chroma
        
        self.embedding_model_name = embedding_model or EMBEDDING_MODEL
        self.embeddings = HuggingFaceEmbeddings(model_name=self.embedding_model_name)
        self.db = Chroma(
            persist_directory=str(CHROMA_PATH),
            embedding_function=self.embeddings
        )
        
        # Also keep ChromaDB client for metadata operations
        import chromadb
        self.client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        self.collections = self.client.list_collections()
        
        # Validate embedding dimension compatibility
        self._validate_embedding_compatibility()
    
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
        """Search the RAG database with proper embedding"""
        if not self.collections:
            return {
                "status": "error",
                "message": "No collections found",
                "results": [],
            }
        
        col = self.collections[0]
        try:
            # Generate query embedding using the same model as indexer
            import time
            start_time = time.time()
            query_vector = self.embeddings.embed_documents([query])[0]
            embedding_time = time.time() - start_time
            
            # Use vector query instead of text query
            results = col.query(query_embeddings=[query_vector], n_results=limit)
            
            documents = []
            if results["documents"] and results["documents"][0]:
                for doc, distance in zip(results["documents"][0], results["distances"][0]):
                    documents.append({
                        "text": doc[:200] + "..." if len(doc) > 200 else doc,
                        "similarity": 1 - distance,  # Convert distance to similarity
                    })
            
            return {
                "status": "success",
                "query": query,
                "results_count": len(documents),
                "documents": documents,
                "embedding_time_ms": round(embedding_time * 1000, 2),
                "embedding_model": EMBEDDING_MODEL,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "embedding_model": EMBEDDING_MODEL,
            }
    
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
        else:
            return {
                "status": "error",
                "message": f"Unknown command: {command}",
            }
    
    def _validate_embedding_compatibility(self) -> None:
        """Validate that query embeddings match collection embeddings"""
        if not self.collections:
            return
        
        col = self.collections[0]
        try:
            # Test embedding dimension
            test_vector = self.embeddings.embed_documents(["test"])[0]
            test_dim = len(test_vector)
            
            # Store dimension info
            self.embedding_dim = test_dim
            print(f"✅ Embedding dimension: {test_dim} (model: {self.embedding_model_name})")
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
