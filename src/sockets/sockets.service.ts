import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

type RoomInfo = { host: string; users: Map<string, UserData>; gameTime?: number };
type UserEntry = [string, UserData];
type UserData = { clientId: string; socket: Socket; };

@Injectable()
export class SocketsService {
    public openRooms = new Map<string, RoomInfo>();
    private characterStates = new Map<string, any>();

    /**
     * Disconnects an old existing socket for the user with this username and room and adds the new information to the
     * correct room.
     *
     * @param username - the username of the new user
     * @param clientId - the socket.io client-id to identify the requester
     * @param roomId   - the room the user is related to.
     * @param socket   - the socket of the user.
     */
    public addConnectedClient(
        username: string,
        clientId: string,
        roomId: string,
        socket: Socket,
    ): void {
        // Disconnect from old socket if present.
        const oldSocket = this.openRooms.get(roomId)?.users.get(username)?.socket;
        oldSocket?.disconnect();

        // Update the room entry for the given id.
        const currentRoom = this.openRooms.get(roomId) ?? {
            host: username,
            users: new Map(),
        };
        currentRoom.users.set(username, { clientId, socket });
        console.log("Room ", roomId, " has ", currentRoom.users.size, " active users");
        this.openRooms.set(roomId, currentRoom);
    }

    /**
     * Removes the connection of this client.
     *
     * @param clientId - The id of the socket.io client that disconnected.
     * @returns true if one connection was removed and false if none was found for this clientId.
     */
    public removeConnectedClient(clientId: string): boolean {
        const user = this.getUserByClientId(clientId);
        if (!user) {
            return false;
        }
        this.characterStates.delete(user[0]);
        const currentRoom = Array.from(this.openRooms.entries()).find(roomInfo => Array.from(roomInfo[1].users.values()).find(user => user.clientId === clientId));
        if (currentRoom) {
            currentRoom[1].users.delete(user[0]);
            if (currentRoom[1].users.size > 0) {
                if (currentRoom[1].host === user[0]) {
                    currentRoom[1].host = currentRoom[1].users[0];
                }
                this.openRooms.set(currentRoom[0], currentRoom[1]);
            } else {
                this.openRooms.delete(currentRoom[0]);
            }
        }
        console.log( "Room ", currentRoom[0], " has ", currentRoom[1].users.size, " active users", );
        return true;
    }

    public getUserByClientId(clientId: string): UserEntry | undefined {
        let userEntry: UserEntry;
        Array.from(this.openRooms.values()).forEach(roomInfo => Array.from(roomInfo.users.entries())
            .forEach(user => {
                if (user[1].clientId === clientId) {
                    userEntry = user;
                    return;
                }
            })
        );
        return userEntry;
    }

    public getRoomOfUserByClientId(clientId: string): [string, RoomInfo] {
        return Array.from(this.openRooms.entries()).find(roomInfo => Array.from(roomInfo[1].users.values())
            .find(user => user.clientId === clientId));
    }

    public getUsersOfRoom(roomId: string): Array<string> {
        const possibleRoom = Array.from(this.openRooms.entries())
            .find(roomInfo => roomInfo[0] === roomId);
        if (!possibleRoom) {
            return [];
        }
        return Array.from(possibleRoom[1].users).map(user => user[0]);
    }

    public updateStateOfUser(id: string, newState: any): void {
        const oldState = this.characterStates.get(id) ?? {};
        this.characterStates.set(id, { ...oldState, ...newState });
    }

    public getStateOfUser(id: string): any {
        return this.characterStates.get(id);
    }
}
