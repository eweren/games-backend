import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { GameGateway } from "./game.gateway";
import { SocketsService } from "./sockets/sockets.service";
import * as env from "dotenv";

env.config();

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ".env",
        })
    ],
    controllers: [AppController],
    providers: [GameGateway, SocketsService],
})
export class AppModule {}
