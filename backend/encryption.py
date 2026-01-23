"""
Encryption Utilities for Data at Rest
Field-level encryption for sensitive data
"""
import os
import base64
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from typing import Optional, Any
import json

logger = logging.getLogger(__name__)

# Encryption key from environment or generate new one
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')

if not ENCRYPTION_KEY:
    # Generate a new key if not provided
    ENCRYPTION_KEY = Fernet.generate_key().decode('utf-8')
    logger.warning("⚠️ No ENCRYPTION_KEY in environment. Generated temporary key. Set ENCRYPTION_KEY in .env for production.")
else:
    logger.info("✅ Encryption enabled with environment key")


class EncryptionManager:
    """Field-level encryption manager"""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption manager
        
        Args:
            encryption_key: Base64-encoded Fernet key
        """
        key = encryption_key or ENCRYPTION_KEY
        
        try:
            self.cipher = Fernet(key.encode('utf-8') if isinstance(key, str) else key)
            logger.info("✅ Encryption manager initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize encryption: {str(e)}")
            raise
    
    def encrypt(self, data: Any) -> str:
        """
        Encrypt data
        
        Args:
            data: Data to encrypt (any JSON-serializable type)
            
        Returns:
            Encrypted data as base64 string
        """
        try:
            # Convert to JSON string
            json_data = json.dumps(data)
            
            # Encrypt
            encrypted = self.cipher.encrypt(json_data.encode('utf-8'))
            
            # Return as base64 string
            return base64.b64encode(encrypted).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt(self, encrypted_data: str) -> Any:
        """
        Decrypt data
        
        Args:
            encrypted_data: Base64-encoded encrypted data
            
        Returns:
            Decrypted data (original type)
        """
        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_data)
            
            # Decrypt
            decrypted = self.cipher.decrypt(encrypted_bytes)
            
            # Parse JSON
            return json.loads(decrypted.decode('utf-8'))
            
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def encrypt_field(self, data: dict, field: str) -> dict:
        """
        Encrypt a specific field in a dictionary
        
        Args:
            data: Dictionary containing the field
            field: Field name to encrypt
            
        Returns:
            Dictionary with encrypted field
        """
        if field in data and data[field] is not None:
            data[f"{field}_encrypted"] = self.encrypt(data[field])
            del data[field]  # Remove plaintext
        return data
    
    def decrypt_field(self, data: dict, field: str) -> dict:
        """
        Decrypt a specific field in a dictionary
        
        Args:
            data: Dictionary containing encrypted field
            field: Field name to decrypt (without _encrypted suffix)
            
        Returns:
            Dictionary with decrypted field
        """
        encrypted_field = f"{field}_encrypted"
        if encrypted_field in data and data[encrypted_field] is not None:
            data[field] = self.decrypt(data[encrypted_field])
            del data[encrypted_field]  # Remove encrypted version
        return data
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new Fernet encryption key
        
        Returns:
            Base64-encoded key string
        """
        return Fernet.generate_key().decode('utf-8')
    
    @staticmethod
    def derive_key_from_password(password: str, salt: Optional[bytes] = None) -> tuple:
        """
        Derive encryption key from password using PBKDF2
        
        Args:
            password: Password to derive key from
            salt: Salt for key derivation (generated if not provided)
            
        Returns:
            (key, salt) tuple
        """
        if salt is None:
            salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key = base64.urlsafe_b64encode(kdf.derive(password.encode('utf-8')))
        return key.decode('utf-8'), base64.b64encode(salt).decode('utf-8')


# Global encryption manager instance
encryption_manager = EncryptionManager()


def encrypt_sensitive_fields(document: dict, sensitive_fields: list) -> dict:
    """
    Encrypt multiple sensitive fields in a document
    
    Args:
        document: Document to encrypt
        sensitive_fields: List of field names to encrypt
        
    Returns:
        Document with encrypted fields
    """
    for field in sensitive_fields:
        if field in document:
            document = encryption_manager.encrypt_field(document, field)
    return document


def decrypt_sensitive_fields(document: dict, sensitive_fields: list) -> dict:
    """
    Decrypt multiple sensitive fields in a document
    
    Args:
        document: Document to decrypt
        sensitive_fields: List of field names to decrypt
        
    Returns:
        Document with decrypted fields
    """
    for field in sensitive_fields:
        encrypted_field = f"{field}_encrypted"
        if encrypted_field in document:
            document = encryption_manager.decrypt_field(document, field)
    return document
