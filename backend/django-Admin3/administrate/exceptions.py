class AdministrateError(Exception):
    """Base exception for Administrate API errors"""
    pass

class AdministrateAuthError(AdministrateError):
    """Authentication related errors"""
    pass

class AdministrateAPIError(AdministrateError):
    """API call related errors"""
    pass
