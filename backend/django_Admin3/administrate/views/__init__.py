# Re-export view classes for `from administrate.views import X` callers.
from administrate.views.webhooks import AdministrateWebhookView  # noqa: F401
# Backward-compat alias: Phase 6 (2026-05-18) renamed the view from
# `AdministrateEventWebhookView` to `AdministrateWebhookView` (it's now
# polymorphic). Keep the old name resolvable so external imports don't
# break.
AdministrateEventWebhookView = AdministrateWebhookView
