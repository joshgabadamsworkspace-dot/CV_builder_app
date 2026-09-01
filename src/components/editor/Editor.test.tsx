import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddButton, Checkbox } from './Editor';

describe('Checkbox', () => {
  it('calls onChange with the new checked state when clicked', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Featured on portfolio" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Featured on portfolio'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflects the checked prop', () => {
    render(<Checkbox label="Featured on portfolio" checked onChange={() => {}} />);
    expect(screen.getByLabelText('Featured on portfolio')).toBeChecked();
  });
});

describe('AddButton', () => {
  it('renders its label and fires onClick once per click', () => {
    const onClick = vi.fn();
    render(<AddButton onClick={onClick}>Add skill</AddButton>);
    fireEvent.click(screen.getByText('Add skill'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
