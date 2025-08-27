"""
Base imports and common utilities for rules engine models
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import json
import logging

User = get_user_model()
logger = logging.getLogger(__name__)