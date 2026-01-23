"""
ML Models Module
Handles loading and inference for all custom ML models
"""

import torch
import torch.nn as nn
from torchvision import models, transforms
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Model paths
MODELS_DIR = Path("/app/models")
MODELS_DIR.mkdir(exist_ok=True, parents=True)


class ImageAuthenticityModel:
    """
    Image Authenticity Detection using EfficientNet-B0
    Classifies images as AI-generated or authentic
    """
    
    def __init__(self):
        self.device = torch.device("cpu")  # Use CPU for compatibility
        self.model = None
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        self._load_model()
    
    def _load_model(self):
        """Load pre-trained model or create new one"""
        try:
            model_path = MODELS_DIR / "efficientnet_image_auth.pth"
            
            # Use pre-trained EfficientNet-B0
            from timm import create_model
            self.model = create_model('efficientnet_b0', pretrained=True, num_classes=2)
            
            # If custom weights exist, load them
            if model_path.exists():
                logger.info(f"Loading custom weights from {model_path}")
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            else:
                logger.info("Using pre-trained EfficientNet-B0 (no custom weights available)")
            
            self.model.to(self.device)
            self.model.eval()
            logger.info("✅ Image authenticity model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load image authenticity model: {str(e)}")
            self.model = None
    
    def predict(self, image) -> Dict:
        """
        Predict if image is AI-generated
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with prediction results
        """
        try:
            if self.model is None:
                return {
                    'ai_probability': 0.5,
                    'confidence': 'low',
                    'classification': 'Unknown',
                    'error': 'Model not loaded'
                }
            
            # Preprocess image
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                ai_probability = float(probabilities[0][1])  # Class 1 = AI-generated
            
            # Determine classification and confidence
            if ai_probability >= 0.7:
                classification = "Likely AI-Generated"
                confidence = "high"
            elif ai_probability >= 0.55:
                classification = "Possibly AI-Generated"
                confidence = "medium"
            elif ai_probability <= 0.3:
                classification = "Likely Authentic"
                confidence = "high"
            elif ai_probability <= 0.45:
                classification = "Possibly Authentic"
                confidence = "medium"
            else:
                classification = "Unclear"
                confidence = "low"
            
            return {
                'ai_probability': round(ai_probability, 3),
                'authentic_probability': round(1 - ai_probability, 3),
                'confidence': confidence,
                'classification': classification,
                'model': 'EfficientNet-B0'
            }
            
        except Exception as e:
            logger.error(f"Image authenticity prediction error: {str(e)}")
            return {
                'ai_probability': 0.5,
                'confidence': 'low',
                'classification': 'Unknown',
                'error': str(e)
            }


class ScamTextClassifier:
    """
    Scam Text Classification using Fine-tuned DistilBERT
    Multi-class classification for Indian scam types
    """
    
    def __init__(self):
        self.device = torch.device("cpu")
        self.tokenizer = None
        self.model = None
        self.scam_categories = [
            "legitimate",
            "phishing",
            "authority_impersonation",
            "lottery_prize",
            "family_emergency",
            "delivery_customs",
            "investment_fraud",
            "banking_fraud"
        ]
        self._load_model()
    
    def _load_model(self):
        """Load fine-tuned DistilBERT or use base model"""
        try:
            # Import here to avoid startup issues
            from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
            
            model_path = MODELS_DIR / "distilbert_scam_classifier"
            
            if model_path.exists():
                logger.info(f"Loading custom DistilBERT from {model_path}")
                self.tokenizer = DistilBertTokenizer.from_pretrained(str(model_path))
                self.model = DistilBertForSequenceClassification.from_pretrained(
                    str(model_path),
                    num_labels=len(self.scam_categories)
                )
            else:
                # Use base DistilBERT (not fine-tuned yet)
                logger.info("Loading base DistilBERT model (not fine-tuned)")
                self.tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
                self.model = DistilBertForSequenceClassification.from_pretrained(
                    'distilbert-base-uncased',
                    num_labels=len(self.scam_categories)
                )
            
            self.model.to(self.device)
            self.model.eval()
            logger.info("✅ Scam text classifier loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load scam text classifier: {str(e)}")
            self.model = None
    
    def predict(self, text: str) -> Dict:
        """
        Classify text as scam or legitimate
        
        Args:
            text: Input text to classify
            
        Returns:
            Dictionary with classification results
        """
        try:
            if self.model is None or self.tokenizer is None:
                return {
                    'scam_probability': 0.5,
                    'scam_type': 'unknown',
                    'confidence': 'low',
                    'error': 'Model not loaded'
                }
            
            # Tokenize input
            inputs = self.tokenizer(
                text,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            ).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence_score = float(probabilities[0][predicted_class])
            
            scam_type = self.scam_categories[predicted_class]
            is_scam = scam_type != "legitimate"
            
            # Calculate overall scam probability (all non-legitimate classes)
            scam_probability = float(1.0 - probabilities[0][0])  # 1 - legitimate probability
            
            # Determine confidence level
            if confidence_score >= 0.8:
                confidence = "high"
            elif confidence_score >= 0.6:
                confidence = "medium"
            else:
                confidence = "low"
            
            return {
                'is_scam': is_scam,
                'scam_probability': round(scam_probability, 3),
                'scam_type': scam_type,
                'confidence': confidence,
                'confidence_score': round(confidence_score, 3),
                'all_probabilities': {
                    cat: round(float(probabilities[0][i]), 3)
                    for i, cat in enumerate(self.scam_categories)
                },
                'model': 'DistilBERT'
            }
            
        except Exception as e:
            logger.error(f"Text classification error: {str(e)}")
            return {
                'scam_probability': 0.5,
                'scam_type': 'unknown',
                'confidence': 'low',
                'error': str(e)
            }


