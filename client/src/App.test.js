import { render, screen } from '@testing-library/react';
import AuctionCard from './components/AuctionCard';
import StatusBadge from './components/StatusBadge';
import Login from './pages/Login';
import { formatCurrency, formatDateTime } from './utils/formatters';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => jest.fn(),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: null,
    isAdmin: false,
  }),
}));

test('renders login UI for unauthenticated users', () => {
  render(<Login />);

  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

test('auction card displays item data and open state', () => {
  const item = {
    _id: 'item-1',
    title: 'Signed Jersey',
    description: 'Team-issued jersey.',
    imageUrl: 'https://example.com/jersey.jpg',
    basePrice: 50,
    currentPrice: 75,
    isClosed: false,
  };

  render(<AuctionCard item={item} timeLeft="1d 2h 3m 4s" />);

  expect(screen.getByRole('heading', { name: /signed jersey/i })).toBeInTheDocument();
  expect(screen.getByText('Team-issued jersey.')).toBeInTheDocument();
  expect(screen.getByText('$75')).toBeInTheDocument();
  expect(screen.getByText('Open')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/item/item-1');
});

test('status badge displays closed auction state', () => {
  render(<StatusBadge isClosed />);

  expect(screen.getByText('Closed')).toBeInTheDocument();
});

test('formatters handle prices and invalid dates', () => {
  expect(formatCurrency(1250)).toBe('$1,250');
  expect(formatCurrency(1250.5)).toBe('$1,250.50');
  expect(formatDateTime('not-a-date')).toBe('Invalid date');
  expect(formatDateTime()).toBe('Not set');
});
