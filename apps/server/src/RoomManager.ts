import { generateRoomCode, type RoomConfig } from '@dankdraw/shared';
import { Room } from './Room.js';

export class RoomManager {
  private rooms = new Map<string, Room>();

  create(hostId: string, config: Partial<RoomConfig> = {}): Room {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));
    const room = new Room(code, hostId, config);
    this.rooms.set(code, room);
    room.on('closed', () => this.rooms.delete(code));
    return room;
  }

  get(code: string): Room | null {
    return this.rooms.get(code.toUpperCase()) ?? null;
  }

  count(): number {
    return this.rooms.size;
  }

  publicListing(): { code: string; players: number; max: number; mode: string }[] {
    return [...this.rooms.values()]
      .filter((r) => !r.config.isPrivate && r.phase === 'lobby')
      .map((r) => ({
        code: r.code,
        players: r.players.size,
        max: r.config.maxPlayers,
        mode: r.config.mode,
      }));
  }
}
