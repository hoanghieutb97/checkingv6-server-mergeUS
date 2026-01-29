const { KeyAndApi } = require('../../config/constants');
const path = require('path');
const fs = require('fs').promises;
const ExcelJS = require('exceljs');
const moveToListArchive = require('../../services/trello/archive-list-mover');
const { addNewCardXlsx } = require('../../services/trello/card-creator');
const moveToListError = require('../../services/trello/error-list-mover');

// Đường dẫn thư mục chứa file tách
const tachStatePath = path.join(KeyAndApi.serverFolder, 'tachState');

// Định nghĩa các cột cho file Excel
const EXCEL_COLUMNS = [
    { header: '#OrderId', key: 'orderId', width: 10 },
    { header: 'Barcode', key: 'barcode', width: 10 },
    { header: 'SKU', key: 'sku', width: 10 },
    { header: 'Quantity', key: 'Quantity', width: 10 },
    { header: 'Variant', key: 'variant', width: 10 },
    { header: 'Product Type', key: 'product', width: 10 },
    { header: 'Country Code', key: 'country', width: 10 },
    { header: 'Partner', key: 'partner', width: 10 },
    { header: 'Design URL', key: 'urlDesign', width: 10 },
    { header: 'Date Received', key: 'dateItem', width: 10 },
    { header: 'Order Name', key: 'orderName', width: 10 },
    { header: 'Note', key: 'note', width: 10 },
    { header: 'Location', key: 'location', width: 10 },
    { header: 'Item Barcode', key: 'ItemBarcode', width: 10 },
    { header: 'Order Type', key: 'OrderType', width: 10 },
    { header: 'TikTok Ship By', key: 'TikTokShipBy', width: 10 },
    { header: 'Priority', key: 'Priority', width: 10 },
    { header: 'Factory', key: 'Factory', width: 10 },
    { header: 'Production Note', key: 'ProductionNote', width: 10 },
    { header: 'QC Note', key: 'QCNote', width: 10 },
    { header: 'Status', key: 'Status', width: 10 }
];

// Hàng header cho file Excel
const EXCEL_HEADER = {
    orderId: '#OrderId',
    barcode: 'Barcode',
    sku: 'SKU',
    Quantity: "Quantity",
    variant: 'Variant',
    product: 'Product Type',
    country: 'Country Code',
    partner: 'Partner',
    urlDesign: 'Design URL',
    dateItem: 'Date Received',
    orderName: 'Order Name',
    note: "Note",
    location: 'Location',
    ItemBarcode: 'Item Barcode',
    OrderType: "Order Type",
    addGllm: "",
    nameId: '',
    box: "",
    button: '',
    direction: '',
    width: "",
    hight: "",
    amountFile: '',
    state: '',
    status: '',
    stt: "",
    TikTokShipBy: "TikTok Ship By",
    Priority: "Priority",
    Factory: "Factory",
    ProductionNote: "Production Note",
    QCNote: "QC Note",
    Status: "Status"
};

/**
 * Tạo thư mục chứa file tách
 * @param {string} nameCard - Tên của card
 * @returns {Promise<string>} Đường dẫn thư mục đã tạo
 */
async function createContainerDirectory(nameCard) {
    const containerPath = path.join(tachStatePath, nameCard);
    await fs.mkdir(containerPath, { recursive: true });
    return containerPath;
}

/**
 * Nhóm các items theo state
 * @param {Array} items - Mảng các items cần nhóm
 * @returns {Object} Object với key là state và value là mảng items
 */
function groupItemsByState(items) {
    return items.reduce((acc, item) => {
        if (!acc[item.state]) {
            acc[item.state] = [];
        }
        acc[item.state].push(item);
        return acc;
    }, {});
}

/**
 * Tạo tên file Excel
 * @param {Object} item - Item đầu tiên của state
 * @param {number} count - Số lượng items
 * @param {string} state - State của items
 * @param {string} random - Phần random của tên
 * @returns {string} Tên file đã định dạng
 */
function generateExcelFileName(item, count, state, tempFilePath) {


    let  fileName = path.basename(tempFilePath);
  

        fileName = fileName.split("-")
        fileName = fileName.slice(1, 7).join("-");
    
    
    return `${count}-${fileName ? fileName : null}-${item.product}-${state}`;
}

/**
 * Tạo file Excel cho một nhóm items
 * @param {Array} items - Items cần ghi vào Excel
 * @param {string} filePath - Đường dẫn lưu file
 * @returns {Promise<string>} Tên file đã tạo
 */
async function createExcelFile(items, filePath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet 1');

    // Thiết lập các cột
    sheet.columns = EXCEL_COLUMNS;

    // Thêm hàng header
    sheet.addRow(EXCEL_HEADER);

    // Thêm dữ liệu
    items.forEach(item => sheet.addRow(item));

    // Ghi file
    await workbook.xlsx.writeFile(filePath);
    return path.basename(filePath);
}

/**
 * Tạo các card Trello mới cho các file Excel đã tách
 * @param {Array} filePaths - Mảng đường dẫn file
 */
async function createTrelloCards(filePaths) {
    for (const filePath of filePaths) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await addNewCardXlsx(filePath);
    }
}

/**
 * Hàm chính để tách state và tạo file Excel
 * @param {Array} items - Items cần tách
 * @param {string} cardId - ID của card Trello gốc
 * @param {string} nameCard - Tên của card
 */
async function tachState(items, cardId, nameCard, tempFilePath) {
    try {
        // Tạo thư mục chứa file tách


        const containerPath = await createContainerDirectory(nameCard);

        // Nhóm items theo state
        const groupedByState = groupItemsByState(items);
        const allStates = Object.keys(groupedByState);

        // Kiểm tra điều kiện chuyển sang list lỗi
        if (allStates.length === 1 && groupedByState[allStates[0]].status !== 1) {
            await moveToListError(cardId);
            return;
        }

        // Xử lý từng state
        const filePaths = [];
        for (const state of allStates) {
            const stateItems = groupedByState[state];
            const firstItem = stateItems[0];

            // Tạo tên file
            const fileName = generateExcelFileName(firstItem, stateItems.length, state, tempFilePath);
            console.log(fileName);

            const filePath = path.join(containerPath, fileName + '.xlsx');

            // Tạo file Excel
            await createExcelFile(stateItems, filePath);
            filePaths.push(filePath);
        }

        // Chuyển card gốc sang archive
        const archiveSuccess = await moveToListArchive(cardId);

        // Tạo card Trello mới nếu chuyển archive thành công
        if (archiveSuccess) {
            await createTrelloCards(filePaths);
        }

    } catch (error) {
        console.error('Lỗi trong quá trình tách state:', error);
        throw error;
    }
}

module.exports = tachState;