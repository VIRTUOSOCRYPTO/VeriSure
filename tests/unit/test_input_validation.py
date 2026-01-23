"""
Unit tests for input validation
Phase 1 Critical Fix: Ensure input validation prevents attacks
"""
import pytest
from input_validation import (
    sanitize_filename,
    validate_text_input,
    validate_url_input,
    validate_batch_size,
    validate_report_ids,
    validate_pagination,
    ValidationError
)


@pytest.mark.unit
class TestFilenameSanitization:
    """Test filename sanitization"""
    
    def test_sanitize_path_traversal(self):
        """Test removal of path traversal"""
        assert sanitize_filename("../../etc/passwd") == "etcpasswd"
    
    def test_sanitize_special_chars(self):
        """Test removal of special characters"""
        assert sanitize_filename("test<script>.jpg") == "testscript.jpg"
    
    def test_sanitize_long_filename(self):
        """Test truncation of long filenames"""
        long_name = "a" * 300 + ".txt"
        result = sanitize_filename(long_name)
        assert len(result) <= 255
    
    def test_sanitize_empty_filename(self):
        """Test handling of empty filename"""
        assert sanitize_filename("") == "unnamed_file"


@pytest.mark.unit
class TestTextValidation:
    """Test text input validation"""
    
    def test_valid_text(self):
        """Test valid text passes"""
        text = "This is valid text"
        result = validate_text_input(text)
        assert result == text
    
    def test_empty_text_raises_error(self):
        """Test empty text raises error"""
        with pytest.raises(ValidationError):
            validate_text_input("")
    
    def test_whitespace_only_raises_error(self):
        """Test whitespace-only text raises error"""
        with pytest.raises(ValidationError):
            validate_text_input("   ")
    
    def test_text_too_long_raises_error(self):
        """Test text exceeding max length raises error"""
        long_text = "a" * (100 * 1024 + 1)  # Exceed 100KB
        with pytest.raises(ValidationError):
            validate_text_input(long_text)
    
    def test_null_bytes_raises_error(self):
        """Test text with null bytes raises error"""
        with pytest.raises(ValidationError):
            validate_text_input("test\x00content")


@pytest.mark.unit
class TestURLValidation:
    """Test URL input validation"""
    
    def test_valid_http_url(self):
        """Test valid HTTP URL passes"""
        url = "http://example.com/test"
        result = validate_url_input(url)
        assert result == url
    
    def test_valid_https_url(self):
        """Test valid HTTPS URL passes"""
        url = "https://example.com/test"
        result = validate_url_input(url)
        assert result == url
    
    def test_localhost_raises_error(self):
        """Test localhost URL raises error (SSRF prevention)"""
        with pytest.raises(ValidationError):
            validate_url_input("http://localhost/test")
    
    def test_private_ip_raises_error(self):
        """Test private IP raises error (SSRF prevention)"""
        with pytest.raises(ValidationError):
            validate_url_input("http://192.168.1.1/test")
    
    def test_file_protocol_raises_error(self):
        """Test file protocol raises error"""
        with pytest.raises(ValidationError):
            validate_url_input("file:///etc/passwd")
    
    def test_url_too_long_raises_error(self):
        """Test URL exceeding max length raises error"""
        long_url = "https://example.com/" + "a" * 2100
        with pytest.raises(ValidationError):
            validate_url_input(long_url)


@pytest.mark.unit
class TestBatchValidation:
    """Test batch size validation"""
    
    def test_valid_batch_size(self):
        """Test valid batch size passes"""
        assert validate_batch_size(5) == 5
    
    def test_zero_raises_error(self):
        """Test batch size of 0 raises error"""
        with pytest.raises(ValidationError):
            validate_batch_size(0)
    
    def test_exceeds_max_raises_error(self):
        """Test batch size exceeding max raises error"""
        with pytest.raises(ValidationError):
            validate_batch_size(11)  # Max is 10


@pytest.mark.unit
class TestReportIDsValidation:
    """Test report IDs validation"""
    
    def test_valid_report_ids(self):
        """Test valid report IDs pass"""
        ids = ["id1", "id2", "id3"]
        result = validate_report_ids(ids)
        assert result == ids
    
    def test_empty_list_raises_error(self):
        """Test empty list raises error"""
        with pytest.raises(ValidationError):
            validate_report_ids([])
    
    def test_single_id_raises_error(self):
        """Test single ID raises error (need at least 2)"""
        with pytest.raises(ValidationError):
            validate_report_ids(["id1"])
    
    def test_too_many_ids_raises_error(self):
        """Test too many IDs raises error (max 10)"""
        ids = [f"id{i}" for i in range(11)]
        with pytest.raises(ValidationError):
            validate_report_ids(ids)
    
    def test_duplicate_ids_raises_error(self):
        """Test duplicate IDs raise error"""
        with pytest.raises(ValidationError):
            validate_report_ids(["id1", "id2", "id1"])


@pytest.mark.unit
class TestPaginationValidation:
    """Test pagination validation"""
    
    def test_valid_pagination(self):
        """Test valid pagination parameters pass"""
        limit, skip = validate_pagination(50, 0)
        assert limit == 50
        assert skip == 0
    
    def test_limit_too_small_raises_error(self):
        """Test limit < 1 raises error"""
        with pytest.raises(ValidationError):
            validate_pagination(0, 0)
    
    def test_limit_too_large_raises_error(self):
        """Test limit > 100 raises error"""
        with pytest.raises(ValidationError):
            validate_pagination(101, 0)
    
    def test_negative_skip_raises_error(self):
        """Test negative skip raises error"""
        with pytest.raises(ValidationError):
            validate_pagination(50, -1)
    
    def test_skip_too_large_raises_error(self):
        """Test skip > 10000 raises error"""
        with pytest.raises(ValidationError):
            validate_pagination(50, 10001)
