const KAD = require('pandora-protocol-kad-reference')
const PANDORA_PROTOCOL = require('./../index')
const path = require('path');

console.log("PANDORA PROTOCOL REFERENCE EXAMPLE");

//const sybilKeys = KAD.helpers.ECCUtils.createPair();
const sybilKeys = {
    //WARNING! PRIVATE KEY IS PROVIDED ONLY FOR TESTING PURPOSES ONLY!
    privateKey: Buffer.from("68a595199d55260b90d97e6714f27c2a22548f9ee4b2c61956eb628189a8e2ed", "hex"),
    publicKey: Buffer.from("049cf62611922a64575439fd14e0a1190c40184c4d20a1c7179828693d574e84b94b70c3f3995b7a2cd826e1e8ef9eb8ccf90e578891ecfe10de6a4dc9371cd19a", 'hex'),
    uri: 'http://pandoraprotocol.ddns.net:9090/challenge/',
    origin: 'http://pandoraprotocol.ddns.net:9090',
}

KAD.init({
    PLUGINS:{
        CONTACT_SYBIL_PROTECT: {
            SYBIL_PUBLIC_KEYS: [ sybilKeys ],
        }
    }
});

PANDORA_PROTOCOL.init({});

if (sybilKeys.privateKey)
    console.info("SYBIL PRIVATE KEY", sybilKeys.privateKey.toString('hex') );

console.info("SYBIL PUBLIC KEY", sybilKeys.publicKey.toString('hex') );

const COUNT = 6;

// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_MOCK;
// KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_HTTP;
//KAD_OPTIONS.TEST_PROTOCOL = KAD.ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBSOCKET;

//addresses
const array = new Array( COUNT ).fill(1).map( (it, i) => i )

const nodes = array.map(
    (contact, index) => new PANDORA_PROTOCOL.PandoraProtocolNode(
        path.resolve( __dirname + '/_temp/' + index ),
    ) )

async function execute() {

    for (let i = 0; i < nodes.length; i++) {
        await nodes[i].start({port: 10000 + i});
        console.info("BOOTSTRAP INFO:", KAD.library.bencode.encode( nodes[i].contact.toArray()).toString('hex') )
    }

    for (let i = 1; i < nodes.length; i++) {
        const out = await nodes[i].bootstrap(nodes[0].contact, true);
        console.log("BOOTSTRAPING...", out.length);
    }

    console.log('NODES BOOTSTRAPPED');
    for (let i = 0; i < nodes.length; i++)
        console.log(i, nodes[i].routingTable.count, nodes[i].routingTable.array.map(it => it.contact.contactType));

    const name = 'Example 1 box simple';
    const out = await nodes[3].seedPandoraBox( './examples/public/data1',  name, 'Example1 Description', ['category1','category2'] );

    nodes[3].pandoraBoxes.on( 'pandora-box/creating', (data) =>{

        if (data.name === name){
            console.log(data.status);
            if (data.chunkIndex && data.chunkIndex % 100 === 0)
                console.log("update", data.chunkIndex, data.path );

        }

    });

    console.info('pandora box hash', out.pandoraBox.hash.toString('hex'))

    let initialized = false;
    while (!initialized)
        initialized = await out.pandoraBox.streamliner.initializeStreamliner();

    const out2 = await nodes[4].findPandoraBoxesByName('box simple');
    if (!out2) throw "pandora box was not found by name";

    console.info('pandora box found', !!out2[out.pandoraBox.hash.toString('hex')] )

    const out3 = await nodes[4].getPandoraBox( out.pandoraBox.hash );
    console.info('pandora box get', out3.pandoraBox.hash.toString('hex'));

    nodes[4].pandoraBoxes.on("stream/chunk/done", ({pandoraBox, stream, chunkIndex}) => {

        if (pandoraBox.hash.equals(out.pandoraBox.hash) && chunkIndex % 100 === 0)
            console.log(stream.path, chunkIndex);

    });

    nodes[4].pandoraBoxes.on("pandora-box/done", ({pandoraBox}) =>{

        if (pandoraBox.hash.equals(out.pandoraBox.hash))
            console.log("streamliner done!");

    })

    console.log( JSON.stringify( out3.pandoraBox.toJSON(true), null, 4 ) );
    console.log('isDone', out3.pandoraBox.isDone)

}

execute();
global.nodes = nodes;
