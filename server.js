const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Configuração de middleware
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para calculadora
app.get('/calculator.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'calculator.html'));
});

// Rota para visualizador
app.get('/viewer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

// Gerenciamento de clientes
const clients = {
    calculators: new Map(),
    viewers: new Set()
};

let nextCalculatorId = 1;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                handleRegistration(ws, data.clientType);
                break;
            case 'calculation':
                handleCalculation(data);
                break;
        }
    });

    ws.on('close', () => {
        handleDisconnection(ws);
    });
});

function handleRegistration(ws, clientType) {
    if (clientType === 'calculator') {
        const calculatorId = nextCalculatorId++;
        clients.calculators.set(calculatorId, ws);
        ws.calculatorId = calculatorId;
        ws.send(JSON.stringify({
            type: 'registered',
            calculatorId: calculatorId
        }));

        // Notificar visualizadores sobre a nova calculadora
        broadcastCalculatorList();
    } else if (clientType === 'viewer') {
        clients.viewers.add(ws);
        broadcastCalculatorList();
    }
}

function handleCalculation(calculationData) {
    // Transmitir cálculo para todos os visualizadores
    clients.viewers.forEach(viewer => {
        try {
            viewer.send(JSON.stringify(calculationData));
        } catch (error) {
            console.error('Erro ao enviar cálculo para visualizador:', error);
        }
    });
}

function broadcastCalculatorList() {
    const calculatorIds = Array.from(clients.calculators.keys());
    clients.viewers.forEach(viewer => {
        try {
            viewer.send(JSON.stringify({
                type: 'calculatorList',
                calculators: calculatorIds
            }));
        } catch (error) {
            console.error('Erro ao enviar lista de calculadoras:', error);
        }
    });
}

function handleDisconnection(ws) {
    if (ws.calculatorId) {
        clients.calculators.delete(ws.calculatorId);
        broadcastCalculatorList();
    } else {
        clients.viewers.delete(ws);
    }
}

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
});
