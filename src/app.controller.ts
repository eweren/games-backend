import { Controller, Get, Param } from "@nestjs/common";
import { SocketsService } from "./sockets/sockets.service";

@Controller()
export class AppController {
    constructor(private readonly socketsService: SocketsService) {}

    @Get(":roomId")
    getUsers(@Param("roomId") room: string): any {
        if (room) {
            return this.socketsService.getUsersOfRoom(room);
        }
        return [];
    }
}
