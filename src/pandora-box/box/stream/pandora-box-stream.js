const PandoraBoxStreamType = require('./pandora-box-stream-type')
const PandoraBoxStreamStatus = require('./pandora-box-stream-status')
const PandoraBoxStreamHelper = require('./pandora-box-stream-helper')

module.exports = class PandoraBoxStream {

    constructor(pandoraBox, path, type, size, hash, chunkSize, chunks, statusChunks = [], streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED) {

        if (pandoraBox)
            this.setPandoraBox(pandoraBox);

        path = path.toString();

        PandoraBoxStreamHelper.validatePandoraBoxStream( path, type, size,  hash);

        if (!Array.isArray(statusChunks)) throw 'Stream.statusChunks is not a n array';
        if (statusChunks.length > chunks) throw 'Stream.statusChunks length is invalid';

        for (const status of statusChunks)
            if (status !== 0 && status !== 1)
                throw 'Stream.status is invalid';

        this.path = path;
        this.type = type;
        this.size = size;
        this.chunkSize = chunkSize;

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM)
            this.chunksCount = chunkSize ? Math.ceil( size / chunkSize ) : 0;
        else
            this.chunksCount = 0;

        this.hash = hash;
        this.hashHex = hash.toString('hex');

        this.chunks = chunks;

        this.statusChunks = statusChunks
        this.statusUndoneChunksPending = 0;

        this.calculateStatusUndone();

        this.setStreamStatus( streamStatus );

    }

    async setStreamStatus(newValue, save = false ){

        this._streamStatus = newValue;
        this.isDone = this.calculateIsDone;

        if (save)
            await this.saveStatus();

        return true;
    }

    get streamStatus(){
        return this._streamStatus;
    }

    calculateStatusUndone(){

        this.statusUndoneChunks = [];

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM)
            for (let i=0; i < this.chunksCount; i++)
                if (this.statusChunks[i] !== 1)
                    this.statusUndoneChunks.push({
                        index: i,
                        pending: false,
                    });
    }

    setPandoraBox(pandoraBox){
        this._pandoraBox = pandoraBox;
        this._kademliaNode = pandoraBox._kademliaNode;
    }

    get absolutePath(){
        const abs = ( !this._pandoraBox.absolutePath ) ? this._kademliaNode.locations._prefix + this._pandoraBox.name : this._pandoraBox.absolutePath;
        return this._kademliaNode.locations.trailingSlash( abs  ).slice(0, -1) + this.path;
    }

    get calculateIsDone(){

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_DIRECTORY){
            return this._streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
        } if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM) {

            for (let i=0; i < this.chunks; i++)
                if ( !this.statusChunks[i] )
                    return false;

            return this._streamStatus  === PandoraBoxStreamStatus.STREAM_STATUS_FINALIZED;
        } else throw new Error("Invalid type");

    }


    chunkRealSize(chunkIndex){
        return ( chunkIndex === this.chunksCount -1 ) ? this.size % this.chunkSize : this.chunkSize;
    }

    get chunksDone(){
        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM )
            return this.chunksCount - this.statusUndoneChunks.length;
        return this.isDone ? 1 : 0;
    }

    get percent(){

        if (this.type === PandoraBoxStreamType.PANDORA_LOCATION_TYPE_STREAM )
            return (this.chunksCount - this.statusUndoneChunks.length) / (this.chunksCount || 1) * 100 ;
        else
            return this.isDone ? 100 : 0;
    }

    async saveStatus(){
        const obj = {
            statusChunks: this.statusChunks,
            streamStatus: this.streamStatus,
        }
        return this._kademliaNode.storage.setItem('pandoraBoxes:streams:status:'+this.absolutePath, JSON.stringify(obj) );
    }

    async loadStatus(){

        const json = await this._kademliaNode.storage.getItem('pandoraBoxes:streams:status:'+this.absolutePath);
        if (!json) throw 'Status not found';

        const out = JSON.parse(json);

        if (out.streamStatus === PandoraBoxStreamStatus.STREAM_STATUS_INITIALIZING)
            out.streamStatus = PandoraBoxStreamStatus.STREAM_STATUS_NOT_INITIALIZED;

        this.setStreamStatus(out.streamStatus, false);

        this.statusChunks = out.statusChunks;
        this.calculateStatusUndone();

        return true;
    }

    removeStatus(){
        return this._kademliaNode.storage.removeItem('pandoraBoxes:streams:status:'+this.absolutePath);
    }

    toArray(){
        return [ this.path, this.type, this.size,  this.hash, this.chunks  ];
    }

    static fromArray(pandoraBox, chunkSize, arr ){
        arr.splice(4, 0, chunkSize,);
        return new PandoraBoxStream(  pandoraBox, ...arr);
    }

    toJSON(hex = false){
        return {
            path: this.path,
            type: this.type,
            size: this.size,
            hash: hex ? this.hash.toString('hex') : this.hash,
            chunks: hex ? this.chunks.map( it => it.toString('hex')) : this.chunks,
        }
    }

}