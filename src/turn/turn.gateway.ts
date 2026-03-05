import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { TurnService } from './turn.service';
import { CreateTurnDto } from './dto/create-turn.dto';
import { UpdateTurnDto } from './dto/update-turn.dto';

@WebSocketGateway()
export class TurnGateway {
  constructor(private readonly turnService: TurnService) {}

  @SubscribeMessage('createTurn')
  create(@MessageBody() createTurnDto: CreateTurnDto) {
    return this.turnService.create(createTurnDto);
  }

  @SubscribeMessage('findAllTurn')
  findAll() {
    return this.turnService.findAll();
  }

  @SubscribeMessage('findOneTurn')
  findOne(@MessageBody() id: number) {
    return this.turnService.findOne(id);
  }

  @SubscribeMessage('updateTurn')
  update(@MessageBody() updateTurnDto: UpdateTurnDto) {
    return this.turnService.update(updateTurnDto.id, updateTurnDto);
  }

  @SubscribeMessage('removeTurn')
  remove(@MessageBody() id: number) {
    return this.turnService.remove(id);
  }
}
