"""
Vector Store Module
ChromaDB integration for semantic similarity search and pattern learning
"""

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError as e:
    CHROMADB_AVAILABLE = False
    print(f"⚠️  ChromaDB not available: {e}. Vector store will use fallback mode.")

from typing import List, Dict, Optional, Tuple
import logging
import numpy as np
from datetime import datetime, timezone
import hashlib

logger = logging.getLogger(__name__)

# ChromaDB persistent directory
CHROMADB_DIR = "/app/data/chromadb"


class VectorStore:
    """
    Vector database for semantic similarity search
    Used for scam pattern matching and learning
    """
    
    def __init__(self):
        """Initialize ChromaDB client and collections"""
        self.enabled = CHROMADB_AVAILABLE
        
        if not self.enabled:
            logger.warning("⚠️  Vector store running in fallback mode - ChromaDB unavailable")
            self.client = None
            self.scam_patterns_collection = None
            self.image_signatures_collection = None
            return
            
        try:
            # Create persistent ChromaDB client
            self.client = chromadb.PersistentClient(
                path=CHROMADB_DIR,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Create/get collections
            self.scam_patterns_collection = self.client.get_or_create_collection(
                name="scam_patterns",
                metadata={"description": "Verified scam text patterns with embeddings"}
            )
            
            self.image_signatures_collection = self.client.get_or_create_collection(
                name="image_signatures",
                metadata={"description": "Known AI-generated image embeddings"}
            )
            
            logger.info(f"✅ ChromaDB initialized with {self.scam_patterns_collection.count()} scam patterns")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            self.client = None
    
    def add_scam_pattern(
        self,
        text: str,
        embedding: np.ndarray,
        scam_type: str,
        severity: str = "medium",
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Add a verified scam pattern to vector store
        
        Args:
            text: Scam text content
            embedding: Text embedding vector (384-dim)
            scam_type: Type of scam
            severity: Risk severity (low/medium/high)
            metadata: Additional metadata
            
        Returns:
            Success status
        """
        try:
            if self.client is None:
                logger.error("ChromaDB not initialized")
                return False
            
            # Generate unique ID from content hash
            content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
            
            # Prepare metadata
            meta = {
                "scam_type": scam_type,
                "severity": severity,
                "added_at": datetime.now(timezone.utc).isoformat(),
                "text_length": len(text)
            }
            
            if metadata:
                meta.update(metadata)
            
            # Add to collection
            self.scam_patterns_collection.add(
                ids=[content_hash],
                embeddings=[embedding.tolist()],
                documents=[text],
                metadatas=[meta]
            )
            
            logger.info(f"✅ Added scam pattern to vector store: {scam_type} ({content_hash})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add scam pattern: {str(e)}")
            return False
    
    def search_similar_scams(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        min_similarity: float = 0.7
    ) -> List[Dict]:
        """
        Search for similar scam patterns using semantic similarity
        
        Args:
            query_embedding: Query text embedding (384-dim)
            top_k: Number of results to return
            min_similarity: Minimum cosine similarity threshold (0-1)
            
        Returns:
            List of matching patterns with metadata and similarity scores
        """
        try:
            if self.client is None:
                logger.error("ChromaDB not initialized")
                return []
            
            # Query collection
            results = self.scam_patterns_collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            matches = []
            
            if results and results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    # ChromaDB returns squared euclidean distance
                    # Convert to cosine similarity: similarity = 1 - (distance / 2)
                    distance = results['distances'][0][i]
                    similarity = max(0, 1 - (distance / 2))
                    
                    # Filter by minimum similarity
                    if similarity >= min_similarity:
                        matches.append({
                            'pattern_id': results['ids'][0][i],
                            'text': results['documents'][0][i],
                            'similarity': round(similarity, 3),
                            'metadata': results['metadatas'][0][i]
                        })
            
            logger.info(f"Found {len(matches)} similar scam patterns (min similarity: {min_similarity})")
            return matches
            
        except Exception as e:
            logger.error(f"Similar scam search error: {str(e)}")
            return []
    
    def search_by_text(
        self,
        query_text: str,
        embedding_model,
        top_k: int = 5,
        min_similarity: float = 0.7
    ) -> List[Dict]:
        """
        Search similar scams using raw text (auto-generates embedding)
        
        Args:
            query_text: Query text
            embedding_model: Model to generate embeddings
            top_k: Number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of matching patterns
        """
        if not self.enabled:
            return []
            
        try:
            # Generate embedding for query
            query_embedding = embedding_model.encode_single(query_text)
            
            # Search using embedding
            return self.search_similar_scams(query_embedding, top_k, min_similarity)
            
        except Exception as e:
            logger.error(f"Text search error: {str(e)}")
            return []
    
    def add_image_signature(
        self,
        image_embedding: np.ndarray,
        source: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Add known AI-generated image signature
        
        Args:
            image_embedding: Image embedding (CLIP or similar)
            source: Source of image (e.g., "stable_diffusion", "midjourney")
            metadata: Additional metadata
            
        Returns:
            Success status
        """
        try:
            if self.client is None:
                return False
            
            # Generate ID
            signature_id = hashlib.sha256(image_embedding.tobytes()).hexdigest()[:16]
            
            # Prepare metadata
            meta = {
                "source": source,
                "added_at": datetime.now(timezone.utc).isoformat()
            }
            
            if metadata:
                meta.update(metadata)
            
            # Add to collection
            self.image_signatures_collection.add(
                ids=[signature_id],
                embeddings=[image_embedding.tolist()],
                documents=[f"AI image from {source}"],
                metadatas=[meta]
            )
            
            logger.info(f"✅ Added image signature to vector store: {source}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add image signature: {str(e)}")
            return False
    
    def search_similar_images(
        self,
        query_embedding: np.ndarray,
        top_k: int = 10,
        min_similarity: float = 0.8
    ) -> List[Dict]:
        """
        Search for similar images in database
        
        Args:
            query_embedding: Query image embedding
            top_k: Number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of similar images
        """
        try:
            if self.client is None:
                return []
            
            results = self.image_signatures_collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                include=["metadatas", "distances"]
            )
            
            matches = []
            
            if results and results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    distance = results['distances'][0][i]
                    similarity = max(0, 1 - (distance / 2))
                    
                    if similarity >= min_similarity:
                        matches.append({
                            'signature_id': results['ids'][0][i],
                            'similarity': round(similarity, 3),
                            'metadata': results['metadatas'][0][i]
                        })
            
            logger.info(f"Found {len(matches)} similar images (min similarity: {min_similarity})")
            return matches
            
        except Exception as e:
            logger.error(f"Image search error: {str(e)}")
            return []
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about vector store collections"""
        try:
            if self.client is None:
                return {'error': 'ChromaDB not initialized'}
            
            return {
                'scam_patterns_count': self.scam_patterns_collection.count(),
                'image_signatures_count': self.image_signatures_collection.count(),
                'storage_path': CHROMADB_DIR
            }
            
        except Exception as e:
            logger.error(f"Stats error: {str(e)}")
            return {'error': str(e)}
    
    def batch_add_scam_patterns(
        self,
        texts: List[str],
        embeddings: np.ndarray,
        scam_types: List[str],
        severities: List[str]
    ) -> int:
        """
        Batch add multiple scam patterns at once
        
        Returns:
            Number of patterns successfully added
        """
        try:
            if self.client is None:
                return 0
            
            # Generate IDs
            ids = [hashlib.sha256(text.encode()).hexdigest()[:16] for text in texts]
            
            # Prepare metadatas
            metadatas = [
                {
                    "scam_type": scam_types[i],
                    "severity": severities[i],
                    "added_at": datetime.now(timezone.utc).isoformat(),
                    "text_length": len(texts[i])
                }
                for i in range(len(texts))
            ]
            
            # Batch add
            self.scam_patterns_collection.add(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=texts,
                metadatas=metadatas
            )
            
            logger.info(f"✅ Batch added {len(texts)} scam patterns to vector store")
            return len(texts)
            
        except Exception as e:
            logger.error(f"Batch add error: {str(e)}")
            return 0
    
    def clear_collection(self, collection_name: str) -> bool:
        """Clear all data from a collection (use with caution)"""
        try:
            if collection_name == "scam_patterns":
                self.client.delete_collection("scam_patterns")
                self.scam_patterns_collection = self.client.create_collection("scam_patterns")
            elif collection_name == "image_signatures":
                self.client.delete_collection("image_signatures")
                self.image_signatures_collection = self.client.create_collection("image_signatures")
            else:
                logger.error(f"Unknown collection: {collection_name}")
                return False
            
            logger.info(f"✅ Cleared collection: {collection_name}")
            return True
            
        except Exception as e:
            logger.error(f"Clear collection error: {str(e)}")
            return False


# Initialize global vector store
logger.info("🚀 Initializing vector store (ChromaDB)...")
vector_store = VectorStore()
logger.info("✅ Vector store initialized")
