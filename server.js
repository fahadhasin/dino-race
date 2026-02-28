const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Dino metadata
const HORSE_NAMES = ['Rex', 'Spike', 'Dino', 'Chomper', 'Roar', 'Trex'];
const HORSE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

const MAX_PLAYERS = 6;
const RACE_DURATION_MS = 60000;
const FINISH_POSITION = 1000;
const TICK_INTERVAL_MS = 50;
const MAX_VELOCITY = 60;   // generous server-side cap — formula tops out ~50

// rooms: Map<roomId, RoomState>
const rooms = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function createRoom() {
  let roomId;
  do { roomId = generateRoomId(); } while (rooms.has(roomId));

  const room = {
    id: roomId,
    players: new Map(),     // socketId -> Player
    organizerId: null,      // set to first player who joins (the creator)
    state: 'lobby',
    raceStart: null,
    raceEnd: null,
    tickInterval: null,
    lastTick: null,
    usedNames: new Set(),
    usedColors: new Set(),
  };
  rooms.set(roomId, room);
  return room;
}

function assignHorseMeta(room) {
  for (const name of HORSE_NAMES) {
    if (!room.usedNames.has(name)) return name;
  }
  return 'Mystery';
}

function assignHorseColor(room) {
  for (const color of HORSE_COLORS) {
    if (!room.usedColors.has(color)) return color;
  }
  return '#ffffff';
}

function broadcastLobby(room) {
  const players = [...room.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    horseName: p.horseName,
    color: p.color,
  }));
  io.to(room.id).emit('lobby-update', { players, state: room.state, organizerId: room.organizerId });
}

function broadcastPositions(room) {
  const positions = {};
  for (const [id, p] of room.players) {
    positions[id] = {
      position: p.position,
      velocity: p.velocity,
      rtt:    p.liveStats?.rtt    ?? null,
      jitter: p.liveStats?.jitter ?? null,
      mbps:   p.liveStats?.mbps   ?? null,
    };
  }
  io.to(room.id).emit('positions', positions);
}

function startRaceTick(room) {
  room.lastTick = Date.now();
  room.tickInterval = setInterval(() => {
    if (room.state !== 'racing') {
      clearInterval(room.tickInterval);
      return;
    }

    const now = Date.now();
    const delta = now - room.lastTick;
    room.lastTick = now;

    for (const [id, player] of room.players) {
      if (player.finished) continue;
      const vel = Math.min(player.velocity, MAX_VELOCITY);
      player.position += vel * (delta / 1000);
      if (player.position >= FINISH_POSITION) {
        player.position = FINISH_POSITION;
        player.finished = true;
        player.finishTime = now;
      }
    }

    broadcastPositions(room);

    // End only when time expires — race always runs the full duration
    const timeExpired = now - room.raceStart >= RACE_DURATION_MS;
    if (timeExpired) {
      endRace(room);
    }
  }, TICK_INTERVAL_MS);
}

function endRace(room) {
  clearInterval(room.tickInterval);
  room.state = 'results';
  room.raceEnd = Date.now();

  const results = [...room.players.values()]
    .map(p => ({
      id: p.id,
      name: p.name,
      horseName: p.horseName,
      color: p.color,
      position: p.position,
      finished: p.finished,
      finishTime: p.finishTime || room.raceEnd,
      raceStats: p.raceStats,
    }))
    .sort((a, b) => {
      // Finished players sort by finish time; unfinished by position desc
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.position - a.position;
    });

  results.forEach((r, i) => { r.place = i + 1; });

  io.to(room.id).emit('race-results', results);
  // Room stays in 'results' state until organizer triggers return-to-lobby,
  // or until a safety cleanup after 30 minutes.
  setTimeout(() => {
    if (!rooms.has(room.id) || room.state !== 'results') return;
    resetRoomToLobby(room);
  }, 30 * 60 * 1000);
}

function resetRoomToLobby(room) {
  room.state = 'lobby';
  for (const p of room.players.values()) {
    p.position = 0; p.velocity = 0; p.finished = false;
    p.finishTime = null; p.raceStats = null;
  }
  broadcastLobby(room);
}

// Serve static files
app.use(express.static('public'));

