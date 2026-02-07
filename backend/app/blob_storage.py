# app/blob_storage.py
"""Azure Blob Storage service for saving extraction results."""

import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from azure.storage.blob import BlobServiceClient, BlobClient, ContentSettings
from app.config import AZURE_STORAGE_CONNECTION_STRING, AZURE_BLOB_CONTAINER
from app.log import logger


class BlobStorageService:
    """Service for storing and retrieving extraction results from Azure Blob Storage."""
    
    def __init__(self):
        """Initialize blob storage client."""
        self.connection_string = AZURE_STORAGE_CONNECTION_STRING
        self.container_name = AZURE_BLOB_CONTAINER or "extraction-results"
        self.client = None
        
        if self.connection_string:
            try:
                self.client = BlobServiceClient.from_connection_string(self.connection_string)
                self._ensure_container_exists()
                logger.info(f"Blob storage initialized. Container: {self.container_name}")
            except Exception as e:
                logger.error(f"Failed to initialize blob storage: {e}")
                self.client = None
    
    def _ensure_container_exists(self):
        """Create container if it doesn't exist."""
        if self.client:
            try:
                container_client = self.client.get_container_client(self.container_name)
                if not container_client.exists():
                    container_client.create_container()
                    logger.info(f"Created blob container: {self.container_name}")
            except Exception as e:
                logger.error(f"Error ensuring container exists: {e}")
    
    def save_extraction(
        self, 
        extracted_data: Dict[str, Any], 
        filename: str,
        text_stats: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Save extraction result to blob storage.
        
        Args:
            extracted_data: The extracted referral data
            filename: Original filename
            text_stats: Text statistics (character count, word count)
            
        Returns:
            extraction_id if successful, None otherwise
        """
        if not self.client:
            logger.warning("Blob storage not configured. Skipping save.")
            return None
        
        try:
            extraction_id = str(uuid.uuid4())
            timestamp = datetime.now().isoformat()
            
            # Prepare result object
            result = {
                "extraction_id": extraction_id,
                "filename": filename,
                "timestamp": timestamp,
                "text_stats": text_stats or {},
                "extracted_data": extracted_data
            }
            
            # Create blob name
            blob_name = f"extractions/{extraction_id}.json"
            
            # Upload to blob storage
            blob_client = self.client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_client.upload_blob(
                json.dumps(result, indent=2),
                content_settings=ContentSettings(content_type='application/json'),
                metadata={
                    "filename": filename,
                    "timestamp": timestamp,
                    "extraction_id": extraction_id
                },
                overwrite=True
            )
            
            logger.info(f"Saved extraction {extraction_id} to blob storage")
            return extraction_id
            
        except Exception as e:
            logger.error(f"Failed to save extraction to blob storage: {e}")
            return None
    
    def get_extraction(self, extraction_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve extraction result by ID.
        
        Args:
            extraction_id: The extraction ID
            
        Returns:
            Extraction result dict or None
        """
        if not self.client:
            logger.warning("Blob storage not configured.")
            return None
        
        try:
            blob_name = f"extractions/{extraction_id}.json"
            blob_client = self.client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_data = blob_client.download_blob().readall()
            result = json.loads(blob_data)
            
            logger.info(f"Retrieved extraction {extraction_id} from blob storage")
            return result
            
        except Exception as e:
            logger.error(f"Failed to retrieve extraction {extraction_id}: {e}")
            return None
    
    def list_extractions(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent extractions.
        
        Args:
            limit: Maximum number of results to return
            
        Returns:
            List of extraction summaries
        """
        if not self.client:
            logger.warning("Blob storage not configured.")
            return []
        
        try:
            container_client = self.client.get_container_client(self.container_name)
            blobs = container_client.list_blobs(name_starts_with="extractions/")
            
            results = []
            for blob in blobs:
                if len(results) >= limit:
                    break
                
                # Get metadata
                metadata = blob.metadata or {}
                results.append({
                    "extraction_id": metadata.get("extraction_id", "unknown"),
                    "filename": metadata.get("filename", "unknown"),
                    "timestamp": metadata.get("timestamp", "unknown"),
                    "size": blob.size
                })
            
            # Sort by timestamp (newest first)
            results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            logger.info(f"Retrieved {len(results)} extraction records")
            return results
            
        except Exception as e:
            logger.error(f"Failed to list extractions: {e}")
            return []
    
    def delete_extraction(self, extraction_id: str) -> bool:
        """
        Delete extraction result.
        
        Args:
            extraction_id: The extraction ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            logger.warning("Blob storage not configured.")
            return False
        
        try:
            blob_name = f"extractions/{extraction_id}.json"
            blob_client = self.client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_client.delete_blob()
            logger.info(f"Deleted extraction {extraction_id} from blob storage")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete extraction {extraction_id}: {e}")
            return False


# Global instance
blob_service = BlobStorageService()
