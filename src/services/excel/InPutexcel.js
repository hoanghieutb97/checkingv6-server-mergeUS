const { KeyAndApi } = require('../../config/constants');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const _ = require('lodash');
const readXlsxFile = require('read-excel-file/node');
const { getSortByProduct } = require('../sortByProduct');

// Thay thế việc sử dụng SortByProduct từ constants
// let SortByProduct = [];

// async function initializeSortByProduct() {
//     try {
//         SortByProduct = await getSortByProduct();
//     } catch (error) {
//         console.error('Error initializing SortByProduct:', error);
//         // Không cần set lại giá trị mặc định vì đã có sẵn
//     }
// }

// // Gọi hàm khởi tạo khi module được load
// initializeSortByProduct().catch(console.error);

// Thêm hàm để refresh data khi cần
async function refreshSortByProduct() {
    await initializeSortByProduct();
}

/**
 * Lấy dữ liệu GLLM từ API
 * @returns {Promise<Array>} Mảng dữ liệu GLLM đã được xử lý
 */
async function FetchGLLM() {
    try {
        const url = KeyAndApi.gllm;
        const response = await axios.get(url);

        // Lọc bỏ các item không hợp lệ
        const GLLM = response.data.filter(item =>
            item.variant && item.variant !== "" &&
            item.ProductType && item.ProductType !== ""
        );

        // Xử lý dữ liệu
        return GLLM.map(item => ({
            ...item,
            ProductType: item.ProductType.toLowerCase().trim().replace(/ /g, '').split(","),
            variant: item.variant.toLowerCase().trim().replace(/ /g, '').split(",")
        }));
    } catch (error) {
        console.error('Error fetching GLLM:', error);
        throw error;
    }
}

/**
 * Đọc và xử lý file Excel
 * @param {string|Buffer} url - Đường dẫn file Excel hoặc buffer data
 * @returns {Promise<Array>} Mảng dữ liệu đã được xử lý
 */
async function FetchXLSX(url) {
    try {
        const rows = await readXlsxFile(url);

        // Map dữ liệu từ Excel
        const newSheet = rows.map(item => ({
            orderId: item[0],
            barcode: item[1],
            sku: item[2],
            Quantity: item[3],
            variant: item[4],
            product: item[5],
            country: item[6],
            partner: item[7],
            urlDesign: item[8],
            dateItem: item[9],
            orderName: item[10],
            note: item[11],
            location: item[12],
            ItemBarcode: item[13],
            TikTokShipBy: item[14],
            Priority: item[15],
            Factory: item[16],
            ProductionNote: item[17],
            QCNote: item[18],
            Status: item[19]
        }));

        // Bỏ 2 dòng đầu và lọc bỏ các dòng không có orderId
        newSheet.shift();
        newSheet.shift();
        return newSheet.filter(item => item.orderId !== null);
    } catch (error) {
        console.error('Error reading Excel file:', error);
        throw error;
    }
}

/**
 * Hàm hỗ trợ để chọn các thuộc tính cần thiết
 * @param {Object} object - Đối tượng cần lấy thuộc tính
 * @param {Array} properties - Mảng tên các thuộc tính cần lấy
 * @returns {Object} Đối tượng mới chỉ chứa các thuộc tính được chọn
 */
function pickProperties(object, properties) {
    return properties.reduce((acc, prop) => {
        acc[prop] = object[prop];
        return acc;
    }, {});
}

/**
 * Hàm hỗ trợ để chuẩn hóa chuỗi
 * @param {string} item - Chuỗi cần chuẩn hóa
 * @returns {string} Chuỗi đã được chuẩn hóa
 */
