// ==================== IMPORTS ====================
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const ngrok = require('ngrok');
const wol = require('wake_on_lan');
const fs = require('fs').promises;
const { log } = require('console');
const { KeyAndApi } = require('./src/config/constants');

// Import local modules
const cardMover = require('./src/services/trello/card-mover');
const { handleWebhook, setIoInstance } = require('./src/services/trello/webhook');
const cardValidator = require('./src/services/trello/card-validator');
const webhookCreator = require('./src/services/trello/webhook-creator');
const getListTrelloAuto = require('./src/services/trello/getListTrelloAuto');
const { startJSONServer, resetServer, startCheckingv4Ultimate, startDongBoFile, startTaiExcel } = require('./src/server/startServer');
const connectDB = require('./src/config/db');
const { initializeSocket } = require('./src/services/trello/socket-handler');
const { initializeGllmTags } = require('./src/services/gllm/fetch-gllm-tags');

// ==================== SERVER SETUP ====================
const app = express();

app.use(cors({
    origin: "*", // Cho phép tất cả origins
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // Cho phép tất cả origins
        methods: ["GET", "POST"],
        credentials: true
    }
});

// ==================== GLOBAL VARIABLES ====================
global.listIP = [];
global.listTrello = [];
global.matchingTags = []; // Danh sách tags trùng tên với Trello

// ==================== INITIALIZATION ====================
async function initialize() {
    try {
        // 1. Import và setup Socket.IO (đầu tiên)
        initializeSocket(io);
        // 2. Set io instance cho webhook (đầu tiên)
        setIoInstance(io);
        // 3. Kết nối database
        await connectDB();
        // 4. Khởi động JSON Server
        await startJSONServer();
        // 5. Fetch danh sách tags từ GLLM
        await initializeGllmTags();
        // 6. Xử lý card và file chưa up lên trello
        await cardValidator();
        // 7. Tự động lấy card mới (sau khi đã set io instance)
        await getListTrelloAuto();
        // 8. Setup webhook Trello (sau khi đã set io instance)
        await webhookCreator();

        console.log('all start connected************');
        console.log("global.matchingTags********************", global.matchingTags);

    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Chạy khởi tạo
initialize();

// ==================== API ROUTES ====================
// Route để nhận webhook từ Trello
app.post('/webhook/trello', handleWebhook);

app.get('/webhook/trello', (req, res) => {

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).send('Success');
});

// ==================== SERVER START ====================
const PORT = KeyAndApi.port || 3999;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO server is ready for connections`);
    console.log(`Server URL: http://192.168.1.90:${PORT}`);
});
