const errorHandling = (err,req,res,next) =>{
    console.log('error from error middleware' , err.message);
    if(err.cause) console.log("caused by:" , err.cause);
    

    return res.status(err.status || 500).json({
        message : err.message || "Internal Server error"
    })

}



export default errorHandling;