const fs = require('fs');
const path = require('path');

const files = [
    'webhook.js',
    'webhook-creator.js',
    'socket-handler.js',
    'getListTrelloAuto.js',
    'fail-label.js',
    'design-label.js',
    'description-adder.js',
    'date-image-adder.js',
    'card-validator.js',
    'card-creator.js',
    'archive-list-mover.js',
    'error-list-mover.js',
    'comment-adder.js'
];

const trelloDir = path.join(__dirname, 'src', 'services', 'trello');

files.forEach(file => {
    const filePath = path.join(trelloDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sửa đường dẫn constants
    content = content.replace(
        /require\(['"]\.\.\/constants['"]\)/g,
        "require('../../config/constants')"
    );
    
    // Sửa import xulyLoiTrello
    content = content.replace(
        /require\(['"]\.\/xulyLoiTrello['"]\)/g,
        "require('./error-handler')"
    );
    
    // Sửa tên biến xulyLoiTrello thành errorHandler
    content = content.replace(
        /const xulyLoiTrello =/g,
        "const errorHandler ="
    );
    
    // Sửa các lời gọi hàm xulyLoiTrello thành errorHandler
    content = content.replace(
        /xulyLoiTrello\(/g,
        "errorHandler("
    );
    
    fs.writeFileSync(filePath, content);
}); 