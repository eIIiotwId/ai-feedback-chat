"""
Title generation utility functions
"""

from __future__ import annotations

import requests
from django.conf import settings
from typing import Optional


def generate_title_with_gemini(message: str) -> Optional[str]:
    """
    Generate a conversation title using Gemini API
    
    Args:
        message: The user's first message
        
    Returns:
        Generated title or None if generation fails
    """
    if not message:
        return None
    
    try:
        prompt = f"""Analyze this user message and create a descriptive title (max 25 characters) that captures the main intent/topic:

User message: "{message}"

Examples of good intent-based titles:
- "Can you give me all of the primary colours?" → "Primary Colors"
- "How do I cook pasta?" → "Cooking Pasta" 
- "What's the weather like?" → "Weather Info"
- "Hey there, I want to know how tall are giraffes?" → "Giraffe Height"
- "Help me with Python coding" → "Python Help"
- "Tell me about history" → "History Facts"
- "How to fix my car?" → "Car Repair"
- "What's the best way to learn Spanish?" → "Learn Spanish"
- "Can you explain quantum physics?" → "Quantum Physics"

Generate a descriptive title that captures the main intent (max 25 characters):"""
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        headers = {
            'Content-Type': 'application/json',
        }
        data = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        params = {'key': settings.GEMINI_API_KEY}
        
        response = requests.post(url, headers=headers, json=data, params=params, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        title = result['candidates'][0]['content']['parts'][0]['text'].strip()
        
        # Clean up the title
        title = title.replace('Title:', '').strip()
        title = title.replace('"', '').strip()
        
        if len(title) > 25:
            title = title[:22] + '...'
        
        return title
        
    except Exception as e:
        print(f"Gemini API failed: {e}")
        return None


def generate_fallback_title(message: str) -> str:
    """
    Generate a simple fallback title based on first few words
    
    Args:
        message: The user's message
        
    Returns:
        Fallback title
    """
    words = ' '.join(message.split(' ')[:2])
    if len(words) > 14:
        return words[:11] + '...'
    return words

