import { render, screen } from '@testing-library/react';
import { SourceRef } from './SourceLink';

describe('SourceRef', () => {
  it('links a record the source workflow mentions to its place there', () => {
    render(<SourceRef id="PUB-2027CT-012" />);
    const link = screen.getByRole('link', { name: /Source plan: PUB-2027CT-012/ });
    expect(link).toHaveAttribute(
      'href',
      'https://claude.ai/artifact/TpdZz945Dm6MVEvLeBNLFN#ref-PUB-2027CT-012',
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders nothing for a record the source does not mention', () => {
    const { container } = render(<SourceRef id="TASK-034" />);
    expect(container).toBeEmptyDOMElement();
  });
});
