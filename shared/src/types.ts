// Shared types for dice rolling
export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DiceRoll {
  type: DiceType;
  result: number;
}

export interface RollRequest {
  player: string;
  dice: DiceType[];
  modifier?: number;
}

export interface RollResult {
  player: string;
  rolls: DiceRoll[];
  modifier: number;
  total: number;
  timestamp: number;
}

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
}

export interface RoomState {
  id: string;
  players: string[];
  history: RollResult[];
}
