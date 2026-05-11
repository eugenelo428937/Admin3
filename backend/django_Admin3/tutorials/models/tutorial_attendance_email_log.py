"""TutorialAttendanceEmailLog — idempotency log for the daily attendance email job.

One row per (session, instructor) once the email has been successfully queued.
Unique constraint prevents the daily cron from emailing twice if re-run.
"""
from django.db import models


class TutorialAttendanceEmailLog(models.Model):
    session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.CASCADE,
        related_name='attendance_email_logs',
    )
    instructor = models.ForeignKey(
        'tutorials.TutorialInstructor', on_delete=models.CASCADE,
        related_name='+',
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    email_queue = models.ForeignKey(
        'email_system.EmailQueue', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )
    token_issued_at = models.DateTimeField()

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance_email_log"'
        verbose_name = 'Tutorial Attendance Email Log'
        verbose_name_plural = 'Tutorial Attendance Email Logs'
        unique_together = [('session', 'instructor')]

    def __str__(self):
        return f"AttendanceEmailLog(session={self.session_id}, instructor={self.instructor_id})"
