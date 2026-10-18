import { render, screen } from '@testing-library/react';
import { ExternalLink } from './ExternalLink';

describe('ExternalLink', () => {
  it('links http(s) URLs in a new tab', () => {
    render(<ExternalLink href="https://example.com/proof/e-03.png">GTM log</ExternalLink>);
    const a = screen.getByRole('link', { name: 'GTM log' });
    expect(a).toHaveAttribute('href', 'https://example.com/proof/e-03.png');
    expect(a).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('renders a javascript: URL as plain text, never as a link', () => {
    render(<ExternalLink href="javascript:alert(document.cookie)">Proof</ExternalLink>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Proof')).toBeInTheDocument();
  });
});
