const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@example.com';

jest.mock('../models/AuctionItem', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock('../models/Bid', () => ({
  find: jest.fn(),
  create: jest.fn(),
  deleteMany: jest.fn(),
}));

jest.mock('../config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../utils/email', () => ({
  sendWinnerEmail: jest.fn(),
  sendOutbidEmail: jest.fn(),
}));

const AuctionItem = require('../models/AuctionItem');
const Bid = require('../models/Bid');
const adminAuth = require('../config/firebaseAdmin');
const { createApp } = require('../app');

function queryResult(data) {
  return {
    lean: jest.fn().mockResolvedValue(data),
  };
}

function sortedLimitedResult(data) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(data),
    lean: jest.fn().mockResolvedValue(data),
  };
}

describe('silent auction API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
    app.set('socketio', { emit: jest.fn() });
  });

  test('GET /health returns service status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      env: 'test',
    });
    expect(res.body.timestamp).toBeDefined();
  });

  test('unknown routes return JSON 404', async () => {
    const res = await request(app).get('/api/not-real');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Route not found' });
  });

  test('GET /api/items returns auction items', async () => {
    const items = [{
      _id: 'item-1',
      title: 'Signed Jersey',
      basePrice: 50,
      currentPrice: 75,
      endDate: new Date(Date.now() + 86400000).toISOString(),
      isClosed: false,
    }];
    AuctionItem.find.mockReturnValue(queryResult(items));

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(items);
    expect(AuctionItem.find).toHaveBeenCalledTimes(1);
  });

  test('GET /api/items/:id returns 404 for missing item', async () => {
    AuctionItem.findById.mockReturnValue(queryResult(null));

    const res = await request(app).get('/api/items/missing-item');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Item not found' });
  });

  test('POST /api/items/:id/bid rejects requests without a token', async () => {
    const res = await request(app)
      .post('/api/items/item-1/bid')
      .send({ amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'No token provided' });
  });

  test('POST /api/items/:id/bid validates bid amount before querying item', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'bidder@example.com' });

    const res = await request(app)
      .post('/api/items/item-1/bid')
      .set('Authorization', 'Bearer valid-token')
      .send({ amount: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Bid amount is required and must be a number' });
    expect(AuctionItem.findById).not.toHaveBeenCalled();
  });

  test('POST /api/items/:id/bid creates a higher bid and emits a socket event', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'bidder@example.com' });

    const item = {
      _id: 'item-1',
      title: 'Signed Jersey',
      basePrice: 50,
      currentPrice: 75,
      currentBidder: null,
      isClosed: false,
      hasEnded: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const bid = { _id: 'bid-1', amount: 100, timestamp: new Date('2026-09-02T12:00:00Z') };
    AuctionItem.findById.mockResolvedValue(item);
    Bid.create.mockResolvedValue(bid);

    const res = await request(app)
      .post('/api/items/item-1/bid')
      .set('Authorization', 'Bearer valid-token')
      .send({ amount: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Bid placed', bidId: 'bid-1' });
    expect(Bid.create).toHaveBeenCalledWith(expect.objectContaining({
      item: 'item-1',
      userId: 'user-1',
      userEmail: 'bidder@example.com',
      amount: 100,
    }));
    expect(app.get('socketio').emit).toHaveBeenCalledWith('bidUpdate', expect.objectContaining({
      itemId: 'item-1',
      userEmail: 'bidder@example.com',
      amount: 100,
    }));
  });

  test('POST /api/items rejects non-admin users', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'user-1', email: 'user@example.com' });

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'New Item',
        description: 'Auction item',
        imageUrl: 'https://example.com/item.jpg',
        basePrice: 25,
        endDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Only admin can create auctions' });
  });
});
