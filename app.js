/**
 * Message Codes
 * 0 => Admin
 * 1 => Message
 * 2 => Actions
 * 3 => 
 * 4 => 
 * 5 => Login/Connection
 * 6 => Logout/Disconnection
 * 7 => Sign Up
 */

const MessageCode = {
    ADMIN: 0,
    MESSAGE: 1,
    ACTION: 2,
    USERS: 3,
    LOGIN: 5,
    LOGOUT: 6,
    SIGNUP: 7,
}

const ActionType = {
    START: 0,
    BREAK: 1,
    STOP: 2
}

const UserState = {
    REST: 0,
    WORK: 1,
    BREAK: 2
}

const LogType = {
    ADMIN: "ADMIN",

    INFO: "INFO",
    WARNING: "WARN",
    ERROR: "ERR",

    SEND: "SEND",
    SEND_ALL: "SEND",
    SEND_TO: "SEND_TO",
    RECV: "RECV",
    RECEIVE: "RECV",

    UKN: "UKN",
    UNKNOWN: "UKN"
}

// Websocket core
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 31492 });

wss.on('connection', (ws, req) => {
    ws.ip = req.socket.remoteAddress;
    log(`New client connected: ${ws.ip}`);

    // Still alive
    ws.isAlive = true;
    ws.on('pong', () => this.isAlive = true)

    // User vars
    ws.pseudo = null;
    ws.state = UserState.REST;

    // Message
    ws.on('message', (data) => {
        data = JSON.parse(data)
        log(data, LogType.RECV, ws);

        messageHandler(data, ws);
    });

    // Disconnected
    ws.on('close', (code, reason) => {
        log(`Client disconnected: ${wsToUserLogName(ws)} - [${code}] ${reason}`);

        if (ws.pseudo !== null)
            sendAll(MessageCode.LOGOUT, ws.pseudo, ws);
    })
});

// Handlers
function messageHandler(data, ws) {
    switch (data.code) {
        case MessageCode.ADMIN:
            break;

        case MessageCode.MESSAGE:
            break;

        case MessageCode.ACTION:
            actionHandler(data, ws);
            break;

        case MessageCode.LOGIN:
            if (pseudoAlreadyConnected(data.data, ws)) {
                sendTo(MessageCode.LOGIN, false, ws);
            } else {
                ws.pseudo = data.data;

                sendTo(MessageCode.LOGIN, true, ws);
                sendTo(MessageCode.USERS, getUserList(), ws);

                sendAll(MessageCode.LOGIN, ws.pseudo, ws);

                // test()
            }
            break;

        case MessageCode.LOGOUT:
            break;

        case MessageCode.SIGNUP:
            break;

        default:
            break;
    }
}

function actionHandler(data, ws) {
    switch (data.data) {
        case ActionType.START:
            updateUserState(UserState.WORK, ws);
            break;

        case ActionType.BREAK:
            updateUserState(UserState.BREAK, ws);
            break;

        case ActionType.STOP:
            updateUserState(UserState.REST, ws);
            break;

        default:
            break;
    }

    sendAll(MessageCode.ACTION, createAction(data.data, ws.pseudo))
}

function updateUserState(newState, ws) {
    if (ws.state == newState)
        return;

    ws.state = newState;
    // Then, save to history...
}

// Utils functions
function createAction(action, pseudo) {
    return {
        action,
        pseudo
    }
}

function sendTo(code, data, receiver) {
    if (receiver.readyState === WebSocket.OPEN) {
        const d = {
            code,
            data
        };

        log(d, LogType.SEND_TO, receiver)
        receiver.send(JSON.stringify(d))
    }
}

function sendAll(code, data, sender = null) {
    const d = {
        code,
        data
    };

    log(d, LogType.SEND, sender);
    wss.clients.forEach((ws) => {
        if (ws !== sender && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(d));
        }
    });
}

function pseudoAlreadyConnected(pseudo, ws) {
    let found = false;

    wss.clients.forEach(client => {
        if (client !== ws && client.pseudo !== null
            && client.pseudo.toLowerCase() == pseudo.toLowerCase()) {
            found = true;
        }
    })

    return found;
}

function getUserData(ws) {
    return {
        pseudo: ws.pseudo,
        state: ws.state
    }
}

function getUserList() {
    let userList = [];

    wss.clients.forEach(client => {
        if (client.pseudo !== null) {
            userList.push(getUserData(client));
        }
    })

    return userList;
}

// Check clients
// const interval = setInterval(() => {
//     wss.clients.forEach((ws) => {
//         if (ws.isAlive === false) return ws.terminate();

//         ws.isAlive = false;
//         ws.ping();
//     });
// }, 20000);

// Close server
wss.on('close', function close() {
    clearInterval(interval);
});

// Utils functions
function logTime() {
    return `[${(new Date()).toLocaleTimeString("FR-fr")}]`;
}

function wsToUserLogName(ws) {
    return `${ws.ip}${ws.pseudo !== null ? ` (${ws.pseudo})` : ''}`;
}

function log(data, type = LogType.INFO, ws = null, time = true) {
    let text = "";

    // Time
    if (time)
        text += `${logTime()}`;

    // Type
    text += `[${type}]`;

    // Pseudo
    if (ws !== null)
        text += ` ${wsToUserLogName(ws)}:`;

    // Print log
    console.log(`${text}`, data);
}


function test() {
    setTimeout(() => {
        sendAll(MessageCode.USERS, [
            { pseudo: "Albert", state: UserState.REST },
            { pseudo: "TrouDuc", state: UserState.WORK },
            { pseudo: "Jean-Michel", state: UserState.BREAK },
        ])
    }, 5000);

    setTimeout(() => {
        sendAll(MessageCode.LOGIN, "Alfred")
    }, 10000)

    setTimeout(() => {
        sendAll(MessageCode.LOGOUT, "TrouDuc")
    }, 15000)

    setTimeout(() => {
        sendAll(MessageCode.ACTION, createAction(ActionType.START, "Albert"))
    }, 20000)

    setTimeout(() => {
        sendAll(MessageCode.ACTION, createAction(ActionType.STOP, "Jean-Michel"))
    }, 25000)

    setTimeout(() => {
        sendAll(MessageCode.ACTION, createAction(ActionType.BREAK, "Albert"))
    }, 30000)
}