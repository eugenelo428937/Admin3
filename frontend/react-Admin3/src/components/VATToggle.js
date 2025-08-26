import React, { useId } from 'react';
import { Form } from 'react-bootstrap';
import { useVAT } from '../contexts/VATContext';
import './VATToggle.css';

const VATToggle = ({ size = 'sm', className = '', showLabel = true }) => {
  const { showVATInclusive, toggleVATDisplay } = useVAT();
  const uniqueId = useId(); // Generate unique ID for each instance

  return (
		<div className={`vat-toggle-container ${className}`}>			
			<div className="vat-toggle-switch">
				<span className="vat-toggle-text fw-normal">
					{showVATInclusive ? "Inc. VAT" : "Ex. VAT"}
				</span>
				<Form.Check
					type="switch"
					id={`vat-toggle-${uniqueId}`}
					checked={showVATInclusive}
					onChange={toggleVATDisplay}
					size={size}
					className="vat-switch"
				/>
			</div>
		</div>
  );
};

export default VATToggle; 