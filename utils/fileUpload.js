const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const getUploadFolder = (fieldName) => {
  if (fieldName === 'poster') {
    return 'posters/';
  }
  return 'users/';
};

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ,
    secretAccessKey: process.env.S3_SECRET_KEY 
  }
});

const s3Storage = multerS3({
  s3: s3Client,
  bucket: process.env.S3_BUCKET_NAME,
  // Remove ACL and use bucket policies instead
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const folder = getUploadFolder(file.fieldname);
    cb(null, folder + uniqueSuffix + ext);
  },
  // Add content type to ensure proper file handling
  contentType: function (req, file, cb) {
    cb(null, file.mimetype);
  },
  // Add cache control for better performance
  cacheControl: 'max-age=31536000'
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed.'), false);
  }
};

const createUploadMiddleware = (fieldName) => {
  const upload = multer({
    storage: s3Storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
          success: false,
          message: err.message
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(500).json({
          success: false,
          message: err.message
        });
      }
      // Everything went fine
      next();
    });
  };
};

const uploadImage = createUploadMiddleware('image');
const uploadPoster = createUploadMiddleware('poster');

// Function to delete a file from S3
const deleteFileFromS3 = async (url) => {
  if (!url) return;
  
  try {
    // Extract the key from the URL
    const urlObj = new URL(url);
    // The key is everything after the bucket name in the path
    const key = urlObj.pathname.substring(1);
    
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'thelaundryguyz',
      Key: key
    });
    
    await s3Client.send(command);
    console.log(`Successfully deleted ${key} from S3`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    // Don't throw error, as we don't want to fail the request if deletion fails
  }
};

module.exports = {
  uploadImage,
  uploadPoster,
  deleteFileFromS3
};

