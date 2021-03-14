import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

interface RoomInfo {
  host: string;
  users: Set<string>;
}

@Injectable()
export class SocketsService {
  public connectedUsers = new Map<
    string,
    { clientId: string; roomId: string; socket: Socket }
  >();
  public openRooms = new Map<string, RoomInfo>();

  public addConnectedClient(
    user: string,
    clientId: string,
    roomId: string,
    socket: Socket,
  ): void {
    const oldSocket = this.connectedUsers.get(user)?.socket;
    oldSocket?.disconnect();
    this.connectedUsers.set(user, { clientId, roomId, socket });
    const currentRoom = this.openRooms.get(roomId) ?? {
      host: user,
      users: new Set(),
    };
    currentRoom.users.add(user);
    console.log(
      "Room ",
      roomId,
      " has ",
      currentRoom.users.size,
      " active users",
    );
    this.openRooms.set(roomId, currentRoom);
  }

  public removeConnectedClient(clientId: string): boolean {
    const user = this.getUserByClientId(clientId);
    if (!user) {
      return false;
    }
    this.connectedUsers.delete(user[0]);
    const currentRoom = this.openRooms.get(user[1].roomId);
    if (currentRoom) {
      currentRoom.users.delete(user[0]);
      if (currentRoom.users.size > 0) {
        if (currentRoom.host === user[0]) {
          currentRoom.host = currentRoom.users[0];
        }
        this.openRooms.set(user[1].roomId, currentRoom);
      } else {
        this.openRooms.delete(user[1].roomId);
      }
    }
    console.log(
      "Room ",
      user[1].roomId,
      " has ",
      currentRoom.users.size,
      " active users",
    );
    return true;
  }

  public getSocketsForRoom(roomId: string): Array<Socket> {
    const room = this.openRooms.get(roomId);
    if (!room) {
      return [];
    } else {
      return Array.from(room.users.values()).map(
        (userId) => this.connectedUsers.get(userId).socket,
      );
    }
  }

  public getUserByClientId(
    clientId: string,
  ):
    | [
        string,
        {
          clientId: string;
          roomId: string;
          socket: Socket;
        },
      ]
    | undefined {
    const user = Array.from(this.connectedUsers.entries()).find(
      (entry) => entry[1].clientId === clientId,
    );
    return user;
  }
}
