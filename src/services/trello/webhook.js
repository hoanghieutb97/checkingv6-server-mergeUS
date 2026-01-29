const { KeyAndApi } = require('../../config/constants');
const axios = require('axios');
const { addDateImage } = require('./date-image-adder');
const { addComment } = require('./comment-adder');
const { InPutexcel } = require('../excel/InPutexcel');
const tachState = require('../excel/tachState');
const moveToListError = require('./error-list-mover');
const { notifyClientsWhenCardsAvailable } = require('./socket-handler');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { log } = require('console');

// Biến toàn cục để lưu danh sách card đang xử lý
global.listTrello = global.listTrello || [];

// Biến để lưu trữ io instance
let ioInstance = null;

// Function để set io instance
function setIoInstance(io) {

    ioInstance = io;

}

// Hàm xử lý một card
async function processCard(cardId) {
    // Kiểm tra xem card đã có trong global.listTrello chưa
    if (global.listTrello.some(card => card.cardId === cardId)) {
        console.log(`Card ${cardId} đã tồn tại trong danh sách xử lý, bỏ qua.`);
        return;
    }

    try {

        // Lấy thông tin attachments của card
        const response = await axios.get(
            `https://api.trello.com/1/cards/${cardId}?attachments=true&key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`
        );


        const attachments = response.data.attachments;


        // Kiểm tra file Excel
        const xlsxAttachments = attachments.filter(att => {
            return att.name && att.name.toLowerCase().endsWith('.xlsx');
        });


        if (xlsxAttachments.length === 1) {
            try {


                // Tải file Excel với authentication
                const excelResponse = await axios.get(xlsxAttachments[0].url, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Authorization': `OAuth oauth_consumer_key="${KeyAndApi.apiKey}", oauth_token="${KeyAndApi.token}"`
                    }
                });


                // Tạo file tạm thời
                const tempFilePath = path.join(os.tmpdir(), xlsxAttachments[0].name);
                await fs.writeFile(tempFilePath, excelResponse.data);



                try {
                    // Sử dụng InPutexcel để xử lý file

                    const result = await InPutexcel(tempFilePath);


                    // Kiểm tra xem card đã có ảnh chưa
                    const hasImage = attachments.some(att =>
                        att.name && att.name.toLowerCase().endsWith('.jpg')
                    );


                    // Chỉ thêm ảnh và comment nếu chưa có ảnh
                    if (!hasImage) {

                        const items = result.value.items.map(row => ({
                            dateItem: row.dateItem,
                            partner: row.partner,
                            orderId: row.orderId
                        }));

                        const resultImage = await addDateImage(cardId, items);


                        if (resultImage) {
                            // Thêm comment với danh sách orderId


                            addComment(cardId, result);
                        }
                    }


                    if (result.stt === 0) {
                        // Tách state và tạo card mới


                        await tachState(result.value.items, cardId, result.value.fileName, tempFilePath);
                        return;
                    } else if (result.stt === 2) {
                        // Chuyển card sang list lỗi

                        await moveToListError(cardId);
                        return;
                    } else if (result.stt === 1) {
                        // Thêm card vào danh sách xử lý


                        if (!global.listTrello.some(card => card.cardId === cardId)) {
                            global.listTrello.push({
                                cardId: cardId,
                                state: 'awaitReady',  // Thêm state awaitReady
                                ...result.value  // Lưu nguyên item object
                            });

                            console.log('global.listTrello********************', global.listTrello.length);


                            // Thông báo cho các client khi có card mới
                            if (ioInstance) {

                                notifyClientsWhenCardsAvailable(ioInstance);
                            } else {
                                console.log('ioInstance chưa được set!');
                            }

                        } else {
                            console.log("Card already exists in global.listTrello");
                        }

                    }
                } catch (error) {
                    console.log("Error processing Excel file:", error);
                    throw error;
                } finally {
                    // Xóa file tạm sau khi xử lý xong
                    try {
                        await fs.unlink(tempFilePath);

                    } catch (error) {
                        console.log("Error deleting temporary file:", error);
                    }
                }
            } catch (error) {
                console.log("Error in Excel processing:", error);
                throw error;
            }
        }

    } catch (error) {
        console.log("error********************", error);
    }
}

// Hàm xử lý webhook
async function handleWebhook(req, res) {
    try {
        const action = req.body.action;
        const model = req.body.model;

        // Chỉ xử lý khi thêm attachment Excel vào card
        if (action.type === 'addAttachmentToCard') {
            const cardId = action.data.card.id;

            // Kiểm tra trạng thái hiện tại của card
            try {
                const cardResponse = await axios.get(
                    `https://api.trello.com/1/cards/${cardId}?key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`
                );

                // Nếu card không nằm trong startList, bỏ qua
                if (cardResponse.data.idList !== KeyAndApi.startList) {

                    return res.status(200).send('OK');
                }

                // Kiểm tra xem attachment có phải là file Excel không
                if (action.data.attachment.name.toLowerCase().endsWith('.xlsx')) {
                    await processCard(cardId);
                }
            } catch (error) {
                console.error('Lỗi khi kiểm tra trạng thái card:', error);
                return res.status(500).send('Internal Server Error');
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
}

module.exports = { handleWebhook, processCard, setIoInstance }; 