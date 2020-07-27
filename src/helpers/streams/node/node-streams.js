module.exports = {

    splitStreamIntoChunks( stream, chunkSize, cb){

        let buffer = Buffer.alloc(chunkSize);
        let bufferPosition = 0, chunkIndex = 0;

        stream.on('data', (chunk)=>{
            try {

                let index = 0;
                while (index < chunk.length){

                    const diff = Math.min( chunkSize, Math.max( 0, (chunk.length -index) - bufferPosition ) );
                    chunk.copy(buffer, bufferPosition, index, index + diff );
                    bufferPosition += diff;

                    index += diff;

                    if (bufferPosition === chunkSize){
                        cb(null, {done: false, chunk: buffer, chunkIndex: chunkIndex++})
                        bufferPosition = 0;
                    }

                }

            } catch (ex) {
                return cb(ex, {} )
            }
        })
        stream.on('end', ()=>{

            if (bufferPosition > 0){

                let buffer2 = buffer;
                if (bufferPosition !== chunkSize){
                    buffer2 = Buffer.alloc(bufferPosition);
                    buffer.copy(buffer2, 0, 0, bufferPosition);
                }

                cb(null, {done: false, chunk: buffer2, chunkIndex: chunkIndex++})

            }

            cb(null, {done: true })

        })
        stream.on('error',()=>{
            cb(new Error('Stream raised an error'), { });
        })

    },


}