// Jest setup file with mocks for Convex and other dependencies

// Mock Convex React hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
  useConvex: jest.fn(),
  ConvexProvider: ({ children }) => children,
  ConvexReactClient: jest.fn()
}));

// Mock Convex browser client
jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({}),
    mutation: jest.fn().mockResolvedValue({}),
    action: jest.fn().mockResolvedValue({}),
  })),
}));

// Mock Convex generated API
jest.mock('./convex/_generated/api', () => ({
  api: {
    episodes: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
    },
    feeds: {
      get: jest.fn(),
    },
  },
}));

// Mock global fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    ok: true,
    status: 200,
    statusText: 'OK'
  })
);

// Mock environment variables for tests
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud';
process.env.NEWS_API_KEY = 'test-news-api-key';
process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token';

// Mock Vercel Blob Storage
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({ url: 'https://test.blob.url/file.mp3' }),
  list: jest.fn().mockResolvedValue({ blobs: [] }),
  del: jest.fn().mockResolvedValue({}),
  head: jest.fn().mockResolvedValue({ size: 1000, uploadedAt: new Date() })
}));