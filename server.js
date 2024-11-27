const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir arquivos estáticos
app.use(express.static('public'));

// Armazenar conexões ativas e seus tipos (calculadora ou visualizador)
const connections = new Map();

wss.on('connection', (ws) => {
    ws.id = Date.now();
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'register') {
            // Registrar o tipo de conexão (calculadora ou visualizador)
            connections.set(ws, {
                id: ws.id,
                type: data.clientType
            });
            
            // Se for um visualizador, enviar lista de calculadoras ativas
            if (data.clientType === 'viewer') {
                const calculators = Array.from(connections.entries())
                    .filter(([_, info]) => info.type === 'calculator')
                    .map(([_, info]) => info.id);
                    
                ws.send(JSON.stringify({
                    type: 'calculatorList',
                    calculators: calculators
                }));
            }
        }
        else if (data.type === 'calculation') {
            // Transmitir cálculos para todos os visualizadores
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    const clientInfo = connections.get(client);
                    if (clientInfo && clientInfo.type === 'viewer') {
                        client.send(JSON.stringify({
                            type: 'calculation',
                            calculatorId: ws.id,
                            ...data
                        }));
                    }
                }
            });
        }
    });

    ws.on('close', () => {
        // Remover conexão e notificar visualizadores
        connections.delete(ws);
        
        const calculators = Array.from(connections.entries())
            .filter(([_, info]) => info.type === 'calculator')
            .map(([_, info]) => info.id);
            
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                const clientInfo = connections.get(client);
                if (clientInfo && clientInfo.type === 'viewer') {
                    client.send(JSON.stringify({
                        type: 'calculatorList',
                        calculators: calculators
                    }));
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
