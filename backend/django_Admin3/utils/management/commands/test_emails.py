import json
from django.core.management.base import BaseCommand, CommandError
from utils.email_testing import email_tester

class Command(BaseCommand):
    help = 'Test and preview email templates for cross-client compatibility'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['preview', 'send', 'validate', 'report', 'outlook-test'],
            help='Action to perform: preview, send, validate, report, or outlook-test'
        )
        
        parser.add_argument(
            '--template',
            type=str,
            choices=[
                'master_template', 'order_confirmation', 'password_reset', 'password_reset_completed', 'account_activation', 'email_verification', 'sample_email',
                'order_confirmation_content', 'password_reset_content', 'password_reset_completed_content', 'account_activation_content', 'email_verification_content', 'email_verification_content'
            ],
            help='Email template to test'
        )
        
        parser.add_argument(
            '--format',
            type=str,
            choices=['html', 'text', 'inlined', 'mjml', 'outlook'],
            default='html',
            help='Output format for preview (default: html). Use "outlook" for MJML + Premailer enhanced version'
        )
        
        parser.add_argument(
            '--use-html',
            action='store_true',
            help='Force use of HTML templates instead of MJML'
        )
        
        parser.add_argument(
            '--enhance-outlook',
            action='store_true',
            help='Apply Outlook compatibility enhancements to MJML output (combines MJML + Premailer)'
        )
        
        parser.add_argument(
            '--email',
            type=str,
            help='Email address to send test email to'
        )
        
        parser.add_argument(
            '--output',
            type=str,
            default='./email_previews/',
            help='Output directory for preview files (default: ./email_previews/)'
        )
        
        parser.add_argument(
            '--save',
            action='store_true',
            help='Save preview to file'
        )

    def handle(self, *args, **options):
        action = options['action']
        template = options.get('template')
        
        try:
            if action == 'preview':
                self.handle_preview(options)
            elif action == 'send':
                self.handle_send(options)
            elif action == 'validate':
                self.handle_validate(options)
            elif action == 'report':
                self.handle_report(options)
            elif action == 'outlook-test':
                self.handle_outlook_test(options)
                
        except Exception as e:
            raise CommandError(f'Email testing failed: {str(e)}')

    def handle_preview(self, options):
        """Handle email template preview."""
        template = options.get('template')
        if not template:
            raise CommandError('Template name is required for preview action')
        
        format_type = options.get('format', 'html')
        save_to_file = options.get('save', False)
        use_mjml = not options.get('use_html', False)  # Use MJML unless --use-html is specified
        enhance_outlook = options.get('enhance_outlook', False) or format_type == 'outlook'
        
        template_type = "MJML" if use_mjml else "HTML"
        enhancement_note = " + Premailer" if enhance_outlook else ""
        
        self.stdout.write(f'Previewing template: {template} (format: {format_type}, type: {template_type}{enhancement_note})')
        
        try:
            content = email_tester.preview_template(template, format_type, use_mjml, enhance_outlook)
            
            if save_to_file:
                email_tester.save_preview_to_file(template, options.get('output'), use_mjml, include_outlook_enhanced=True)
                self.stdout.write(
                    self.style.SUCCESS(f'Preview saved to {options.get("output")}')
                )
            else:
                self.stdout.write('\n' + '='*80)
                self.stdout.write(f'PREVIEW: {template}.{format_type} ({template_type}{enhancement_note})')
                self.stdout.write('='*80)
                self.stdout.write(content)
                self.stdout.write('='*80 + '\n')
                
        except Exception as e:
            raise CommandError(f'Failed to preview template: {str(e)}')

    def handle_send(self, options):
        """Handle sending test email."""
        template = options.get('template')
        email = options.get('email')
        
        if not template:
            raise CommandError('Template name is required for send action')
        if not email:
            raise CommandError('Email address is required for send action')
        
        self.stdout.write(f'Sending test email: {template} to {email}')
        
        try:
            success = email_tester.test_send_email(template, email)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'Test email sent successfully to {email}')
                )
            else:
                raise CommandError('Failed to send test email')
                
        except Exception as e:
            raise CommandError(f'Failed to send test email: {str(e)}')

    def handle_validate(self, options):
        """Handle email template validation."""
        template = options.get('template')
        
        if not template:
            raise CommandError('Template name is required for validate action')
        
        self.stdout.write(f'Validating template: {template}')
        
        try:
            report = email_tester.validate_email_compatibility(template)
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write(f'VALIDATION REPORT: {template}')
            self.stdout.write('='*60)
            
            # Display compatibility score
            score = report.get('compatibility_score', 0)
            if score >= 90:
                score_style = self.style.SUCCESS
            elif score >= 70:
                score_style = self.style.WARNING
            else:
                score_style = self.style.ERROR
            
            self.stdout.write(f'Compatibility Score: {score_style(str(score))}/100')
            
            # Display issues
            issues = report.get('issues', [])
            if issues:
                self.stdout.write('\nIssues Found:')
                for issue in issues:
                    self.stdout.write(f'  ⚠️  {issue}')
            else:
                self.stdout.write(self.style.SUCCESS('\n✅ No compatibility issues found'))
            
            # Display recommendations
            recommendations = report.get('recommendations', [])
            if recommendations:
                self.stdout.write('\nRecommendations:')
                for rec in recommendations:
                    self.stdout.write(f'  💡 {rec}')
            
            self.stdout.write('='*60 + '\n')
            
        except Exception as e:
            raise CommandError(f'Failed to validate template: {str(e)}')

    def handle_report(self, options):
        """Handle generating comprehensive test report."""
        template = options.get('template')
        
        self.stdout.write('Generating email template test report...')
        
        try:
            if template:
                templates = [template]
            else:
                templates = ['order_confirmation', 'password_reset', 'account_activation']
            
            report = email_tester.generate_test_report(templates)
            
            # Display overall results
            self.stdout.write('\n' + '='*80)
            self.stdout.write('EMAIL TEMPLATE TEST REPORT')
            self.stdout.write('='*80)
            
            overall_score = report.get('overall_score', 0)
            templates_tested = report.get('templates_tested', 0)
            
            if overall_score >= 90:
                score_style = self.style.SUCCESS
            elif overall_score >= 70:
                score_style = self.style.WARNING
            else:
                score_style = self.style.ERROR
            
            self.stdout.write(f'Templates Tested: {templates_tested}')
            self.stdout.write(f'Overall Score: {score_style(f"{overall_score:.1f}")}/100')
            self.stdout.write(f'Test Date: {report.get("test_timestamp", "Unknown")}')
            
            # Display individual template results
            template_reports = report.get('template_reports', [])
            for template_report in template_reports:
                template_name = template_report.get('template', 'Unknown')
                template_score = template_report.get('compatibility_score', 0)
                template_issues = len(template_report.get('issues', []))
                
                if template_score >= 90:
                    status = self.style.SUCCESS('✅ EXCELLENT')
                elif template_score >= 70:
                    status = self.style.WARNING('⚠️  GOOD')
                else:
                    status = self.style.ERROR('❌ NEEDS WORK')
                
                self.stdout.write(f'\n{template_name}: {status} ({template_score}/100)')
                if template_issues > 0:
                    self.stdout.write(f'  Issues: {template_issues}')
            
            # Save detailed report to file
            report_file = f'email_test_report_{report.get("test_timestamp", "").replace(":", "-")}.json'
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            self.stdout.write(f'\nDetailed report saved to: {report_file}')
            self.stdout.write('='*80 + '\n')
            
        except Exception as e:
            raise CommandError(f'Failed to generate test report: {str(e)}')

    def handle_outlook_test(self, options):
        """Handle Outlook compatibility testing."""
        template = options.get('template')
        if not template:
            raise CommandError('Template name is required for outlook-test action')
        
        self.stdout.write(f'Testing Outlook compatibility for template: {template}')
        
        try:
            results = email_tester.test_outlook_compatibility(template)
            
            if 'error' in results:
                raise CommandError(f'Outlook test failed: {results["error"]}')
            
            # Display comparison results
            comparison = results.get('comparison', {})
            
            self.stdout.write('\n' + '='*80)
            self.stdout.write('OUTLOOK COMPATIBILITY TEST RESULTS')
            self.stdout.write('='*80)
            self.stdout.write(f'Template: {template}')
            self.stdout.write(f'Regular MJML size: {comparison.get("regular_size", 0)} characters')
            self.stdout.write(f'Enhanced size: {comparison.get("enhanced_size", 0)} characters')
            self.stdout.write(f'Size difference: +{comparison.get("size_difference", 0)} characters')
            self.stdout.write(f'Enhancement applied: {"Yes" if comparison.get("enhancement_applied", False) else "No"}')
            self.stdout.write('='*80)
            
            # Save both versions to files for comparison
            output_dir = options.get('output', './email_previews/')
            
            # Save regular version
            with open(f'{output_dir}/{template}_mjml_regular.html', 'w', encoding='utf-8') as f:
                f.write(results['mjml_regular'])
                
            # Save enhanced version  
            with open(f'{output_dir}/{template}_mjml_outlook_enhanced.html', 'w', encoding='utf-8') as f:
                f.write(results['mjml_outlook_enhanced'])
            
            self.stdout.write(self.style.SUCCESS(f'Comparison files saved to {output_dir}'))
            self.stdout.write(self.style.WARNING('Test both versions in desktop Outlook to compare rendering quality'))
            
        except Exception as e:
            raise CommandError(f'Failed to test Outlook compatibility: {str(e)}') 