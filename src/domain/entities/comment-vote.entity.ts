export class CommentVoteEntity {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly commentId: number,
    public readonly voteType: 1 | -1,
    public readonly createdAt: Date,
    public readonly user?: {
      id: number;
      username: string;
    }
  ) {}

  static fromObject(obj: any): CommentVoteEntity {
    return new CommentVoteEntity(
      obj.id,
      obj.userId,
      obj.commentId,
      obj.voteType,
      obj.createdAt,
      obj.user
    );
  }
}