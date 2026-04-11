import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { RolUsuario } from './enums/rol-usuario.enum';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /** Registrar un usuario vía GraphQL (alternativa al REST /auth/register) */
  @Mutation(() => User, {
    description: 'Registra un nuevo usuario. Rol por defecto: PACIENTE',
  })
  createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  /** Solo ADMIN puede listar todos los usuarios */
  @Auth(RolUsuario.ADMIN)
  @Query(() => [User], {
    name: 'users',
    description: 'Retorna todos los usuarios activos. Requiere rol ADMIN.',
  })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  /** Cualquier usuario autenticado puede buscar por ID */
  @Auth()
  @Query(() => User, {
    name: 'user',
    description: 'Busca un usuario por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del usuario' }) id: string,
  ): Promise<User> {
    return this.usersService.findOne(id);
  }

  /** Solo ADMIN puede actualizar cualquier usuario */
  @Auth(RolUsuario.ADMIN)
  @Mutation(() => User, {
    description:
      'Actualiza nombre, apellido, teléfono o rol de un usuario. Requiere rol ADMIN.',
  })
  updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
    return this.usersService.update(input.id, input);
  }

  /** Solo ADMIN puede desactivar usuarios */
  @Auth(RolUsuario.ADMIN)
  @Mutation(() => User, {
    description:
      'Desactiva un usuario del sistema (soft delete). Requiere rol ADMIN.',
  })
  removeUser(
    @Args('id', { type: () => ID, description: 'ID del usuario a desactivar' })
    id: string,
  ): Promise<User> {
    return this.usersService.remove(id);
  }
}
