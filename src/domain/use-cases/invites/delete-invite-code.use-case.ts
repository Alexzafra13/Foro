import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserErrors } from '../../../shared/errors';
import { InviteCodeErrors } from '../../../shared/errors/domain.errors';

export interface DeleteInviteCodeRequestDto {
  code: string;
  requesterId: number;
}

export interface DeleteInviteCodeResponseDto {
  code: string;
  deletedBy: {
    id: number;
    username: string;
    role: string;
  };
  deletedAt: Date;
}

export class DeleteInviteCode {
  constructor(
    private readonly inviteCodeRepository: InviteCodeRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: DeleteInviteCodeRequestDto): Promise<DeleteInviteCodeResponseDto> {
    const { code, requesterId } = dto;

    // 1. Verificar permisos (solo admin puede eliminar códigos)
    const requester = await this.userRepository.findById(requesterId);
    if (!requester) {
      throw UserErrors.userNotFound(requesterId);
    }

    if (requester.role!.name !== 'admin') {
      throw UserErrors.insufficientPermissions();
    }

    // 2. Verificar que el código existe
    const inviteCode = await this.inviteCodeRepository.findByCode(code);
    if (!inviteCode) {
      throw InviteCodeErrors.codeNotFound(code);
    }

    // 3. Verificar si se puede eliminar (opcional: no permitir eliminar códigos usados)
    if (inviteCode.isUsed()) {
      throw InviteCodeErrors.codeAlreadyUsed(
        code,
        inviteCode.user!.username,
        inviteCode.usedAt!
      );
    }

    // 4. Eliminar el código
    await this.inviteCodeRepository.deleteByCode(code);

    // 5. Retornar confirmación
    return {
      code,
      deletedBy: {
        id: requester.id,
        username: requester.username,
        role: requester.role!.name
      },
      deletedAt: new Date()
    };
  }
}
