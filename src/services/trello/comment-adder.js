const { KeyAndApi } = require('../../config/constants');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const errorHandler = require('./error-handler');
const filePath = path.join(KeyAndApi.serverFolder, 'status.txt');

function addComment(cardId, result) {
    const longText = result.value.items.map(itemx => (itemx.orderId)).join("\n");
    var url2 = `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`
    axios.post(url2, { text: longText + "\n" + cardId }, {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }).then(function (response) {
    
    })
        .catch(function (error) {
            console.error("❌ Lỗi khi thêm comment:", error.message);
            // xulyLoiTrello("addComment", data.cardId, longText)
        })
        .then(function () {
            // Luôn được thực thi
        });
}

module.exports = { addComment };