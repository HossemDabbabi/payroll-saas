const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `payroll-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Generic mimetypes some browsers/OS send for spreadsheets.
const genericMimes = ['application/octet-stream', ''];

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
  ];
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();

  // FIX #10: the extension MUST be valid AND the mimetype must be compatible.
  // The mimetype is client-controlled, so it can never be enough on its own
  // (a .pdf declared as text/csv is rejected because of its extension).
  const extensionOk = allowedExtensions.includes(ext);
  const mimeOk = allowedMimes.includes(file.mimetype) || genericMimes.includes(file.mimetype);

  if (extensionOk && mimeOk) {
    cb(null, true);
  } else {
    // FIX #9: a client error, not a 500
    const error = new Error('Invalid file type. Only .xlsx, .xls, and .csv files are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10 MB
    files: 1,
  },
});

module.exports = { upload };
