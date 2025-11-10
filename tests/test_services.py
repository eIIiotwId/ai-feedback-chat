"""
Unit tests for service functions
"""

import pytest
import os
import sys
from unittest.mock import patch, MagicMock

from chat.services.gemini import generate_reply, GeminiServiceError, _get_model_name


class TestGeminiService:
    """Tests for Gemini service functions"""
    
    def test_get_model_name_default(self):
        """Test default model name"""
        with patch.dict(os.environ, {}, clear=True):
            assert _get_model_name() == "gemini-2.5-flash"
    
    def test_get_model_name_custom(self):
        """Test custom model name from environment"""
        with patch.dict(os.environ, {"GEMINI_MODEL": "custom-model"}):
            assert _get_model_name() == "custom-model"
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"})
    def test_generate_reply_success(self):
        """Test successful reply generation"""
        # Create a mock genai module
        mock_genai_module = MagicMock()
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is a test reply"
        mock_model.generate_content.return_value = mock_response
        mock_genai_module.GenerativeModel.return_value = mock_model
        mock_genai_module.configure = MagicMock()
        
        # Patch sys.modules before the import happens inside the function
        with patch.dict(sys.modules, {'google.generativeai': mock_genai_module}):
            history = [{"role": "user", "text": "Hello"}]
            reply = generate_reply(history, "How are you?", timeout_s=10)
            
            assert reply == "This is a test reply"
            mock_model.generate_content.assert_called_once()
    
    @patch.dict(os.environ, {}, clear=True)
    def test_generate_reply_missing_api_key(self):
        """Test that missing API key raises error"""
        with pytest.raises(GeminiServiceError) as exc_info:
            generate_reply([], "Test")
        
        assert "API key is missing" in str(exc_info.value)
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"})
    def test_generate_reply_empty_response(self):
        """Test that empty response raises error"""
        # Create a mock genai module
        mock_genai_module = MagicMock()
        mock_model = MagicMock()
        mock_response = MagicMock()
        # Make text attribute return None/empty
        del mock_response.text
        type(mock_response).text = property(lambda self: None)
        mock_model.generate_content.return_value = mock_response
        mock_genai_module.GenerativeModel.return_value = mock_model
        mock_genai_module.configure = MagicMock()
        
        # Patch sys.modules before the import happens inside the function
        with patch.dict(sys.modules, {'google.generativeai': mock_genai_module}):
            with pytest.raises(GeminiServiceError) as exc_info:
                generate_reply([], "Test")
            
            assert "Empty response" in str(exc_info.value)
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"})
    def test_generate_reply_api_error(self):
        """Test that API errors are caught and re-raised"""
        # Create a mock genai module
        mock_genai_module = MagicMock()
        mock_genai_module.configure = MagicMock()
        # Make generate_content raise an error
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API Error")
        mock_genai_module.GenerativeModel.return_value = mock_model
        
        # Patch sys.modules before the import happens inside the function
        with patch.dict(sys.modules, {'google.generativeai': mock_genai_module}):
            with pytest.raises(GeminiServiceError) as exc_info:
                generate_reply([], "Test")
            
            assert "request failed" in str(exc_info.value).lower()
    
    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"})
    def test_generate_reply_with_history(self):
        """Test reply generation with conversation history"""
        # Create a mock genai module
        mock_genai_module = MagicMock()
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Reply"
        mock_model.generate_content.return_value = mock_response
        mock_genai_module.GenerativeModel.return_value = mock_model
        mock_genai_module.configure = MagicMock()
        
        # Patch sys.modules before the import happens inside the function
        with patch.dict(sys.modules, {'google.generativeai': mock_genai_module}):
            history = [
                {"role": "user", "text": "Hello"},
                {"role": "ai", "text": "Hi there!"},
                {"role": "user", "text": "How are you?"}
            ]
            
            reply = generate_reply(history, "What's the weather?", timeout_s=10)
            
            # Verify the reply is returned
            assert reply == "Reply"
            # Verify generate_content was called
            assert mock_model.generate_content.called

