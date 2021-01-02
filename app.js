const { Client } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode')
const http = require('http')
const fs = require('fs');
const { response } = require('express');

const app = express();
const server = http.createServer(app);
const io = socketIO(server)

app.use(express.json());
app.use(express.urlencoded({extends: true}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname })
});
const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
    socket.emit('message', 'Connecting...')

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, scan please!');
        });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit('ready', 'WhatsApp is Ready!');
        socket.emit('message', 'WhatsApp is Ready!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'WhatsApp is authenticated!');
        socket.emit('message', 'WhatsApp is authenticated!');
        console.log('AUTHENTICATED', session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

});

// Send Message
app.post('/send-message', (req, res) => {
    const number = req.body.number;
    const message = req.body.message;
 
    client.sendMessage(number, message)
        .then(response => {
            res.status(200).json({
                status: true,
                response: response
            });
        })
        .catch(err => {
            res.status(500).json({
                status: false,
                response: err
            });
        });
});

server.listen(8000, function() {
    console.log('App running on *: 8000');
});