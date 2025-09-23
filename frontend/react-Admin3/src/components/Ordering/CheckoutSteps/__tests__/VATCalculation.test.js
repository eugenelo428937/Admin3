import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('VAT and Fee Calculations', () => {
  const VAT_RATE = 0.20; // 20% VAT

  describe('Correct order of calculation', () => {
    it('should calculate VAT on items then add fees (fees are VAT exempt)', () => {
      // Given: item price £100, VAT 20%, booking fee £10
      const itemPrice = 100;
      const bookingFee = 10;

      // Calculation should be:
      // Item subtotal: £100
      // VAT on items: £100 * 0.20 = £20
      // Fees (VAT exempt): £10
      // Total: £100 + £20 + £10 = £130

      const subtotal = itemPrice;
      const vatAmount = subtotal * VAT_RATE;
      const totalFees = bookingFee;
      const total = subtotal + vatAmount + totalFees;

      expect(subtotal).toBe(100);
      expect(vatAmount).toBe(20);
      expect(totalFees).toBe(10);
      expect(total).toBe(130);
    });

    it('should handle multiple items with quantities and fees', () => {
      // Given:
      // Item 1: £50 x 2 = £100
      // Item 2: £75 x 1 = £75
      // Subtotal: £175
      // VAT: £175 * 0.20 = £35
      // Tutorial booking fee: £15
      // Total: £175 + £35 + £15 = £225

      const cartItems = [
        { actual_price: '50.00', quantity: 2 },
        { actual_price: '75.00', quantity: 1 }
      ];

      const fees = [
        { fee_type: 'tutorial_booking_fee', amount: '15.00' }
      ];

      const subtotal = cartItems.reduce((total, item) =>
        total + (parseFloat(item.actual_price) * item.quantity), 0
      );
      const vatAmount = subtotal * VAT_RATE;
      const totalFees = fees.reduce((total, fee) =>
        total + parseFloat(fee.amount), 0
      );
      const total = subtotal + vatAmount + totalFees;

      expect(subtotal).toBe(175);
      expect(vatAmount).toBe(35);
      expect(totalFees).toBe(15);
      expect(total).toBe(225);
    });

    it('should handle VAT-exempt items correctly', () => {
      // Some educational materials might be VAT exempt
      // Given:
      // VAT-exempt item: £100 (no VAT)
      // Regular item: £50 (with VAT)
      // Fee: £10 (VAT exempt)

      const vatExemptItem = { price: 100, isVATExempt: true };
      const regularItem = { price: 50, isVATExempt: false };
      const fee = 10;

      const vatExemptSubtotal = vatExemptItem.price;
      const regularSubtotal = regularItem.price;
      const vatOnRegular = regularItem.price * VAT_RATE;
      const total = vatExemptSubtotal + regularSubtotal + vatOnRegular + fee;

      expect(vatExemptSubtotal).toBe(100);
      expect(regularSubtotal).toBe(50);
      expect(vatOnRegular).toBe(10);
      expect(total).toBe(170); // 100 + 50 + 10 + 10
    });
  });

  describe('Cart data structure with fees', () => {
    it('should correctly extract fees from cartData', () => {
      const cartData = {
        id: 1,
        items: [
          { actual_price: '100.00', quantity: 1 }
        ],
        fees: [
          { fee_type: 'tutorial_booking_fee', amount: '15.00', description: 'Tutorial Booking Fee' },
          { fee_type: 'service_charge', amount: '5.00', description: 'Service Charge' }
        ]
      };

      const totalFees = cartData.fees ?
        cartData.fees.reduce((total, fee) => total + parseFloat(fee.amount), 0) : 0;

      expect(totalFees).toBe(20);
    });

    it('should handle missing fees array gracefully', () => {
      const cartData = {
        id: 1,
        items: [
          { actual_price: '100.00', quantity: 1 }
        ]
        // No fees property
      };

      const totalFees = cartData.fees ?
        cartData.fees.reduce((total, fee) => total + parseFloat(fee.amount), 0) : 0;

      expect(totalFees).toBe(0);
    });
  });

  describe('VAT calculation helper function', () => {
    const calculateVATTotals = (cartItems, cartData) => {
      // Calculate subtotal from items
      const subtotal = cartItems.reduce((total, item) =>
        total + (parseFloat(item.actual_price) * item.quantity), 0
      );

      // Calculate VAT on subtotal
      const vatAmount = subtotal * VAT_RATE;

      // Calculate fees (VAT exempt)
      const totalFees = cartData?.fees ?
        cartData.fees.reduce((total, fee) =>
          total + parseFloat(fee.amount), 0
        ) : 0;

      // Calculate total
      const totalGross = subtotal + vatAmount + totalFees;

      return {
        subtotal,
        total_vat: vatAmount,
        total_fees: totalFees,
        total_gross: totalGross
      };
    };

    it('should calculate correct totals with fees', () => {
      const cartItems = [
        { actual_price: '100.00', quantity: 2 },
        { actual_price: '50.00', quantity: 1 }
      ];

      const cartData = {
        fees: [
          { fee_type: 'tutorial_booking_fee', amount: '25.00' }
        ]
      };

      const result = calculateVATTotals(cartItems, cartData);

      expect(result.subtotal).toBe(250); // (100*2) + (50*1)
      expect(result.total_vat).toBe(50); // 250 * 0.20
      expect(result.total_fees).toBe(25); // booking fee
      expect(result.total_gross).toBe(325); // 250 + 50 + 25
    });

    it('should work without fees', () => {
      const cartItems = [
        { actual_price: '100.00', quantity: 1 }
      ];

      const cartData = {};

      const result = calculateVATTotals(cartItems, cartData);

      expect(result.subtotal).toBe(100);
      expect(result.total_vat).toBe(20);
      expect(result.total_fees).toBe(0);
      expect(result.total_gross).toBe(120);
    });
  });
});