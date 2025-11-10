"""
Insights utility functions
"""

from __future__ import annotations

from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from typing import Dict, Any, Tuple

from ..models import MessageFeedback, ConversationFeedback


def get_message_feedback_stats(since_date: timezone.datetime) -> Dict[str, Any]:
    """Get message feedback statistics for a given date range"""
    return MessageFeedback.objects.filter(
        created_at__gte=since_date
    ).aggregate(
        total_feedback=Count('id'),
        avg_rating=Avg('rating'),
        excellent_count=Count('id', filter=Q(rating=5)),
        good_count=Count('id', filter=Q(rating=4)),
        fair_count=Count('id', filter=Q(rating=3)),
        poor_count=Count('id', filter=Q(rating=2)),
        very_poor_count=Count('id', filter=Q(rating=1)),
    )


def get_conversation_feedback_stats(since_date: timezone.datetime) -> Dict[str, Any]:
    """Get conversation feedback statistics for a given date range"""
    return ConversationFeedback.objects.filter(
        created_at__gte=since_date
    ).aggregate(
        total_feedback=Count('id'),
        avg_overall_rating=Avg('overall_rating'),
        avg_helpfulness_rating=Avg('helpfulness_rating'),
        avg_accuracy_rating=Avg('accuracy_rating'),
        excellent_count=Count('id', filter=Q(overall_rating=5)),
        good_count=Count('id', filter=Q(overall_rating=4)),
        fair_count=Count('id', filter=Q(overall_rating=3)),
        poor_count=Count('id', filter=Q(overall_rating=2)),
        very_poor_count=Count('id', filter=Q(overall_rating=1)),
    )


def get_recent_feedback(since_date: timezone.datetime, limit: int = 10) -> Tuple[list, list]:
    """Get recent feedback for messages and conversations"""
    recent_message_feedback = list(MessageFeedback.objects.filter(
        created_at__gte=since_date
    ).select_related('message').order_by('-created_at')[:limit])
    
    recent_conversation_feedback = list(ConversationFeedback.objects.filter(
        created_at__gte=since_date
    ).select_related('conversation').order_by('-created_at')[:limit])
    
    return recent_message_feedback, recent_conversation_feedback


def get_insights_data(days: int = 30) -> Dict[str, Any]:
    """Get complete insights data for a given number of days"""
    since_date = timezone.now() - timedelta(days=days)
    
    message_stats = get_message_feedback_stats(since_date)
    conversation_stats = get_conversation_feedback_stats(since_date)
    recent_message_feedback, recent_conversation_feedback = get_recent_feedback(since_date)
    
    return {
        'period_days': days,
        'message_feedback': message_stats,
        'conversation_feedback': conversation_stats,
        'recent_message_feedback': recent_message_feedback,
        'recent_conversation_feedback': recent_conversation_feedback,
    }

