// Response middleware for consistent API responses
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, error, statusCode = 500, message = 'Error') => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || error
  });
};

module.exports = {
  sendSuccess,
  sendError
};
