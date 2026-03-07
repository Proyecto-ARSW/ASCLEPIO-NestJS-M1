import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User, {
    description: 'Registra un nuevo usuario. Rol por defecto: PACIENTE',
  })
  createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  @Query(() => [User], {
    name: 'users',
    description: 'Retorna todos los usuarios activos',
  })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User, {
    name: 'user',
    description: 'Busca un usuario por su ID',
  })
  findOne(
    @Args('id', { type: () => ID, description: 'ID del usuario' }) id: string,
  ): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User, {
    description: 'Actualiza nombre, apellido, teléfono o rol de un usuario',
  })
  updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
    return this.usersService.update(input.id, input);
  }

  @Mutation(() => User, {
    description: 'Desactiva un usuario del sistema (soft delete)',
  })
  removeUser(
    @Args('id', { type: () => ID, description: 'ID del usuario a desactivar' })
    id: string,
  ): Promise<User> {
    return this.usersService.remove(id);
  }
}
