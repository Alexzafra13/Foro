export class VoteEntity {
  constructor(
    public readonly id: number,
    public readonly userId: number,
    public readonly postId: number,
    public readonly voteType: 1 | -1,
    public readonly createdAt: Date,
    public readonly user?: {
      id: number;
      username: string;
    }
  ) {}

  static fromObject(obj: any): VoteEntity {
    return new VoteEntity(
      obj.id,
      obj.userId,
      obj.postId,
      obj.voteType,
      obj.createdAt,
      obj.user
    );
  }
}