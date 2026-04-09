import re

from django.core.exceptions import ValidationError
from django.db import models


# Segment may be a plain identifier, optionally followed by "[]" as a complete marker.
_SEGMENT_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*(\[\])?$')


class EmailVariable(models.Model):
    """Global catalog of template variables available for email template editing."""

    DATA_TYPES = [
        ('string', 'String'),
        ('int', 'Integer'),
        ('float', 'Float'),
        ('bool', 'Boolean'),
        ('object', 'Object'),
        ('array', 'Array'),
    ]

    CONTAINER_TYPES = ('object', 'array')

    display_name = models.CharField(
        max_length=100,
        help_text="Human-readable label shown in the template editor (e.g. 'First Name')",
    )
    variable_path = models.CharField(
        max_length=200,
        unique=True,
        help_text="Dot-notation path used in templates (e.g. 'user.first_name')",
    )
    data_type = models.CharField(
        max_length=20,
        choices=DATA_TYPES,
        default='string',
        help_text="Expected data type for payload validation",
    )
    default_value = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Default value when payload omits this variable",
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Help text for staff editing templates",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'utils_email_variables'
        ordering = ['variable_path']
        verbose_name = 'Email Variable'
        verbose_name_plural = 'Email Variables'

    def __str__(self):
        return f"{self.display_name} ({self.variable_path})"

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def clean(self):
        super().clean()
        path = (self.variable_path or '').strip()
        if not path:
            raise ValidationError({'variable_path': 'variable_path is required.'})

        segments = path.split('.')

        # Rule 1: "[]" may appear only as a complete segment marker.
        for seg in segments:
            if not seg:
                raise ValidationError({
                    'variable_path': f"Invalid path '{path}': empty segment.",
                })
            if not _SEGMENT_RE.match(seg):
                raise ValidationError({
                    'variable_path': (
                        f"Invalid segment '{seg}' in path '{path}'. "
                        "'[]' may appear only as a complete segment suffix "
                        "(e.g. 'items[]'), never bare '[]' or 'items[]x'."
                    ),
                })

        # Rule 2: any path containing a foo[] segment requires a row at that
        # exact path prefix (including the [] suffix) with data_type='array'.
        # The array row itself lives at 'foo[]', not at 'foo' — one row per
        # array, serving both as the array definition and as the drill-in
        # node in the picker.
        for i, seg in enumerate(segments):
            if seg.endswith('[]'):
                required_path = '.'.join(segments[:i + 1])
                # Case A: this row IS the required array row.
                if path == required_path:
                    if self.data_type != 'array':
                        raise ValidationError({
                            'data_type': (
                                f"Path '{path}' ends with an array segment "
                                f"'{seg}', so data_type must be 'array' "
                                f"(got '{self.data_type}')."
                            ),
                        })
                    continue
                # Case B: the required array row must already exist as an ancestor.
                qs = EmailVariable.objects.filter(variable_path=required_path)
                if self.pk:
                    qs = qs.exclude(pk=self.pk)
                required = qs.first()
                if required is None:
                    raise ValidationError({
                        'variable_path': (
                            f"Path '{path}' references array segment '{seg}' "
                            f"but no row exists at '{required_path}'. Create an "
                            f"EmailVariable with variable_path='{required_path}' "
                            f"and data_type='array' first."
                        ),
                    })
                if required.data_type != 'array':
                    raise ValidationError({
                        'variable_path': (
                            f"Path '{path}' references array segment '{seg}' "
                            f"but row at '{required_path}' has data_type="
                            f"'{required.data_type}', expected 'array'."
                        ),
                    })

        # Rule 3: container rows must have empty default_value.
        if self.data_type in self.CONTAINER_TYPES and self.default_value != '':
            raise ValidationError({
                'default_value': (
                    f"Rows with data_type='{self.data_type}' must have an "
                    "empty default_value."
                ),
            })

        # Rule 4: array rows must live at a path ending in '[]'. Non-array
        # rows must NOT end in '[]'. This keeps the picker's iteration
        # semantics unambiguous: the [] suffix is how descendants and the
        # frontend tree builder recognize element scope.
        path_ends_with_bracket = path.endswith('[]')
        if self.data_type == 'array' and not path_ends_with_bracket:
            raise ValidationError({
                'variable_path': (
                    f"Array rows must have a variable_path ending in '[]' "
                    f"(got '{path}'). Register this row at '{path}[]' instead."
                ),
            })
        if self.data_type != 'array' and path_ends_with_bracket:
            raise ValidationError({
                'data_type': (
                    f"Path '{path}' ends with '[]' so data_type must be "
                    f"'array' (got '{self.data_type}')."
                ),
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


def _title_case_segment(segment: str) -> str:
    """Turn 'first_name' into 'First Name'. Strips trailing '[]'."""
    base = segment[:-2] if segment.endswith('[]') else segment
    return base.replace('_', ' ').strip().title()


def ancestor_paths(path: str):
    """Yield (ancestor_path, segment) for each strict ancestor of ``path``.

    'order.items[].amount.vat' → [
        ('order',                 'order'),
        ('order.items[]',         'items[]'),
        ('order.items[].amount',  'amount'),
    ]
    The leaf itself is not yielded.
    """
    segments = path.split('.')
    for i in range(1, len(segments)):
        yield '.'.join(segments[:i]), segments[i - 1]


def ensure_ancestor_rows(model, leaf_path: str) -> int:
    """Create missing ``object`` ancestor rows for ``leaf_path``.

    ``model`` is either ``EmailVariable`` (runtime) or the historical model
    from a migration apps registry. Returns the number of rows created.
    Skips ancestors whose last segment is ``foo[]`` — those refer to array
    element shapes and must be registered explicitly as ``array`` rows.
    """
    created = 0
    for anc_path, segment in ancestor_paths(leaf_path):
        # Skip array-element ancestor paths like 'order.items[]': the array
        # row lives at 'order.items' and must be created explicitly.
        if segment.endswith('[]'):
            continue
        if not model.objects.filter(variable_path=anc_path).exists():
            model.objects.create(
                variable_path=anc_path,
                display_name=_title_case_segment(segment),
                data_type='object',
                default_value='',
                description='',
                is_active=True,
            )
            created += 1
    return created
