/**
 * Unit Tests for CartPanel Tutorial Item Removal Logic
 * Tests the handleRemoveItem function's ability to extract subject code from cart items
 *
 * T022: Cart removal should restore choices to draft state for the specific subject
 */

describe('CartPanel handleRemoveItem - Subject Code Extraction', () => {
  // Mock functions
  const mockRestoreChoicesToDraft = jest.fn();
  const mockRemoveFromCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Simulate the current handleRemoveItem implementation
   * This is the BUGGY version that only checks item.subject_code
   */
  const handleRemoveItem_Current = (item) => {
    // Check if this is a tutorial item
    if (item.product_type === 'tutorial' && item.subject_code) {
      // Restore tutorial choices to draft state for this subject
      mockRestoreChoicesToDraft(item.subject_code);
    }
    // Remove from cart
    mockRemoveFromCart(item.product);
  };

  /**
   * Proposed fixed implementation
   * Should check both item.subject_code AND item.metadata?.subjectCode
   */
  const handleRemoveItem_Fixed = (item) => {
    // Check if this is a tutorial item
    const subjectCode = item.subject_code || item.metadata?.subjectCode;

    if (item.product_type === 'tutorial' && subjectCode) {
      // Restore tutorial choices to draft state for this subject
      mockRestoreChoicesToDraft(subjectCode);
    }
    // Remove from cart
    mockRemoveFromCart(item.product);
  };

  describe('Current Implementation (BUGGY)', () => {
    it('T022-A: should work when item has subject_code field', () => {
      const item = {
        id: 999,
        product: 123,
        subject_code: 'CS2',
        product_type: 'tutorial',
        metadata: { type: 'tutorial', subjectCode: 'CS2' }
      };

      handleRemoveItem_Current(item);

      expect(mockRestoreChoicesToDraft).toHaveBeenCalledWith('CS2');
      expect(mockRemoveFromCart).toHaveBeenCalledWith(123);
    });

    it('T022-B: FAILS when item only has metadata.subjectCode (THIS IS THE BUG)', () => {
      const item = {
        id: 999,
        product: 456,
        product_type: 'tutorial',
        metadata: { type: 'tutorial', subjectCode: 'CP1' }
        // Note: No subject_code field at top level
      };

      handleRemoveItem_Current(item);

      // THIS TEST DOCUMENTS THE BUG
      // Expected: restoreChoicesToDraft called with 'CP1'
      // Actual: restoreChoicesToDraft NOT called at all
      expect(mockRestoreChoicesToDraft).not.toHaveBeenCalled(); // Bug confirmed
      expect(mockRemoveFromCart).toHaveBeenCalledWith(456); // Cart removal still works
    });
  });

  describe('Fixed Implementation', () => {
    it('T022-C: should work when item has subject_code field', () => {
      const item = {
        id: 999,
        product: 123,
        subject_code: 'CS2',
        product_type: 'tutorial',
        metadata: { type: 'tutorial', subjectCode: 'CS2' }
      };

      handleRemoveItem_Fixed(item);

      expect(mockRestoreChoicesToDraft).toHaveBeenCalledWith('CS2');
      expect(mockRemoveFromCart).toHaveBeenCalledWith(123);
    });

    it('T022-D: should work when item only has metadata.subjectCode', () => {
      const item = {
        id: 999,
        product: 456,
        product_type: 'tutorial',
        metadata: { type: 'tutorial', subjectCode: 'CP1' }
      };

      handleRemoveItem_Fixed(item);

      // Fixed version should extract from metadata
      expect(mockRestoreChoicesToDraft).toHaveBeenCalledWith('CP1');
      expect(mockRemoveFromCart).toHaveBeenCalledWith(456);
    });

    it('T022-E: should prioritize top-level subject_code over metadata', () => {
      const item = {
        id: 999,
        product: 789,
        subject_code: 'CS2',  // Top-level value
        product_type: 'tutorial',
        metadata: { type: 'tutorial', subjectCode: 'CP1' }  // Metadata value (should be ignored)
      };

      handleRemoveItem_Fixed(item);

      // Should use top-level subject_code
      expect(mockRestoreChoicesToDraft).toHaveBeenCalledWith('CS2');
      expect(mockRemoveFromCart).toHaveBeenCalledWith(789);
    });

    it('T022-F: should not call restoreChoicesToDraft for non-tutorial items', () => {
      const item = {
        id: 888,
        product: 999,
        product_type: 'material',
        metadata: { type: 'material' }
      };

      handleRemoveItem_Fixed(item);

      expect(mockRestoreChoicesToDraft).not.toHaveBeenCalled();
      expect(mockRemoveFromCart).toHaveBeenCalledWith(999);
    });

    it('T022-G: should not call restoreChoicesToDraft when subject code is missing', () => {
      const item = {
        id: 777,
        product: 888,
        product_type: 'tutorial',
        metadata: { type: 'tutorial' }
        // No subject_code anywhere
      };

      handleRemoveItem_Fixed(item);

      // Can't restore if we don't know which subject
      expect(mockRestoreChoicesToDraft).not.toHaveBeenCalled();
      expect(mockRemoveFromCart).toHaveBeenCalledWith(888);
    });
  });
});
