const PandoraStreamType = require('../pandora-box/stream/pandora-box-stream-type')
const async = require('pandora-protocol-kad-reference').library.async;

module.exports = class InterfacePandoraLocations {

    constructor(pandoraProtocolNode, prefix = '', type) {
        this._pandoraProtocolNode = pandoraProtocolNode;
        this._prefix = this.trailingSlash(prefix);
        this._type = type;
    }

    extractFileBase(filename){

        let base = filename.substring( filename.lastIndexOf('/') + 1);
        if (base.lastIndexOf(".") !== -1)
            base = base.substring(0, base.lastIndexOf("."));

        return base;
    }

    extractFilePath(filename){

        let base = filename.substring( 0, filename.lastIndexOf('/') + 1);
        if (base.substr(-1) === '/')
            base = base.substr(0, base.length-1 );
        return base;
    }

    trailingSlash(str  = ''){

        if (str.substr(-1) !== '/')         // If the last character is not a slash
            str = str + '/';            // Append a slash to it.

        return str
    }

    walkLocation(location, cb, done ){

        this.getLocationInfo(location, (err, info )=>{

            if (err) return cb(err);
            if (!info) return cb(new Error('Info not found'));

            if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_STREAM) {
                cb(null, { path: location, info }, done);
            }
            else if (info.type === PandoraStreamType.PANDORA_LOCATION_TYPE_DIRECTORY) {
                cb(null, { path: location, info }, ()=>{

                    this.getLocationDirectoryFiles(location, (err, streams)=>{

                        if (err) return done(err);
                        async.eachLimit( streams, 1, (stream, next)=>{

                            this.walkLocation(this.trailingSlash(location) + stream, cb,next );

                        }, done );

                    })

                });

            } else
                cb( new Error("Stream Type invalid"))
        })

    }


}