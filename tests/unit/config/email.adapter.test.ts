import { MockEmailAdapter, createEmailAdapter } from '@/config/email.adapter';

// Mock de nodemailer
const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn()
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter)
}));

// Mock de envs
jest.mock('@/config/envs', () => ({
  envs: {
    NODE_ENV: 'test',
    MAILER_SERVICE: 'gmail',
    MAILER_EMAIL: 'test@example.com',
    MAILER_SECRET_KEY: 'test-secret'
  }
}));

describe('Email Adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MockEmailAdapter', () => {
    let mockAdapter: MockEmailAdapter;

    beforeEach(() => {
      mockAdapter = new MockEmailAdapter();
    });

    it('should send email successfully and store it', async () => {
      // Arrange
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test text'
      };

      // Act
      const result = await mockAdapter.sendEmail(emailOptions);

      // Assert
      expect(result).toBe(true);
      expect(mockAdapter.getSentEmails()).toHaveLength(1);
      expect(mockAdapter.getSentEmails()[0]).toEqual(emailOptions);
    });

    it('should clear sent emails', async () => {
      // Arrange
      await mockAdapter.sendEmail({
        to: 'test1@example.com',
        subject: 'Test 1',
        html: '<h1>Test 1</h1>'
      });
      await mockAdapter.sendEmail({
        to: 'test2@example.com',
        subject: 'Test 2',
        html: '<h1>Test 2</h1>'
      });

      expect(mockAdapter.getSentEmails()).toHaveLength(2);

      // Act
      mockAdapter.clearSentEmails();

      // Assert
      expect(mockAdapter.getSentEmails()).toHaveLength(0);
    });

    it('should store multiple emails', async () => {
      // Arrange
      const email1 = {
        to: 'test1@example.com',
        subject: 'Test 1',
        html: '<h1>Test 1</h1>'
      };
      const email2 = {
        to: 'test2@example.com',
        subject: 'Test 2',
        html: '<h1>Test 2</h1>'
      };

      // Act
      await mockAdapter.sendEmail(email1);
      await mockAdapter.sendEmail(email2);

      // Assert
      expect(mockAdapter.getSentEmails()).toHaveLength(2);
      expect(mockAdapter.getSentEmails()[0]).toEqual(email1);
      expect(mockAdapter.getSentEmails()[1]).toEqual(email2);
    });
  });

  describe('createEmailAdapter factory', () => {
    it('should return MockEmailAdapter in test environment', () => {
      // Act
      const adapter = createEmailAdapter();

      // Assert
      expect(adapter).toBeInstanceOf(MockEmailAdapter);
    });
  });

  describe('GmailAdapter (mocked)', () => {
    // Importar GmailAdapter directamente para testear
    const { GmailAdapter } = require('@/config/email.adapter');

    let gmailAdapter: any;

    beforeEach(() => {
      gmailAdapter = new GmailAdapter();
    });

    it('should send email successfully', async () => {
      // Arrange
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test text'
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id'
      });

      // Act
      const result = await gmailAdapter.sendEmail(emailOptions);

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Foro Platform" <test@example.com>',
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html
      });
    });

    it('should return false when email sending fails', async () => {
      // Arrange
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>'
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const result = await gmailAdapter.sendEmail(emailOptions);

      // Assert
      expect(result).toBe(false);
    });

    it('should verify connection successfully', async () => {
      // Arrange
      mockTransporter.verify.mockResolvedValue(true);

      // Act
      const result = await gmailAdapter.verifyConnection();

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when connection verification fails', async () => {
      // Arrange
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await gmailAdapter.verifyConnection();

      // Assert
      expect(result).toBe(false);
    });
  });
});