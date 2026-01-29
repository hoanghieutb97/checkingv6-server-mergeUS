const { KeyAndApi } = require('../../config/constants');
const { moveToRunDone, moveToRunErr } = require('./card-mover');
const axios = require('axios');
const { processCardTags } = require('./tag-matcher');
// Lưu trạng thái các client
const clients = new Map();

// Mutex lock để tránh race condition
let isProcessingCard = false;
let cardQueue = [];

// Function thêm description vào card
async function addDescriptionToCard(cardId, description) {
    try {
        await axios.put(`https://api.trello.com/1/cards/${cardId}`, {
            desc: description,
            key: KeyAndApi.apiKey,
            token: KeyAndApi.token
        });

    } catch (error) {
        console.error(`Lỗi khi thêm description cho card ${cardId}:`, error.message);
    }
}

// Function xử lý card với mutex lock
async function processCardRequest(socket, client) {
    if (isProcessingCard) {
        console.log(`Client ${socket.id} phải đợi, đang xử lý card khác...`);
        // Thêm vào queue để xử lý sau
        cardQueue.push({ socket, client });
        return;
    }

    isProcessingCard = true;


    try {
        const card = global.listTrello[0];
        if (card) {


            // Xóa card khỏi danh sách ngay lập tức để tránh race condition
            global.listTrello = global.listTrello.filter(c => c.cardId !== card.cardId);

            // Cập nhật trạng thái client
            clients.set(socket.id, {
                status: 'busy',
                currentCard: card.cardId
            });

            // Gửi card cho client
            socket.emit('newCard', card);


            

            // Thêm tags phù hợp vào card ngay sau khi gửi cho client
            if (card.tags && Array.isArray(card.tags)) {
                await processCardTags(card.cardId, card.tags);
            } else {
                console.log(`Card ${card.cardId} không có tags hoặc tags không phải array`);
            }
        } else {
            console.log(`Không có card nào trong danh sách cho client ${socket.id}`);

        }
    } catch (error) {
        console.error(`Lỗi khi xử lý card cho client ${socket.id}:`, error);

    } finally {
        isProcessingCard = false;


        // Xử lý queue nếu có
        if (cardQueue.length > 0) {
            const nextRequest = cardQueue.shift();
            console.log(`Xử lý request tiếp theo trong queue cho client ${nextRequest.socket.id}`);
            setTimeout(() => processCardRequest(nextRequest.socket, nextRequest.client), 100);
        }
    }
}

// Function kiểm tra card có đang ở startList và di chuyển đến listRunDone
async function checkAndMoveCard(cardId, fileNameCard) {
    
    
    try {
        // Kiểm tra card có đang ở startList không
        const response = await axios.get(`https://api.trello.com/1/cards/${cardId}`, {
            params: {
                key: KeyAndApi.apiKey,
                token: KeyAndApi.token,
                attachments: true // Thêm tham số này để lấy thông tin attachments
            }
        });

        const card = response.data;


        // Nếu card đang ở startList thì di chuyển đến listRunDone
        if (card.idList === KeyAndApi.startList) {

            await moveToRunDone(cardId);

            // Tìm file xlsx trong attachments
            const xlsxAttachment = card.attachments?.find(att =>
                att.fileName && att.fileName.toLowerCase().endsWith('.xlsx')
            );

            if (xlsxAttachment) {
                const fileName = xlsxAttachment.fileName.replace(/\..+$/, ''); // Loại bỏ extension
                const description = `\\\\192.168.1.240\\in\\${fileNameCard}`;
                await addDescriptionToCard(cardId, description);

            } else {
                console.log('Không tìm thấy file xlsx trong attachments', cardId);
            }
        } else {
            console.log(`Card ${cardId} không ở startList, không di chuyển`);
        }
    } catch (error) {
        console.error(`Lỗi khi kiểm tra và di chuyển card ${cardId}:`, error.message);
    }
}

// Function kiểm tra card có đang ở startList và di chuyển đến listRunErr
async function checkAndMoveCardError(cardId) {
    try {
        // Kiểm tra card có đang ở startList không
        const response = await axios.get(`https://api.trello.com/1/cards/${cardId}`, {
            params: {
                key: KeyAndApi.apiKey,
                token: KeyAndApi.token,
                attachments: true // Thêm tham số này để lấy thông tin attachments
            }
        });

        const card = response.data;

        // Log thông tin card để kiểm tra có attachments không


        // Nếu card đang ở startList thì di chuyển đến listRunErr
        if (card.idList === KeyAndApi.startList) {

            await moveToRunErr(cardId);
        } else {
            console.log(`Card ${cardId} không ở startList, không di chuyển`);
        }
    } catch (error) {
        console.error(`Lỗi khi kiểm tra và di chuyển card ${cardId} đến listRunErr:`, error.message);
    }
}

// Function thông báo cho tất cả client ready khi có card mới
function notifyClientsWhenCardsAvailable(io) {


    if (global.listTrello && global.listTrello.length > 0) {
        console.log(`Có ${global.listTrello.length} card mới, thông báo cho các client ready`);

        for (const [socketId, client] of clients.entries()) {

            if (client.status === 'ready') {
                // Tìm socket instance
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit('checkAwait');
                    console.log(`Đã gửi checkAwait cho client ${socketId}`);
                }
            }
        }
    } else {
        console.log('Không có card mới hoặc không có client ready');
    }

}

// Wrapper function để gọi notifyClientsWhenCardsAvailable mà không cần io parameter
function notifyClientsWhenCardsAvailableGlobal() {
    if (global.ioInstance) {
        notifyClientsWhenCardsAvailable(global.ioInstance);
    } else {
        console.log('ioInstance chưa được khởi tạo');
    }
}

function initializeSocket(io) {
    // Lưu io instance vào global để sử dụng từ mọi nơi
    global.ioInstance = io;

    console.log('Socket.IO server initialized and listening for connections...');

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);


        // Thêm client mới với trạng thái ready
        clients.set(socket.id, { status: 'ready' });




        // Khi client sẵn sàng
        socket.on('awaitReady', () => {

            const client = clients.get(socket.id);
            if (client && client.status === 'ready') {
                processCardRequest(socket, client);
            } else {
                console.log(`Client ${socket.id} không sẵn sàng nhận card mới. Trạng thái hiện tại: ${client ? client.status : 'unknown'}`);
            }
        });

        // Khi client xử lý xong card
        socket.on('cardDone', async ({ cardId, fileName }) => {
            


            clients.set(socket.id, { status: 'ready' });
            console.log(`Client ${socket.id} đã hoàn thành card ${cardId}`);
            socket.emit('checkAwait');
            // Kiểm tra và di chuyển card nếu cần
            await checkAndMoveCard(cardId, fileName);
        });

        // Khi client gặp lỗi khi xử lý card
        socket.on('cardError', async (cardId) => {

            clients.set(socket.id, { status: 'ready' });
            console.log(`Client ${socket.id} gặp lỗi khi xử lý card ${cardId}`);
            socket.emit('checkAwait');
            // Kiểm tra và di chuyển card đến listRunErr nếu cần
            await checkAndMoveCardError(cardId);
        });

        // Khi client disconnect
        socket.on('disconnect', (reason) => {
            clients.delete(socket.id);
        });
    });
}

module.exports = {
    initializeSocket,
    notifyClientsWhenCardsAvailable,
    notifyClientsWhenCardsAvailableGlobal
}; 