function trimlower(item) {
    return item.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Map dữ liệu sheet với GLLM
 * @param {Array} sheet - Dữ liệu từ Excel
 * @param {Array} gllm - Dữ liệu GLLM
 * @returns {Array} Dữ liệu đã được map
 */
function mapSheetGllm(sheet, gllm) {
    // Lọc và xử lý GLLM


    const processedGllm = gllm
        .filter(item => item.hight !== null)
        .map(item => ({
            ...item,
            hight: Number(item.hight),
            width: Number(item.width),
            box: item.box.split(",").map(Number),
            ProductType: item.ProductType,
            variant: item.variant,
            button: item.button || "normal",
            amountFile: (item.amountFile !== "1" && item.amountFile !== "2") ? "1" : item.amountFile,
            chayTuDong: item.chayTuDong,
            tag: item.tag
        }));


    // Map sheet với GLLM
    return sheet.map(itemSheet => {
        const filteredGllm = processedGllm.filter(itemGllm =>
            _.intersection(itemGllm.ProductType, [trimlower(itemSheet.product)]).length !== 0 &&
            _.intersection(itemGllm.variant, [trimlower(itemSheet.variant)]).length !== 0
        );

        if (filteredGllm.length === 0) {
            return { ...itemSheet, addGllm: false };
        }

        const [firstFilteredItem] = filteredGllm;
        return {
            ...itemSheet,
            addGllm: true,
            ...pickProperties(firstFilteredItem, [
                'nameId', 'box', 'button', 'direction',
                'width', 'hight', 'amountFile', 'state', 'status',
                'chayTuDong', 'tag'
            ])
        };
    });
}

/**
 * Nhân bản items theo Quantity
 * @param {Array} excel - Mảng items cần nhân bản
 * @returns {Array} Mảng items đã được nhân bản
 */
function dupItemsExcel(excel) {
    // Nhân bản items
    const newSheet = excel.flatMap(item =>
        Array(item.Quantity).fill().map(() => ({ ...item }))
    );

    // Thêm số thứ tự
    const sheetWithStt = newSheet.map((item, key) => ({
        ...item,
        stt: key + 1
    }));

    // Tính QuantityAll
    const orderIdCount = sheetWithStt.reduce((acc, item) => {
        acc[item.orderId] = (acc[item.orderId] || 0) + 1;
        return acc;
    }, {});

    return sheetWithStt.map(item => ({
        ...item,
        QuantityAll: orderIdCount[item.orderId]
    }));
}

/**
 * Sắp xếp sheet theo các tiêu chí
 * @param {Array} sheet - Mảng cần sắp xếp
 * @returns {Array} Mảng đã được sắp xếp
 */
async function sortSheet(sheet) {
    let SortByProduct = await getSortByProduct();
    // console.log(SortByProduct, "SortByProduct-----------");

    const product = sheet[0].button ? sheet[0].button : "normal";

    let selectedPR = SortByProduct.filter(item => item.name.toLowerCase().trim() === product.toLowerCase().trim())[0];
    // console.log(selectedPR, "selectedPR-----------");


    // Xử lý đặc biệt cho Acrylic Plaque
    if (product === "Acrylic Plaque") {
        const arr5 = _.chunk(sheet.filter(item =>
            ["A.Plaque6x8in", "DZT-Plaque6x8", "wood-Plaque6x8in", "2M-Plaque6x8inTMZ"].includes(item.nameId)
        ), 5);

        const arr1 = sheet.filter(item =>
            ["A.Plaque4x6in", "DZT-Plaque4x6", "wood-Plaque4x6in"].includes(item.nameId)
        );

        if (arr5.length > arr1.length) {
            return _.flattenDeep(arr5.map((arr, i) =>
                arr1[i] ? [...arr, arr1[i]] : arr
            ));
        }

        return _.flattenDeep(arr1.map((arr, i) =>
            arr5[i] ? [...arr5[i], arr] : arr
        ));


    } else if (selectedPR) {

        // console.log(_.orderBy(sheet, [selectedPR.sortConfig.primary, selectedPR.sortConfig.secondary, selectedPR.sortConfig.tertiary], ['asc', 'asc', 'asc']).map((item, key) => ({ ...item, stt: key + 1 })))
        return _.orderBy(sheet, [selectedPR.sortConfig.primary, selectedPR.sortConfig.secondary, selectedPR.sortConfig.tertiary], ['asc', 'asc', 'asc']).map((item, key) => ({ ...item, stt: key + 1 }));
    }
    else {
        return _.orderBy(sheet, ['orderId', 'variant', 'sku'], ['asc', 'asc', 'asc']).map((item, key) => ({ ...item, stt: key + 1 }));

    }

}

/**
 * Kiểm tra điều kiện ungtoll
 * @param {Array} excel - Mảng cần kiểm tra
 * @returns {number} Kết quả kiểm tra (0, 1, hoặc 2)
 */
function checkungtoll(excel) {
    const state = _.uniq(excel.map(item => item.state));
    const status = _.uniq(excel.map(item => item.status));

    if (state.length === 1 && status[0] === "1") return 1;
    if (state.length !== 1 && status.includes("1")) return 0;
    return 2;
}

/**
 * Hàm chính xử lý file Excel
 * @param {string} url - Đường dẫn file Excel
 * @returns {Promise<{stt: number, value: Object}>} Kết quả xử lý
 */
async function InPutexcel(url) {
    try {
        // Đọc file Excel
        const sheet = await FetchXLSX(url);
        if (!sheet || sheet.length === 0) {
            throw new Error('Excel file is empty or invalid');
        }

        // Lấy dữ liệu GLLM
        let gllm;
        try {
            gllm = await FetchGLLM();
        } catch (error) {
            console.error('Error fetching GLLM:', error);
            return { stt: 2, value: [] };
        }

        // Xử lý dữ liệu
        const excel = mapSheetGllm(sheet, gllm);
        const duplicatedExcel = dupItemsExcel(excel);
        const sortedExcel = await sortSheet(duplicatedExcel);
        // console.log("sortedExcel", sortedExcel);
        // Tạo kết quả
        const fileName = path.basename(url);


        // Kiểm tra chayTuDong trong sortedExcel
        const chayTuDongItems = sortedExcel.filter(item => item.chayTuDong);
        const chayTuDong = chayTuDongItems.length > 0 && chayTuDongItems.every(item => item.chayTuDong === "1");

        // Lấy tất cả các tag từ sortedExcel
        const allTags = sortedExcel
            .filter(item => item.tag) // Lọc các item có tag
            .flatMap(item => item.tag.split(',')) // Tách tag bằng dấu phẩy
            .map(tag => tag.trim()) // Loại bỏ khoảng trắng
            .filter(tag => tag.length > 0); // Loại bỏ tag rỗng

        // Loại bỏ tag trùng lặp
        const uniqueTags = [...new Set(allTags)];


        const item = {
            items: sortedExcel,
            type: sortedExcel[0].button,
            hAll: 1200,
            wAll: 2400,
            fileName: fileName.replace(/\..+$/, ''),
            FileDesign: "~/Desktop/xoa",
            chayTuDong: chayTuDong,
            tags: uniqueTags
        };

        return {
            stt: checkungtoll(sortedExcel),
            value: item
        };
    } catch (error) {
        console.error('Error in InPutexcel:', error);
        throw error;
    }
}

module.exports = {
    InPutexcel,
    FetchXLSX
};
