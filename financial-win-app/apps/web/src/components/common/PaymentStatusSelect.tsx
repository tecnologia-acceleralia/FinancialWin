import React from 'react';
import type { PaymentStatus } from '../../contexts/FinancialContext';

interface PaymentStatusSelectProps {
  value: PaymentStatus;
  onChange: (value: PaymentStatus) => void;
  disabled?: boolean;
}

export const PaymentStatusSelect: React.FC<PaymentStatusSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const isPaid = value === 'Pagado';
  const statusClass = isPaid ? 'payment-status-select-paid' : 'payment-status-select-pending';

  return (
    <div className="payment-status-select-wrapper">
      <span className={`payment-status-indicator ${isPaid ? 'payment-status-indicator-paid' : 'payment-status-indicator-pending'}`} />
      <select
        className={`payment-status-select ${statusClass}`}
        value={value}
        onChange={(e) => onChange(e.target.value as PaymentStatus)}
        disabled={disabled}
      >
        <option value="Pendiente">Pendiente</option>
        <option value="Pagado">Pagado</option>
      </select>
    </div>
  );
};
