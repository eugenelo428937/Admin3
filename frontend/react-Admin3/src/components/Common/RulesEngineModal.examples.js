/**
 * Usage Examples for RulesEngineModal
 *
 * This file provides examples of how to use the generic RulesEngineModal component
 * for both single and multiple modal messages.
 */

// Example 1: Single Modal Message
// When only one rule matches for modal display, the Modal.Title will be the title from json_content

const singleMessageExample = {
  // State management
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Example message from rules engine
  const importTaxMessage = {
    id: 'msg_uk_import_tax',
    message_type: 'warning',
    display_type: 'modal',
    content: {
      title: 'Import Tax Notice',
      message: 'Students based outside the UK may incur import tax on delivery of materials. Any VAT, charges and tariffs levied by the customs authorities (and related fees by the courier) are the responsibility of the recipient rather than ActEd.',
      details: [
        'Import tax rates vary by country',
        'Contact your local customs office for specific rates',
        'These charges are separate from ActEd fees'
      ]
    },
    variant: 'warning'
  };

  // Usage in JSX
  return (
    <RulesEngineModal
      open={showModal}
      onClose={() => setShowModal(false)}
      messages={importTaxMessage} // Single message object
      closeButtonText="I Understand"
      backdrop="static"
      disableEscapeKeyDown={true}
    />
  );
};

// Example 2: Multiple Modal Messages
// When multiple rules match for modal display, each page will have their own title above the content
// and the Modal.Title will be "Important Notice"

const multipleMessagesExample = {
  // State management
  const [showModal, setShowModal] = useState(false);
  const [modalMessages, setModalMessages] = useState([]);

  // Example multiple messages from rules engine
  const multipleModalMessages = [
    {
      id: 'msg_uk_import_tax',
      message_type: 'warning',
      display_type: 'modal',
      content: {
        title: 'Import Tax Notice',
        message: 'Students based outside the UK may incur import tax on delivery of materials.',
        details: ['Contact customs for specific rates', 'Charges are separate from ActEd fees']
      },
      variant: 'warning'
    },
    {
      id: 'msg_shipping_delay',
      message_type: 'info',
      display_type: 'modal',
      content: {
        title: 'Shipping Delay Notice',
        message: 'Due to high demand, please allow an additional 2-3 business days for delivery.',
        details: ['Tracking information will be provided', 'Contact support for urgent requests']
      },
      variant: 'info'
    },
    {
      id: 'msg_terms_update',
      message_type: 'info',
      display_type: 'modal',
      content: {
        title: 'Terms & Conditions Update',
        message: 'Our terms and conditions have been updated effective immediately.',
        details: ['Review the changes on our website', 'Continued use implies acceptance']
      },
      variant: 'info'
    }
  ];

  // Usage in JSX
  return (
    <RulesEngineModal
      open={showModal}
      onClose={() => setShowModal(false)}
      messages={multipleModalMessages} // Array of message objects
      closeButtonText="I Understand"
      backdrop="static"
      disableEscapeKeyDown={true}
      onPageChange={(page) => console.log(`User viewed page ${page}`)}
    />
  );
};

// Example 3: Integration with CheckoutSteps component
const checkoutStepsIntegration = {
  // In your rules engine response handler
  const handleRulesEngineResponse = (result) => {
    if (result.messages && result.messages.length > 0) {
      // Separate modal messages from regular messages
      const modalMsgs = result.messages.filter(msg => msg.display_type === 'modal');
      const alertMessages = result.messages.filter(msg => msg.display_type !== 'modal');

      // Set regular alert messages for inline display
      setRulesMessages(alertMessages);

      // If there are modal messages, show them in the generic modal
      if (modalMsgs.length > 0) {
        setModalMessages(modalMsgs);
        setShowRulesModal(true);
      }
    }
  };

  // JSX usage
  return (
    <>
      {/* Your other checkout content */}

      {/* Generic modal for all modal messages */}
      <RulesEngineModal
        open={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        messages={modalMessages}
        closeButtonText="I Understand"
        backdrop="static"
        disableEscapeKeyDown={true}
      />
    </>
  );
};

export {
  singleMessageExample,
  multipleMessagesExample,
  checkoutStepsIntegration
};