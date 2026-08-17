const errorHandling = (err, req, res, next) => {
  console.error("Error:", err.message);

  if (err.cause) {
    console.error("Caused by:", err.cause);
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandling;
