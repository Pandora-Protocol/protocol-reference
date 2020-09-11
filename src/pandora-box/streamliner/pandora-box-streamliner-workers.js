const PandoraBoxStreamlinerWorker = require('./pandora-box-streamliner-worker')
const {setAsyncInterval, clearAsyncInterval} = require('pandora-protocol-kad-reference').helpers.AsyncInterval;
const Utils = require('pandora-protocol-kad-reference').helpers.Utils;

module.exports = class PandoraBoxStreamlinerWorkers {

    constructor(kademliaNode, pandoraBox, pandoraBoxStreamliner) {

        this._kademliaNode = kademliaNode;
        this._pandoraBox = pandoraBox;
        this._pandoraBoxStreamliner = pandoraBoxStreamliner;

        this._workers = [];
        this._initialized = 0;

        this._workersCount = 0;
    }

    start(){

        if (!this._pandoraBox.isDone)
            this.workersCount = 20;
        else
            this.workersCount = 0;

        this._streamlinerInitializeWorkersAsyncInterval = setAsyncInterval(
            next => this._workStreamlinerInitializeWorkers(next),
            5*1000,
        );


        this.initializeWorkers((err, out)=>{});

    }

    stop(){
        this.workersCount = 0;
        clearAsyncInterval(this._streamlinerInitializeWorkersAsyncInterval);
    }

    get workersWorkingCount(){
        return this._workers.length;
    }

    get workersCount(){
        return this._workersCount;
    }

    set workersCount(newValue){

        this._workersCount = newValue;
        this.refreshWorkers();

    }

    removeWorker(worker){

        worker.stop();

        worker.peer.worker = null;
        delete worker.peer.worker;

        for (let j=0; j < this._workers.length; j++)
            if (this._workers[j] === worker)
                this._workers.splice(j, 1);

        //placing it at the end

        const index = this._pandoraBoxStreamliner.peers.indexOf(worker.peer);
        if (index !== undefined) {
            this._pandoraBoxStreamliner.peers.splice(index, 1);
            this._pandoraBoxStreamliner.peers.push(worker.peer);
        }

    }


    refreshWorkers(){

        if ( !this._pandoraBoxStreamliner._started || this._pandoraBoxStreamliner.isDone ){

            for (let i = this._workers.length-1; i >= 0; i--)
                this.removeWorker( this._workers[i] )

        } else {

            if (this._workers.length < this._workersCount)
                for (let i=0; i < this._pandoraBoxStreamliner.peers.length && this._workers.length < this._workersCount; i++) {
                    const peer = this._pandoraBoxStreamliner.peers[i];
                    if (!peer.worker) {

                        const worker = new PandoraBoxStreamlinerWorker(this._kademliaNode, this._pandoraBox, this._pandoraBoxStreamliner, this, peer);

                        this._workers.push(worker);
                        peer.worker = worker;

                        worker.connect(()=>{});
                    }
                }

            //close if we have more
            for (let i = this._workers.length-1; i >= this._workersCount; i--)
                this.removeWorker(this._workers[i])

        }
    }


    _workStreamlinerInitializeWorkers(next){

        const time = new Date().getTime();

        if ( this._initialized < time - PANDORA_PROTOCOL_OPTIONS.T_STORE_PEER_KEY_EXPIRY - Utils.preventConvoy( PANDORA_PROTOCOL_OPTIONS.T_STORE_PEER_KEY_EXPIRY_CONVOY ) )
            return this.initializeWorkers( (err, out)=>{

                console.log("initialized workers", this._pandoraBox._name, this._pandoraBox.hashHex, out);
                next();

            } )

        next();

    }

    initializeWorkers(cb){

        this._kademliaNode.crawler.iterativeStorePandoraBoxPeer( this._pandoraBox, undefined, undefined, (err, out2)=>{

            if (err) return cb(err, null);

            if (!this._pandoraBox.isDone)
                return this._kademliaNode.crawler.iterativeFindPandoraBoxPeersList( this._pandoraBox, (err, peers ) => {

                    if (peers && peers.length)
                        this._pandoraBoxStreamliner.addPeers(peers);

                    this.refreshWorkers();

                    this._initialized = new Date().getTime();
                    cb(null, true);

                } );

            this._initialized = new Date().getTime();
            cb(null, true);

        });

    }

}