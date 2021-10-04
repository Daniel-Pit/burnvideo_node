var request = require('request');
var upperCase = require('upper-case');
var fs = require("fs");
var s3 = require('s3');
var randomstring = require('randomstring');
var serverSettings = require('../../server/settings');
 var google = require('googleapis');
 var OAuth2 = google.auth.OAuth2;
var oauth2client = new OAuth2(
  "893842987415-1h467f27oj23qieihq7i9vr394lapjm5.apps.googleusercontent.com",
  "AyBXRNBCiWRfQ65_JY0pYA9B",
  ""
);

var client = s3.createClient(
        serverSettings.awsS3Setting
    );

var uploadLocalPathBase = "./localStorage/";
var uploadAwsPathBase = "https://s3.amazonaws.com/burunvideo/";

module.exports = function(Social) {


    var download = function(uri, filename, callback){
        request.head(uri, function(err, res, body){
            if(err){
                console.log(err);
            }
            // console.log('content-type:', res.headers['content-type']);
            // console.log('content-length:', res.headers['content-length']);
        
            request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
    };

    var downloadGoogle = function(fileUrl, filename, googleToken, callback) {
        
        request.get(fileUrl, {
          'auth': {
            'bearer': googleToken
          }
        })
        .on('error', function(err) {
            console.log("download err = " + err);
          })
        .pipe(fs.createWriteStream(filename)
        .on('close', callback));
        
    };


    var downloadUpload = function(uri, localfilename, uploadKey, callback){
        
        download(uri, localfilename, function(){
            
            var params = {
              localFile: localfilename,
              s3Params: {
                Bucket: "burunvideo",
                Key: uploadKey,
                ACL: 'public-read'
              }
            };
            //console.log(params);
            var stats = fs.statSync(localfilename);
            var downloadedfileSizeInBytes = stats.size;
            console.log("social file size = " + downloadedfileSizeInBytes);
            
            var uploader = client.uploadFile(params);
            uploader.on('error', function(err) {
              console.error("unable to upload:", err.stack);
              return callback(err.stack, false);
            });
            uploader.on('end', function() {
                console.log("done uploading to s3");

                if(fs.existsSync(localfilename))
                    fs.unlinkSync(localfilename);
                    
                return callback(null, true);


            });
            
        });

    };
    
    var downloadUploadFromGoogle = function(uri, localfilename, uploadKey, token, callback){

        var bufferFileUrl = uri;
        
        var parsedUrl = parseQueryString(bufferFileUrl);
        var downloadfileId = parsedUrl.id;
        
        var googleDownloadIdUrl = "https://www.googleapis.com/drive/v3/files/" + downloadfileId + "?alt=media";
        
        console.log("google download url = " + googleDownloadIdUrl);

        
        downloadGoogle(googleDownloadIdUrl, localfilename, token, function(){
            
            var params = {
              localFile: localfilename,
              s3Params: {
                Bucket: "burunvideo",
                Key: uploadKey,
                ACL: 'public-read'
              }
            };
            
            var stats = fs.statSync(localfilename);
            var downloadedfileSizeInBytes = stats.size;
            console.log("google file size = " + downloadedfileSizeInBytes);
            if ( downloadedfileSizeInBytes > 350 ) {

                //console.log(params);
                var uploader = client.uploadFile(params);
                uploader.on('error', function(err) {
                  console.error("unable to upload:", err.stack);
                  return callback(err.stack, false);
                });
                uploader.on('end', function() {
                    console.log("done uploading to s3 " + localfilename);
    
                    if(fs.existsSync(localfilename))
                        fs.unlinkSync(localfilename);
                    
                    console.log("delete google file after done uploading to s3 " + localfilename);
                    return callback(null, true);
                        
                });


                
            } else {

                download(uri, localfilename, function(){
                    
                    var retryParams = {
                      localFile: localfilename,
                      s3Params: {
                        Bucket: "burunvideo",
                        Key: uploadKey,
                        ACL: 'public-read'
                      }
                    };
                    var retryStats = fs.statSync(localfilename);
                    var retryfileSizeInBytes = retryStats.size;
                    console.log("google download without auth url" + uri);
                    console.log("retry google file size = " + retryfileSizeInBytes);
                    

                    var uploader = client.uploadFile(retryParams);
                    uploader.on('error', function(err) {
                      console.error("unable to upload:", err.stack);
                      return callback(err.stack, false);
                    });
                    uploader.on('end', function() {
                        console.log("without auth done uploading to s3 " + localfilename);

                        if(fs.existsSync(localfilename))
                            fs.unlinkSync(localfilename);
                        
                        console.log("delete google file = " + localfilename);
                        return callback(null, true);

        
                    });
                    
                });

                
            }

        });

    };

    var parseQueryString = function(url) {
      var urlParams = {};
      url.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) {
          urlParams[$1] = $3;
        }
      );
      
      return urlParams;
    }

    Social.uploadFile = function(uploadUrl, fileType, category, token, callbackfunc){

        var randomfilename = randomstring.generate();
        var time = new Date().getTime();
        var fileExtension = ".m4v";
        if ( fileType !== "video" ) {
            fileExtension = ".png";
        }
        
        var uploadFileKey = "SF_" + category + '_' + randomfilename + '_' + time + fileExtension;
        
        var newUploadFileData = {
            "category": category,
            "sourcePath": uploadUrl,
            "mediaType": fileType,
            "upload_at": new Date().getTime()
        };
        
        Social.create(newUploadFileData, function(err, createdResult){
            
            if ( err ) {
                return callbackfunc(null, false, err.message);
            }
            
            var localTempFile = uploadLocalPathBase + uploadFileKey;
            
            //console.log("File id = " + downloadfileId)
            if ( upperCase(category) == "GD" && token ) {
                
                console.log("google download url = " + uploadUrl);
                
                downloadUploadFromGoogle( uploadUrl, localTempFile, uploadFileKey, token, function(err, result){
                    
                    if ( err ) {
                        return callbackfunc(null, false, JSON.stringify(err));
                    }
                    
                    console.log("google file upload doen " + JSON.stringify(result) );
                    var uploadDestPath = uploadAwsPathBase + uploadFileKey;
                    var uploadUpdatedData = {
                        "destPath": uploadDestPath,
                        "uploaded_at": new Date().getTime()
                    };
                    createdResult.updateAttributes(uploadUpdatedData, function(err, updatedResult){
                        
                        if ( err ) {
                            console.log("update Social error" + JSON.stringify(err));
                            return callbackfunc(null, false, err.message);
                        }
                        
                        return callbackfunc(null, true, uploadDestPath);
                        
                    });
                    
                });
                
                
                
            } else {
                downloadUpload( uploadUrl, localTempFile, uploadFileKey, function(err, result){
                    
                    if ( err ) {
                        return callbackfunc(null, false, JSON.stringify(err));
                    }
                    
                    var uploadDestPath = uploadAwsPathBase + uploadFileKey;
                    var uploadUpdatedData = {
                        "destPath": uploadDestPath,
                        "uploaded_at": new Date().getTime()
                    };
                    createdResult.updateAttributes(uploadUpdatedData, function(err, updatedResult){
                        
                        if ( err ) {
                            return callbackfunc(null, false, err.message);
                        }
                        
                        return callbackfunc(null, true, uploadDestPath);
                        
                    });
                    
                });
            }

        });
 
    };
    
    Social.remoteMethod(
      'uploadFile',
      {
        http: {path: '/uploadFile', verb: 'post'},
        accepts: [
          {arg:'uploadUrl', type:'string', required: true},
          {arg:'fileType', type:'string', required: true},
          {arg:'category', type:'string', required: true},
          {arg:'token', type:'string'}
        ],
        returns: [
          {arg:'success', type:'boolean'},
          {arg:'uploadedUrl', type:'string'}
        ]
      }
    );

    
    Social.googleAccessToken = function(googleAuthtoken, callbackfunc){
        console.log("client token = " + googleAuthtoken);
       oauth2client.getToken( googleAuthtoken , function( err , tokens ){
            if(err){
                console.log(err);
                return callbackfunc(null, false, err);
            }
            
            //oauth2client.setCredentials(tokens);
            console.log("call get tokens =" + JSON.stringify(tokens));
            return callbackfunc(null, true, tokens);
        });
    };    

    Social.remoteMethod(
      'googleAccessToken',
      {
        http: {path: '/googletokens', verb: 'post'},
        accepts: [
          {arg:'googleAuthtoken', type:'string', required: true}
        ],
        returns: [
          {arg:'success', type:'boolean'},
          {arg:'result', type:'object'}
        ]
      }
    ); 
};
