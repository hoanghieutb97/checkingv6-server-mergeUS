const fetch = require('node-fetch');
const axios = require('axios');
const { KeyAndApi } = require('../../config/constants');

/**
 * Fetch danh sách tags từ GLLM
 * @returns {Promise<Array>} Danh sách tags duy nhất
 */
async function fetchGllmTags() {
    try {
     
        const response = await fetch(KeyAndApi.gllm);
        const gllm = await response.json();
        
        // Lấy tất cả tags từ GLLM
        const allGllmTags = gllm
            .filter(item => item.tag && typeof item.tag === 'string')
            .flatMap(item => {
                return item.tag
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            });
        
        // Loại bỏ tag trùng lặp và sắp xếp
        const uniqueTags = [...new Set(allGllmTags)].sort();
        
      
        return uniqueTags;
    } catch (error) {
        console.error('Error fetching GLLM tags:', error);
        return [];
    }
}

/**
 * Fetch danh sách tags từ Trello
 * @returns {Promise<Array>} Danh sách tags Trello với id và name
 */
async function fetchTrelloTags() {
    try {
        console.log('Đang fetch Trello tags...');
        const response = await axios.get(`https://api.trello.com/1/boards/${KeyAndApi.activeBoard}/labels?limit=1000&key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`);
        
        
        const trelloTags = response.data;
        
        // Đảm bảo trả về array
        if (!Array.isArray(trelloTags)) {
            console.error('Trello API không trả về array:', trelloTags);
            return [];
        }
        
        console.log(`Đã fetch được ${trelloTags.length} Trello tags`);
        return trelloTags;
    } catch (error) {
        console.error('Error fetching Trello tags:', error.message);
        if (error.response) {
            console.error('Response error:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        return [];
    }
}

/**
 * Tìm các tag Trello trùng tên với GLLM tags
 * @param {Array} gllmTags - Danh sách tags từ GLLM
 * @param {Array} trelloTags - Danh sách tags từ Trello
 * @returns {Array} Danh sách tags trùng tên với nameTag và idTag
 */
function findMatchingTags(gllmTags, trelloTags) {

    
    // Đảm bảo cả hai đều là array
    if (!Array.isArray(gllmTags) || !Array.isArray(trelloTags)) {
        console.error('Input không phải array:', { gllmTags, trelloTags });
        return [];
    }
    
    const matchingTags = [];

    gllmTags.forEach(gllmTag => {
        const matchingTrelloTag = trelloTags.find(trelloTag => 
            trelloTag.name && trelloTag.name.toLowerCase() == gllmTag.toLowerCase()
        );
        
        if (matchingTrelloTag) {
            matchingTags.push({
                nameTag: gllmTag,
                idTag: matchingTrelloTag.id
            });
        }
    });
    
    
    return matchingTags;
}

/**
 * Khởi tạo danh sách tags toàn cục và tìm tags trùng tên
 */
async function initializeGllmTags() {
    try {
        // Fetch GLLM tags
        const gllmTags = await fetchGllmTags();
        
        // Fetch Trello tags
        const trelloTags = await fetchTrelloTags();
        
        // Tìm tags trùng tên
        const matchingTags = findMatchingTags(gllmTags, trelloTags);
        
        // Chỉ lưu matchingTags vào global
        global.matchingTags = matchingTags;
        
      
        
        return matchingTags;
    } catch (error) {
        console.error('Error initializing GLLM tags:', error);
        global.matchingTags = [];
        return [];
    }
}

module.exports = {
    fetchGllmTags,
    fetchTrelloTags,
    findMatchingTags,
    initializeGllmTags
}; 