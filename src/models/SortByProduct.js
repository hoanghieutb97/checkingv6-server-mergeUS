

const mongoose = require('mongoose');

// Đơn giản hóa - không cần schema chi tiết
const SortByProduct = mongoose.model('SortByProduct', {}, 'checkingc6-constant');

module.exports = SortByProduct; 