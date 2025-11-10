"""
WSGI config for ai_chat project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys
import logging

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ai_chat.settings')

application = get_wsgi_application()

# Suppress broken pipe errors in WSGI - these are harmless and occur when clients disconnect
# (common with mobile browsers and polling requests)
class SuppressBrokenPipeWSGI:
    """Wrapper to suppress broken pipe errors at the WSGI level"""
    def __init__(self, application):
        self.application = application
    
    def __call__(self, environ, start_response):
        try:
            return self.application(environ, start_response)
        except (BrokenPipeError, ConnectionResetError, OSError) as e:
            # Suppress broken pipe errors - they're harmless
            error_str = str(e)
            if 'Broken pipe' in error_str or 'Connection reset' in error_str:
                # Silently ignore - these are common with mobile browsers
                # Return empty response to prevent error propagation
                try:
                    start_response('200 OK', [('Content-Type', 'text/plain')])
                    return [b'']
                except:
                    pass
            raise

# Wrap the application to suppress broken pipe errors
application = SuppressBrokenPipeWSGI(application)
