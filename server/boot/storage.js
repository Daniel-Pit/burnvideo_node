//var randomstring = require('randomstring');

module.exports = function(app) {
    
    //Function for checking the file type..
    app.dataSources.awsStorage.connector.getFilename = function(file, req, res) {
        
        //First checking the file type..
        var image_pattern = /^image\/.+$/;
        var image_value = image_pattern.test(file.type);
        var video_pattern = /^video\/.+$/;
        var video_value = video_pattern.test(file.type);
        //if(image_value || video_value)
	//{
            var container = file.container;
            var query = req.query;
            var uploadObjectProperty = query;
            console.log("request = " + JSON.stringify(uploadObjectProperty) );
            var uploadFileTag = "";
            if (uploadObjectProperty.uploadKey){
                console.log("request = " + uploadObjectProperty.uploadKey );
                uploadFileTag = uploadObjectProperty.uploadKey
            }
            
            
            var NewFileName = "";
            if(container == "burunvideo"){
                console.log("file path" + container);
                //Now preparing the file name..
                //customerId_time_orderId.extension
                NewFileName = uploadFileTag;
                console.log("NewFileName" + NewFileName);
                return NewFileName;
            } else {
                throw "s3 bucket Error.";
            }



            

          
          
            //And the file name will be saved as defined..
            
        //}
        //else{
	//    console.log("file type = " + file.type);
        //    throw "FileTypeError: Only File of Media type is accepted.";
        //}
    };
}
