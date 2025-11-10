"""
Unit tests for utility functions
"""

import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from chat.models import Conversation, Message, MessageFeedback, ConversationFeedback
from chat.utils.insights import (
    get_message_feedback_stats,
    get_conversation_feedback_stats,
    get_recent_feedback,
    get_insights_data
)
from chat.utils.title_generation import generate_title_with_gemini, generate_fallback_title


@pytest.mark.django_db
class TestInsightsUtils:
    """Tests for insights utility functions"""
    
    def test_get_message_feedback_stats(self):
        """Test getting message feedback statistics"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 1")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 2")
        
        MessageFeedback.objects.create(message=msg1, rating=5)
        MessageFeedback.objects.create(message=msg2, rating=3)
        
        since_date = timezone.now() - timedelta(days=30)
        stats = get_message_feedback_stats(since_date)
        
        assert stats["total_feedback"] == 2
        assert stats["avg_rating"] == 4.0
        assert stats["excellent_count"] == 1
        assert stats["fair_count"] == 1
    
    def test_get_conversation_feedback_stats(self):
        """Test getting conversation feedback statistics"""
        conv1 = Conversation.objects.create()
        conv2 = Conversation.objects.create()
        
        ConversationFeedback.objects.create(
            conversation=conv1,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        ConversationFeedback.objects.create(
            conversation=conv2,
            overall_rating=3,
            helpfulness_rating=3,
            accuracy_rating=3
        )
        
        since_date = timezone.now() - timedelta(days=30)
        stats = get_conversation_feedback_stats(since_date)
        
        assert stats["total_feedback"] == 2
        assert stats["avg_overall_rating"] == 4.0
        assert stats["excellent_count"] == 1
        assert stats["fair_count"] == 1
    
    def test_get_recent_feedback(self):
        """Test getting recent feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        MessageFeedback.objects.create(message=msg, rating=5)
        ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        
        since_date = timezone.now() - timedelta(days=30)
        recent_msg_feedback, recent_conv_feedback = get_recent_feedback(since_date, limit=10)
        
        assert len(recent_msg_feedback) == 1
        assert len(recent_conv_feedback) == 1
    
    def test_get_insights_data(self):
        """Test getting complete insights data"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        MessageFeedback.objects.create(message=msg, rating=5)
        ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        
        data = get_insights_data(days=30)
        
        assert "period_days" in data
        assert "message_feedback" in data
        assert "conversation_feedback" in data
        assert "recent_message_feedback" in data
        assert "recent_conversation_feedback" in data
        assert data["period_days"] == 30


class TestTitleGeneration:
    """Tests for title generation utility functions"""
    
    @patch('chat.utils.title_generation.requests.post')
    def test_generate_title_with_gemini_success(self, mock_post):
        """Test successful title generation with Gemini"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'candidates': [{
                'content': {
                    'parts': [{'text': 'Test Title'}]
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response
        
        with patch('chat.utils.title_generation.settings') as mock_settings:
            mock_settings.GEMINI_MODEL = 'test-model'
            mock_settings.GEMINI_API_KEY = 'test-key'
            
            title = generate_title_with_gemini("Test message")
            assert title == "Test Title"
    
    @patch('chat.utils.title_generation.requests.post')
    def test_generate_title_with_gemini_failure(self, mock_post):
        """Test title generation failure falls back gracefully"""
        mock_post.side_effect = Exception("API Error")
        
        title = generate_title_with_gemini("Test message")
        assert title is None
    
    def test_generate_fallback_title(self):
        """Test fallback title generation"""
        title = generate_fallback_title("This is a test message")
        assert title == "This is"
        
        # Test with long message
        long_message = "This is a very long message that should be truncated"
        title = generate_fallback_title(long_message)
        assert len(title) <= 14
        # Title may or may not end with "..." depending on length
        if len(title) > 11:
            assert title.endswith("...")