class EmbeddingModel:
    """
    Text embedding model for semantic similarity
    Used for vector database and pattern matching
    """
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load sentence transformer model"""
        try:
            # Import here to avoid startup issues
            from sentence_transformers import SentenceTransformer
            
            # Use lightweight all-MiniLM-L6-v2 model (384 dimensions)
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            self.model = None
    
    def encode(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for text(s)
        
        Args:
            texts: List of text strings
            
        Returns:
            Numpy array of embeddings (shape: [n_texts, 384])
        """
        try:
            if self.model is None:
                logger.error("Embedding model not loaded")
                return np.zeros((len(texts), 384))
            
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings
            
        except Exception as e:
            logger.error(f"Embedding generation error: {str(e)}")
            return np.zeros((len(texts), 384))
    
    def encode_single(self, text: str) -> np.ndarray:
        """Generate embedding for single text"""
        return self.encode([text])[0]


class VoiceAuthenticityDetector:
    """
    Voice Cloning Detection using audio features
    Uses librosa features + traditional ML classifier
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self._load_model()
    
    def _load_model(self):
        """Load voice detection model"""
        try:
            import joblib
            model_path = MODELS_DIR / "voice_authenticity_model.pkl"
            scaler_path = MODELS_DIR / "voice_feature_scaler.pkl"
            
            if model_path.exists() and scaler_path.exists():
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("✅ Voice authenticity model loaded successfully")
            else:
                logger.info("Voice authenticity model not available (train model first)")
                self.model = None
                
        except Exception as e:
            logger.error(f"Failed to load voice model: {str(e)}")
            self.model = None
    
    def predict(self, audio_features: Dict) -> Dict:
        """
        Predict if voice is synthetic/cloned
        
        Args:
            audio_features: Dictionary of audio features from librosa
            
        Returns:
            Dictionary with prediction results
        """
        try:
            if self.model is None:
                return {
                    'synthetic_probability': 0.5,
                    'confidence': 'low',
                    'classification': 'Unknown',
                    'note': 'Model not trained yet'
                }
            
            # Extract relevant features
            feature_vector = np.array([
                audio_features.get('pitch_mean', 0),
                audio_features.get('pitch_std', 0),
                audio_features.get('energy_mean', 0),
                audio_features.get('energy_std', 0),
                audio_features.get('spectral_centroid_mean', 0),
                audio_features.get('spectral_centroid_std', 0),
                audio_features.get('silence_ratio', 0)
            ]).reshape(1, -1)
            
            # Scale features
            feature_vector_scaled = self.scaler.transform(feature_vector)
            
            # Predict
            prediction_proba = self.model.predict_proba(feature_vector_scaled)[0]
            synthetic_probability = float(prediction_proba[1])  # Class 1 = synthetic
            
            # Determine classification
            if synthetic_probability >= 0.7:
                classification = "Likely Synthetic/Cloned"
                confidence = "high"
            elif synthetic_probability >= 0.55:
                classification = "Possibly Synthetic"
                confidence = "medium"
            elif synthetic_probability <= 0.3:
                classification = "Likely Authentic"
                confidence = "high"
            elif synthetic_probability <= 0.45:
                classification = "Possibly Authentic"
                confidence = "medium"
            else:
                classification = "Unclear"
                confidence = "low"
            
            return {
                'synthetic_probability': round(synthetic_probability, 3),
                'authentic_probability': round(1 - synthetic_probability, 3),
                'confidence': confidence,
                'classification': classification,
                'model': 'Random Forest + Audio Features'
            }
            
        except Exception as e:
            logger.error(f"Voice prediction error: {str(e)}")
            return {
                'synthetic_probability': 0.5,
                'confidence': 'low',
                'classification': 'Unknown',
                'error': str(e)
            }


# Initialize models globally (loaded once at startup)
logger.info("🚀 Initializing ML models...")
image_auth_model = ImageAuthenticityModel()
scam_text_classifier = ScamTextClassifier()
embedding_model = EmbeddingModel()
voice_detector = VoiceAuthenticityDetector()
logger.info("✅ All ML models initialized")
