# Trello Webhook Processor

Ứng dụng xử lý webhook từ Trello và tự động xử lý các file Excel đính kèm.

## Cấu trúc Project

```
project/
├── src/
│   ├── config/
│   │   └── constants.js
│   ├── services/
│   │   ├── trello/
│   │   │   ├── webhook.js
│   │   │   ├── card.js
│   │   │   └── list.js
│   │   ├── excel/
│   │   │   ├── parser.js
│   │   │   └── processor.js
│   │   └── client/
│   │       └── socket.js
│   ├── utils/
│   │   ├── trello.js
│   │   └── excel.js
│   └── server/
│       ├── socket.js
│       └── routes.js
├── index.js
├── package.json
└── .gitignore
```

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm run dev
```

## Chức năng

1. Nhận webhook từ Trello
2. Xử lý file Excel đính kèm
3. Gửi thông tin cho client qua Socket.IO
4. Tự động cập nhật trạng thái card trên Trello

## Cấu hình

Cấu hình được lưu trong `src/config/constants.js`:
- Trello API Key
- Trello Token
- Các ID List
- Port server
- Các đường dẫn file 