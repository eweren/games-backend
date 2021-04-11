import { Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from "@nestjs/websockets";
import os from "os";

import { Server, Socket } from "socket.io";
import { RoomInfo, SocketsService } from "./sockets/sockets.service";

/**
 * @description The websocket gateway for user-activities.
 *              - Should notify users when a friend connects to the server, thus is online.
 *              - Should notify users about friends activities so that they can refresh their log.
 *              - Should possibly notify users about likes/friend request and other things coming in the future.
 */
@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @Inject("SocketsService") private socketsService: SocketsService,
    ) {}

    /** The socketio server used to emit the sockets. */
    @WebSocketServer() server: Server;

    /**
     * Gets called when a client connects to the socket.
     * Caches the user in the `socketService` so that a user can have multiple socket instances at once.
     * Emits the `connected` event to each friend of the current user.
     *
     * @param client the current socketio client to get the header from.
     */
    public async handleConnection(client: Socket): Promise<void> {
        const clientId = client.id;
        const roomId = client.handshake.query.room as string;
        const username = client.handshake.query.username as string;

        if (!clientId || !roomId || !username) {
            return;
        }

        client.join(roomId);

        setTimeout(() => {
            const roomInfo = this.socketsService.openRooms.get(roomId);
            if (roomInfo) {
                this.server.to(roomId).emit("roomInfo", {
                    host: roomInfo.host,
                    playerJoined: true,
                    newUser: username,
                    users: Array.from(roomInfo.users).map(u => u[0]),
                    gameTime: roomInfo.gameTime
                });
            }
            const otherPlayersOfRoom = Array.from(roomInfo.users.keys()).map(u => this.socketsService.getStateOfUser(u));
            client.emit("playersUpdate", otherPlayersOfRoom);
        }, 1000);

        this.socketsService.addConnectedClient(username, clientId, roomId, client);
    }

    /**
     * Gets called when a client disconnects from the socket.
     * Removes one socket instance of the user from the `socketService`.
     * Emits the `disconnected` event to each friend of the current user.
     *
     * @param client the current socketio client to get the header from.
     */
    public async handleDisconnect(client: Socket) {
        const clientId = client.id;
        const userEntry = this.socketsService.getUserByClientId(clientId);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];

        if (!clientId || !userEntry) {
            return;
        }

        this.socketsService.removeConnectedClient(clientId);
        const roomInfo = this.socketsService.openRooms.get(roomId);
        if (roomInfo) {
            this.server.to(roomId).emit("roomInfo", {
                host: roomInfo.host,
                playerLeft: true,
                users: Array.from(roomInfo.users).map(u => u[0]),
                gameTime: roomInfo.gameTime
            });
        }
    }

    @SubscribeMessage("message")
    public handleMessage(
        @MessageBody() message: any,
        @ConnectedSocket() client: Socket) {
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        const user = this.socketsService.getUserByClientId(client.id);
        this.server.to(roomId).emit("message", message, roomId);
    }

    @SubscribeMessage("ipaddr")
    public handleIpAddress(@ConnectedSocket() socket: Socket) {
        socket.on("ipaddr", function() {
            const ifaces = os.networkInterfaces();
            for (const dev in ifaces) {
            ifaces[dev].forEach(function(details) {
                if (details.family === "IPv4" && details.address !== "127.0.0.1") {
                socket.emit("ipaddr", details.address);
                }
            });
            }
        });
    }

    @SubscribeMessage("characterUpdate")
    public handleEvent(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }
        if (!this.socketsService.getStateOfUser(user[0])) {
            this.server.to(roomId).emit("characterJoined", data);
        }
        this.socketsService.updateStateOfUser(user[0], data);
        try {
            this.server
                .to(roomId)
                .emit("characterUpdate", { username: user[0], ...data });
        } catch (e) {
            console.log("LogPoint1");
        }

        const event = "events";

        return { event, data };
    }

    @SubscribeMessage("gameState")
    public joinEvent(
        @MessageBody() data: string,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }

        const event = "events";

        try {
            this.server.to(roomId).emit("gameState", data);
        } catch (e) {
            console.log("LogPoint2");
        }

        return { event, data };
    }

    @SubscribeMessage("characterEvent")
    public characterEvent(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }

        const event = "events";

        try {
            this.server.to(roomId).emit("characterEvent", data);
        } catch (e) {
            console.log("LogPoint3: ", JSON.stringify(data));
        }

        return { event, data };
    }

    @SubscribeMessage("gameTime")
    public gameTime(
        @MessageBody() data: number,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }

        const event = "events";
        const roomInfo = this.socketsService.openRooms.get(roomId);
        roomInfo.gameTime = data;

        try {
            this.server.to(roomId).emit("gameTime", data);
        } catch (e) {
            console.log("LogPoint4: ", JSON.stringify(data));
        }

        return { event, data };
    }

    @SubscribeMessage("roomInfo")
    public roomInfo(
        @MessageBody() data: RoomInfo,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }

        const event = "events";
        let roomInfo = this.socketsService.openRooms.get(roomId);
        roomInfo = {...roomInfo, ...data};
        this.socketsService.openRooms.set(roomId, roomInfo);

        try {
            this.server.to(roomId).emit("roomInfo", roomInfo);
        } catch (e) {
            console.log("LogPoint4: ", JSON.stringify(data));
        }

        return { event, data };
    }

    @SubscribeMessage("dropCard")
    public dropCard(
        @MessageBody() data: string,
        @ConnectedSocket() client: Socket,
    ): WsResponse<unknown> {
        const user = this.socketsService.getUserByClientId(client.id);
        const roomId = this.socketsService.getRoomOfUserByClientId(client.id)[0];
        if (!user) {
            return;
        }

        const event = "events";

        try {
            this.server.to(roomId).emit("dropCard", data);
        } catch (e) {
            console.log("LogPoint4: ", JSON.stringify(data));
        }

        return { event, data };
    }
}
