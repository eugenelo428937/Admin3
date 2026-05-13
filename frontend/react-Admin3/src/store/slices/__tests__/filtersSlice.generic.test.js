import filtersReducer, {
  setFilter,
  toggleFilter,
  removeFilter,
  clearFilterKey,
  clearAllFilters,
  setScalar,
} from '../filtersSlice';

describe('filtersSlice generic actions', () => {
  let state;
  beforeEach(() => {
    state = filtersReducer(undefined, { type: '@@INIT' });
  });

  it('initial state has byKey + scalar bags', () => {
    expect(state.byKey).toEqual({});
    expect(state.scalar).toEqual({});
  });

  it('setFilter overwrites byKey[key]', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1', 'CB2'] }));
    expect(state.byKey.subjects).toEqual(['CB1', 'CB2']);

    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB3'] }));
    expect(state.byKey.subjects).toEqual(['CB3']);
  });

  it('toggleFilter adds then removes', () => {
    state = filtersReducer(state, toggleFilter({ filterKey: 'categories', value: 'Material' }));
    expect(state.byKey.categories).toEqual(['Material']);

    state = filtersReducer(state, toggleFilter({ filterKey: 'categories', value: 'Material' }));
    expect(state.byKey.categories).toEqual([]);
  });

  it('removeFilter removes a specific value', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'product_types', values: ['A', 'B', 'C'] }));
    state = filtersReducer(state, removeFilter({ filterKey: 'product_types', value: 'B' }));
    expect(state.byKey.product_types).toEqual(['A', 'C']);
  });

  it('clearFilterKey empties one key only', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    state = filtersReducer(state, setFilter({ filterKey: 'categories', values: ['Material'] }));
    state = filtersReducer(state, clearFilterKey('subjects'));
    expect(state.byKey.subjects).toBeUndefined();
    expect(state.byKey.categories).toEqual(['Material']);
  });

  it('clearAllFilters empties byKey + scalar', () => {
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    state = filtersReducer(state, setScalar({ filterKey: 'searchQuery', value: 'exam' }));
    state = filtersReducer(state, clearAllFilters());
    expect(state.byKey).toEqual({});
    expect(state.scalar).toEqual({});
  });

  it('setScalar updates the scalar bag', () => {
    state = filtersReducer(state, setScalar({ filterKey: 'searchQuery', value: 'tutorial' }));
    expect(state.scalar.searchQuery).toBe('tutorial');
  });

  it('setFilter resets currentPage to 1', () => {
    state = { ...state, currentPage: 5 };
    state = filtersReducer(state, setFilter({ filterKey: 'subjects', values: ['CB1'] }));
    expect(state.currentPage).toBe(1);
  });
});
