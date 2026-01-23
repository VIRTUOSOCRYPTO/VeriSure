"""
Pattern Learning Module
Auto-learns scam patterns from user reports and updates vector store
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from collections import Counter
import numpy as np
from sklearn.cluster import HDBSCAN

logger = logging.getLogger(__name__)


class PatternLearningSystem:
    """
    Automated pattern learning system for scam detection
    Learns from community reports and updates vector database
    """
    
    def __init__(self, db, vector_store, embedding_model):
        """
        Initialize pattern learning system
        
        Args:
            db: MongoDB database connection
            vector_store: VectorStore instance
            embedding_model: Embedding model for text vectorization
        """
        self.db = db
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.min_reports_for_learning = 3  # Minimum reports before auto-learning
        self.similarity_threshold = 0.75  # Threshold for grouping similar reports
        
        logger.info("✅ Pattern Learning System initialized")
    
    async def process_new_report(
        self,
        content: str,
        scam_type: str,
        severity: str = "medium"
    ) -> Dict:
        """
        Process a new scam report and potentially learn from it
        
        Args:
            content: Scam content
            scam_type: Type of scam
            severity: Risk severity
            
        Returns:
            Processing result with learning status
        """
        try:
            # Generate embedding for the report
            embedding = self.embedding_model.encode_single(content)
            
            # Check if similar patterns already exist in vector store
            similar_patterns = self.vector_store.search_similar_scams(
                embedding,
                top_k=5,
                min_similarity=self.similarity_threshold
            )
            
            if similar_patterns:
                # Pattern already known
                best_match = similar_patterns[0]
                logger.info(f"Report matches existing pattern (similarity: {best_match['similarity']:.2f})")
                return {
                    'status': 'matched_existing',
                    'matched_pattern_id': best_match['pattern_id'],
                    'similarity': best_match['similarity'],
                    'learned': False
                }
            
            # Check if enough similar reports exist in MongoDB to learn
            similar_reports_count = await self._count_similar_reports(content, embedding)
            
            if similar_reports_count >= self.min_reports_for_learning:
                # Learn new pattern
                success = self.vector_store.add_scam_pattern(
                    text=content,
                    embedding=embedding,
                    scam_type=scam_type,
                    severity=severity,
                    metadata={
                        'learned_from_reports': similar_reports_count,
                        'learning_method': 'auto'
                    }
                )
                
                if success:
                    logger.info(f"✅ Learned new pattern from {similar_reports_count} reports: {scam_type}")
                    return {
                        'status': 'new_pattern_learned',
                        'similar_reports': similar_reports_count,
                        'learned': True
                    }
            
            # Not enough reports to learn yet
            return {
                'status': 'waiting_for_more_reports',
                'current_reports': similar_reports_count,
                'needed_reports': self.min_reports_for_learning,
                'learned': False
            }
            
        except Exception as e:
            logger.error(f"Report processing error: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'learned': False
            }
    
    async def _count_similar_reports(self, content: str, embedding: np.ndarray) -> int:
        """Count similar reports in MongoDB"""
        try:
            # Get recent reports (last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            
            cursor = self.db.scam_reports.find({
                "created_at": {"$gte": thirty_days_ago},
                "verified": True
            }).limit(500)
            
            reports = await cursor.to_list(length=500)
            
            if not reports:
                return 0
            
            # Generate embeddings for all reports
            report_texts = [r.get('content', '') for r in reports]
            report_embeddings = self.embedding_model.encode(report_texts)
            
            # Calculate cosine similarity
            similarities = np.dot(report_embeddings, embedding) / (
                np.linalg.norm(report_embeddings, axis=1) * np.linalg.norm(embedding)
            )
            
            # Count similar reports (above threshold)
            similar_count = int(np.sum(similarities >= self.similarity_threshold))
            
            return similar_count
            
        except Exception as e:
            logger.error(f"Similar reports count error: {str(e)}")
            return 0
    
    async def detect_emerging_trends(self, days: int = 7) -> List[Dict]:
        """
        Detect emerging scam trends using clustering
        
        Args:
            days: Number of days to look back
            
        Returns:
            List of emerging trends with statistics
        """
        try:
            # Get recent reports
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            cursor = self.db.scam_reports.find({
                "created_at": {"$gte": cutoff_date}
            }).limit(1000)
            
            reports = await cursor.to_list(length=1000)
            
            if len(reports) < 10:
                logger.info("Not enough reports for trend detection")
                return []
            
            # Generate embeddings for all reports
            report_texts = [r.get('content', '') for r in reports]
            report_embeddings = self.embedding_model.encode(report_texts)
            
            # Cluster reports using HDBSCAN
            clusterer = HDBSCAN(
                min_cluster_size=3,
                min_samples=2,
                metric='euclidean'
            )
            
            cluster_labels = clusterer.fit_predict(report_embeddings)
            
            # Analyze clusters
            emerging_trends = []
            unique_labels = set(cluster_labels)
            
            for label in unique_labels:
                if label == -1:  # Noise points
                    continue
                
                # Get reports in this cluster
                cluster_indices = np.where(cluster_labels == label)[0]
                cluster_reports = [reports[i] for i in cluster_indices]
                
                # Check if this is a new trend (not in vector store)
                cluster_center = np.mean(report_embeddings[cluster_indices], axis=0)
                existing_patterns = self.vector_store.search_similar_scams(
                    cluster_center,
                    top_k=1,
                    min_similarity=0.75
                )
                
                if not existing_patterns:
                    # This is a new emerging trend!
                    scam_types = [r.get('scam_type', 'unknown') for r in cluster_reports]
                    most_common_type = Counter(scam_types).most_common(1)[0][0]
                    
                    # Get representative text (closest to cluster center)
                    distances = np.linalg.norm(
                        report_embeddings[cluster_indices] - cluster_center,
                        axis=1
                    )
                    representative_idx = cluster_indices[np.argmin(distances)]
                    representative_text = reports[representative_idx].get('content', '')[:200]
                    
                    emerging_trends.append({
                        'cluster_id': int(label),
                        'report_count': len(cluster_reports),
                        'scam_type': most_common_type,
                        'representative_text': representative_text,
                        'first_seen': min(r.get('created_at') for r in cluster_reports),
                        'severity': 'high' if len(cluster_reports) > 10 else 'medium',
                        'is_new_trend': True
                    })
            
            logger.info(f"🔍 Detected {len(emerging_trends)} emerging trends")
            return emerging_trends
            
        except Exception as e:
            logger.error(f"Trend detection error: {str(e)}")
            return []
    
    async def batch_learn_from_verified_reports(
        self,
        min_report_count: int = 3
    ) -> Dict:
        """
        Batch process verified reports and learn patterns
        
        Args:
            min_report_count: Minimum reports needed to learn pattern
            
        Returns:
            Statistics about learning process
        """
        try:
            # Get all verified reports
            cursor = self.db.scam_reports.find({
                "verified": True,
                "status": "verified"
            }).limit(5000)
            
            reports = await cursor.to_list(length=5000)
            
            if not reports:
                return {
                    'total_reports': 0,
                    'patterns_learned': 0,
                    'status': 'no_reports'
                }
            
            # Group by scam type
            type_groups = {}
            for report in reports:
                scam_type = report.get('scam_type', 'unknown')
                if scam_type not in type_groups:
                    type_groups[scam_type] = []
                type_groups[scam_type].append(report)
            
            patterns_learned = 0
            
            # Learn patterns for each type
            for scam_type, type_reports in type_groups.items():
                if len(type_reports) < min_report_count:
                    continue
                
                # Get representative examples
                sample_size = min(len(type_reports), 50)
                samples = np.random.choice(type_reports, sample_size, replace=False)
                
                # Generate embeddings
                texts = [r.get('content', '') for r in samples]
                embeddings = self.embedding_model.encode(texts)
                
                # Calculate average severity
                severities = [r.get('severity', 'medium') for r in samples]
                severity_counts = Counter(severities)
                avg_severity = severity_counts.most_common(1)[0][0]
                
                # Add each sample to vector store
                for i, sample in enumerate(samples):
                    success = self.vector_store.add_scam_pattern(
                        text=texts[i],
                        embedding=embeddings[i],
                        scam_type=scam_type,
                        severity=avg_severity,
                        metadata={
                            'report_count': len(type_reports),
                            'learning_method': 'batch_verified'
                        }
                    )
                    
                    if success:
                        patterns_learned += 1
            
            logger.info(f"✅ Batch learning complete: {patterns_learned} patterns learned from {len(reports)} reports")
            
            return {
                'total_reports': len(reports),
                'patterns_learned': patterns_learned,
                'scam_types_processed': len(type_groups),
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Batch learning error: {str(e)}")
            return {
                'total_reports': 0,
                'patterns_learned': 0,
                'status': 'error',
                'error': str(e)
            }
    
    async def update_pattern_effectiveness(
        self,
        pattern_id: str,
        detection_result: bool
    ) -> bool:
        """
        Update pattern effectiveness metrics based on detection results
        
        Args:
            pattern_id: Pattern identifier
            detection_result: True if pattern correctly detected scam
            
        Returns:
            Success status
        """
        try:
            # This would update pattern metadata in vector store
            # For now, log the feedback
            logger.info(f"Pattern {pattern_id} feedback: {'correct' if detection_result else 'incorrect'}")
            
            # In production, implement feedback loop to:
            # 1. Track pattern accuracy
            # 2. Adjust confidence scores
            # 3. Deprecate ineffective patterns
            
            return True
            
        except Exception as e:
            logger.error(f"Pattern effectiveness update error: {str(e)}")
            return False
    
    def get_learning_stats(self) -> Dict:
        """Get statistics about the learning system"""
        try:
            vector_stats = self.vector_store.get_collection_stats()
            
            return {
                'total_learned_patterns': vector_stats.get('scam_patterns_count', 0),
                'min_reports_threshold': self.min_reports_for_learning,
                'similarity_threshold': self.similarity_threshold,
                'status': 'active'
            }
            
        except Exception as e:
            logger.error(f"Learning stats error: {str(e)}")
            return {'status': 'error', 'error': str(e)}
