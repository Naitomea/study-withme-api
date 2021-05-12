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

const MessageCodes = {
    ADMIN: 0,
    MESSAGE: 1,
    ACTIONS: 2,
    USERS: 3,
    LOGIN: 5,
    LOGOUT: 6,
    SIGNUP: 7,
}

const ActionTypes = {
    START: 0,
    BREAK: 1,
    STOP: 2
}

const UserStates = {
    REST: 0,
    WORK: 1,
    BREAK: 2
}

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
    ws.ip = req.socket.remoteAddress;
    console.log("New client connected:", ws.ip)

    // Still alive
    ws.isAlive = true;
    ws.on('pong', () => this.isAlive = true)

    // User vars
    ws.pseudo = null;
    ws.state = UserStates.REST;

    // Message
    ws.on('message', (data) => {
        data = JSON.parse(data)
        // console.log("Data received:", data)

        messageHandler(data, ws);
    });

    // Disconnected
    ws.on('close', (code, reason) => {
        console.log(`Client disconnected ${ws.ip}\n[${code}] ${reason}`)

        if (ws.pseudo !== null)
            sendToAll(MessageCodes.LOGOUT, ws.pseudo, ws);
    })
});

// Handlers
function messageHandler(data, ws) {
    switch (data.code) {
        case MessageCodes.ADMIN:
            break;

        case MessageCodes.MESSAGE:
            break;

        case MessageCodes.ACTIONS:
            actionHandler(data, ws);
            break;

        case MessageCodes.LOGIN:
            if (pseudoAlreadyConnected(data.data, ws)) {
                sendTo(MessageCodes.LOGIN, false, ws);
            } else {
                ws.pseudo = data.data;

                sendTo(MessageCodes.LOGIN, true, ws);
                sendToAll(MessageCodes.USERS, getUserList(), ws);
            }
            break;

        case MessageCodes.LOGOUT:
            break;

        case MessageCodes.SIGNUP:
            break;

        default:
            break;
    }
}

function actionHandler(data, ws) {
    switch (data.action) {
        case ActionTypes.START:
            updateUserState(UserStates.WORK, ws);
            break;

        case ActionTypes.BREAK:
            updateUserState(UserStates.BREAK, ws);
            break;

        case ActionTypes.STOP:
            updateUserState(UserStates.REST, ws);
            break;

        default:
            break;
    }
}

function updateUserState(newState, ws) {
    if (ws.state == newState)
        return;

    ws.state = newState;
    // Then, save to history...

    sendToAll(MessageCodes.ACTIONS, {
        pseudo: ws.pseudo,
        state: newState
    })
}

// Utils functions
function sendTo(code, data, receiver) {
    if (receiver.readyState === WebSocket.OPEN) {
        receiver.send(JSON.stringify({
            code,
            data
        }))
    }
}

function sendToAll(code, data, sender = null) {
    wss.clients.forEach((ws) => {
        if (ws !== sender && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                code,
                data
            }));
        }
    });
}

function pseudoAlreadyConnected(pseudo, ws) {
    let found = false;

    wss.clients.forEach(client => {
        if (client !== ws && client.pseudo !== null
            && client.pseudo.toLowerCase() == pseudo.toLowerCase()) {
            found = true;
            break;
        }
    })

    return found;
}

function getUserList() {
    let userList = [];

    wss.clients.forEach(client => {
        if (client.pseudo !== null) {
            userList.push({
                pseudo: client.pseudo,
                state: client.state
            });
        }
    })

    return userList;
}

// Check clients
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Close server
wss.on('close', function close() {
    clearInterval(interval);
});