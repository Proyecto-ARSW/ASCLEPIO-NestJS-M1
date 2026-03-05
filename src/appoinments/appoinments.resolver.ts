import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { AppoinmentsService } from './appoinments.service';
import { Appoinment } from './entities/appoinment.entity';
import { CreateAppoinmentInput } from './dto/create-appoinment.input';
import { UpdateAppoinmentInput } from './dto/update-appoinment.input';

@Resolver(() => Appoinment)
export class AppoinmentsResolver {
  constructor(private readonly appoinmentsService: AppoinmentsService) {}

  @Mutation(() => Appoinment)
  createAppoinment(@Args('createAppoinmentInput') createAppoinmentInput: CreateAppoinmentInput) {
    return this.appoinmentsService.create(createAppoinmentInput);
  }

  @Query(() => [Appoinment], { name: 'appoinments' })
  findAll() {
    return this.appoinmentsService.findAll();
  }

  @Query(() => Appoinment, { name: 'appoinment' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.appoinmentsService.findOne(id);
  }

  @Mutation(() => Appoinment)
  updateAppoinment(@Args('updateAppoinmentInput') updateAppoinmentInput: UpdateAppoinmentInput) {
    return this.appoinmentsService.update(updateAppoinmentInput.id, updateAppoinmentInput);
  }

  @Mutation(() => Appoinment)
  removeAppoinment(@Args('id', { type: () => Int }) id: number) {
    return this.appoinmentsService.remove(id);
  }
}
