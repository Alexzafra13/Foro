import request from 'supertest';
import { Application } from 'express';
import { TestServer } from '../../helpers/test-server';

// Mock de bcrypt para tests
jest.mock('@/config/bcrypt.adapter', () => ({
  bcryptAdapter: {
    hash: jest.fn().mockReturnValue('hashed_password'),
    compare: jest.fn().mockImplementation((password, hash) => {
      return password === 'password123' && hash === 'hashed_password';
    })
  }
}));

// Mock de JWT para tests
jest.mock('@/config/jwt.adapter', () => ({
  JwtAdapter: {
    generateToken: jest.fn().mockReturnValue('mock.jwt.token'),
    validateToken: jest.fn().mockReturnValue({ userId: 1, email: 'test@example.com' })
  }
}));

describe('Comments Integration Tests', () => {
  let app: Application;
  let testServer: TestServer;
  
  beforeAll(async () => {
    testServer = new TestServer();
    app = await testServer.getApp();
  });

  beforeEach(() => {
    testServer.clearUsers();
    testServer.clearInviteCodes();
    testServer.clearComments();
    testServer.clearPosts();
    jest.clearAllMocks();
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('should create a comment successfully', async () => {
      // Setup: crear post primero
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const commentData = {
        content: 'This is a test comment that meets the minimum length requirement.'
      };

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send(commentData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Comment created successfully',
        data: {
          id: expect.any(Number),
          postId: postId,
          content: commentData.content,
          isReply: false,
          parentCommentId: null,
          createdAt: expect.any(String),
          author: {
            id: expect.any(Number),
            username: expect.any(String),
            reputation: expect.any(Number),
            role: {
              id: expect.any(Number),
              name: expect.any(String)
            }
          },
          stats: {
            voteScore: 0,
            repliesCount: 0
          }
        }
      });
    });

    it('should create a reply comment successfully', async () => {
      // Setup
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const parentCommentId = testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Parent comment',
        authorId: 2
      });

      const replyData = {
        content: 'This is a reply to the parent comment.',
        parentCommentId: parentCommentId
      };

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send(replyData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Reply created successfully',
        data: {
          id: expect.any(Number),
          postId: postId,
          content: replyData.content,
          isReply: true,
          parentCommentId: parentCommentId,
          author: expect.any(Object),
          parentComment: {
            id: parentCommentId,
            content: expect.any(String),
            authorUsername: expect.any(String)
          }
        }
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .send({ content: 'Test comment' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Authorization token is required'
      });
    });

    it('should return 400 for content too short', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Hi' }) // Too short
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Content must be at least 3 characters long'
      });
    });

    it('should return 400 for content too long', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const longContent = 'a'.repeat(2001);

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: longContent })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Content must not exceed 2000 characters'
      });
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .post('/api/posts/999/comments')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Test comment for non-existent post' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Post with id 999 not found'
      });
    });

    it('should return 400 for locked post', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Locked Post',
        content: 'This post is locked',
        isLocked: true
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Trying to comment on locked post' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Cannot perform action on locked post'
      });
    });

    it('should return 400 for invalid parent comment', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ 
          content: 'Reply to non-existent comment',
          parentCommentId: 999
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Parent comment must be a valid existing comment'
      });
    });

    it('should return 403 for unverified user', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer unverified.user.token')
        .send({ content: 'Comment from unverified user' })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Insufficient permissions for this action'
      });
    });
  });

  describe('GET /api/posts/:postId/comments', () => {
    it('should get comments for a post', async () => {
      // Setup
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      testServer.addComment({
        id: 1,
        postId: postId,
        content: 'First comment',
        authorId: 1
      });

      testServer.addComment({
        id: 2,
        postId: postId,
        content: 'Second comment',
        authorId: 2
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Found 2 comments',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            postId: postId,
            content: expect.any(String),
            isReply: false,
            author: expect.any(Object),
            stats: expect.any(Object)
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        },
        postInfo: {
          id: postId,
          title: 'Test Post',
          isLocked: false,
          totalComments: 2
        }
      });
    });

    it('should work for anonymous users', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Public comment',
        authorId: 1
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      // Anonymous users won't have userVote information
    });

    it('should handle pagination parameters', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      // Add multiple comments
      for (let i = 1; i <= 25; i++) {
        testServer.addComment({
          id: i,
          postId: postId,
          content: `Comment ${i}`,
          authorId: 1
        });
      }

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({
          page: 2,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should include replies when requested', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const parentCommentId = testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Parent comment',
        authorId: 1
      });

      testServer.addComment({
        id: 2,
        postId: postId,
        content: 'Reply comment',
        authorId: 2,
        parentCommentId: parentCommentId
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({ includeReplies: 'true' })
        .expect(200);

      expect(response.body.data[0]).toMatchObject({
        id: parentCommentId,
        content: 'Parent comment',
        isReply: false,
        replies: expect.arrayContaining([
          expect.objectContaining({
            id: 2,
            content: 'Reply comment',
            isReply: true,
            parentCommentId: parentCommentId
          })
        ])
      });
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/999/comments')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Post with id 999 not found'
      });
    });

    it('should return empty array for post with no comments', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Empty Post',
        content: 'Post with no comments',
        isLocked: false
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Found 0 comments',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        postInfo: {
          id: postId,
          title: 'Empty Post',
          isLocked: false,
          totalComments: 0
        }
      });
    });

    it('should handle sorting parameters', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      testServer.addComment({
        id: 1,
        postId: postId,
        content: 'First comment',
        authorId: 1,
        voteScore: 5
      });

      testServer.addComment({
        id: 2,
        postId: postId,
        content: 'Second comment',
        authorId: 2,
        voteScore: 10
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .query({
          sortBy: 'voteScore',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // Verificar que están ordenados correctamente por voteScore descendente
      if (response.body.data.length >= 2) {
        expect(response.body.data[0].stats.voteScore).toBeGreaterThanOrEqual(
          response.body.data[1].stats.voteScore
        );
      }
      
      // Verificar que el primer comentario tiene el voteScore más alto
      expect(response.body.data[0].stats.voteScore).toBe(10);
      expect(response.body.data[1].stats.voteScore).toBe(5);
    });
  });

  describe('GET /api/comments/:id/replies', () => {
    it('should return coming soon message', async () => {
      const response = await request(app)
        .get('/api/comments/1/replies')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        message: 'Feature coming soon - replies endpoint'
      });
    });

    it('should work with query parameters', async () => {
      const response = await request(app)
        .get('/api/comments/1/replies')
        .query({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for creating comments', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .send({ content: 'Unauthorized comment' })
        .expect(401);

      expect(response.body.error).toContain('Authorization token is required');
    });

    it('should reject invalid tokens for creating comments', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer invalid.token')
        .send({ content: 'Comment with invalid token' })
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should allow anonymous users to view comments', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Public Post',
        content: 'Public post content',
        isLocked: false
      });

      testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Public comment',
        authorId: 1
      });

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should show different data for authenticated vs anonymous users', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Test comment',
        authorId: 1
      });

      // Anonymous request
      const anonymousResponse = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      // Authenticated request
      const authenticatedResponse = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .expect(200);

      // Both should succeed, but authenticated might have additional data
      expect(anonymousResponse.body.success).toBe(true);
      expect(authenticatedResponse.body.success).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed postId in URL', async () => {
      const response = await request(app)
        .post('/api/posts/invalid/comments')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Comment on invalid post ID' })
        .expect(404);

      // The controller will parse "invalid" as NaN, which should result in post not found
      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.error).toContain('Content is required');
    });

    it('should handle whitespace-only content', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: '   \n\t   ' }) // Only whitespace
        .expect(400);

      expect(response.body.error).toContain('Content is required');
    });

    it('should handle nested replies beyond maximum depth', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      // Create a chain: comment -> reply -> nested reply (should fail)
      const rootCommentId = testServer.addComment({
        id: 1,
        postId: postId,
        content: 'Root comment',
        authorId: 1
      });

      const replyCommentId = testServer.addComment({
        id: 2,
        postId: postId,
        content: 'First level reply',
        authorId: 2,
        parentCommentId: rootCommentId
      });

      // Try to create a nested reply (should fail due to depth limit)
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({
          content: 'Nested reply (too deep)',
          parentCommentId: replyCommentId
        })
        .expect(400);

      expect(response.body.error).toContain('maximum nesting depth exceeded');
    });

    it('should handle concurrent comment creation', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      // Create multiple comments concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post(`/api/posts/${postId}/comments`)
          .set('Authorization', 'Bearer valid.jwt.token')
          .send({ content: `Concurrent comment ${i + 1}` })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all comments were created
      const getResponse = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(5);
    });

    it('should handle special characters in comment content', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const specialContent = 'Comment with émojis 🎉, special chars áéíóú, and symbols !@#$%^&*()';

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: specialContent })
        .expect(201);

      expect(response.body.data.content).toBe(specialContent);
    });

    it('should trim whitespace from comment content', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      const contentWithSpaces = '   This comment has leading and trailing spaces   ';
      const expectedContent = 'This comment has leading and trailing spaces';

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: contentWithSpaces })
        .expect(201);

      expect(response.body.data.content).toBe(expectedContent);
    });
  });

  describe('Integration with Posts', () => {
    it('should maintain referential integrity with posts', async () => {
      const postId = testServer.addPost({
        id: 1,
        title: 'Test Post',
        content: 'Test post content',
        isLocked: false
      });

      // Create comment
      const commentResponse = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Comment on existing post' })
        .expect(201);

      expect(commentResponse.body.data.postId).toBe(postId);

      // Verify comment appears in post's comments
      const getResponse = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(1);
      expect(getResponse.body.data[0].id).toBe(commentResponse.body.data.id);
    });

    it('should prevent commenting on non-existent posts', async () => {
      const response = await request(app)
        .post('/api/posts/99999/comments')
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Comment on non-existent post' })
        .expect(404);

      expect(response.body.error).toContain('Post with id 99999 not found');
    });

    it('should respect post lock status', async () => {
      const lockedPostId = testServer.addPost({
        id: 1,
        title: 'Locked Post',
        content: 'This post is locked',
        isLocked: true
      });

      const response = await request(app)
        .post(`/api/posts/${lockedPostId}/comments`)
        .set('Authorization', 'Bearer valid.jwt.token')
        .send({ content: 'Trying to comment on locked post' })
        .expect(400);

      expect(response.body.error).toContain('Cannot perform action on locked post');
    });
  });
});