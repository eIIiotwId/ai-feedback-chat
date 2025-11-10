"""
Custom middleware to handle broken pipe errors gracefully and reduce log verbosity
"""

import logging

logger = logging.getLogger(__name__)


class SuppressBrokenPipeErrorsMiddleware:
    """
    Middleware to suppress broken pipe errors that occur when clients disconnect.
    These are harmless and common with mobile browsers and polling requests.
    
    Note: Broken pipe errors are typically caught at the WSGI level, not in middleware.
    This middleware provides additional protection, but the main fix is in logging configuration.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except (BrokenPipeError, ConnectionResetError, OSError) as e:
            # Suppress broken pipe errors - they're harmless
            error_str = str(e)
            if 'Broken pipe' in error_str or 'Connection reset' in error_str:
                # Return a minimal response to prevent error propagation
                from django.http import HttpResponse
                return HttpResponse(status=200)
            raise
