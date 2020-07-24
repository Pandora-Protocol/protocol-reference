const fs = require('fs');
const crypto = require('crypto');

module.exports =  {

    computeStreamHash( stream, cb){

        const sum = crypto.createHash('sha256');

        stream.on('data', (chunk)=>{
            try {
                sum.update(chunk)
            } catch (ex) {
                return cb(ex, null)
            }
        })
        stream.on('end', ()=>{
            cb(null, sum.digest('buffer') )
        })
        stream.on('error',()=>{
            cb(new Error('Stream raised an error'), null);
        })

    },

    computeStreamHashAndChunks( stream, chunkSize, cb){

        const sum = crypto.createHash('sha256');
        const chunks = [];

        let buffer = Buffer.alloc(chunkSize);
        let bufferPosition = 0;

        stream.on('data', (chunk)=>{
            try {

                sum.update(chunk)

                let index = 0;
                while (index < chunk.length){

                    const diff = Math.min( chunkSize, Math.max( 0, (chunk.length -index) - bufferPosition ) );
                    chunk.copy(buffer, bufferPosition, index, index + diff );
                    bufferPosition += diff;

                    index += diff;

                    if (bufferPosition === chunkSize){
                        const hashChunk = crypto.createHash('sha256').update(buffer).digest('buffer');
                        chunks.push(hashChunk);
                        bufferPosition = 0;
                    }

                }

            } catch (ex) {
                return cb(ex, null)
            }
        })
        stream.on('end', ()=>{

            if (bufferPosition > 0){

                let buffer2 = buffer;
                if (bufferPosition !== chunkSize){
                    buffer2 = Buffer.alloc(bufferPosition);
                    buffer.copy(buffer2, 0, 0, bufferPosition);
                }

                const hashChunk = crypto.createHash('sha256').update(buffer2).digest('buffer');
                chunks.push(hashChunk);

            }

            cb(null, {
                hash: sum.digest('buffer'),
                chunks,
            } )
        })
        stream.on('error',()=>{
            cb(new Error('Stream raised an error'), null);
        })

    },

}