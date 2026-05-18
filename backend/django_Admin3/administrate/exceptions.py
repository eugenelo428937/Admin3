class AdministrateError(Exception):
    """Base exception for Administrate API errors"""
    pass

class AdministrateAuthError(AdministrateError):
    """Authentication related errors"""
    pass

class AdministrateAPIError(AdministrateError):
    """API call related errors"""
    pass


class MissingDependencyError(Exception):
    """Raised by webhook handlers when a referenced FK target (course_template,
    location, instructor, venue) has no local row with the given external_id.

    The task layer logs this, marks the inbox row failed/dead, and surfaces
    it to the operator who runs the relevant `sync_*` management command and
    replays via `administrate_webhooks_inbox replay`.
    """

    def __init__(self, model_name: str, external_id: str):
        self.model_name = model_name
        self.external_id = external_id
        super().__init__(
            f'No local {model_name} with external_id={external_id!r}; '
            f'run the corresponding sync_* command and replay'
        )
