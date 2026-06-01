// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

const Modal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);
  return (
    <div ref={ref} data-testid="modal">
      <button>premier</button>
      <button>dernier</button>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('place le focus sur le premier élément focusable', () => {
    const { getByText } = render(<Modal onClose={() => {}} />);
    expect(document.activeElement).toBe(getByText('premier'));
  });

  it('appelle onClose sur Échap', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<Modal onClose={onClose} />);
    fireEvent.keyDown(getByTestId('modal'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('boucle du dernier au premier avec Tab', () => {
    const { getByText, getByTestId } = render(<Modal onClose={() => {}} />);
    const last = getByText('dernier');
    last.focus();
    fireEvent.keyDown(getByTestId('modal'), { key: 'Tab' });
    expect(document.activeElement).toBe(getByText('premier'));
  });

  it('boucle du premier au dernier avec Shift+Tab', () => {
    const { getByText, getByTestId } = render(<Modal onClose={() => {}} />);
    const first = getByText('premier');
    first.focus();
    fireEvent.keyDown(getByTestId('modal'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByText('dernier'));
  });
});
