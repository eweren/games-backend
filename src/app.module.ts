import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GameGateway } from "./game.gateway";
import { SocketsService } from "./sockets/sockets.service";

@Module({
    imports: [],
    controllers: [AppController],
    providers: [GameGateway, SocketsService],
})
export class AppModule {}
