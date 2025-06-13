import React from 'react';
import { Form } from 'react-bootstrap';
import { useVAT } from '../contexts/VATContext';
import './VATToggle.css';

const VATToggle = ({ size = 'sm', className = '', showLabel = true }) => {
  const { showVATInclusive, toggleVATDisplay } = useVAT();

  return (
		<div className={`vat-toggle-container ${className}`}>			
			<div className="vat-toggle-switch">
				<span className="vat-toggle-text">
					{showVATInclusive ? "Inc. VAT" : "Ex. VAT"}
				</span>
				<Form.Check
					type="switch"
					id="vat-toggle"
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