import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from '../layout/Modal.js';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  type = isDestructive ? 'danger' : 'info',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const iconMap = {
    danger: <AlertTriangle size={24} color="var(--error, #ba1a1a)" />,
    warning: <AlertTriangle size={24} color="#d97706" />,
    info: <Info size={24} color="var(--primary-container, #0d631b)" />
  };

  const bgMap = {
    danger: 'var(--error-container, #ffdad6)',
    warning: 'rgba(217, 119, 6, 0.12)',
    info: 'var(--primary-soft, #e8f5e9)'
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: bgMap[type],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {iconMap[type]}
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '6px' }}>
              {title}
            </h4>
            <p style={{ fontSize: '13.5px', color: 'var(--secondary)', lineHeight: '1.5', margin: 0 }}>
              {message}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid var(--outline)'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
