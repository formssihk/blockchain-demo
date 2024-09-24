const express = require('express');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const app = express();
const port = 3000;

let blockchainData = [];

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Load blockchain from a file and create the first block if necessary
const loadBlockchain = () => {
  if (fs.existsSync('blockchain.json')) {
    const data = fs.readFileSync('blockchain.json', 'utf8');
    blockchainData = JSON.parse(data);
  } else {
    blockchainData = [[createGenesisBlock()]];
    saveBlockchain();
  }
};

// Save blockchain to a file
const saveBlockchain = () => {
  fs.writeFileSync('blockchain.json', JSON.stringify(blockchainData, null, 2));
};

// Create Genesis block
function createGenesisBlock() {
  return {
    index: 0,
    data: "Genesis Block",
    previousHash: "0",
    hash: calculateHash(0, "Genesis Block", "0"),
  };
}

// Calculate hash for the block
function calculateHash(index, data, previousHash) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(index + data + previousHash).digest('hex');
}

// API to fetch all blockchain data
app.get('/blocks', (req, res) => {
  loadBlockchain();
  res.json(blockchainData);
});

// API to add a new block
app.post('/blocks', (req, res) => {
  const { newBlockData } = req.body;
  if (!newBlockData || newBlockData.trim() === '') {
    return res.status(400).json({ error: "Block data is required" });
  }

  // Create new block
  const newBlock = {
    index: blockchainData[0].length,
    data: newBlockData,
    previousHash: blockchainData[0][blockchainData[0].length - 1].hash,
    hash: calculateHash(blockchainData[0].length, newBlockData, blockchainData[0][blockchainData[0].length - 1].hash),
  };

  // Add new block to the first node and save
  blockchainData[0].push(newBlock);
  saveBlockchain();

  // Notify all connected clients
  broadcastBlockchain();

  res.json(newBlock);
});

// API to confirm a block
app.post('/confirm', (req, res) => {
  const { nodeIndex } = req.body;
  if (nodeIndex === undefined || nodeIndex < 0 || nodeIndex >= blockchainData.length) {
    return res.status(400).json({ error: "Invalid node index" });
  }

  blockchainData[nodeIndex] = [...blockchainData[0]];
  saveBlockchain();

  // Notify all connected clients
  broadcastBlockchain();

  res.json({ message: "Block confirmed for node " + nodeIndex });
});

// Create an HTTP server and bind WebSocket server to it
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

function broadcastBlockchain() {
  const data = JSON.stringify({ type: 'update', blockchain: blockchainData });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start the server and WebSocket on the same port
server.listen(port, () => {
  console.log(`Blockchain API and WebSocket listening at http://localhost:${port}`);
});
