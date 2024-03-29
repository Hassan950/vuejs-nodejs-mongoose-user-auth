const httpStatus = require('http-status');
const AppError = require('../utils/AppError');
const config = require('config');
const logger = require('./../config/logger');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (config.get('NODE_ENV') === 'development') {
    logger.error(err);
  }

  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError(error);
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new AppError(message, statusCode, false, err.stack);
  }
  next(error);
};


const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, httpStatus.BAD_REQUEST);
};

const handleJWTError = err =>
  new AppError('Invalid Token. Please log in again', httpStatus.UNAUTHORIZED);

const handleJWTExpiredError = err =>
  new AppError(
    'Your token has expired! Please log in again.',
    httpStatus.UNAUTHORIZED
  );

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, httpStatus.BAD_REQUEST);
};

const handleDuplicateFieldsDB = err => {
  const [field, value] = Object.entries(err.keyValue)[0];
  const message = `${value} already exists as ${field}.`;
  return new AppError(message, httpStatus.BAD_REQUEST);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.get('NODE_ENV') === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    status: statusCode,
    message,
    ...(config.get('NODE_ENV') === 'development' && {
      stack: err.stack
    })
  };

  if (config.get('NODE_ENV') === 'development') {
    logger.error(err);
  }
  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler
};
