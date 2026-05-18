"""adm.contacts: thin bridge between Administrate Contacts and acted.students.

Administrate's `Contact` corresponds 1:1 with our `students.Student` (one
person record per side). The join key from the Administrate side is the
contact `id`. The join key from our side is `Student.student_ref` (the
AutoField primary key), which Administrate happens to store in the
contact's `personalName.middleName` field — a long-standing domain
quirk we documented in the Learner Created webhook handler.

The bridge gives us:
  - O(1) `external_id` -> Student resolution for inbound webhooks
    (Contact Created/Updated, Learner Created via lazy resolve).
  - A SET_NULL FK so deleting / soft-removing a Student doesn't kill
    the audit row that the webhook receipt history still references.

Per the session+learner webhook expansion (2026-05-18), this model is a
pure mapper — no data columns of its own beyond timestamps.
"""
from django.db import models


class Contact(models.Model):

    # Administrate's `Contact` id (Relay base64). Unique because there
    # is exactly one Administrate contact per person on their side.
    external_id = models.CharField(
        max_length=50, null=True, blank=True, unique=True,
    )

    # The student row this contact represents. OneToOne because the
    # contact ↔ student relationship is genuinely 1:1; if two
    # Administrate contacts ever pointed at the same student that would
    # be a data-quality bug, not something to model. Cross-schema FK
    # (adm -> acted) is handled natively by PostgreSQL.
    student = models.OneToOneField(
        'students.Student',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_contact',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."contacts"'
        ordering = ['external_id']
        verbose_name = 'Administrate Contact Bridge'
        verbose_name_plural = 'Administrate Contact Bridges'

    def __str__(self):
        if self.student_id:
            return f"adm.Contact[{self.external_id}] -> Student#{self.student_id}"
        return f"adm.Contact[{self.external_id}] (unlinked)"
