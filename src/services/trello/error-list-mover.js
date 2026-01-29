const { KeyAndApi } = require('../../config/constants');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const errorHandler = require('./error-handler');
const filePath = path.join(KeyAndApi.serverFolder, 'status.txt');

async function moveToListError(cardId) {
    try {
        // Di chuyển card sang list Error bằng listRunErr từ constants
        await axios.put(
            `https://api.trello.com/1/cards/${cardId}?key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`,
            {
                idList: KeyAndApi.listRunErr
            }
        );
        return true;
    } catch (error) {
        console.error('Lỗi khi di chuyển card sang list Error:', error);
        return false;
    }
}

module.exports = moveToListError;