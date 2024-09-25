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

const loadBlockchain = () => {
  if (fs.existsSync('blockchain.json')) {
    const data = fs.readFileSync('blockchain.json', 'utf8');
    blockchainData = JSON.parse(data);
  } else {
    // Ensure that blockchainData is initialized with at least one node (client) and its blocks
    blockchainData = [
      {
        clientId: "1",
        blocks: [createGenesisBlock()],
      },
    ];
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
    isValid: true,
    addedBy: "system", // Genesis block is added by the system
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

// API to add a new block to all nodes
app.post('/blocks', (req, res) => {
  const { newBlockData, clientId } = req.body; // Capture the clientId to know who added the block
  if (!newBlockData || newBlockData.trim() === '') {
    return res.status(400).json({ error: "Block data is required" });
  }

  // Get the blocks from the first node to calculate the previous block's hash
  const previousBlock = blockchainData[0].blocks[blockchainData[0].blocks.length - 1];

  // Create new block
  const newBlock = {
    index: previousBlock.index + 1,
    data: newBlockData,
    previousHash: previousBlock.hash,
    hash: calculateHash(previousBlock.index + 1, newBlockData, previousBlock.hash),
    isValid: true,
    addedBy: clientId, // Store which client added this block
  };

  // Add the new block to all nodes
  blockchainData.forEach(node => {
    node.blocks.push(newBlock);
  });

  // Save the updated blockchain
  saveBlockchain();

  // Notify all connected clients
  broadcastBlockchain();

  res.json(newBlock);
});

// WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Generate a new clientId for the new node
  const newClientId = (blockchainData.length + 1).toString();

  // Check if blockchainData[0] exists and has blocks
  let copiedBlocks = [];
  if (blockchainData[0] && blockchainData[0].blocks) {
    copiedBlocks = [...blockchainData[0].blocks]; // Copy blocks from the first node
  } else {
    // If there are no blocks, start with a genesis block
    copiedBlocks = [createGenesisBlock()];
  }

  // Create a new node with the copied blocks
  const newNode = {
    clientId: newClientId,
    blocks: copiedBlocks,
  };

  // Add the new node to the blockchain data
  blockchainData.push(newNode);
  saveBlockchain();

  // Send the copied blocks to the newly connected client
  ws.send(JSON.stringify({ clientId: newClientId, blocks: copiedBlocks }));

  // Notify all clients about the updated blockchain
  broadcastBlockchain();

  ws.on('message', (message) => {
    console.log(`Received message: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// Broadcast updated blockchain to all clients
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