// Speed test endpoint — 200 KB of random-ish data, no caching
const SPEEDTEST_BUF = Buffer.alloc(200 * 1024, 0xAB);
app.get('/speedtest', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.send(SPEEDTEST_BUF);
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPlayer = null;

  socket.on('join', ({ playerName, roomId }) => {
    // Find or create room
    let room;
    if (roomId) {
      // Joining an existing room — must exist
      if (!rooms.has(roomId)) {
        socket.emit('join-error', 'Room not found. Check the code and try again.');
        return;
      }
      room = rooms.get(roomId);
    } else {
      // No roomId = create a new room
      room = createRoom();
    }

    if (room.players.size >= MAX_PLAYERS) {
      socket.emit('join-error', 'Room is full (max 6 players).');
      return;
    }

    if (room.state !== 'lobby') {
      socket.emit('join-error', 'Race already in progress.');
      return;
    }

    const horseName = assignHorseMeta(room);
    const color = assignHorseColor(room);
    room.usedNames.add(horseName);
    room.usedColors.add(color);

    const player = {
      id: socket.id,
      name: playerName || `Player${room.players.size + 1}`,
      horseName,
      color,
      position: 0,
      velocity: 0,
      finished: false,
      finishTime: null,
      raceStats: null,
    };

    room.players.set(socket.id, player);
    currentRoom = room;
    currentPlayer = player;

    // First player to join becomes the organizer
    if (!room.organizerId) room.organizerId = socket.id;

    socket.join(room.id);
    socket.emit('joined', {
      roomId: room.id,
      playerId: socket.id,
      horseName,
      color,
      isOrganizer: room.organizerId === socket.id,
    });

    broadcastLobby(room);
  });

  // Client reports its computed velocity + live stats
  socket.on('velocity-update', ({ velocity, raceStats, liveStats }) => {
    if (!currentPlayer || !currentRoom || currentRoom.state !== 'racing') return;
    currentPlayer.velocity = Math.min(Math.max(0, velocity), MAX_VELOCITY);
    if (raceStats)   currentPlayer.raceStats  = raceStats;
    if (liveStats)   currentPlayer.liveStats  = liveStats;
  });

  socket.on('return-to-lobby', () => {
    if (!currentRoom) return;
    const room = currentRoom;
    if (room.organizerId !== socket.id) return; // only organizer
    if (room.state !== 'results') return;
    resetRoomToLobby(room);
  });

  socket.on('transfer-organizer', ({ targetId }) => {
    if (!currentRoom) return;
    const room = currentRoom;
    if (room.organizerId !== socket.id) return; // only organizer can transfer
    if (!room.players.has(targetId)) return;    // target must be in room
    room.organizerId = targetId;
    broadcastLobby(room);
  });

  socket.on('start-race', () => {
    if (!currentRoom) return;
    const room = currentRoom;
    if (room.state !== 'lobby') return;
    if (room.organizerId !== socket.id) {
      socket.emit('start-error', 'Only the organizer can start the race.');
      return;
    }
    if (room.players.size < 2) {
      socket.emit('start-error', 'Need at least 2 players to start.');
      return;
    }

    // Reset positions
    for (const p of room.players.values()) {
      p.position = 0;
      p.velocity = 0;
      p.finished = false;
      p.finishTime = null;
      p.raceStats = null;
    }

    room.state = 'countdown';
    const raceStartTimestamp = Date.now() + 5000;
    io.to(room.id).emit('countdown-start', { raceStartTimestamp });

    setTimeout(() => {
      if (room.state !== 'countdown') return;
      room.state = 'racing';
      room.raceStart = Date.now();
      io.to(room.id).emit('race-start', { raceStart: room.raceStart });
      startRaceTick(room);
    }, 5000);
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !currentPlayer) return;
    const room = currentRoom;

    room.usedNames.delete(currentPlayer.horseName);
    room.usedColors.delete(currentPlayer.color);
    room.players.delete(socket.id);

    if (room.players.size === 0) {
      if (room.tickInterval) clearInterval(room.tickInterval);
      rooms.delete(room.id);
    } else {
      // If organizer left, pass the role to the next player in the room
      if (room.organizerId === socket.id) {
        room.organizerId = room.players.keys().next().value;
      }
      broadcastLobby(room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Dino Race server running on http://localhost:${PORT}`);
});
