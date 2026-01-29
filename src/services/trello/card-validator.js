const axios = require('axios');
const { addNewCardXlsx, uploadFileToTrello } = require('./card-creator');

const { KeyAndApi, JSON_SERVER } = require('../../config/constants');

async function checkCreateCard() {
    try {
        axios.get(JSON_SERVER.CREATE_ENDPOINT)
            .then(response => {
                const listCreate = response.data;
                
                for (let i = 0; i < listCreate.length; i++) {
                    axios.get(`https://api.trello.com/1/search?idBoards=${KeyAndApi.activeBoard}&key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}&query=name:${listCreate[i].content}&modelTypes=cards`)
                        .then(async (response) => {
                            axios.delete(JSON_SERVER.CREATE_ENDPOINT + '/' + listCreate[i].id);
                            if (response.data.cards.length > 0)  // tim thu, neu >0 la da co roi
                                await uploadFileToTrello(response.data.cards[0].id, listCreate[i].linkFile);
                            else await addNewCardXlsx(listCreate[i].linkFile) 
                        })
                        .catch((error) => {
                            // Im lặng xử lý lỗi
                        });
                }
            })
            .catch(error => {
                // Im lặng xử lý lỗi
            });

        axios.get(JSON_SERVER.FILE_ENDPOINT)
            .then(response => {
                const listFile = response.data;
                
                for (let i = 0; i < listFile.length; i++) {
                    const url = `https://api.trello.com/1/cards/${listFile[i].cardId}/attachments?key=${KeyAndApi.apiKey}&token=${KeyAndApi.token}`;
                    
                    axios.get(url)
                        .then(async (response) => {
                            const attachments = response.data;
                            var coFIleXlsx = false;
                            for (let j = 0; j < attachments.length; j++) {
                                var fileName = attachments[j].name;
                                fileName = fileName.split(".").pop();
                                if (fileName == "xlsx") coFIleXlsx = true;
                                break;
                            }
                            if (!coFIleXlsx) {
                                await uploadFileToTrello(listFile[i].cardId, listFile[i].content)
                            }
                            await axios.delete(JSON_SERVER.FILE_ENDPOINT + '/' + listFile[i].id);
                        })
                        .catch(error => {
                            // Im lặng xử lý lỗi
                        });
                }
            })
            .catch(error => {
                // Im lặng xử lý lỗi
            });
    } catch (error) {
        // Im lặng xử lý lỗi
    }

    setTimeout(checkCreateCard, 540000); // Thử lại sau 30 phút mặc định
}
module.exports = checkCreateCard