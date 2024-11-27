const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir arquivos estáticos
app.use(express.static('public'));

// Armazenar conexões ativas
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    
    // Enviar ID único para o cliente
    ws.id = Date.now();
    ws.send(JSON.stringify({ type: 'id', id: ws.id }));
    
    // Broadcast lista de calculadoras conectadas
    const activeCalculators = Array.from(clients).map(client => client.id);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
                type: 'calculators',
                calculators: activeCalculators
            }));
        }
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // Repassar mensagem para todos os clientes
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    ...data,
                    calculatorId: ws.id
                }));
            }
        });
    });

    ws.on('close', () => {
        clients.delete(ws);
        // Atualizar lista de calculadoras conectadas
        const activeCalculators = Array.from(clients).map(client => client.id);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ 
                    type: 'calculators',
                    calculators: activeCalculators
                }));
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
