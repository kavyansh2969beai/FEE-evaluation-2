require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Conversation = require('./models/Conversation');

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE']
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: corsOptions });
app.set('io', io);

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const noteRoutes = require('./routes/noteRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const chatRoutes = require('./routes/chatRoutes');
const eventRoutes = require('./routes/eventRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/events', eventRoutes);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch((error) => console.error('Database connection failed:', error.name, error.code || 'unknown'));

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) {
        return next(new Error('Authentication required.'));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (!verified.userId) return next(new Error('Invalid authentication token.'));
        socket.userId = String(verified.userId);
        return next();
    } catch (error) {
        return next(new Error('Invalid authentication token.'));
    }
});

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);
    socket.join(socket.userId);
    socket.emit('connected');

    socket.on('join_chat', async (room) => {
        try {
            if (!room || !mongoose.Types.ObjectId.isValid(room)) return;
            const isParticipant = await Conversation.exists({
                _id: room,
                participants: socket.userId
            });
            if (isParticipant) socket.join(String(room));
        } catch (error) {
            console.error('Socket chat join failed:', error.message);
        }
    });

    socket.on('typing', (room) => {
        if (String(room) !== socket.userId && socket.rooms.has(String(room))) {
            socket.to(String(room)).emit('typing');
        }
    });
    socket.on('stop_typing', (room) => {
        if (String(room) !== socket.userId && socket.rooms.has(String(room))) {
            socket.to(String(room)).emit('stop_typing');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
