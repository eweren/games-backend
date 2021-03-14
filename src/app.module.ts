import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GameGateway } from "./game.gateway";
import { SocketsService } from "./sockets/sockets.service";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, GameGateway, SocketsService],
})
export class AppModule {}
