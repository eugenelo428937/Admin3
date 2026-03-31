import logging
import time
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from email_system.services.queue_service import email_queue_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process pending emails from the email queue'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of emails to process in one batch (default: 50)'
        )

        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Run continuously, processing emails as they arrive'
        )

        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Interval in seconds between processing batches in continuous mode (default: 30)'
        )

        parser.add_argument(
            '--priority',
            type=str,
            choices=['urgent', 'high', 'normal', 'low'],
            help='Process only emails with specified priority'
        )

        parser.add_argument(
            '--template',
            type=str,
            help='Process only emails for specified template'
        )

        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually sending emails'
        )

        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed queue stats before and after processing'
        )

    def _suppress_noisy_loggers(self):
        """Suppress non-critical library loggers (e.g. css_inline MediaQuery warnings)."""
        for name in ('css_inline', 'cssutils', 'premailer', 'PIL', 'parso'):
            logging.getLogger(name).setLevel(logging.CRITICAL)

    def _show_email_config(self):
        """Print email configuration summary."""
        use_internal = getattr(settings, 'USE_INTERNAL_SMTP', False)
        email_host = getattr(settings, 'EMAIL_HOST', 'not set')
        self.stdout.write(f'USE_INTERNAL_SMTP : {use_internal}')
        self.stdout.write(f'EMAIL_HOST : {email_host}')

    def handle(self, *args, **options):
        self._suppress_noisy_loggers()

        limit = options['limit']
        continuous = options['continuous']
        interval = options['interval']
        priority_filter = options.get('priority')
        template_filter = options.get('template')
        dry_run = options['dry_run']
        verbose = options['verbose']

        self._show_email_config()
        self.stdout.write('')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No emails will be sent'))

        try:
            if continuous:
                self.run_continuous(limit, interval, priority_filter, template_filter, dry_run, verbose)
            else:
                self.run_single_batch(limit, priority_filter, template_filter, dry_run, verbose)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nGracefully shutting down email queue processor...'))
        except Exception as e:
            raise CommandError(f'Email queue processing failed: {str(e)}')

    def run_single_batch(self, limit, priority_filter, template_filter, dry_run, verbose=False):
        """Process a single batch of emails."""
        if dry_run:
            pending_count = self.get_pending_count(priority_filter, template_filter)
            self.stdout.write(f'Would process {min(pending_count, limit)} emails')
            return

        if verbose:
            stats = email_queue_service.get_queue_stats()
            self.display_queue_stats(stats, 'Before Processing')

        # Process the queue
        start_time = timezone.now()
        results = email_queue_service.process_pending_queue(limit)
        processing_time = (timezone.now() - start_time).total_seconds()

        # Display results
        self.display_processing_results(results, processing_time)

        if verbose:
            stats = email_queue_service.get_queue_stats()
            self.display_queue_stats(stats, 'After Processing')

    def run_continuous(self, limit, interval, priority_filter, template_filter, dry_run, verbose=False):
        """Run continuously, processing emails at regular intervals."""
        self.stdout.write(f'Starting continuous email queue processor...')
        self.stdout.write(f'Batch size: {limit}, Interval: {interval}s')
        if priority_filter:
            self.stdout.write(f'Priority filter: {priority_filter}')
        if template_filter:
            self.stdout.write(f'Template filter: {template_filter}')
        self.stdout.write('Press Ctrl+C to stop')

        cycles = 0
        total_processed = 0
        total_successful = 0
        total_failed = 0

        while True:
            try:
                cycles += 1
                if verbose:
                    self.stdout.write(f'\n--- Cycle {cycles} at {timezone.now().strftime("%Y-%m-%d %H:%M:%S")} ---')

                if dry_run:
                    pending_count = self.get_pending_count(priority_filter, template_filter)
                    self.stdout.write(f'Would process {min(pending_count, limit)} emails')
                else:
                    # Process batch
                    start_time = timezone.now()
                    results = email_queue_service.process_pending_queue(limit)
                    processing_time = (timezone.now() - start_time).total_seconds()

                    # Update totals
                    total_processed += results['processed']
                    total_successful += results['successful']
                    total_failed += results['failed']

                    # Display results
                    if results['processed'] > 0:
                        self.display_processing_results(results, processing_time)
                    else:
                        self.stdout.write('No emails to process')

                    if verbose:
                        self.stdout.write(f'Running totals: {total_processed} processed, {total_successful} successful, {total_failed} failed')

                # Wait for next cycle
                if not dry_run or cycles == 1:  # In dry run, only show once
                    time.sleep(interval)
                else:
                    break

            except KeyboardInterrupt:
                break
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error in processing cycle: {str(e)}'))
                logger.error(f'Error in email queue processing cycle: {str(e)}')
                time.sleep(interval)  # Wait before retrying

        if not dry_run:
            self.stdout.write(f'\nFinal totals: {total_processed} processed, {total_successful} successful, {total_failed} failed')

    def get_pending_count(self, priority_filter, template_filter):
        """Get count of pending emails with filters."""
        from email_system.models import EmailQueue
        from django.db.models import Q

        now = timezone.now()
        queryset = EmailQueue.objects.filter(
            status__in=['pending', 'retry'],
            process_after__lte=now
        ).exclude(
            expires_at__lt=now
        )

        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)

        if template_filter:
            queryset = queryset.filter(template__name=template_filter)

        return queryset.count()

    def display_queue_stats(self, stats, title):
        """Display queue statistics."""
        self.stdout.write(f'\n{title}:')
        self.stdout.write(f'  Total queue items: {stats["total"]}')
        self.stdout.write(f'  Pending: {stats["pending"]}')
        self.stdout.write(f'  Processing: {stats["processing"]}')
        self.stdout.write(f'  Sent: {stats["sent"]}')
        self.stdout.write(f'  Failed: {stats["failed"]}')
        self.stdout.write(f'  Retry: {stats["retry"]}')
        self.stdout.write(f'  Cancelled: {stats["cancelled"]}')

        if 'total_logs' in stats:
            self.stdout.write(f'\nEmail Logs:')
            self.stdout.write(f'  Total logs: {stats["total_logs"]}')
            self.stdout.write(f'  Sent: {stats["sent_logs"]}')
            self.stdout.write(f'  Opened: {stats["opened_logs"]}')
            self.stdout.write(f'  Clicked: {stats["clicked_logs"]}')
            self.stdout.write(f'  Failed: {stats["failed_logs"]}')

    def display_processing_results(self, results, processing_time):
        """Display processing results."""
        # Show errors first (most important)
        if results['errors']:
            self.stdout.write('')
            for error in results['errors']:
                self.stdout.write(self.style.ERROR(f'  ERROR {error}'))

        self.stdout.write(f'\nProcessing Results:')
        self.stdout.write(f'  Processed: {results["processed"]} emails')
        self.stdout.write(f'  Successful: {results["successful"]}')
        self.stdout.write(f'  Failed: {results["failed"]}')
