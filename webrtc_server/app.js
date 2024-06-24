const socket = require('socket.io');
const http = require('http');

const server = http.createServer()

const io = socket(server, {
    cors: {
        origin: '*' // 配置跨域
    }
});

io.on('connection', sock => {
    console.log('连接成功...')
    // 向客户端发送连接成功的消息
    sock.emit('connectionSuccess');

    sock.on('joinRoom', (roomId) => {
        sock.join(roomId);
        console.log('joinRoom-房间ID：' + roomId);
    })

    // 广播有人加入到房间
    sock.on('call', (roomId) => {
        console.log("有人进来")
        io.to(roomId).emit('callRemote')
    })

    // 广播同意接听视频
    sock.on('acceptCall', (roomId) => {
        io.to(roomId).emit('acceptCall')
    })

    // 接收offer
    sock.on('sendOffer', ({offer, roomId}) => {
        // console.log("收到off", offer, roomId)
        io.to(roomId).emit('sendOffer', offer)
    })

    // 接收answer
    sock.on('sendAnswer', ({answer, roomId}) => {
        console.log("收到回复", answer)
        io.to(roomId).emit('sendAnswer', answer)
    })

    // 收到candidate
    sock.on('sendCandidate', ({candidate, roomId}) => {
        // console.log('收到sendCandidate', candidate)
        io.to(roomId).emit('sendCandidate', candidate)
    })

    // 挂断结束视频
    sock.on('hangUp', (roomId) => {
        io.to(roomId).emit('hangUp')
    })
})

server.listen(3000, () => {
    console.log('服务器启动成功');
});