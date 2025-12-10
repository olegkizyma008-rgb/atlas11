# index_rag.py
from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from pathlib import Path

# Define paths relative to project root
script_dir = Path(__file__).parent.parent
KB_PATH = str(script_dir / "rag" / "macOS-automation-knowledge-base")
DB_PATH = str(script_dir / "rag" / "chroma_mac")

def main():
    print(f"Loading documents from {KB_PATH}...")
    loader = DirectoryLoader(KB_PATH, glob="**/*.md")
    docs = loader.load()
    
    if not docs:
        print("No documents found. Please ensure the knowledge base is populated.")
        return

    print(f"Splitting {len(docs)} documents...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = splitter.split_documents(docs)

    print("Initializing embeddings (BAAI/bge-m3)...")
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    
    print("Creating/Updating Vector Store...")
    # Chroma 0.4+ automatically persists if persist_directory is set
    db = Chroma.from_documents(texts, embeddings, persist_directory=DB_PATH)
    
    print(f"Successfully indexed {len(texts)} chunks to {DB_PATH}")

if __name__ == "__main__":
    main()
