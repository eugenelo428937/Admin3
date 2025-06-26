import requests
import logging
from django.conf import settings
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def verify_recaptcha(recaptcha_response: str, user_ip: Optional[str] = None) -> Dict[str, any]:
    """
    Verify reCAPTCHA response with Google servers.
    
    Args:
        recaptcha_response: The reCAPTCHA response token from the frontend
        user_ip: Optional user IP address for additional verification
        
    Returns:
        Dict containing verification result and details
    """
    if not recaptcha_response:
        return {
            "success": False,
            "error": "No reCAPTCHA response provided",
            "error_codes": ["missing-input-response"]
        }
    
    # Get reCAPTCHA settings
    secret_key = getattr(settings, "RECAPTCHA_SECRET_KEY", "")
    verify_url = getattr(settings, "RECAPTCHA_VERIFY_URL", "https://www.google.com/recaptcha/api/siteverify")
    
    if not secret_key:
        logger.error("RECAPTCHA_SECRET_KEY not configured in settings")
        return {
            "success": False,
            "error": "reCAPTCHA not properly configured",
            "error_codes": ["missing-secret-key"]
        }
    
    # Prepare verification data
    verification_data = {
        "secret": secret_key,
        "response": recaptcha_response,
    }
    
    # Add IP address if provided
    if user_ip:
        verification_data["remoteip"] = user_ip
    
    try:
        # Make request to Google verification endpoint
        response = requests.post(
            verify_url,
            data=verification_data,
            timeout=10,  # 10 second timeout
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Parse JSON response
        result = response.json()
        
        # Log the verification attempt
        if result.get("success"):
            score = result.get("score", "N/A")
            logger.info(f"reCAPTCHA verification successful. Score: {score}")
        else:
            error_codes = result.get("error-codes", [])
            logger.warning(f"reCAPTCHA verification failed. Error codes: {error_codes}")
        
        return {
            "success": result.get("success", False),
            "score": result.get("score"),  # For reCAPTCHA v3
            "action": result.get("action"),  # For reCAPTCHA v3
            "challenge_ts": result.get("challenge_ts"),  # Timestamp of challenge
            "hostname": result.get("hostname"),  # Hostname of the site where reCAPTCHA was solved
            "error_codes": result.get("error-codes", []),
            "raw_response": result
        }
        
    except requests.RequestException as e:
        logger.error(f"Network error during reCAPTCHA verification: {str(e)}")
        return {
            "success": False,
            "error": f"Network error: {str(e)}",
            "error_codes": ["network-error"]
        }
        
    except ValueError as e:
        logger.error(f"Invalid JSON response from reCAPTCHA verification: {str(e)}")
        return {
            "success": False,
            "error": "Invalid response from reCAPTCHA service",
            "error_codes": ["invalid-json-response"]
        }
        
    except Exception as e:
        logger.error(f"Unexpected error during reCAPTCHA verification: {str(e)}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "error_codes": ["unexpected-error"]
        }


def verify_recaptcha_v3(recaptcha_response: str, expected_action: str = None, min_score: float = 0.5, user_ip: Optional[str] = None) -> Dict[str, any]:
    """
    Verify reCAPTCHA v3 response with score and action validation.
    
    Args:
        recaptcha_response: The reCAPTCHA response token from the frontend
        expected_action: Expected action name (e.g., 'password_reset', 'login')
        min_score: Minimum score threshold (0.0 to 1.0, default: 0.5)
        user_ip: Optional user IP address for additional verification
        
    Returns:
        Dict containing verification result and details
    """
    # First verify with Google
    result = verify_recaptcha(recaptcha_response, user_ip)
    
    if not result["success"]:
        return result
    
    # Additional v3-specific validation
    score = result.get("score")
    action = result.get("action")
    
    # Check score threshold
    if score is not None and score < min_score:
        logger.warning(f"reCAPTCHA score {score} below threshold {min_score}")
        return {
            "success": False,
            "error": f"reCAPTCHA score {score} below required threshold {min_score}",
            "error_codes": ["score-too-low"],
            "score": score,
            "min_score": min_score
        }
    
    # Check action if specified
    if expected_action and action != expected_action:
        logger.warning(f"reCAPTCHA action '{action}' does not match expected '{expected_action}'")
        return {
            "success": False,
            "error": f"reCAPTCHA action '{action}' does not match expected '{expected_action}'",
            "error_codes": ["action-mismatch"],
            "action": action,
            "expected_action": expected_action
        }
    
    logger.info(f"reCAPTCHA v3 verification successful. Score: {score}, Action: {action}")
    return result


def is_recaptcha_enabled() -> bool:
    """
    Check if reCAPTCHA is properly configured and enabled.
    
    Returns:
        True if reCAPTCHA is enabled and configured, False otherwise
    """
    site_key = getattr(settings, "RECAPTCHA_SITE_KEY", "")
    secret_key = getattr(settings, "RECAPTCHA_SECRET_KEY", "")
    
    return bool(site_key and secret_key)


def get_client_ip(request) -> Optional[str]:
    """
    Get the client IP address from the request.
    
    Args:
        request: Django request object
        
    Returns:
        Client IP address as string, or None if not found
    """
    # Check for IP in headers (in case of proxy/load balancer)
    ip = request.META.get("HTTP_X_FORWARDED_FOR")
    if ip:
        # X-Forwarded-For can contain multiple IPs, get the first one
        ip = ip.split(",")[0].strip()
    else:
        # Fallback to direct connection IP
        ip = request.META.get("REMOTE_ADDR")
    
    return ip 