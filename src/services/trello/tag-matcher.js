const axios = require('axios');
const { KeyAndApi } = require('../../config/constants');

/**
 * Thêm tags vào card Trello dựa trên tags array
 * @param {string} cardId - ID của card Trello
 * @param {Array} tags - Array chứa tên các tags
 */
async function processCardTags(cardId, tags) {
    try {
       

        // Kiểm tra input
        if (!cardId || !tags || !Array.isArray(tags)) {
            console.log('Input không hợp lệ:', { cardId, tags });
            return;
        }

        if (!global.matchingTags || global.matchingTags.length === 0) {
            console.log('Không có global matchingTags');
            return;
        }

        // Tìm các tags phù hợp
        const matchingTags = [];
        tags.forEach(tagName => {
            const matchingTag = global.matchingTags.find(globalTag => 
                globalTag.nameTag && globalTag.nameTag.trim().toLowerCase() == tagName.trim().toLowerCase()
            );
            
            if (matchingTag) {
                matchingTags.push(matchingTag);
                
            } else {
              
            }
        });

        if (matchingTags.length === 0) {
         
            return;
        }

        // Thêm tags vào card
       
        for (const tag of matchingTags) {
            try {
                await axios.post(`https://api.trello.com/1/cards/${cardId}/idLabels`, {
                    value: tag.idTag,
                    key: KeyAndApi.apiKey,
                    token: KeyAndApi.token
                });
              
            } catch (error) {
                console.error(`❌ Lỗi khi thêm tag "${tag.nameTag}":`, error.message);
            }
        }

    } catch (error) {
        console.error(`Lỗi khi xử lý tags cho card ${cardId}:`, error.message);
    }
}

module.exports = {
    processCardTags
};
