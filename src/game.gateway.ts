import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { SocketsService } from './sockets/sockets.service';

/**
 * @description The websocket gateway for user-activities.
 *              - Should notify users when a friend connects to the server, thus is online.
 *              - Should notify users about friends activities so that they can refresh their log.
 *              - Should possibly notify users about likes/friend request and other things coming in the future.
 */
@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject('SocketsService') private socketsService: SocketsService,
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
        this.server.to(roomId).emit('roomInfo', {
          host: roomInfo.host,
          users: Array.from(roomInfo.users),
        });
      }
    }, 100);

    console.log(`${clientId} joined ${roomId}`);

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

    if (!clientId || !userEntry) {
      return;
    }

    this.socketsService.removeConnectedClient(clientId);
    const roomId = userEntry[1].roomId;

    const roomInfo = this.socketsService.openRooms.get(roomId);
    if (roomInfo) {
      this.server.to(roomId).emit('roomInfo', {
        host: roomInfo.host,
        users: Array.from(roomInfo.users),
      });
    }
  }

  @SubscribeMessage('playerUpdate')
  handleEvent(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): WsResponse<unknown> {
    const user = this.socketsService.getUserByClientId(client.id);
    if (!user) {
      return;
    }
    const roomId = user[1].roomId;
    try {
      this.server
        .to(roomId)
        .emit('playerUpdate', { username: user[0], ...data });
    } catch (e) {
      console.log('AHA, hier also');
    }

    const event = 'events';

    return { event, data };
  }

  @SubscribeMessage('startGame')
  joinEvent(
    @MessageBody() data: string,
    @ConnectedSocket() client: Socket,
  ): WsResponse<unknown> {
    const user = this.socketsService.getUserByClientId(client.id);
    if (!user) {
      return;
    }
    const roomId = user[1].roomId;

    const event = 'events';

    try {
      this.server.to(roomId).emit('startGame', user);
    } catch (e) {
      console.log('AHA, hier also');
    }

    return { event, data };
  }
}
