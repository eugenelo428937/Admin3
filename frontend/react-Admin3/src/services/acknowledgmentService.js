import httpService from './httpService';

/**
 * Service for handling rules engine acknowledgments
 */
class AcknowledgmentService {
  /**
   * Submit an acknowledgment to the backend
   * @param {Object} acknowledgmentData - The acknowledgment data
   * @param {string} acknowledgmentData.ackKey - Acknowledgment key
   * @param {number} acknowledgmentData.message_id - Message template ID
   * @param {boolean} acknowledgmentData.acknowledged - Whether user acknowledged
   * @param {string} acknowledgmentData.entry_point_location - Entry point location
   * @returns {Promise<Object>} Response from the backend
   */
  async submitAcknowledgment(acknowledgmentData) {
    try {
      console.log('Submitting acknowledgment:', acknowledgmentData);

      const response = await httpService.post('/api/rules/acknowledge/', acknowledgmentData);

      console.log('Acknowledgment response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting acknowledgment:', error);
      throw new Error(
        error.response?.data?.error ||
        'Failed to submit acknowledgment'
      );
    }
  }

  /**
   * Get session acknowledgments from cart context
   * @returns {Promise<Array>} Array of session acknowledgments
   */
  async getSessionAcknowledgments() {
    try {
      const response = await httpService.get('/api/cart/');
      const cart = response.data;
      return cart.user_context?.acknowledgments || [];
    } catch (error) {
      console.error('Error fetching session acknowledgments:', error);
      return [];
    }
  }

  /**
   * Check if a specific acknowledgment exists in session
   * @param {string} ackKey - Acknowledgment key to check
   * @param {string} entryPointLocation - Entry point location
   * @returns {Promise<boolean>} Whether acknowledgment exists
   */
  async hasAcknowledgment(ackKey, entryPointLocation) {
    try {
      const acknowledgments = await this.getSessionAcknowledgments();

      return acknowledgments.some(ack =>
        ack.ack_key === ackKey &&
        ack.entry_point_location === entryPointLocation &&
        ack.acknowledged === true
      );
    } catch (error) {
      console.error('Error checking acknowledgment:', error);
      return false;
    }
  }

  /**
   * Clear all session acknowledgments (typically called after checkout)
   * @returns {Promise<boolean>} Success status
   */
  async clearSessionAcknowledgments() {
    try {
      // Session acknowledgments are cleared automatically when transferred to order
      // This method is mainly for explicit clearing if needed
      const response = await httpService.post('/api/rules/acknowledge/', {
        action: 'clear_session'
      });

      return response.data.success;
    } catch (error) {
      console.error('Error clearing session acknowledgments:', error);
      return false;
    }
  }

  /**
   * Validate checkout acknowledgments
   * Checks if all required acknowledgments are present before allowing checkout
   * @returns {Promise<Object>} Validation result
   */
  async validateCheckoutAcknowledgments() {
    try {
      const response = await httpService.post('/api/rules/execute/', {
        entry_point: 'checkout_terms',
        context: {
          // Context will be populated by the backend from session/user data
        }
      });

      // Check if any blocking acknowledgments are required
      const blocking = response.data.blocked || false;
      const requiredAcknowledgments = response.data.required_acknowledgments || [];
      const messages = response.data.messages || [];

      return {
        canProceed: !blocking,
        blocking: blocking,
        requiredAcknowledgments: requiredAcknowledgments,
        messages: messages,
        success: response.data.success
      };
    } catch (error) {
      console.error('Error validating checkout acknowledgments:', error);
      return {
        canProceed: false,
        blocking: true,
        requiredAcknowledgments: [],
        messages: [],
        success: false,
        error: error.message
      };
    }
  }

}

// Export a singleton instance
const acknowledgmentService = new AcknowledgmentService();
export default acknowledgmentService;