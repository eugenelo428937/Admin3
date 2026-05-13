"""Tests for the FilterHandler ABC and the three concrete handlers."""
import pytest
from django.db.models import Q
from filtering.services.filter_handlers import FilterHandler, FILTER_HANDLERS


def test_filter_handler_is_abstract():
    """FilterHandler cannot be instantiated directly."""
    with pytest.raises(TypeError):
        FilterHandler()


def test_filter_handlers_registry_has_three_handlers():
    """FILTER_HANDLERS dict ships with subject, subject_type, filter_group."""
    assert set(FILTER_HANDLERS.keys()) == {'subject', 'subject_type', 'filter_group'}


def test_filter_handlers_all_implement_required_methods():
    """Each handler must implement get_options, build_q, count_path."""
    for filter_type, handler in FILTER_HANDLERS.items():
        assert callable(handler.get_options), \
            f"{filter_type} handler missing get_options"
        assert callable(handler.build_q), \
            f"{filter_type} handler missing build_q"
        assert callable(handler.count_path), \
            f"{filter_type} handler missing count_path"


@pytest.mark.django_db
def test_subject_handler_get_options_returns_active_subjects():
    from catalog.models import Subject
    from filtering.services.filter_handlers import SubjectHandler

    Subject.objects.create(code='ZZ1', description='Active', active=True)
    Subject.objects.create(code='ZZ2', description='Inactive', active=False)

    handler = SubjectHandler()
    options = handler.get_options(config=None)  # config unused for subject

    codes = [o['value'] for o in options]
    assert 'ZZ1' in codes
    assert 'ZZ2' not in codes
    # Each option has value + label
    opt = next(o for o in options if o['value'] == 'ZZ1')
    assert opt['label'].startswith('ZZ1')


@pytest.mark.django_db
def test_subject_handler_build_q():
    from filtering.services.filter_handlers import SubjectHandler

    handler = SubjectHandler()
    q = handler.build_q(config=None, values=['CB1', 'CB2'])

    # Children of Q should match exam_session_subject__subject__code__in
    assert q.children == [
        ('exam_session_subject__subject__code__in', ['CB1', 'CB2'])
    ]


def test_subject_handler_count_path():
    from filtering.services.filter_handlers import SubjectHandler
    handler = SubjectHandler()
    assert handler.count_path(config=None) == \
        'exam_session_subject__subject__code'


def test_subject_type_handler_get_options_returns_text_choices():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    options = handler.get_options(config=None)

    values = {o['value'] for o in options}
    assert values == {'UK', 'SA', 'CAA', 'PMS'}

    uk = next(o for o in options if o['value'] == 'UK')
    assert uk['label'] == 'UK Exam'


def test_subject_type_handler_build_q():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    q = handler.build_q(config=None, values=['UK', 'SA'])
    assert q.children == [
        ('exam_session_subject__subject__subject_type__in', ['UK', 'SA'])
    ]


def test_subject_type_handler_count_path():
    from filtering.services.filter_handlers import SubjectTypeHandler
    handler = SubjectTypeHandler()
    assert handler.count_path(config=None) == \
        'exam_session_subject__subject__subject_type'
