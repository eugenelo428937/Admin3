"""Tests for the FilterHandler ABC and the three concrete handlers."""
import pytest
from django.db.models import Q
from filtering.services.filter_handlers import FilterHandler, FILTER_HANDLERS


def test_filter_handler_is_abstract():
    """FilterHandler cannot be instantiated directly."""
    with pytest.raises(TypeError):
        FilterHandler()


def test_filter_handlers_registry_has_expected_handlers():
    """FILTER_HANDLERS dict ships with the original three handlers plus
    the three Phase 4a subclass-aware handlers."""
    assert set(FILTER_HANDLERS.keys()) == {
        'subject', 'subject_type', 'filter_group',
        'tutorial_format', 'tutorial_location', 'marking_template',
    }


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


@pytest.mark.django_db
def test_filter_group_handler_get_options_returns_assigned_groups():
    from filtering.models import (
        FilterConfiguration, FilterGroup, FilterConfigurationGroup,
    )
    from filtering.services.filter_handlers import FilterGroupHandler

    fc = FilterConfiguration.objects.create(
        name='TEST_CAT', filter_key='test_cat', filter_type='filter_group',
        display_label='Test Category',
    )
    fg1 = FilterGroup.objects.create(name='Alpha', code='alpha', display_order=1)
    fg2 = FilterGroup.objects.create(name='Beta',  code='beta',  display_order=2)
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg1)
    FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg2)

    handler = FilterGroupHandler()
    options = handler.get_options(fc)

    assert [o['value'] for o in options] == ['Alpha', 'Beta']
    assert options[0]['label'] == 'Alpha'


@pytest.mark.django_db
def test_filter_group_handler_build_q():
    """build_q produces a subquery-based Q (id__in=<QuerySet>) so the JOIN
    for filtering doesn't share an alias with the count-path JOIN. See the
    inline comment in FilterGroupHandler.build_q for why.
    """
    from filtering.services.filter_handlers import FilterGroupHandler
    handler = FilterGroupHandler()
    q = handler.build_q(config=None, values=['Material', 'Marking'])

    # One child: id__in with a QuerySet value.
    assert len(q.children) == 1
    field, subquery = q.children[0]
    assert field == 'id__in'
    # The subquery filters StoreProduct by product_group name.
    sql = str(subquery.query)
    assert 'product_group' in sql or 'filter_product_product_groups' in sql.lower()


def test_filter_group_handler_count_path():
    from filtering.services.filter_handlers import FilterGroupHandler
    handler = FilterGroupHandler()
    assert handler.count_path(config=None) == \
        'product_product_variation__product_groups__product_group__name'
